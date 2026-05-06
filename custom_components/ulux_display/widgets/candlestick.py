"""Candlestick chart widget for UluxDisplay displays."""

from __future__ import annotations

import contextlib
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, ClassVar

from ._header import header_height_for, header_mode, render_label_value_header
from .base import Widget, WidgetConfig
from .components import THEME_TEXT_SECONDARY, Color, Component

if TYPE_CHECKING:
    from ..render_context import RenderContext
    from .state import WidgetState


def aggregate_ohlc(
    timestamped_values: list[tuple[float, float]],
    interval_seconds: int,
    candle_count: int,
) -> list[tuple[float, float, float, float]]:
    """Aggregate timestamped values into OHLC candles."""
    if not timestamped_values:
        return []
    end_ts = timestamped_values[-1][0]
    start_ts = end_ts - (candle_count * interval_seconds)
    buckets: list[list[float]] = [[] for _ in range(candle_count)]
    for ts, value in timestamped_values:
        if ts < start_ts:
            continue
        bucket_idx = int((ts - start_ts) / interval_seconds)
        bucket_idx = min(bucket_idx, candle_count - 1)
        if bucket_idx >= 0:
            buckets[bucket_idx].append(value)
    candles: list[tuple[float, float, float, float]] = []
    last_close: float | None = None
    for values in buckets:
        if values:
            last_close = values[0]
            break
    if last_close is None:
        return []
    for ts, value in timestamped_values:
        if ts < start_ts:
            last_close = value
        else:
            break
    for values in buckets:
        if values:
            o = values[0]
            h = max(values)
            low = min(values)
            c = values[-1]
            candles.append((o, h, low, c))
            last_close = c
        else:
            candles.append((last_close, last_close, last_close, last_close))
    return candles


@dataclass
class CandlestickDisplay(Component):
    """Candlestick chart display component."""

    data: list[tuple[float, float, float, float]] = field(default_factory=list)
    label: str | None = None
    current_value: float | None = None
    unit: str = ""
    show_value: bool = True

    def measure(self, ctx: RenderContext, max_width: int, max_height: int) -> tuple[int, int]:
        return (max_width, max_height)

    def render(self, ctx: RenderContext, x: int, y: int, width: int, height: int) -> None:
        """Render candlestick chart with header and candles."""
        font_label = ctx.get_font("small")
        padding = int(width * 0.08)
        inner_w = width - padding * 2
        value_str = (
            f"{self.current_value:.1f}{self.unit}"
            if self.show_value and self.current_value is not None
            else ""
        )
        mode = header_mode(ctx, label=self.label, value=value_str, inner_w=inner_w, height=height)
        _, label_h = ctx.get_text_size("Hg", font_label) if self.label else (0, 0)
        _, value_h = ctx.get_text_size("Hg", ctx.get_font("regular")) if value_str else (0, 0)
        header_height = header_height_for(mode, label_h=label_h, value_h=value_h, height=height)
        footer_height = int(height * 0.04)
        chart_top = y + header_height
        chart_bottom = y + height - footer_height
        chart_left = x + padding
        chart_right = x + width - padding
        chart_height = chart_bottom - chart_top
        chart_width = chart_right - chart_left
        value_color: Color = THEME_TEXT_SECONDARY
        if self.data:
            last = self.data[-1]
            value_color = ctx.theme.success if last[3] >= last[0] else ctx.theme.error
        render_label_value_header(ctx, x, y, width, header_height, mode=mode, label=self.label, value=value_str, value_color=value_color, padding=padding)
        if not self.data:
            ctx.draw_text("No data", (x + width // 2, (chart_top + chart_bottom) // 2), font=font_label, color=THEME_TEXT_SECONDARY, anchor="mm")
            return
        all_highs = [c[1] for c in self.data]
        all_lows = [c[2] for c in self.data]
        data_min = min(all_lows)
        data_max = max(all_highs)
        data_range = data_max - data_min
        if data_range == 0:
            data_range = 1.0
            data_min -= 0.5
            data_max += 0.5
        margin = data_range * 0.05
        data_min -= margin
        data_max += margin
        data_range = data_max - data_min
        num_candles = len(self.data)
        candle_total_width = chart_width / num_candles
        gap = max(1, int(candle_total_width * 0.2))
        candle_body_width = max(1, int(candle_total_width - gap))

        def val_to_y(val: float) -> int:
            return chart_bottom - int((val - data_min) / data_range * chart_height)

        for i, (o, h, low, c) in enumerate(self.data):
            bullish = c >= o
            color = ctx.theme.success if bullish else ctx.theme.error
            candle_x = chart_left + int(i * candle_total_width) + gap // 2
            candle_center_x = candle_x + candle_body_width // 2
            wick_top_y = val_to_y(h)
            wick_bottom_y = val_to_y(low)
            body_top_y = val_to_y(max(o, c))
            body_bottom_y = val_to_y(min(o, c))
            if body_bottom_y <= body_top_y:
                body_bottom_y = body_top_y + 1
            ctx.draw_line([(candle_center_x, wick_top_y), (candle_center_x, wick_bottom_y)], fill=color, width=1)
            ctx.draw_rect((candle_x, body_top_y, candle_x + candle_body_width, body_bottom_y), fill=color)


def extract_timestamped_values(history_states: list) -> list[tuple[float, float]]:
    """Extract (timestamp, value) pairs from recorder history states."""
    timestamped: list[tuple[float, float]] = []
    for state_obj in history_states:
        try:
            state_value = state_obj.state if hasattr(state_obj, "state") else state_obj.get("state")
            ts = (
                state_obj.last_changed.timestamp()
                if hasattr(state_obj, "last_changed")
                else state_obj.get("last_changed", 0)
            )
            if state_value is not None:
                timestamped.append((float(ts), float(state_value)))
        except (ValueError, TypeError, AttributeError):
            continue
    return timestamped


INTERVAL_TO_SECONDS: dict[str, int] = {
    "1 hour": 3600,
    "4 hours": 14400,
    "1 day": 86400,
}


class CandlestickWidget(Widget):
    """Widget that displays a candlestick chart from entity history."""

    WIDGET_TYPE: ClassVar[str] = "candlestick"
    SCHEMA: ClassVar[dict[str, Any]] = {
        "name": "Candlestick Chart",
        "needs_entity": True,
        "entity_domains": None,
        "options": [
            {"key": "candle_interval", "type": "select", "label": "Candle Interval", "options": ["1 hour", "4 hours", "1 day"], "default": "4 hours"},
            {"key": "candle_count", "type": "number", "label": "Number of Candles", "min": 5, "max": 40, "default": 20},
            {"key": "show_value", "type": "boolean", "label": "Show Current Value", "default": True},
        ],
    }

    INTERVAL_TO_HOURS: ClassVar[dict[str, float]] = {
        "1 hour": 1,
        "4 hours": 4,
        "1 day": 24,
    }

    def __init__(self, config: WidgetConfig) -> None:
        """Initialize the candlestick widget."""
        super().__init__(config)
        self.candle_interval: str = config.options.get("candle_interval", "4 hours")
        self.candle_count: int = int(config.options.get("candle_count", 20))
        self.show_value: bool = config.options.get("show_value", True)

    @property
    def hours(self) -> float:
        """Total hours of history needed."""
        interval_hours = self.INTERVAL_TO_HOURS.get(self.candle_interval, 4)
        return interval_hours * self.candle_count

    @property
    def interval_seconds(self) -> int:
        """Candle interval in seconds."""
        return INTERVAL_TO_SECONDS.get(self.candle_interval, 14400)

    def render(self, ctx: RenderContext, state: WidgetState) -> Component:
        """Render the candlestick chart widget."""
        entity = state.entity
        current_value = None
        unit = ""
        label = self.config.label
        if entity is not None:
            with contextlib.suppress(ValueError, TypeError):
                current_value = float(entity.state)
            unit = entity.unit or ""
            if not label:
                label = entity.friendly_name
        return CandlestickDisplay(
            data=list(state.candlestick_data),
            label=label,
            current_value=current_value if self.show_value else None,
            unit=unit,
            show_value=self.show_value,
        )
