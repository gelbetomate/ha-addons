"""u::lux Display integration for Home Assistant."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr

from .const import (
    CONF_ACTOR_ID,
    CONF_PAGE_ID,
    CONF_SWITCH_IP,
    DEFAULT_ACTOR_ID,
    DEFAULT_PAGE_ID,
    DOMAIN,
)
from .coordinator import UluxDisplayCoordinator
from .panel import async_register_panel
from .store import UluxDisplayStore
from .ulux_device import UluxDevice
from .websocket import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

PLATFORMS: list[Platform] = [
    Platform.IMAGE,
    Platform.NUMBER,
    Platform.SELECT,
    Platform.SENSOR,
    Platform.BUTTON,
    Platform.SWITCH,
]


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the u::lux Display domain."""
    _LOGGER.debug("Setting up u::lux Display domain")

    hass.data.setdefault(DOMAIN, {})

    store = UluxDisplayStore(hass)
    await store.async_load()
    hass.data[DOMAIN]["store"] = store

    async_register_websocket_commands(hass)
    await async_register_panel(hass)

    async def async_handle_notify(call):
        device_ids = call.data.get("device_id")
        if not isinstance(device_ids, list):
            device_ids = [device_ids]
        dev_reg = dr.async_get(hass)
        for device_id in device_ids:
            device = dev_reg.async_get(device_id)
            if not device:
                continue
            for entry_id in device.config_entries:
                if entry_id in hass.data[DOMAIN]:
                    coordinator = hass.data[DOMAIN][entry_id]
                    if isinstance(coordinator, UluxDisplayCoordinator):
                        await coordinator.trigger_notification(call.data)

    hass.services.async_register(DOMAIN, "notify", async_handle_notify)

    _LOGGER.info("u::lux Display domain setup complete")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up u::lux Display from a config entry."""
    if DOMAIN not in hass.data:
        await async_setup(hass, {})

    switch_ip = entry.data[CONF_SWITCH_IP]
    actor_id = entry.data.get(CONF_ACTOR_ID, DEFAULT_ACTOR_ID)
    page_id = entry.data.get(CONF_PAGE_ID, DEFAULT_PAGE_ID)

    _LOGGER.debug("Setting up u::lux Display integration for %s (actor=%s, page=%s)", switch_ip, actor_id, page_id)

    device = UluxDevice(host=switch_ip, actor_id=actor_id, page_id=page_id)

    coordinator = UluxDisplayCoordinator(
        hass=hass,
        device=device,
        options=dict(entry.options),
        config_entry=entry,
    )

    _LOGGER.debug("Performing first refresh for %s", switch_ip)
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    entry.async_on_unload(entry.add_update_listener(async_options_update_listener))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    _LOGGER.info("u::lux Display integration successfully set up for %s", switch_ip)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    switch_ip = entry.data.get(CONF_SWITCH_IP, "unknown")
    _LOGGER.debug("Unloading u::lux Display integration for %s", switch_ip)

    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok and entry.entry_id in hass.data.get(DOMAIN, {}):
        del hass.data[DOMAIN][entry.entry_id]

    return unload_ok


async def async_options_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    switch_ip = entry.data.get(CONF_SWITCH_IP, "unknown")
    _LOGGER.debug("Options updated for u::lux Display device %s", switch_ip)
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]
    coordinator.update_options(dict(entry.options))
    await coordinator.async_request_refresh()


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle removal of an entry."""
