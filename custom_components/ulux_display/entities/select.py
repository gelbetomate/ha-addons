"""Select entities for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..const import DOMAIN
from .base import UluxDisplayEntity

if TYPE_CHECKING:
    from ..coordinator import UluxDisplayCoordinator

_LOGGER = logging.getLogger(__name__)

BUILTIN_MODES = {
    "Weather Clock Today": 1,
    "Weather Forecast": 2,
    "Time Style 1": 4,
    "Time Style 2": 5,
    "Time Style 3": 6,
    "Simple Weather Clock": 7,
}

CUSTOM_VIEW_PREFIX = ""


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up u::lux Display select entities."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [
        UluxDisplayDisplaySelect(coordinator),
    ]

    async_add_entities(entities)


class UluxDisplayDisplaySelect(UluxDisplayEntity, SelectEntity):
    """Unified select entity for choosing what to display."""

    _attr_name = "Display"
    _attr_icon = "mdi:monitor"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "display")
        self._last_options: list[str] | None = None

    def _get_custom_view_names(self) -> list[str]:
        store = self.coordinator.get_store()
        if not store:
            return []

        assigned_views = self.coordinator.options.get("assigned_views", [])
        names = []
        for view_id in assigned_views:
            view = store.get_view(view_id)
            if view:
                names.append(view.get("name", view_id))
        return names

    @property
    def options(self) -> list[str]:
        options = list(BUILTIN_MODES.keys())
        options.extend(self._get_custom_view_names())
        return options or ["Clock"]

    @property
    def current_option(self) -> str | None:
        if self.coordinator.display_mode == "builtin":
            theme = self.coordinator.builtin_theme
            for mode_name, mode_theme in BUILTIN_MODES.items():
                if mode_theme == theme:
                    return mode_name
            return "Clock"

        view_names = self._get_custom_view_names()
        if not view_names:
            return "Clock"

        current_idx = self.coordinator.current_screen
        if 0 <= current_idx < len(view_names):
            return view_names[current_idx]

        return view_names[0] if view_names else "Clock"

    async def async_select_option(self, option: str) -> None:
        if option in BUILTIN_MODES:
            theme = BUILTIN_MODES[option]
            _LOGGER.debug("Switching to built-in mode: %s (theme=%d)", option, theme)
            await self.coordinator.device.set_theme(theme)
            self.coordinator.set_display_mode("builtin", theme)
            await self.coordinator.async_request_refresh()
        else:
            view_names = self._get_custom_view_names()
            if option in view_names:
                view_idx = view_names.index(option)
                _LOGGER.debug("Switching to custom view: %s (index=%d)", option, view_idx)
                self.coordinator.set_display_mode("custom", view_idx)
                await self.coordinator.async_refresh_display()

        self.async_write_ha_state()

    def _handle_coordinator_update(self) -> None:
        current_options = self.options
        if self._last_options is None:
            self._last_options = current_options
            self.async_write_ha_state()
        elif current_options != self._last_options:
            self._last_options = current_options
            self.async_write_ha_state()
