"""Hero layout for UluxDisplay displays."""

from __future__ import annotations

from .base import Layout, Slot


class HeroLayout(Layout):
    """Layout with large hero widget and footer widgets.

    Structure:
    +------------------------+
    |         HERO           |
    |        (slot 0)        |
    +-------+-------+--------+
    | slot1 | slot2 | slot3  |
    +-------+-------+--------+
    """

    def __init__(self, footer_slots: int = 3, hero_ratio: float = 0.7, padding: int = 8, gap: int = 8) -> None:
        """Initialize hero layout."""
        self.footer_slots = footer_slots
        self.hero_ratio = hero_ratio
        super().__init__(padding=padding, gap=gap)

    def _calculate_slots(self) -> None:
        """Calculate hero and footer rectangles."""
        self.slots = []
        available_width = self.width - (2 * self.padding)
        available_height = self.height - (2 * self.padding) - self.gap
        hero_height = int(available_height * self.hero_ratio)
        self.slots.append(Slot(index=0, rect=(self.padding, self.padding, self.width - self.padding, self.padding + hero_height)))
        footer_width = (available_width - (self.footer_slots - 1) * self.gap) // self.footer_slots
        footer_y = self.padding + hero_height + self.gap
        for i in range(self.footer_slots):
            x1 = self.padding + i * (footer_width + self.gap)
            self.slots.append(Slot(index=i + 1, rect=(x1, footer_y, x1 + footer_width, self.height - self.padding)))
