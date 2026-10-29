"""Gauge widget for UluxDisplay displays."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, ClassVar

from ..const import COLOR_DARK_GRAY
from .base import Widget, WidgetConfig
from .component_helpers import ArcGauge, BarGauge, RingGauge
from .components import Component
from .helpers import calculate_percent, format_value_with_unit

if TYPE_CHECKING:
    from ..render_context import RenderContext
    from .state import EntityState, WidgetState


def _extract_numeric(entity: EntityState | None, attribute: str | None = None) -> float:
    """Extract numeric value from entity state."""
    if entity is None:
        return 0.0
    value = entity.get(attribute) if attribute else entity.state
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def _resolve_label(config: WidgetConfig, entity: EntityState | None) -> str:
    """Get label from config or entity friendly_name."""
    if config.label:
        return config.label
    if entity:
        return entity.friendly_name
    return ""


class GaugeWidget(Widget):
    """Widget that displays a value as a gauge (bar or ring)."""

    WIDGET_TYPE: ClassVar[str] = "gauge"
    SCHEMA: ClassVar[dict[str, Any]] = {
        "name": "Gauge",
        "needs_entity": True,
        "entity_domains": None,
        "options": [
            {"key": "style", "type": "select", "label": "Style", "options": ["bar", "ring", "arc"], "default": "bar"},
            {"key": "min", "type": "number", "label": "Minimum", "default": 0},
            {"key": "max", "type": "number", "label": "Maximum", "default": 100},
            {"key": "unit", "type": "text", "label": "Unit Override"},
            {"key": "show_value", "type": "boolean", "label": "Show Value", "default": True},
            {"key": "icon", "type": "icon", "label": "Icon"},
            {"key": "attribute", "type": "text", "label": "Entity Attribute"},
            {"key": "color_thresholds", "type": "thresholds", "label": "Color Thresholds"},
        ],
    }

    def __init__(self, config: WidgetConfig) -> None:
        """Initialize the gauge widget."""
        super().__init__(config)
        self.style = config.options.get("style", "bar")
        self.min_value = config.options.get("min", 0)
        self.max_value = config.options.get("max", 100)
        self.icon = config.options.get("icon")
        self.show_value = config.options.get("show_value", True)
        self.unit = config.options.get("unit", "")
        self.attribute = config.options.get("attribute")
        self.color_thresholds = config.options.get("color_thresholds", [])

    def _get_threshold_color(self, value: float) -> tuple[int, int, int] | None:
        """Get color based on value and thresholds."""
        if not self.color_thresholds:
            return None
        sorted_thresholds = sorted(self.color_thresholds, key=lambda t: t.get("value", 0))
        matching_color = None
        for threshold in sorted_thresholds:
            threshold_value = threshold.get("value", 0)
            threshold_color = threshold.get("color")
            if value >= threshold_value and threshold_color:
                matching_color = tuple(threshold_color)
        return matching_color  # type: ignore[return-value]

    def render(self, ctx: RenderContext, state: WidgetState) -> Component:
        """Render the gauge widget."""
        entity = state.entity
        value = _extract_numeric(entity, self.attribute)
        display_value = f"{value:.0f}" if entity is not None else "--"
        unit = self.unit
        if not unit and entity is not None:
            unit = entity.unit or ""
        percent = calculate_percent(value, self.min_value, self.max_value)
        name = _resolve_label(self.config, entity)
        threshold_color = self._get_threshold_color(value)
        color = threshold_color or self.config.color or ctx.theme.get_accent_color(self.config.slot)
        value_text = format_value_with_unit(display_value, unit) if self.show_value else ""

        if self.style == "ring":
            return RingGauge(percent=percent, value=value_text, label=name, color=color, background=COLOR_DARK_GRAY)
        if self.style == "arc":
            return ArcGauge(percent=percent, value=value_text, label=name, color=color, background=COLOR_DARK_GRAY)
        return BarGauge(percent=percent, value=value_text, label=name, color=color, icon=self.icon, background=COLOR_DARK_GRAY)
