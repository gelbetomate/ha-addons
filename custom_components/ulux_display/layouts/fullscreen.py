"""Fullscreen layout for UluxDisplay displays."""

from __future__ import annotations

from .base import Layout, Slot


class FullscreenLayout(Layout):
    """Single widget taking full display with no padding.

    +---------------------+
    |                     |
    |      FULLSCREEN     |
    |       (slot 0)      |
    |                     |
    +---------------------+
    """

    def __init__(self, padding: int = 0, gap: int = 0) -> None:
        """Initialize fullscreen layout."""
        super().__init__(padding=0, gap=0)

    def _calculate_slots(self) -> None:
        """Calculate single fullscreen slot."""
        self.slots = [Slot(index=0, rect=(0, 0, self.width, self.height))]
