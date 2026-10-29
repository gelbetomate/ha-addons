"""Hero Simple layout for UluxDisplay displays."""

from __future__ import annotations

from .base import Layout, Slot


class HeroSimpleLayout(Layout):
    """Layout with one large hero widget (top 2/3) and one footer widget (bottom 1/3).

    Structure:
    +------------------------+
    |         HERO           |
    |        (slot 0)        |
    +------------------------+
    |         FOOTER         |
    |        (slot 1)        |
    +------------------------+
    """

    def __init__(self, hero_ratio: float = 0.66, padding: int = 8, gap: int = 8) -> None:
        """Initialize hero simple layout."""
        self.hero_ratio = hero_ratio
        super().__init__(padding=padding, gap=gap)

    def _calculate_slots(self) -> None:
        """Calculate hero and footer rectangles."""
        self.slots = []
        available_height = self.height - (2 * self.padding) - self.gap
        hero_height = int(available_height * self.hero_ratio)
        self.slots.append(Slot(index=0, rect=(self.padding, self.padding, self.width - self.padding, self.padding + hero_height)))
        footer_y = self.padding + hero_height + self.gap
        self.slots.append(Slot(index=1, rect=(self.padding, footer_y, self.width - self.padding, self.height - self.padding)))
