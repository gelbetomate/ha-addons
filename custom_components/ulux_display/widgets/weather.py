"""Weather widget for u::lux Display displays."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any, ClassVar

from ..const import (
    COLOR_CYAN,
    COLOR_GOLD,
)
from ..render_context import SizeCategory, get_size_category
from .base import Widget, WidgetConfig
from .components import (
    THEME_TEXT_PRIMARY,
    THEME_TEXT_SECONDARY,
    Column,
    Component,
    Icon,
    Padding,
    Row,
    Stack,
    Text,
)

if TYPE_CHECKING:
    from ..render_context import RenderContext
    from .state import WidgetState


WEATHER_ICONS = {
    "sunny": "weather-sunny",
    "clear-night": "weather-night",
    "partlycloudy": "weather-partly-cloudy",
    "cloudy": "weather-cloudy",
    "rainy": "weather-rainy",
    "pouring": "weather-pouring",
    "snowy": "weather-snowy",
    "snowy-rainy": "weather-snowy-rainy",
    "fog": "weather-fog",
    "hail": "weather-hail",
    "windy": "weather-windy",
    "windy-variant": "weather-windy-variant",
    "lightning": "weather-lightning",
    "lightning-rainy": "weather-lightning-rainy",
    "exceptional": "alert-circle",
}

WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _parse_forecast_day_name(datetime_str: str, fallback: str) -> str:
    if not datetime_str:
        return fallback
    try:
        dt_str = datetime_str.split("+", 1)[0].split("Z", 1)[0]
        dt = datetime.fromisoformat(dt_str)
        return WEEKDAY_NAMES[dt.weekday()]
    except (ValueError, IndexError):
        if len(datetime_str) >= 3 and datetime_str[:3].isalpha():
            return datetime_str[:3]
        return fallback


@dataclass
class WeatherDisplay(Component):
    """Weather display component."""

    temperature: Any = "--"
    humidity: Any = "--"
    condition: str = "sunny"
    forecast: list[dict] = field(default_factory=list)
    show_forecast: bool = True
    show_humidity: bool = True
    show_high_low: bool = True
    forecast_days: int = 3

    def measure(self, ctx: RenderContext, max_width: int, max_height: int) -> tuple[int, int]:
        return (max_width, max_height)

    def render(self, ctx: RenderContext, x: int, y: int, width: int, height: int) -> None:
        icon_name = WEATHER_ICONS.get(self.condition, "weather-sunny")
        size = get_size_category(height)

        if size in (SizeCategory.MEDIUM, SizeCategory.LARGE) and self.show_forecast:
            component = self._build_full(ctx, width, height, icon_name)
        elif size == SizeCategory.SMALL and self.show_forecast and self.forecast:
            component = self._build_semi_compact(ctx, width, height, icon_name)
        else:
            component = self._build_compact(ctx, width, height, icon_name)

        component.render(ctx, x, y, width, height)

    def _build_full(self, ctx, width, height, icon_name):
        padding = int(width * 0.04)
        icon_size = max(24, int(height * 0.25))
        temp_str = f"{self.temperature}°" if self.temperature != "--" else "--"

        main_weather = Column(
            children=[
                Icon(icon_name, size=icon_size, color=COLOR_GOLD),
                Text(temp_str, font="xlarge", color=THEME_TEXT_PRIMARY),
                Text(
                    self.condition.replace("-", " ").title(),
                    font="small",
                    color=THEME_TEXT_SECONDARY,
                ),
            ],
            gap=int(height * 0.04),
            align="center",
            justify="start",
            padding=padding,
        )

        humidity_row = None
        if self.show_humidity:
            humidity_icon_size = max(8, int(height * 0.07))
            humidity_row = Row(
                children=[
                    Icon("water-percent", size=humidity_icon_size, color=COLOR_CYAN),
                    Text(f"{self.humidity}%", font="tiny", color=COLOR_CYAN, align="start"),
                ],
                gap=4,
                align="center",
                justify="start",
                padding=padding,
            )

        forecast_component = None
        if self.forecast and self.show_forecast:
            forecast_items = self.forecast[: self.forecast_days]
            if forecast_items:
                forecast_icon_size = max(10, int(height * 0.10))
                forecast_columns = []

                for i, day in enumerate(forecast_items):
                    day_condition = day.get("condition", "sunny")
                    day_temp = day.get("temperature", "--")
                    day_temp_low = day.get("templow")
                    day_name = _parse_forecast_day_name(day.get("datetime", ""), f"D{i + 1}")
                    day_icon = WEATHER_ICONS.get(day_condition, "weather-sunny")

                    if self.show_high_low and day_temp_low is not None:
                        temp_str = f"{day_temp}°/{day_temp_low}°"
                    else:
                        temp_str = f"{day_temp}°"

                    forecast_columns.append(
                        Column(
                            children=[
                                Text(day_name.upper(), font="tiny", color=THEME_TEXT_SECONDARY),
                                Icon(day_icon, size=forecast_icon_size, color=THEME_TEXT_SECONDARY),
                                Text(temp_str, font="tiny", color=THEME_TEXT_PRIMARY),
                            ],
                            gap=int(height * 0.02),
                            align="center",
                            justify="center",
                        )
                    )

                forecast_component = Row(
                    children=forecast_columns,
                    gap=0,
                    align="center",
                    justify="space-around",
                    padding=padding,
                )

        if humidity_row and forecast_component:
            return Stack(
                children=[
                    main_weather,
                    Padding(child=humidity_row, top=int(height * 0.35)),
                    Padding(child=forecast_component, top=int(height * 0.72)),
                ]
            )
        if humidity_row:
            return Column(
                children=[main_weather, humidity_row],
                gap=int(height * 0.05),
                align="start",
                justify="start",
            )
        if forecast_component:
            return Column(
                children=[main_weather, forecast_component],
                gap=int(height * 0.10),
                align="center",
                justify="space-between",
            )
        return main_weather

    def _build_semi_compact(self, ctx, width, height, icon_name):
        padding = int(width * 0.04)
        icon_size = max(16, min(28, int(height * 0.28)))
        mini_icon_size = max(10, int(height * 0.12))
        temp_str = f"{self.temperature}°" if self.temperature != "--" else "--"

        top_row = Row(
            children=[
                Icon(icon_name, size=icon_size, color=COLOR_GOLD),
                Text(temp_str, font="large", color=THEME_TEXT_PRIMARY),
            ],
            gap=4,
            align="center",
            justify="center",
        )

        forecast_icons = []
        for day in self.forecast[: min(3, self.forecast_days)]:
            day_condition = day.get("condition", "sunny")
            day_icon = WEATHER_ICONS.get(day_condition, "weather-sunny")
            forecast_icons.append(Icon(day_icon, size=mini_icon_size, color=THEME_TEXT_SECONDARY))

        bottom_row = (
            Row(
                children=forecast_icons,
                gap=int(width * 0.08),
                align="center",
                justify="center",
            )
            if forecast_icons
            else None
        )

        children = [top_row]
        if bottom_row:
            children.append(bottom_row)

        return Column(
            children=children,
            gap=int(height * 0.08),
            padding=padding,
            align="center",
            justify="center",
        )

    def _build_compact(self, ctx, width, height, icon_name):
        padding = int(width * 0.04)
        icon_size = max(16, min(32, int(height * 0.40)))
        temp_str = f"{self.temperature}°" if self.temperature != "--" else "--"

        left_side = Icon(icon_name, size=icon_size, color=COLOR_GOLD)

        right_children = [Text(temp_str, font="large", color=THEME_TEXT_PRIMARY, align="end")]
        if self.show_humidity:
            right_children.append(
                Text(f"{self.humidity}%", font="tiny", color=COLOR_CYAN, align="end")
            )

        right_side = Column(
            children=right_children,
            gap=int(height * 0.08),
            align="end",
            justify="center",
        )

        return Row(
            children=[left_side, right_side],
            gap=padding,
            align="center",
            justify="space-between",
            padding=padding,
        )


def _weather_placeholder() -> Component:
    return Column(
        children=[
            Icon("weather-cloudy", color=THEME_TEXT_SECONDARY, max_size=48),
            Text("No Weather Data", font="small", color=THEME_TEXT_SECONDARY),
        ],
        gap=8,
        align="center",
        justify="center",
    )


class WeatherWidget(Widget):
    """Widget that displays weather information."""

    WIDGET_TYPE: ClassVar[str] = "weather"
    SCHEMA: ClassVar[dict[str, Any]] = {
        "name": "Weather",
        "needs_entity": True,
        "entity_domains": ["weather"],
        "options": [
            {"key": "show_forecast", "type": "boolean", "label": "Show Forecast", "default": True},
            {
                "key": "forecast_days",
                "type": "number",
                "label": "Forecast Days",
                "default": 3,
                "min": 1,
                "max": 5,
            },
            {"key": "show_humidity", "type": "boolean", "label": "Show Humidity", "default": True},
            {"key": "show_high_low", "type": "boolean", "label": "Show High/Low", "default": True},
        ],
    }

    def __init__(self, config: WidgetConfig) -> None:
        super().__init__(config)
        self.show_forecast = config.options.get("show_forecast", True)
        self.forecast_days = config.options.get("forecast_days", 3)
        self.show_humidity = config.options.get("show_humidity", True)
        self.show_wind = config.options.get("show_wind", False)
        self.show_high_low = config.options.get("show_high_low", True)

    def render(self, ctx: RenderContext, state: WidgetState) -> Component:
        entity = state.entity
        if entity is None:
            return _weather_placeholder()

        return WeatherDisplay(
            temperature=entity.get("temperature", "--"),
            humidity=entity.get("humidity", "--"),
            condition=entity.state,
            forecast=state.forecast,
            show_forecast=self.show_forecast,
            show_humidity=self.show_humidity,
            show_high_low=self.show_high_low,
            forecast_days=self.forecast_days,
        )
