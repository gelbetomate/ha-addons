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
        session: "ClientSession | None" = None,
    ) -> None:
        self.bridge_url = bridge_url.rstrip("/")
        self.switch_id = switch_id
        # Expose `.host` so coordinator log messages still work.
        self.host = switch_id
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

    # ── No-op stubs (features not exposed via bridge API) ────────────────────

    async def get_state(self) -> DeviceState | None:
        return None

    async def get_space(self) -> SpaceInfo | None:
        return None

    async def get_brightness(self) -> int | None:
        return None

    async def set_brightness(self, brightness: int) -> None:
        pass

    async def set_theme_custom(self) -> None:
        pass

    async def navigate_next(self) -> None:
        pass

    async def navigate_previous(self) -> None:
        pass

    async def detect_model(self) -> None:
        pass


