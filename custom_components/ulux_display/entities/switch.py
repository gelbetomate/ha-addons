"""Switch entities for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..const import CONF_SCREEN_CYCLE_INTERVAL, DOMAIN
from .base import UluxDisplayEntity

if TYPE_CHECKING:
    from ..coordinator import UluxDisplayCoordinator

_LOGGER = logging.getLogger(__name__)

DEFAULT_CYCLE_ON_INTERVAL = 30


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up u::lux Display switch entities."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [
        UluxDisplayActiveSwitch(coordinator),
        UluxDisplayViewCyclingSwitch(coordinator),
    ]

    async_add_entities(entities)


class UluxDisplayActiveSwitch(UluxDisplayEntity, SwitchEntity):
    """Switch to pause/resume the render and upload cycle."""

    _attr_name = "Active"
    _attr_icon = "mdi:monitor"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "active")

    @property
    def is_on(self) -> bool:
        return self.coordinator.is_active

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.coordinator.async_set_active(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.coordinator.async_set_active(False)


class UluxDisplayViewCyclingSwitch(UluxDisplayEntity, SwitchEntity):
    """Switch to enable/disable automatic view cycling."""

    _attr_name = "View Cycling"
    _attr_icon = "mdi:view-carousel"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "view_cycling")
        self._last_interval: int = DEFAULT_CYCLE_ON_INTERVAL

    @property
    def is_on(self) -> bool:
        interval = self.coordinator.options.get(CONF_SCREEN_CYCLE_INTERVAL, 0)
        return interval > 0

    async def async_turn_on(self, **kwargs: Any) -> None:
        current_interval = self.coordinator.options.get(CONF_SCREEN_CYCLE_INTERVAL, 0)
        if current_interval > 0:
            return
        new_interval = self._last_interval
        new_options = {
            **self.coordinator.entry.options,
            CONF_SCREEN_CYCLE_INTERVAL: new_interval,
        }
        self.hass.config_entries.async_update_entry(self.coordinator.entry, options=new_options)
        _LOGGER.debug("View cycling enabled with interval %ds", new_interval)

    async def async_turn_off(self, **kwargs: Any) -> None:
        current_interval = self.coordinator.options.get(CONF_SCREEN_CYCLE_INTERVAL, 0)
        if current_interval == 0:
            return
        self._last_interval = current_interval
        new_options = {
            **self.coordinator.entry.options,
            CONF_SCREEN_CYCLE_INTERVAL: 0,
        }
        self.hass.config_entries.async_update_entry(self.coordinator.entry, options=new_options)
        _LOGGER.debug("View cycling disabled (was %ds)", current_interval)
