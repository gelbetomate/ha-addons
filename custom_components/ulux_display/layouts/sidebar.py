"""Sidebar layouts for UluxDisplay displays."""

from __future__ import annotations

from .base import Layout, Slot


class SidebarLeft(Layout):
    """Wide left column (2/3) + 3 stacked rows on right (1/3).

    ┌────────┬────┐
    │        │ 1  │
    │   0    ├────┤
    │        │ 2  │
    │        ├────┤
    │        │ 3  │
    └────────┴────┘

    Slot 0: Main content (wide left, full height)
    Slots 1-3: Sidebar items (stacked right)
    """

    def __init__(self, ratio: float = 0.67, padding: int = 8, gap: int = 8) -> None:
        """Initialize sidebar left layout."""
        self.ratio = ratio
        super().__init__(padding=padding, gap=gap)

    def _calculate_slots(self) -> None:
        """Calculate slot rectangles."""
        self.slots = []
        available_width, available_height = self._available_space()
        left_width = int((available_width - self.gap) * self.ratio)
        self.slots.append(Slot(index=0, rect=(self.padding, self.padding, self.padding + left_width, self.height - self.padding)))
        row_height = (available_height - 2 * self.gap) // 3
        right_x = self.padding + left_width + self.gap
        for i in range(3):
            y = self.padding + i * (row_height + self.gap)
            self.slots.append(Slot(index=i + 1, rect=(right_x, y, self.width - self.padding, y + row_height)))


class SidebarRight(Layout):
    """3 stacked rows on left (1/3) + wide right column (2/3).

    ┌────┬────────┐
    │ 0  │        │
    ├────┤        │
    │ 1  │   3    │
    ├────┤        │
    │ 2  │        │
    └────┴────────┘

    Slots 0-2: Sidebar items (stacked left)
    Slot 3: Main content (wide right, full height)
    """

    def __init__(self, ratio: float = 0.67, padding: int = 8, gap: int = 8) -> None:
        """Initialize sidebar right layout."""
        self.ratio = ratio
        super().__init__(padding=padding, gap=gap)

    def _calculate_slots(self) -> None:
        """Calculate slot rectangles."""
        self.slots = []
        available_width, available_height = self._available_space()
        right_width = int((available_width - self.gap) * self.ratio)
        left_width = available_width - right_width - self.gap
        row_height = (available_height - 2 * self.gap) // 3
        for i in range(3):
            y = self.padding + i * (row_height + self.gap)
            self.slots.append(Slot(index=i, rect=(self.padding, y, self.padding + left_width, y + row_height)))
        right_x = self.padding + left_width + self.gap
        self.slots.append(Slot(index=3, rect=(right_x, self.padding, self.width - self.padding, self.height - self.padding)))
