"""Button entities for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
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
    """Set up u::lux Display button entities."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [
        UluxDisplayRefreshButton(coordinator),
        UluxDisplayNextScreenButton(coordinator),
        UluxDisplayPreviousScreenButton(coordinator),
    ]

    async_add_entities(entities)


class UluxDisplayRefreshButton(UluxDisplayEntity, ButtonEntity):
    """Button to force display refresh."""

    _attr_name = "Refresh Display"
    _attr_icon = "mdi:refresh"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "refresh")

    async def async_press(self) -> None:
        await self.coordinator.async_refresh_display()


class UluxDisplayNextScreenButton(UluxDisplayEntity, ButtonEntity):
    """Button to switch to next screen."""

    _attr_name = "Next Screen"
    _attr_icon = "mdi:skip-next"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "next_screen")

    async def async_press(self) -> None:
        await self.coordinator.async_next_screen()


class UluxDisplayPreviousScreenButton(UluxDisplayEntity, ButtonEntity):
    """Button to switch to previous screen."""

    _attr_name = "Previous Screen"
    _attr_icon = "mdi:skip-previous"

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        super().__init__(coordinator, "previous_screen")

    async def async_press(self) -> None:
        await self.coordinator.async_previous_screen()
