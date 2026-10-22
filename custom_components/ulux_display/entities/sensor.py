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
        UluxDisplayTemperatureSensor(coordinator),
        UluxDisplayHumiditySensor(coordinator),
        UluxDisplayCO2Sensor(coordinator),
        UluxDisplayVOCSensor(coordinator),
        UluxDisplayIlluminanceSensor(coordinator),
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


class UluxDisplayUmpSensor(UluxDisplayEntity, SensorEntity):
    """Base sensor for a value reported by the UMP bridge."""

    sensor_key = ""

    def __init__(self, coordinator: UluxDisplayCoordinator, suffix: str) -> None:
        super().__init__(coordinator, suffix)

    @property
    def native_value(self) -> float | int | None:
        value = self.coordinator.sensor_value(self.sensor_key)
        return value if isinstance(value, (int, float)) else None


class UluxDisplayTemperatureSensor(UluxDisplayUmpSensor):
    """Ambient temperature reported by the u::lux."""

    sensor_key = "temperature"
    _attr_name = "Temperature"
    _attr_icon = "mdi:thermometer"
    _attr_native_unit_of_measurement = "°C"
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "temperature")


class UluxDisplayHumiditySensor(UluxDisplayUmpSensor):
    """Relative humidity reported by the u::lux."""

    sensor_key = "humidity"
    _attr_name = "Humidity"
    _attr_icon = "mdi:water-percent"
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_device_class = SensorDeviceClass.HUMIDITY
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "humidity")


class UluxDisplayCO2Sensor(UluxDisplayUmpSensor):
    """CO2 concentration reported by the u::lux."""

    sensor_key = "co2"
    _attr_name = "CO2"
    _attr_icon = "mdi:molecule-co2"
    _attr_native_unit_of_measurement = "ppm"
    _attr_device_class = SensorDeviceClass.CO2
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "co2")


class UluxDisplayVOCSensor(UluxDisplayUmpSensor):
    """VOC concentration reported by the u::lux."""

    sensor_key = "voc"
    _attr_name = "VOC"
    _attr_icon = "mdi:air-filter"
    _attr_native_unit_of_measurement = "ppm"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "voc")


class UluxDisplayIlluminanceSensor(UluxDisplayUmpSensor):
    """Ambient light level reported by the u::lux."""

    sensor_key = "lux"
    _attr_name = "Illuminance"
    _attr_icon = "mdi:brightness-5"
    _attr_native_unit_of_measurement = "lx"
    _attr_device_class = SensorDeviceClass.ILLUMINANCE
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "illuminance")
