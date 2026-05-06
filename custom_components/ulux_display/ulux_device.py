"""UluxDevice — UDP/UMP transport for u::lux display."""

from __future__ import annotations

import asyncio
import logging
import socket
import struct
from dataclasses import dataclass

_LOGGER = logging.getLogger(__name__)

DEFAULT_UDP_PORT = 34988


@dataclass
class DeviceState:
    """Device state (stub — UDP device does not expose state)."""

    theme: int | None = None


@dataclass
class SpaceInfo:
    """Storage space info (stub — not applicable to UDP device)."""

    used: int = 0
    free: int = 0
    total: int = 0


class UluxDevice:
    """UDP/UMP transport for u::lux display.

    Sends rendered PNG frames to a u::lux display unit via UDP datagrams
    using the UMP (Universal Media Protocol) framing.
    Each frame is split into 1400-byte chunks, each prefixed with a
    12-byte UMP header: actor_id (2B), page_id (2B), chunk_index (4B),
    total_chunks (4B).
    """

    def __init__(
        self,
        host: str,
        actor_id: int = 22,
        page_id: int = 4,
        port: int = DEFAULT_UDP_PORT,
    ) -> None:
        """Initialise the device transport."""
        self.host = host
        self.actor_id = actor_id
        self.page_id = page_id
        self.port = port
        self.model: str | None = None

    # ── Primary send method ───────────────────────────────────────────────

    async def send_image(self, image_data: bytes) -> None:
        """Send PNG image data to the display via UDP/UMP."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._send_image_sync, image_data)

    def _send_image_sync(self, image_data: bytes) -> None:
        """Send image synchronously via UDP (runs in executor thread)."""
        chunk_size = 1400
        total = len(image_data)
        num_chunks = max(1, (total + chunk_size - 1) // chunk_size)

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(5.0)
            for i in range(num_chunks):
                chunk = image_data[i * chunk_size : (i + 1) * chunk_size]
                header = struct.pack(">HHII", self.actor_id, self.page_id, i, num_chunks)
                sock.sendto(header + chunk, (self.host, self.port))

        _LOGGER.debug(
            "Sent %d UDP chunks (%d bytes) to %s:%d",
            num_chunks, total, self.host, self.port,
        )

    # ── Compatibility stubs (satisfy coordinator / entity calls) ──────────

    async def test_connection(self) -> bool:
        """Always returns True — UDP is connectionless."""
        return True

    async def get_state(self) -> DeviceState | None:
        """Return device state stub (UDP device exposes no state API)."""
        return None

    async def get_space(self) -> SpaceInfo | None:
        """Return storage info stub (not applicable to UDP device)."""
        return None

    async def get_brightness(self) -> int | None:
        """Return brightness stub."""
        return None

    async def set_brightness(self, brightness: int) -> None:
        """Set brightness stub (no-op for UDP device)."""

    async def upload_and_display(self, data: bytes, filename: str) -> None:
        """Alias for send_image (backward-compat shim)."""
        await self.send_image(data)

    async def set_theme_custom(self) -> None:
        """Set custom theme stub (no-op for UDP device)."""

    async def navigate_next(self) -> None:
        """Navigate to next screen stub (no-op)."""

    async def navigate_previous(self) -> None:
        """Navigate to previous screen stub (no-op)."""

    async def detect_model(self) -> None:
        """Detect model stub (no-op)."""
