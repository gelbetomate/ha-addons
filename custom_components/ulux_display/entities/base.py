"""Base entity class for u::lux Display entities."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from ..const import DOMAIN

if TYPE_CHECKING:
    from ..coordinator import UluxDisplayCoordinator


class UluxDisplayEntity(CoordinatorEntity["UluxDisplayCoordinator"]):
    """Base class for u::lux Display entities."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: UluxDisplayCoordinator, entity_suffix: str) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.entry.entry_id}_{entity_suffix}"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device information."""
        return DeviceInfo(
            identifiers={(DOMAIN, self.coordinator.entry.entry_id)},
            name=self.coordinator.entry.title,
            manufacturer="u::lux",
            model="u::lux Display",
        )
