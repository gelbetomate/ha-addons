"""Sensor entities for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfInformation
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
    """Set up u::lux Display sensor entities."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [
        UluxDisplayStatusSensor(coordinator),
        UluxDisplayStorageUsedSensor(coordinator),
        UluxDisplayStorageFreeSensor(coordinator),
    ]

    async_add_entities(entities)


class UluxDisplayStatusSensor(UluxDisplayEntity, SensorEntity):
    """Sensor showing device connection status."""

    _attr_name = "Status"
    _attr_icon = "mdi:monitor"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "status")

    @property
    def native_value(self) -> str:
        if self.coordinator.last_update_success:
            return "Connected"
        return "Disconnected"

    @property
    def extra_state_attributes(self) -> dict:
        attrs = {
            "host": self.coordinator.device.host,
            "refresh_interval": self.coordinator.options.get("refresh_interval", 30),
        }

        if self.coordinator.device_state:
            attrs["theme"] = self.coordinator.device_state.theme
            attrs["brightness"] = self.coordinator.device_state.brightness
            attrs["current_image"] = self.coordinator.device_state.current_image

        assigned_views = self.coordinator.options.get("assigned_views", [])
        attrs["assigned_views"] = len(assigned_views)
        attrs["current_screen"] = self.coordinator.current_screen + 1

        return attrs


class UluxDisplayStorageUsedSensor(UluxDisplayEntity, SensorEntity):
    """Sensor showing storage usage percentage."""

    _attr_name = "Storage Used"
    _attr_icon = "mdi:harddisk"
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "storage_used")

    @property
    def native_value(self) -> float | None:
        if self.coordinator.space_info and self.coordinator.space_info.total > 0:
            used = self.coordinator.space_info.total - self.coordinator.space_info.free
            return round((used / self.coordinator.space_info.total) * 100, 1)
        return None


class UluxDisplayStorageFreeSensor(UluxDisplayEntity, SensorEntity):
    """Sensor showing free storage in KB."""

    _attr_name = "Storage Free"
    _attr_icon = "mdi:harddisk"
    _attr_native_unit_of_measurement = UnitOfInformation.KILOBYTES
    _attr_device_class = SensorDeviceClass.DATA_SIZE
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "storage_free")

    @property
    def native_value(self) -> float | None:
        if self.coordinator.space_info:
            return round(self.coordinator.space_info.free / 1024, 1)
        return None
