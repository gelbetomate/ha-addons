"""u::lux device client — delegates image streaming to the UMP Bridge add-on via HTTP.

The UMP Bridge add-on is the single owner of the UMP/UDP protocol and all
direct device communication.  This client sends rendered images to the bridge's
HTTP API, which handles RGB565 encoding and UDP streaming to the switch.

Bridge API endpoint used:
  POST <bridge_url>/api/display/image/<switch_id>
  Body: { "base64": "<base64-encoded PNG>", "width": <int>, "height": <int> }
"""

from __future__ import annotations

import base64
import io
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from aiohttp import ClientSession
    from PIL import Image as PILImage

_LOGGER = logging.getLogger(__name__)


# ── Stub types (kept for coordinator type-annotation compatibility) ────────────

@dataclass
class DeviceState:
    """Placeholder device state (not available via bridge API)."""


@dataclass
class SpaceInfo:
    """Placeholder space info (not available via bridge API)."""


# ── Device client ─────────────────────────────────────────────────────────────

class UluxDevice:
    """Represents a u::lux Switch IP — communicates via the UMP Bridge HTTP API.

    The bridge add-on owns all UMP/UDP protocol logic.  This class is
    responsible only for:
      - Converting the rendered PIL image to a base64-encoded PNG.
      - POSTing it to the bridge's display/image endpoint.
    """

    def __init__(
        self,
        bridge_url: str,
        switch_id: str,
        host: str = "",
        session: "ClientSession | None" = None,
    ) -> None:
        self.bridge_url = bridge_url.rstrip("/")
        self.switch_id = switch_id
        # Use configured IP when available, fall back to switch_id (MAC) for log messages.
        self.host = host or switch_id
        self._session = session
        self._display_width: int = 240
        self._display_height: int = 240

    # ── Public API ────────────────────────────────────────────────────────────

    async def send_image(self, img: "PILImage.Image") -> None:
        """Encode *img* as PNG and POST to the bridge for UMP streaming.

        Args:
            img: Rendered PIL Image (any mode/size).
        """
        import aiohttp  # noqa: PLC0415 — imported lazily; provided by HA

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        url = f"{self.bridge_url}/api/display/image/{self.switch_id}"
        payload = {
            "base64": b64,
            "width": self._display_width,
            "height": self._display_height,
        }

        session = self._session
        own_session = session is None
        if own_session:
            session = aiohttp.ClientSession()

        try:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    # 404 "Unknown switch_id" means the bridge hasn't discovered this switch yet
                    # (normal for manually-added devices). Log as warning and continue.
                    if resp.status == 404 and "Unknown switch_id" in body:
                        _LOGGER.warning(
                            "Switch %s not yet discovered by bridge (powered off or no activity). "
                            "Image will be sent once the device is discovered.",
                            self.switch_id,
                        )
                        return
                    _LOGGER.error(
                        "Bridge API error for switch %s: HTTP %s — %s",
                        self.switch_id, resp.status, body,
                    )
                    raise RuntimeError(
                        f"Bridge API returned HTTP {resp.status}: {body}"
                    )
                _LOGGER.debug(
                    "Image sent to bridge for switch %s (%dx%d px)",
                    self.switch_id, img.width, img.height,
                )
        finally:
            if own_session:
                await session.close()

    async def stop_stream(self) -> None:
        """Stop the bridge video stream for this switch."""
        await self._post_json(f"/api/display/stream/{self.switch_id}/stop", {})

    async def get_registry_device(self) -> dict:
        """Fetch the bridge registry record for this u::lux."""
        import aiohttp  # noqa: PLC0415

        session = self._session
        own_session = session is None
        if own_session:
            session = aiohttp.ClientSession()
        try:
            async with session.get(
                f"{self.bridge_url}/api/registry/devices/{self.switch_id}",
                timeout=aiohttp.ClientTimeout(total=5),
            ) as resp:
                if resp.status != 200:
                    return {}
                payload = await resp.json()
                return payload.get("device", {}) if isinstance(payload, dict) else {}
        finally:
            if own_session:
                await session.close()

    async def test_connection(self) -> bool:
        """Check that the bridge is reachable."""
        import aiohttp  # noqa: PLC0415

        url = f"{self.bridge_url}/api/health"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    return resp.status == 200
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Bridge health check failed for %s: %s", self.switch_id, err)
            return False

    async def play_local_sound(self, sound_index: int, volume: int = 100) -> None:
        """Play a sound stored in the u::lux through the bridge."""
        await self._post_json(
            f"/api/switch/{self.switch_id}/audio/play",
            {"sound_index": sound_index, "volume": volume},
        )

    async def stop_audio(self) -> None:
        """Stop normal audio playback on the u::lux."""
        await self._post_json(f"/api/switch/{self.switch_id}/audio/stop", {})

    async def set_audio_volume(self, volume: int) -> None:
        """Set the u::lux master audio volume."""
        await self._post_json(
            f"/api/switch/{self.switch_id}/audio/volume",
            {"volume": max(0, min(100, volume))},
        )

    async def configure_audio(
        self,
        target_ip: str,
        *,
        mic_on: bool = False,
        mic_gain: int = 0,
        speaker_on: bool = True,
        speaker_volume: int = 100,
        target_port: int = 35000,
    ) -> None:
        """Configure the u::lux microphone and speaker through the bridge."""
        await self._post_json(
            f"/api/switch/{self.switch_id}/audio/config",
            {
                "target_ip": target_ip,
                "target_port": target_port,
                "mic_on": mic_on,
                "mic_gain": mic_gain,
                "speaker_on": speaker_on,
                "speaker_volume": speaker_volume,
            },
        )

    async def _post_json(self, path: str, payload: dict) -> None:
        """POST a JSON command to the bridge and raise on failure."""
        import aiohttp  # noqa: PLC0415 — imported lazily; provided by HA

        session = self._session
        own_session = session is None
        if own_session:
            session = aiohttp.ClientSession()

        try:
            async with session.post(
                f"{self.bridge_url}{path}",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise RuntimeError(f"Bridge API returned HTTP {resp.status}: {body}")
        finally:
            if own_session:
                await session.close()

    async def get_state(self) -> DeviceState | None:
        return None

    async def get_space(self) -> SpaceInfo | None:
        return None

    async def get_brightness(self) -> int | None:
        return None

    async def set_brightness(self, brightness: int) -> None:
        pass

    async def set_theme(self, theme: int) -> None:
        """No-op for bridge-backed device client."""
        pass

    async def set_theme_custom(self) -> None:
        pass

    async def navigate_next(self) -> None:
        registry = await self.get_registry_device()
        page_count = int(registry.get("page_count") or 0)
        current = int(registry.get("current_page") or 0)
        if page_count:
            await self.set_page((current + 1) % page_count)

    async def navigate_previous(self) -> None:
        registry = await self.get_registry_device()
        page_count = int(registry.get("page_count") or 0)
        current = int(registry.get("current_page") or 0)
        if page_count:
            await self.set_page((current - 1) % page_count)

    async def set_page(self, page_index: int) -> None:
        """Set the physical u::lux page through the bridge."""
        await self._post_json(
            f"/api/switch/{self.switch_id}/page",
            {"page_index": max(0, int(page_index))},
        )

    async def set_active(self, active: bool) -> None:
        """Wake or put the physical u::lux display into standby."""
        await self._post_json(
            f"/api/switch/{self.switch_id}/activate",
            {"active": active},
        )

    async def detect_model(self) -> None:
        pass


