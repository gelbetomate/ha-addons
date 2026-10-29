"""Date/time entity widget for u::lux displays."""

from __future__ import annotations

from typing import Any, ClassVar

from homeassistant.util import dt as dt_util

from .entity import EntityWidget


class DateTimeWidget(EntityWidget):
    """Entity widget specialized for timestamp-valued entities."""

    WIDGET_TYPE: ClassVar[str] = "datetime"
    DEFAULT_TIMESTAMP_FORMAT: ClassVar[str] = "relative"
    SCHEMA: ClassVar[dict[str, Any]] = {
        "name": "Date / Time",
        "needs_entity": True,
        "entity_domains": None,
        "options": [
            {"key": "show_name", "type": "boolean", "label": "Show Name", "default": True},
            {"key": "show_icon", "type": "boolean", "label": "Show Icon", "default": True},
            {"key": "icon", "type": "icon", "label": "Icon Override"},
            {"key": "attribute", "type": "text", "label": "Entity Attribute"},
            {
                "key": "timestamp_format",
                "type": "select",
                "label": "Format",
                "options": ["relative", "time", "date", "datetime", "custom", "default"],
                "default": "relative",
            },
            {"key": "timestamp_custom_format", "type": "text", "label": "Custom Format", "placeholder": "%H:%M"},
        ],
    }

    def __init__(self, config) -> None:
        """Initialize the date/time widget."""
        super().__init__(config)
        self.timestamp_format = config.options.get("timestamp_format", self.DEFAULT_TIMESTAMP_FORMAT)
        self.timestamp_custom_format = config.options.get("timestamp_custom_format", "%H:%M")

    def _format_timestamp(self, value: str) -> str:
        """Format an ISO timestamp while leaving non-timestamps unchanged."""
        if self.timestamp_format == "default":
            return value
        parsed = dt_util.parse_datetime(value)
        if parsed is None:
            return value
        parsed = dt_util.as_local(parsed)
        if self.timestamp_format == "time":
            return parsed.strftime("%H:%M")
        if self.timestamp_format == "date":
            return parsed.strftime("%d.%m.%Y")
        if self.timestamp_format == "datetime":
            return parsed.strftime("%d.%m. %H:%M")
        if self.timestamp_format == "custom":
            return parsed.strftime(self.timestamp_custom_format)
        return dt_util.as_local(parsed).strftime("%d.%m. %H:%M")

    def render(self, ctx, state):
        """Render the timestamp using the existing EntityWidget layout."""
        entity = state.entity
        if entity is not None:
            value = entity.get(self.attribute) if self.attribute else entity.state
            if isinstance(value, str):
                formatted = self._format_timestamp(value)
                if formatted != value:
                    from dataclasses import replace

                    if self.attribute:
                        attributes = {**entity.attributes, self.attribute: formatted}
                        entity = replace(entity, attributes=attributes)
                    else:
                        entity = replace(entity, state=formatted)
                    state = replace(state, entity=entity)
        return super().render(ctx, state)