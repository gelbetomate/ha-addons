"""u::lux UMP/UDP device transport.

Implements the UMP (u::lux Message Protocol) over UDP to stream rendered images
to a u::lux Switch IP display.

Protocol reference: reverse-engineered from Averelll/U--lux-node.js and bpw23/ukm.
"""

from __future__ import annotations

import asyncio
import logging
import struct
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL import Image as PILImage

_LOGGER = logging.getLogger(__name__)

# ── Protocol constants ────────────────────────────────────────────────────────

DEFAULT_UDP_PORT = 34988

UMP_HEADER_SIZE = 16  # bytes

# Message IDs
MSG_ID_STATE = 0x01       # Received from switch (init/time request)
MSG_ID_CONTROL = 0x21     # Sent to switch on init (ControlFlags)
MSG_ID_DATETIME = 0x2F    # Sent to switch for time sync
MSG_ID_PAGE_INDEX = 0x2E  # Navigate to page
MSG_ID_VIDEO_STATE = 0xA1 # Request/response for display area dimensions
MSG_ID_VIDEO_START = 0xA2 # Tell switch to start receiving video

# Datagram type byte (first byte of full datagram)
DATAGRAM_TYPE_NORMAL = 0x01
DATAGRAM_TYPE_VIDEO = 0x03


# ── RGB565 conversion ─────────────────────────────────────────────────────────

def pil_to_rgb565(img: "PILImage.Image", width: int, height: int) -> bytes:
    """Convert a PIL image to raw RGB565 little-endian bytes."""
    from PIL import Image  # noqa: PLC0415

    img = img.resize((width, height), Image.Resampling.LANCZOS).convert("RGB")
    pixels = img.load()
    buf = bytearray(width * height * 2)
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            r5 = (r >> 3) & 0x1F
            g6 = (g >> 2) & 0x3F
            b5 = (b >> 3) & 0x1F
            val = (r5 << 11) | (g6 << 5) | b5
            idx = (y * width + x) * 2
            buf[idx] = val & 0xFF
            buf[idx + 1] = (val >> 8) & 0xFF
    return bytes(buf)


# ── UMP packet builders ───────────────────────────────────────────────────────

def _build_ump_header(total_length: int, packet_id: int) -> bytearray:
    """Build a 16-byte UMP datagram header (normal type 0x01).

    Layout (all little-endian):
        Bytes 0-1:   TotalLength (UInt16LE) — total size incl. header
        Bytes 2-3:   ProtocolVersion (0x0000)
        Bytes 4-9:   DeviceAddress (6 bytes, all zeros)
        Bytes 10-11: PacketID (UInt16LE)
        Bytes 12-15: Reserved (0x00000000)
    """
    header = bytearray(UMP_HEADER_SIZE)
    struct.pack_into("<H", header, 0, total_length & 0xFFFF)
    struct.pack_into("<H", header, 2, 0x0000)
    struct.pack_into("<H", header, 10, packet_id & 0xFFFF)
    return header


def _build_message(msg_id: int, actor_id: int, payload: bytes = b"") -> bytes:
    """Build a UMP message (payload inside a datagram, after the 16-byte header).

    Layout:
        Byte 0:    MessageLength — total size of this message incl. this byte
        Byte 1:    MessageID
        Bytes 2-3: ActorID (UInt16LE)
        Bytes 4+:  Payload
    """
    total = 4 + len(payload)
    return struct.pack("<BBH", total, msg_id, actor_id & 0xFFFF) + payload


# ── asyncio UDP protocol ──────────────────────────────────────────────────────

class _UMPProtocol(asyncio.DatagramProtocol):
    """asyncio DatagramProtocol for UMP communication."""

    def __init__(self) -> None:
        self.transport: asyncio.DatagramTransport | None = None
        self._queue: asyncio.Queue[bytes] = asyncio.Queue()

    def connection_made(self, transport: asyncio.DatagramTransport) -> None:  # type: ignore[override]
        self.transport = transport

    def datagram_received(self, data: bytes, addr: tuple) -> None:
        self._queue.put_nowait(data)

    def error_received(self, exc: Exception) -> None:
        _LOGGER.debug("UMP UDP protocol error: %s", exc)

    def connection_lost(self, exc: Exception | None) -> None:
        pass

    def send(self, data: bytes) -> None:
        if self.transport:
            self.transport.sendto(data)

    async def receive(self, timeout: float = 2.0) -> bytes | None:
        try:
            return await asyncio.wait_for(self._queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    def close(self) -> None:
        if self.transport:
            self.transport.close()


# ── Main device class ─────────────────────────────────────────────────────────

class UluxDevice:
    """Represents a u::lux Switch IP and handles the UMP/UDP image transport."""

    def __init__(
        self,
        host: str,
        port: int = DEFAULT_UDP_PORT,
        actor_id: int = 22,
        page_id: int = 4,
    ) -> None:
        self.host = host
        self.port = port
        self.actor_id = actor_id
        self.page_id = page_id
        self.model: str | None = None

        self._packet_id: int = 0

        # Display geometry (queried from switch on first send)
        self._width: int = 240
        self._height: int = 240
        self._start_col: int = 0
        self._start_line: int = 0
        self._dimensions_queried: bool = False

    # ── Packet helpers ────────────────────────────────────────────────────────

    def _next_pid(self) -> int:
        pid = self._packet_id
        self._packet_id = (self._packet_id + 1) & 0xFFFF
        return pid

    def _wrap_datagram(self, message: bytes) -> bytes:
        """Wrap a UMP message in a normal (type 0x01) datagram."""
        total = UMP_HEADER_SIZE + len(message)
        header = _build_ump_header(total, self._next_pid())
        return bytes(header) + message

    def _build_video_datagram(
        self,
        state_flags: int,
        seq_id: int,
        start_line: int,
        line_count: int,
        start_col: int,
        col_count: int,
        pixels: bytes,
    ) -> bytes:
        """Build a video datagram (type 0x03).

        Layout after the 16-byte UMP header:
            4 bytes: stateFlags (UInt32LE)
            4 bytes: seqId (UInt32LE)
            2 bytes: startLine (UInt16LE)
            2 bytes: lineCount (UInt16LE)
            2 bytes: startColumn (UInt16LE)
            2 bytes: columnCount (UInt16LE)
            N bytes: raw RGB565 pixels
        """
        meta = struct.pack(
            "<IIHHHH",
            state_flags,
            seq_id,
            start_line,
            line_count,
            start_col,
            col_count,
        )
        payload = meta + pixels
        total = UMP_HEADER_SIZE + len(payload)
        header = _build_ump_header(total, self._next_pid())
        header[0] = DATAGRAM_TYPE_VIDEO
        return bytes(header) + payload

    # ── Transport helper ──────────────────────────────────────────────────────

    async def _open_socket(self) -> tuple[asyncio.DatagramTransport, _UMPProtocol]:
        loop = asyncio.get_event_loop()
        transport, protocol = await loop.create_datagram_endpoint(
            _UMPProtocol,
            remote_addr=(self.host, self.port),
        )
        return transport, protocol  # type: ignore[return-value]

    # ── Public API ────────────────────────────────────────────────────────────

    async def query_display_dimensions(self) -> tuple[int, int, int, int]:
        """Query the switch for display geometry via VideoState (0xA1).

        Returns:
            (startCol, colCount, startLine, lineCount)
        """
        msg = _build_message(MSG_ID_VIDEO_STATE, self.actor_id)
        dgram = self._wrap_datagram(msg)

        transport, protocol = await self._open_socket()
        try:
            protocol.send(dgram)
            reply = await protocol.receive(timeout=3.0)
        finally:
            protocol.close()

        if reply and len(reply) >= UMP_HEADER_SIZE + 16:
            message = reply[UMP_HEADER_SIZE:]
            if len(message) >= 16 and message[4] == 0x02:
                start_col  = struct.unpack_from("<H", message, 8)[0]
                end_col    = struct.unpack_from("<H", message, 12)[0]
                start_line = struct.unpack_from("<H", message, 10)[0]
                end_line   = struct.unpack_from("<H", message, 14)[0]
                col_count  = end_col - start_col
                line_count = end_line - start_line
                _LOGGER.debug(
                    "Display dimensions from switch: %dx%d (col %d-%d, line %d-%d)",
                    col_count, line_count, start_col, end_col, start_line, end_line,
                )
                return start_col, col_count, start_line, line_count

        _LOGGER.warning(
            "Could not read display dimensions from %s — using defaults %dx%d",
            self.host, self._width, self._height,
        )
        return self._start_col, self._width, self._start_line, self._height

    async def send_datetime(self) -> None:
        """Send current local datetime to the switch (DateTime 0x2F)."""
        now = time.localtime()
        payload = struct.pack(
            "<HBBBBBB",
            now.tm_year,
            now.tm_mon,
            now.tm_mday,
            now.tm_hour,
            now.tm_min,
            now.tm_sec,
            now.tm_wday,
        )
        msg = _build_message(MSG_ID_DATETIME, self.actor_id, payload)
        dgram = self._wrap_datagram(msg)
        transport, protocol = await self._open_socket()
        try:
            protocol.send(dgram)
        finally:
            protocol.close()

    async def send_image(self, img: "PILImage.Image") -> None:
        """Convert PIL image to RGB565 and stream to the switch via UMP video.

        Steps:
            1. Query display dimensions on first call.
            2. Send PageIndex message to navigate to the image page.
            3. Send VideoStart to begin reception.
            4. Stream RGB565 image data in line-based chunks (stop-and-wait ACK).

        Args:
            img: Rendered PIL Image (any mode/size; resized and converted internally).
        """
        # Step 0: query dimensions once
        if not self._dimensions_queried:
            start_col, col_count, start_line, line_count = (
                await self.query_display_dimensions()
            )
            self._start_col  = start_col
            self._width      = col_count  if col_count  > 0 else 240
            self._start_line = start_line
            self._height     = line_count if line_count > 0 else 240
            self._dimensions_queried = True

        width      = self._width
        height     = self._height
        start_col  = self._start_col
        start_line = self._start_line

        # Step 1: convert to RGB565
        rgb565 = pil_to_rgb565(img, width, height)

        transport, protocol = await self._open_socket()
        try:
            # Step 2: PageIndex
            page_payload = struct.pack("<BB", self.page_id, 0x00)
            page_msg = _build_message(MSG_ID_PAGE_INDEX, self.actor_id, page_payload)
            protocol.send(self._wrap_datagram(page_msg))
            await asyncio.sleep(0.05)

            # Step 3: VideoStart
            video_start_payload = struct.pack("<II", 1, 0)
            video_start_msg = _build_message(
                MSG_ID_VIDEO_START, self.actor_id, video_start_payload
            )
            protocol.send(self._wrap_datagram(video_start_msg))
            await asyncio.sleep(0.05)

            # Step 4: stream video chunks (stop-and-wait)
            lines_per_chunk = max(1, 704 // width)
            seq_id = 0
            y = 0

            while y < height:
                chunk_lines = min(lines_per_chunk, height - y)
                chunk_start = (y * width) * 2
                chunk_end   = ((y + chunk_lines) * width) * 2
                pixels      = rgb565[chunk_start:chunk_end]

                dgram = self._build_video_datagram(
                    state_flags=1,
                    seq_id=seq_id,
                    start_line=start_line + y,
                    line_count=chunk_lines,
                    start_col=start_col,
                    col_count=width,
                    pixels=pixels,
                )
                protocol.send(dgram)

                ack = await protocol.receive(timeout=1.0)
                if ack is None:
                    _LOGGER.debug(
                        "No ACK for chunk y=%d seq=%d — continuing without ACK",
                        y, seq_id,
                    )

                seq_id += 1
                y += chunk_lines

        finally:
            protocol.close()

        _LOGGER.debug(
            "Image streamed to %s: %dx%d px, %d bytes RGB565",
            self.host, width, height, len(rgb565),
        )

    # ── Compatibility stubs ───────────────────────────────────────────────────

    async def test_connection(self) -> bool:
        """UDP is connectionless — always report ready."""
        return True

    async def get_state(self) -> None:
        """Not applicable for UDP device."""
        return None

    async def get_space(self) -> None:
        """Not applicable for UDP device."""
        return None

    async def get_brightness(self) -> None:
        """Not applicable for UDP device."""
        return None

    async def set_brightness(self, brightness: int) -> None:
        """No-op for UDP device."""

    async def set_theme_custom(self) -> None:
        """No-op for UDP device."""

    async def navigate_next(self) -> None:
        """No-op for UDP device."""

    async def navigate_previous(self) -> None:
        """No-op for UDP device."""

    async def detect_model(self) -> None:
        """No-op for UDP device."""
