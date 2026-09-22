"""u::lux Display integration for Home Assistant."""

from __future__ import annotations

import logging
from datetime import timedelta
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.event import async_track_time_interval

from .const import (
    CONF_BRIDGE_URL,
    CONF_HOST,
    CONF_SWITCH_ID,
    DEFAULT_BRIDGE_URL,
    DOMAIN,
)
from .coordinator import UluxDisplayCoordinator
from .panel import async_register_panel
from .store import UluxDisplayStore
from .ulux_device import UluxDevice
from .websocket import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
HA_DELETE_POLL_INTERVAL = timedelta(seconds=5)

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
    hass.async_create_task(_async_process_pending_deletions(hass))

    async def async_poll_pending_deletions(_now=None) -> None:
        await _async_process_pending_deletions(hass)

    hass.data[DOMAIN]["ha_delete_unsub"] = async_track_time_interval(
        hass, async_poll_pending_deletions, HA_DELETE_POLL_INTERVAL
    )

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


async def _async_process_pending_deletions(hass: HomeAssistant) -> None:
    """Remove HA entries explicitly requested by the bridge UI."""
    entries = hass.config_entries.async_entries(DOMAIN)
    session = async_get_clientsession(hass)
    for entry in entries:
        bridge_url = entry.data.get(CONF_BRIDGE_URL, DEFAULT_BRIDGE_URL).rstrip("/")
        switch_id = str(entry.data.get(CONF_SWITCH_ID, "")).upper()
        try:
            async with session.get(f"{bridge_url}/api/registry/devices", timeout=5) as response:
                if response.status != 200:
                    continue
                payload = await response.json()
            pending = {
                str(device.get("switch_id", "")).upper()
                for device in payload.get("devices", [])
                if device.get("ha_delete_requested")
            }
            if switch_id in pending:
                _LOGGER.info("Removing HA config entry %s requested by bridge", entry.entry_id)
                await hass.config_entries.async_remove(entry.entry_id)
                _LOGGER.info("Removed HA config entry %s for switch %s", entry.entry_id, switch_id)
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Pending deletion check failed for %s: %s", switch_id, err)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up u::lux Display from a config entry."""
    if DOMAIN not in hass.data:
        await async_setup(hass, {})

    bridge_url = entry.data.get(CONF_BRIDGE_URL, DEFAULT_BRIDGE_URL)
    switch_id = entry.data[CONF_SWITCH_ID]
    host = str(entry.data.get(CONF_HOST, "")).strip()

    _LOGGER.debug("Setting up u::lux Display integration for switch %s via bridge %s", switch_id, bridge_url)

    device = UluxDevice(bridge_url=bridge_url, switch_id=switch_id, host=host)

    try:
        session = async_get_clientsession(hass)
        async with session.post(
            f"{bridge_url}/api/registry/devices/{switch_id}/link",
            json={"ha_entry_id": entry.entry_id},
            timeout=5,
        ) as response:
            if response.status not in (200, 201):
                _LOGGER.debug("Bridge link update failed for %s: HTTP %s", switch_id, response.status)
    except Exception as err:  # noqa: BLE001
        _LOGGER.debug("Bridge link update failed for %s: %s", switch_id, err)

    coordinator = UluxDisplayCoordinator(
        hass=hass,
        device=device,
        options=dict(entry.options),
        config_entry=entry,
    )

    _LOGGER.debug("Performing first refresh for switch %s", switch_id)
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    entry.async_on_unload(entry.add_update_listener(async_options_update_listener))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    _LOGGER.info("u::lux Display integration successfully set up for switch %s", switch_id)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    switch_id = entry.data.get(CONF_SWITCH_ID, "unknown")
    _LOGGER.debug("Unloading u::lux Display integration for switch %s", switch_id)

    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok and entry.entry_id in hass.data.get(DOMAIN, {}):
        del hass.data[DOMAIN][entry.entry_id]

    return unload_ok


async def async_options_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    switch_id = entry.data.get(CONF_SWITCH_ID, "unknown")
    _LOGGER.debug("Options updated for u::lux Display device %s", switch_id)
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]
    coordinator.update_options(dict(entry.options))
    await coordinator.async_request_refresh()

    bridge_url = entry.data.get(CONF_BRIDGE_URL, DEFAULT_BRIDGE_URL).rstrip("/")
    switch_id = entry.data.get(CONF_SWITCH_ID, "")
    try:
        session = async_get_clientsession(hass)
        async with session.put(
            f"{bridge_url}/api/registry/devices/{switch_id}",
            json={"mqtt_discovery": bool(entry.options.get("mqtt_discovery", False))},
            timeout=5,
        ) as response:
            if response.status != 200:
                _LOGGER.warning("Failed to update MQTT Discovery setting for %s: HTTP %s", switch_id, response.status)
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Failed to update MQTT Discovery setting for %s: %s", switch_id, err)


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle removal of an entry."""
    bridge_url = entry.data.get(CONF_BRIDGE_URL, DEFAULT_BRIDGE_URL).rstrip("/")
    switch_id = entry.data.get(CONF_SWITCH_ID, "")
    try:
        session = async_get_clientsession(hass)
        await session.delete(f"{bridge_url}/api/registry/devices/{switch_id}", timeout=5)
    except Exception as err:  # noqa: BLE001
        _LOGGER.debug("Failed to remove bridge registry entry for %s: %s", switch_id, err)
