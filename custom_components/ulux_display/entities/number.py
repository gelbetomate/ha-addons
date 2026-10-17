"""Number entities for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..const import DOMAIN
from .base import UluxDisplayEntity

if TYPE_CHECKING:
    from ..coordinator import UluxDisplayCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up u::lux Display number entities."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [
        UluxDisplayRefreshIntervalNumber(coordinator),
        UluxDisplayCycleIntervalNumber(coordinator),
        UluxDisplayStreamPageNumber(coordinator),
        UluxDisplayStreamRefreshRateNumber(coordinator),
    ]

    async_add_entities(entities)


class UluxDisplayBrightnessNumber(UluxDisplayEntity, NumberEntity):
    """Number entity for display brightness."""

    _attr_name = "Brightness"
    _attr_icon = "mdi:brightness-6"
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1
    _attr_native_unit_of_measurement = "%"
    _attr_mode = NumberMode.SLIDER

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "brightness")

    @property
    def native_value(self) -> float | None:
        return self.coordinator.device_brightness

    async def async_set_native_value(self, value: float) -> None:
        brightness = int(value)
        await self.coordinator.device.set_brightness(brightness)
        self.coordinator.device_brightness = brightness
        self.async_write_ha_state()


class UluxDisplayRefreshIntervalNumber(UluxDisplayEntity, NumberEntity):
    """Number entity for refresh interval."""

    _attr_name = "Refresh Interval"
    _attr_icon = "mdi:timer-refresh"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min_value = 1
    _attr_native_max_value = 300
    _attr_native_step = 1
    _attr_native_unit_of_measurement = "s"
    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "refresh_interval")

    @property
    def native_value(self) -> float | None:
        return self.coordinator.options.get("refresh_interval", 30)

    async def async_set_native_value(self, value: float) -> None:
        new_options = {**self.coordinator.entry.options, "refresh_interval": int(value)}
        self.hass.config_entries.async_update_entry(self.coordinator.entry, options=new_options)


class UluxDisplayCycleIntervalNumber(UluxDisplayEntity, NumberEntity):
    """Number entity for view cycle interval."""

    _attr_name = "View Cycle Interval"
    _attr_icon = "mdi:view-carousel"
    _attr_native_min_value = 0
    _attr_native_max_value = 300
    _attr_native_step = 5
    _attr_native_unit_of_measurement = "s"
    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "cycle_interval")

    @property
    def native_value(self) -> float | None:
        return self.coordinator.options.get("screen_cycle_interval", 0)

    async def async_set_native_value(self, value: float) -> None:
        new_options = {
            **self.coordinator.entry.options,
            "screen_cycle_interval": int(value),
        }
        self.hass.config_entries.async_update_entry(self.coordinator.entry, options=new_options)


class UluxDisplayStreamPageNumber(UluxDisplayEntity, NumberEntity):
    """Physical u::lux page that activates image streaming; zero disables it."""

    _attr_name = "Stream Page"
    _attr_icon = "mdi:page-next-outline"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min_value = 0
    _attr_native_max_value = 32
    _attr_native_step = 1
    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "stream_page")

    @property
    def native_value(self) -> float:
        return float(self.coordinator.options.get("stream_page", 0))

    async def async_set_native_value(self, value: float) -> None:
        options = {**self.coordinator.entry.options, "stream_page": int(value)}
        self.hass.config_entries.async_update_entry(self.coordinator.entry, options=options)


class UluxDisplayStreamRefreshRateNumber(UluxDisplayEntity, NumberEntity):
    """Maximum rendered stream refresh rate."""

    _attr_name = "Stream Refresh Rate"
    _attr_icon = "mdi:speedometer"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min_value = 0.1
    _attr_native_max_value = 5
    _attr_native_step = 0.1
    _attr_native_unit_of_measurement = "fps"
    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "stream_refresh_rate")

    @property
    def native_value(self) -> float:
        return float(self.coordinator.options.get("stream_refresh_rate", 2))

    async def async_set_native_value(self, value: float) -> None:
        options = {**self.coordinator.entry.options, "stream_refresh_rate": float(value)}
        self.hass.config_entries.async_update_entry(self.coordinator.entry, options=options)
