"""Flexbox layout helpers for ulux_display widget rendering."""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import TYPE_CHECKING

from ._flex import (
    AUTO,
    PCT,
    AlignItems,
    Edge,
    FlexDirection,
    JustifyContent,
    Node,
)

if TYPE_CHECKING:
    from ..render_context import RenderContext


class Priority(IntEnum):
    """Element display priority (lower = more important)."""

    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


@dataclass
class LayoutBox:
    """Calculated box position and size."""

    x: int
    y: int
    width: int
    height: int

    @property
    def center(self) -> tuple[int, int]:
        return (self.x + self.width // 2, self.y + self.height // 2)

    @property
    def right(self) -> int:
        return self.x + self.width

    @property
    def bottom(self) -> int:
        return self.y + self.height


def create_vertical_layout(
    width: int,
    height: int,
    elements: dict[str, int | None],
) -> dict[str, LayoutBox]:
    """Create vertical (column) flexbox layout."""
    root = Node(flex_direction=FlexDirection.COLUMN, size=(width, height))

    for name, elem_height in elements.items():
        if elem_height is None:
            root.add(Node(key=name, size=(100 * PCT, AUTO), flex_grow=1))
        else:
            root.add(Node(key=name, size=(100 * PCT, elem_height)))

    root.compute_layout()

    result = {}
    for name in elements:
        node = root.find(f"/{name}")
        box = node.get_box(Edge.CONTENT)
        result[name] = LayoutBox(x=round(box.x), y=round(box.y), width=round(box.width), height=round(box.height))

    return result


def create_horizontal_layout(
    width: int,
    height: int,
    elements: dict[str, int | None],
    justify: JustifyContent = JustifyContent.SPACE_BETWEEN,
    align: AlignItems = AlignItems.CENTER,
) -> dict[str, LayoutBox]:
    """Create horizontal (row) flexbox layout."""
    root = Node(flex_direction=FlexDirection.ROW, justify_content=justify, align_items=align, size=(width, height))

    for name, elem_width in elements.items():
        if elem_width is None:
            root.add(Node(key=name, size=(AUTO, 100 * PCT), flex_grow=1))
        else:
            root.add(Node(key=name, size=(elem_width, 100 * PCT)))

    root.compute_layout()

    result = {}
    for name in elements:
        node = root.find(f"/{name}")
        box = node.get_box(Edge.CONTENT)
        result[name] = LayoutBox(x=round(box.x), y=round(box.y), width=round(box.width), height=round(box.height))

    return result


def layout_bar_gauge(
    ctx: RenderContext,
    value_text: str,
    label_text: str | None,
    has_icon: bool,
    min_horizontal_width: int = 90,
) -> tuple[bool, dict[str, LayoutBox]]:
    """Calculate layout for bar gauge widget."""
    padding = int(ctx.height * 0.10)
    bar_height = max(6, int(ctx.height * 0.15))
    icon_size = max(10, int(ctx.height * 0.23)) if has_icon else 0

    font_value = ctx.get_font("medium", bold=True)
    value_width, value_height = ctx.get_text_size(value_text, font_value)

    font_label = ctx.get_font("tiny")
    label_height = 0
    if label_text:
        _, label_height = ctx.get_text_size(label_text.upper(), font_label)

    use_vertical = ctx.width < min_horizontal_width

    content_width = ctx.width - padding * 2
    content_height = ctx.height - padding * 2

    if use_vertical:
        elements: dict[str, int | None] = {}
        elements["value"] = value_height + 4
        elements["bar"] = bar_height
        if label_text:
            elements["label"] = label_height + 4

        boxes = create_vertical_layout(content_width, content_height, elements)
        for box in boxes.values():
            box.x += padding
            box.y += padding
    else:
        header_height = int(content_height * 0.55)
        bar_y = padding + header_height + 4

        header_elements: dict[str, int | None] = {}
        if has_icon:
            header_elements["icon"] = icon_size
        if label_text:
            header_elements["label"] = None
        header_elements["value"] = value_width + 8

        header_boxes = create_horizontal_layout(content_width, header_height, header_elements, justify=JustifyContent.SPACE_BETWEEN)

        boxes = {}
        for name, box in header_boxes.items():
            box.x += padding
            box.y += padding
            boxes[name] = box

        boxes["bar"] = LayoutBox(x=padding, y=bar_y, width=content_width, height=bar_height)

    return use_vertical, boxes


def layout_icon_value_label(
    ctx: RenderContext,
    value_text: str,
    label_text: str | None,
    has_icon: bool,
    min_horizontal_width: int = 80,
) -> tuple[bool, dict[str, LayoutBox]]:
    """Calculate layout for icon + value + label widget."""
    padding = int(ctx.height * 0.08)
    icon_size = max(12, int(ctx.height * 0.30)) if has_icon else 0

    font_value = ctx.get_font("medium", bold=True)
    value_width, _ = ctx.get_text_size(value_text, font_value)

    font_label = ctx.get_font("tiny")
    label_height = 0
    if label_text:
        _, label_height = ctx.get_text_size(label_text.upper(), font_label)

    use_vertical = ctx.width < min_horizontal_width

    content_width = ctx.width - padding * 2
    content_height = ctx.height - padding * 2

    if use_vertical:
        elements: dict[str, int | None] = {}
        if has_icon:
            elements["icon"] = icon_size + 4
        elements["value"] = None
        if label_text:
            elements["label"] = label_height + 4

        boxes = create_vertical_layout(content_width, content_height, elements)
        for box in boxes.values():
            box.x += padding
            box.y += padding
    else:
        elements: dict[str, int | None] = {}
        if has_icon:
            elements["icon"] = icon_size + 4
        if label_text:
            elements["label"] = None
        elements["value"] = value_width + 8

        boxes = create_horizontal_layout(content_width, content_height, elements, justify=JustifyContent.SPACE_BETWEEN)
        for box in boxes.values():
            box.x += padding
            box.y += padding

    return use_vertical, boxes


def layout_centered_stack(
    ctx: RenderContext,
    elements: list[tuple[str, int]],
    gap: int = 4,
) -> dict[str, LayoutBox]:
    """Create vertically centered stack of elements."""
    total_height = sum(h for _, h in elements) + gap * (len(elements) - 1)
    start_y = (ctx.height - total_height) // 2

    result = {}
    current_y = start_y

    for name, height in elements:
        result[name] = LayoutBox(x=0, y=current_y, width=ctx.width, height=height)
        current_y += height + gap

    return result
