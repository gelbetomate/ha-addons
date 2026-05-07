"""Image platform for UluxDisplay display preview."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.components.image import ImageEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import CONF_SWITCH_IP, DOMAIN

if TYPE_CHECKING:
    from .coordinator import UluxDisplayCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up UluxDisplay image from a config entry."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([UluxDisplayPreviewImage(hass, coordinator, entry)])


class UluxDisplayPreviewImage(ImageEntity):
    """Image entity showing the UluxDisplay display preview."""

    _attr_has_entity_name = True
    _attr_name = "Display Preview"
    _attr_content_type = "image/png"
    _attr_should_poll = False

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: UluxDisplayCoordinator,
        entry: ConfigEntry,
    ) -> None:
        """Initialize the image entity."""
        super().__init__(hass)
        self.coordinator = coordinator
        self._entry = entry
        self._attr_unique_id = f"{entry.data[CONF_SWITCH_IP]}_preview"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.data[CONF_SWITCH_IP])},
            "name": entry.data.get(CONF_NAME, "u::lux Display"),
            "manufacturer": "u::lux",
            "model": "Display",
        }
        if coordinator.last_image is not None:
            self._attr_image_last_updated = dt_util.utcnow()

    async def async_added_to_hass(self) -> None:
        """Run when entity about to be added to hass."""
        await super().async_added_to_hass()
        self.async_on_remove(self.coordinator.async_add_listener(self._handle_coordinator_update))

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        if self.coordinator.preview_just_updated and self.coordinator.last_image is not None:
            self._attr_image_last_updated = dt_util.utcnow()
            self._cached_image = None
            self.async_write_ha_state()

    async def async_image(self) -> bytes | None:
        """Return the current display preview image."""
        return self.coordinator.last_image

    @property
    def available(self) -> bool:
        """Return True if an image has been generated."""
        return self.coordinator.last_image is not None
