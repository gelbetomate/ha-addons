"""Binary sensors for u::lux UMP state flags."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorDeviceClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from ..const import DOMAIN
from .base import UluxDisplayEntity

if TYPE_CHECKING:
    from ..coordinator import UluxDisplayCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary UMP state sensors."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        UluxDisplayMotionSensor(coordinator),
        UluxDisplayProximitySensor(coordinator),
        UluxDisplayLightStateSensor(coordinator),
        UluxDisplayAudioActiveSensor(coordinator),
        UluxDisplayDisplayActiveSensor(coordinator),
        UluxDisplayInputSensor(coordinator, 1),
        UluxDisplayInputSensor(coordinator, 2),
        UluxDisplayErrorSensor(coordinator),
        UluxDisplayKeySensor(coordinator, 1),
        UluxDisplayKeySensor(coordinator, 2),
        UluxDisplayKeySensor(coordinator, 3),
        UluxDisplayKeySensor(coordinator, 4),
    ])


class UluxDisplayStateBinarySensor(UluxDisplayEntity, BinarySensorEntity):
    """Base binary sensor for a decoded UMP state flag."""

    state_key = ""

    def __init__(self, coordinator: UluxDisplayCoordinator, suffix: str) -> None:
        super().__init__(coordinator, suffix)

    @property
    def is_on(self) -> bool | None:
        value = self.coordinator.state_value(self.state_key)
        return value if isinstance(value, bool) else None


class UluxDisplayMotionSensor(UluxDisplayStateBinarySensor):
    state_key = "motion_detector"
    _attr_name = "Motion"
    _attr_icon = "mdi:motion-sensor"
    _attr_device_class = BinarySensorDeviceClass.MOTION

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "motion")


class UluxDisplayProximitySensor(UluxDisplayStateBinarySensor):
    state_key = "proximity_sensor"
    _attr_name = "Proximity"
    _attr_icon = "mdi:signal-distance-variant"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "proximity")


class UluxDisplayLightStateSensor(UluxDisplayStateBinarySensor):
    state_key = "light_sensor"
    _attr_name = "Light State"
    _attr_icon = "mdi:brightness-6"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "light_state")


class UluxDisplayAudioActiveSensor(UluxDisplayStateBinarySensor):
    state_key = "audio_active"
    _attr_name = "Audio Active"
    _attr_icon = "mdi:volume-high"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "audio_active")


class UluxDisplayDisplayActiveSensor(UluxDisplayStateBinarySensor):
    state_key = "display_active"
    _attr_name = "Display Active"
    _attr_icon = "mdi:monitor"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "display_active")


class UluxDisplayInputSensor(UluxDisplayEntity, BinarySensorEntity):
    """One of the two digital IN2 inputs reported by the u::lux."""

    _attr_icon = "mdi:electric-switch"

    def __init__(self, coordinator: UluxDisplayCoordinator, input_number: int) -> None:
        super().__init__(coordinator, f"input_{input_number}")
        self._input_number = input_number
        self._attr_name = f"Input {input_number}"

    @property
    def is_on(self) -> bool | None:
        value = self.coordinator.sensor_value("in2") or {}
        if not isinstance(value, dict):
            return None
        return value.get(f"input{self._input_number}")


class UluxDisplayErrorSensor(UluxDisplayStateBinarySensor):
    """Hardware error flag reported by the u::lux."""

    state_key = "internal_error"
    _attr_name = "Device Error"
    _attr_icon = "mdi:alert-circle"
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "device_error")


class UluxDisplayKeySensor(UluxDisplayEntity, BinarySensorEntity):
    """Event-driven state of one physical u::lux key."""

    _attr_icon = "mdi:gesture-tap-button"

    def __init__(self, coordinator: UluxDisplayCoordinator, key_number: int) -> None:
        super().__init__(coordinator, f"key_{key_number}")
        self._key_number = key_number
        self._attr_name = f"Key {key_number}"

    @property
    def is_on(self) -> bool | None:
        return self.coordinator.key_value(self._key_number)
