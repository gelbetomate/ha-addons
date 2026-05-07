"""Base layout class."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING

from PIL import Image
from PIL import ImageDraw as PILImageDraw

from ..const import DISPLAY_HEIGHT, DISPLAY_WIDTH
from ..render_context import RenderContext
from ..widgets.components import Component
from ..widgets.state import WidgetState
from ..widgets.theme import DEFAULT_THEME, Theme

if TYPE_CHECKING:
    from PIL import ImageDraw

    from ..renderer import Renderer
    from ..widgets.base import Widget


@dataclass
class Slot:
    """Represents a widget slot in a layout."""

    index: int
    rect: tuple[int, int, int, int]  # x1, y1, x2, y2
    widget: Widget | None = None


class Layout(ABC):
    """Base class for display layouts."""

    def __init__(self, padding: int = 8, gap: int = 8) -> None:
        self.padding = padding
        self.gap = gap
        self.width = DISPLAY_WIDTH
        self.height = DISPLAY_HEIGHT
        self.slots: list[Slot] = []
        self.theme: Theme = DEFAULT_THEME
        self._calculate_slots()

    @abstractmethod
    def _calculate_slots(self) -> None:
        """Calculate the slot rectangles. Override in subclasses."""

    def _available_space(self) -> tuple[int, int]:
        return (
            self.width - 2 * self.padding,
            self.height - 2 * self.padding,
        )

    def _grid_cell_size(self, rows: int, cols: int) -> tuple[int, int]:
        aw, ah = self._available_space()
        return (
            (aw - (cols - 1) * self.gap) // cols,
            (ah - (rows - 1) * self.gap) // rows,
        )

    def _split_dimension(self, total: int, ratio: float) -> tuple[int, int]:
        content = total - self.gap
        first = int(content * ratio)
        second = content - first
        return first, second

    def get_slot_count(self) -> int:
        return len(self.slots)

    def get_slot(self, index: int) -> Slot | None:
        if 0 <= index < len(self.slots):
            return self.slots[index]
        return None

    def set_widget(self, index: int, widget: Widget) -> None:
        if 0 <= index < len(self.slots):
            self.slots[index].widget = widget

    def render(
        self,
        renderer: Renderer,
        draw: ImageDraw.ImageDraw,
        widget_states: dict[int, WidgetState] | None = None,
    ) -> None:
        canvas = draw._image  # noqa: SLF001
        scale = renderer.scale
        if widget_states is None:
            widget_states = {}
        for slot in self.slots:
            widget = slot.widget
            if widget is None:
                continue
            x1, y1, x2, y2 = slot.rect
            slot_width = (x2 - x1) * scale
            slot_height = (y2 - y1) * scale
            temp_img = Image.new("RGB", (slot_width, slot_height), self.theme.surface)
            temp_draw = PILImageDraw.Draw(temp_img)
            local_rect = (0, 0, x2 - x1, y2 - y1)
            ctx = RenderContext(temp_draw, local_rect, renderer, theme=self.theme)
            state = widget_states.get(slot.index, WidgetState())
            result = widget.render(ctx, state)
            if isinstance(result, Component):
                result.render(ctx, 0, 0, x2 - x1, y2 - y1)
            paste_x = x1 * scale
            paste_y = y1 * scale
            canvas.paste(temp_img, (paste_x, paste_y))
        self._apply_theme_effects(canvas, scale)

    def _apply_theme_effects(self, canvas: Image.Image, scale: int) -> None:
        if self.theme.scanlines:
            self._apply_scanlines(canvas, scale)

    def _apply_scanlines(self, canvas: Image.Image, scale: int) -> None:
        line_spacing = 3 * scale
        darkness_factor = 0.7
        pixels = canvas.load()
        if pixels is None:
            return
        for y in range(0, canvas.height, line_spacing):
            for x in range(canvas.width):
                pixel = pixels[x, y]
                if isinstance(pixel, tuple) and len(pixel) >= 3:
                    r, g, b = pixel[0], pixel[1], pixel[2]
                    pixels[x, y] = (
                        int(r * darkness_factor),
                        int(g * darkness_factor),
                        int(b * darkness_factor),
                    )

    def get_all_entities(self) -> list[str]:
        entities = []
        for slot in self.slots:
            if slot.widget is not None:
                entities.extend(slot.widget.get_entities())
        return entities
