"""u::lux Display integration for Home Assistant."""

from __future__ import annotations

import logging
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.config_entries import SOURCE_IMPORT
from homeassistant.const import CONF_NAME, EVENT_HOMEASSISTANT_STOP, Platform
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

AUTO_DISCOVERY_INTERVAL = timedelta(seconds=30)
DATA_AUTO_DISCOVERY_UNSUB = "auto_discovery_unsub"
DATA_AUTO_DISCOVERY_PENDING = "auto_discovery_pending"

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
    hass.data[DOMAIN][DATA_AUTO_DISCOVERY_PENDING] = set()

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

    async def async_poll_discovery(_now=None) -> None:
        await _async_auto_discover_devices(hass)

    # Run one discovery pass immediately on startup.
    hass.async_create_task(_async_auto_discover_devices(hass))

    # Start periodic bridge polling for auto-discovery of new switches.
    unsub = async_track_time_interval(hass, async_poll_discovery, AUTO_DISCOVERY_INTERVAL)
    hass.data[DOMAIN][DATA_AUTO_DISCOVERY_UNSUB] = unsub

    def _async_stop_discovery(_event) -> None:
        stop_cb = hass.data.get(DOMAIN, {}).get(DATA_AUTO_DISCOVERY_UNSUB)
        if stop_cb:
            stop_cb()

    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, _async_stop_discovery)

    _LOGGER.info("u::lux Display domain setup complete")
    return True


async def _async_auto_discover_devices(hass: HomeAssistant) -> None:
    """Discover switches from bridge endpoints and auto-create entries."""
    domain_data = hass.data.get(DOMAIN, {})
    pending: set[str] = domain_data.get(DATA_AUTO_DISCOVERY_PENDING, set())

    bridge_urls = {DEFAULT_BRIDGE_URL}
    for entry in hass.config_entries.async_entries(DOMAIN):
        url = entry.data.get(CONF_BRIDGE_URL)
        if url:
            bridge_urls.add(str(url).rstrip("/"))

    configured_pairs = {
        f"{entry.data.get(CONF_BRIDGE_URL, DEFAULT_BRIDGE_URL).rstrip('/')}|{entry.data.get(CONF_SWITCH_ID, '').upper()}"
        for entry in hass.config_entries.async_entries(DOMAIN)
    }

    session = async_get_clientsession(hass)
    for bridge_url in bridge_urls:
        try:
            async with session.get(
                f"{bridge_url}/api/discovery/devices",
                timeout=5,
            ) as resp:
                if resp.status != 200:
                    continue
                payload = await resp.json()
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Auto-discovery bridge poll failed for %s: %s", bridge_url, err)
            continue

        devices = payload.get("devices", [])
        if not isinstance(devices, list):
            continue

        for dev in devices:
            if not isinstance(dev, dict):
                continue
            switch_id = str(dev.get("switch_id") or "").strip().upper()
            if not switch_id:
                continue

            pair_key = f"{bridge_url}|{switch_id}"
            if pair_key in configured_pairs or pair_key in pending:
                continue

            pending.add(pair_key)
            try:
                result = await hass.config_entries.flow.async_init(
                    DOMAIN,
                    context={"source": SOURCE_IMPORT},
                    data={
                        CONF_BRIDGE_URL: bridge_url,
                        CONF_SWITCH_ID: switch_id,
                        CONF_NAME: f"u::lux Display ({switch_id})",
                    },
                )
                _LOGGER.info(
                    "Auto-discovery import for switch %s via %s finished with type=%s",
                    switch_id,
                    bridge_url,
                    result.get("type"),
                )
            except Exception as err:  # noqa: BLE001
                _LOGGER.warning(
                    "Auto-discovery import failed for switch %s via %s: %s",
                    switch_id,
                    bridge_url,
                    err,
                )
            finally:
                pending.discard(pair_key)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up u::lux Display from a config entry."""
    if DOMAIN not in hass.data:
        await async_setup(hass, {})

    bridge_url = entry.data.get(CONF_BRIDGE_URL, DEFAULT_BRIDGE_URL)
    switch_id = entry.data[CONF_SWITCH_ID]
    host = str(entry.data.get(CONF_HOST, "")).strip()

    _LOGGER.debug("Setting up u::lux Display integration for switch %s via bridge %s", switch_id, bridge_url)

    device = UluxDevice(bridge_url=bridge_url, switch_id=switch_id, host=host)

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


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle removal of an entry."""
