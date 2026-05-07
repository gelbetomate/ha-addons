"""Deprecated camera platform - replaced by image platform."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up u::lux Display camera from a config entry (deprecated stub)."""
    _LOGGER.warning(
        "u::lux Display camera platform is deprecated. "
        "Please remove and re-add the integration to use the new image entity."
    )
