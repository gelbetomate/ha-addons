"""u::lux Display integration for Home Assistant."""

from __future__ import annotations

import json
import logging
from datetime import timedelta
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.exceptions import HomeAssistantError

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
    Platform.BINARY_SENSOR,
    Platform.IMAGE,
    Platform.MEDIA_PLAYER,
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

    def event_matches_entry(entry, event_data: dict) -> bool:
        """Match bridge events by stable switch ID or fallback device IP."""
        switch_id = str(event_data.get("switch_id", "")).upper()
        event_ip = str(event_data.get("ip", ""))
        return (
            switch_id == str(entry.data.get(CONF_SWITCH_ID, "")).upper()
            or (event_ip and event_ip == str(entry.data.get(CONF_HOST, "")))
        )

    async def async_handle_page_event(event) -> None:
        """Activate page-bound streaming when the bridge reports a page change."""
        event_data = event.data
        switch_id = str(event_data.get("switch_id", "")).upper()
        page_number = event_data.get("page_number")
        if not switch_id or page_number is None:
            return
        for entry in hass.config_entries.async_entries(DOMAIN):
            if not event_matches_entry(entry, event_data):
                continue
            coordinator = hass.data[DOMAIN].get(entry.entry_id)
            if isinstance(coordinator, UluxDisplayCoordinator):
                await coordinator.async_handle_device_page(int(page_number))

    hass.data[DOMAIN]["page_event_unsub"] = hass.bus.async_listen(
        "ulux_page", async_handle_page_event
    )

    async def async_handle_sensor_event(event) -> None:
        """Apply a bridge UMP sensor event without waiting for polling."""
        data = event.data
        switch_id = str(data.get("switch_id", "")).upper()
        sensor_type = data.get("sensor_type")
        if not switch_id or not sensor_type:
            return
        for entry in hass.config_entries.async_entries(DOMAIN):
            if not event_matches_entry(entry, data):
                continue
            coordinator = hass.data[DOMAIN].get(entry.entry_id)
            if isinstance(coordinator, UluxDisplayCoordinator):
                coordinator.handle_sensor_event(
                    str(sensor_type), data.get("value"), bool(data.get("valid"))
                )

    async def async_handle_state_event(event) -> None:
        """Apply a bridge UMP state event without waiting for polling."""
        data = event.data
        switch_id = str(data.get("switch_id", "")).upper()
        decoded = data.get("decoded")
        if not switch_id:
            return
        for entry in hass.config_entries.async_entries(DOMAIN):
            if not event_matches_entry(entry, data):
                continue
            coordinator = hass.data[DOMAIN].get(entry.entry_id)
            if isinstance(coordinator, UluxDisplayCoordinator):
                if data.get("key_state_raw") is not None:
                    coordinator.handle_key_snapshot(int(data["key_state_raw"]))
                if isinstance(decoded, dict):
                    coordinator.handle_state_event(decoded)

    async def async_handle_key_event(event) -> None:
        """Apply a physical u::lux key edge immediately."""
        data = event.data
        switch_id = str(data.get("switch_id", "")).upper()
        key = data.get("key")
        action = data.get("action")
        if not switch_id or key is None or action not in ("pressed", "released"):
            return
        for entry in hass.config_entries.async_entries(DOMAIN):
            if not event_matches_entry(entry, data):
                continue
            coordinator = hass.data[DOMAIN].get(entry.entry_id)
            if isinstance(coordinator, UluxDisplayCoordinator):
                coordinator.handle_key_event(int(key), action)

    async def async_handle_led_event(event) -> None:
        """Apply an inbound u::lux LED status event immediately."""
        data = event.data
        switch_id = str(data.get("switch_id", "")).upper()
        leds = data.get("leds")
        if not switch_id or not isinstance(leds, list):
            return
        for entry in hass.config_entries.async_entries(DOMAIN):
            if not event_matches_entry(entry, data):
                continue
            coordinator = hass.data[DOMAIN].get(entry.entry_id)
            if isinstance(coordinator, UluxDisplayCoordinator):
                coordinator.handle_led_event(leds)

    hass.data[DOMAIN]["sensor_event_unsub"] = hass.bus.async_listen(
        "ulux_sensor", async_handle_sensor_event
    )
    hass.data[DOMAIN]["state_event_unsub"] = hass.bus.async_listen(
        "ulux_state", async_handle_state_event
    )
    hass.data[DOMAIN]["key_snapshot_event_unsub"] = hass.bus.async_listen(
        "ulux_event", async_handle_state_event
    )
    hass.data[DOMAIN]["key_event_unsub"] = hass.bus.async_listen(
        "ulux_key", async_handle_key_event
    )
    hass.data[DOMAIN]["led_event_unsub"] = hass.bus.async_listen(
        "ulux_led", async_handle_led_event
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

    async def async_handle_configure_audio(call) -> None:
        """Configure microphone and speaker transport for selected devices."""
        device_ids = call.data.get("device_id")
        if not isinstance(device_ids, list):
            device_ids = [device_ids]
        dev_reg = dr.async_get(hass)
        for device_id in device_ids:
            device = dev_reg.async_get(device_id)
            if not device:
                continue
            for entry_id in device.config_entries:
                coordinator = hass.data[DOMAIN].get(entry_id)
                if not isinstance(coordinator, UluxDisplayCoordinator):
                    continue
                await coordinator.device.configure_audio(
                    target_ip=call.data["target_ip"],
                    mic_on=call.data.get("mic_on", False),
                    mic_gain=call.data.get("mic_gain", 0),
                    speaker_on=call.data.get("speaker_on", True),
                    speaker_volume=call.data.get("speaker_volume", 100),
                    target_port=call.data.get("target_port", 35000),
                )

    hass.services.async_register(DOMAIN, "configure_audio", async_handle_configure_audio)

    def coordinators_for_call(call):
        """Return configured u::lux coordinators targeted by a service call."""
        device_ids = call.data.get("device_id")
        if not isinstance(device_ids, list):
            device_ids = [device_ids]
        dev_reg = dr.async_get(hass)
        coordinators = []
        for device_id in device_ids:
            device = dev_reg.async_get(device_id)
            if not device:
                continue
            for entry_id in device.config_entries:
                coordinator = hass.data[DOMAIN].get(entry_id)
                if isinstance(coordinator, UluxDisplayCoordinator) and coordinator not in coordinators:
                    coordinators.append(coordinator)
        return coordinators

    async def async_handle_play_sound(call) -> None:
        for coordinator in coordinators_for_call(call):
            await coordinator.device.play_local_sound(
                sound_index=int(call.data.get("sound_index", 1)),
                volume=int(call.data.get("volume", 100)),
            )

    async def async_handle_set_volume(call) -> None:
        for coordinator in coordinators_for_call(call):
            await coordinator.device.set_audio_volume(int(call.data["volume"]))

    async def async_handle_set_page(call) -> None:
        for coordinator in coordinators_for_call(call):
            await coordinator.device.set_page(int(call.data["page_index"]))

    async def async_handle_set_active(call) -> None:
        for coordinator in coordinators_for_call(call):
            await coordinator.device.set_active(bool(call.data["active"]))

    async def async_handle_set_led(call) -> None:
        leds = call.data.get("leds", [])
        if isinstance(leds, str):
            try:
                leds = json.loads(leds)
            except json.JSONDecodeError as err:
                raise HomeAssistantError("leds must be a JSON list") from err
        if not isinstance(leds, list) or len(leds) > 4 or not all(isinstance(item, dict) for item in leds):
            raise HomeAssistantError("leds must be a list of up to four LED objects")
        for coordinator in coordinators_for_call(call):
            await coordinator.device.set_leds(int(call.data.get("actor_id", 1)), leds)

    async def async_handle_set_text(call) -> None:
        color = call.data.get("color")
        if color is not None and not isinstance(color, dict):
            raise HomeAssistantError("color must be an object with r, g, and b values")
        for coordinator in coordinators_for_call(call):
            await coordinator.device.set_text(
                actor_id=int(call.data.get("actor_id", 1)),
                text_id=int(call.data.get("text_id", 0)),
                text=str(call.data.get("text", "")),
                color=color,
                visible=bool(call.data.get("visible", True)),
                remove=bool(call.data.get("remove", False)),
            )

    hass.services.async_register(DOMAIN, "play_sound", async_handle_play_sound)
    hass.services.async_register(DOMAIN, "set_volume", async_handle_set_volume)
    hass.services.async_register(DOMAIN, "set_page", async_handle_set_page)
    hass.services.async_register(DOMAIN, "set_active", async_handle_set_active)
    hass.services.async_register(DOMAIN, "set_led", async_handle_set_led)
    hass.services.async_register(DOMAIN, "set_text", async_handle_set_text)

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
            async with session.get(f"{bridge_url}/api/registry/pending-deletions", timeout=5) as response:
                if response.status != 200:
                    continue
                payload = await response.json()
            pending = {str(device.get("switch_id", "")).upper() for device in payload.get("devices", [])}
            if switch_id in pending:
                _LOGGER.info("Removing HA config entry %s requested by bridge", entry.entry_id)
                await hass.config_entries.async_remove(entry.entry_id)
                _LOGGER.info("Removed HA config entry %s for switch %s", entry.entry_id, switch_id)
                await session.delete(
                    f"{bridge_url}/api/registry/pending-deletions/{switch_id}",
                    timeout=5,
                )
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

    await coordinator.async_load_registry()

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
        async with session.post(
            f"{bridge_url}/api/registry/devices/{switch_id}/unlink",
            timeout=5,
        ) as response:
            if response.status not in (200, 404):
                _LOGGER.warning(
                    "Failed to unlink bridge registry entry for %s: HTTP %s",
                    switch_id,
                    response.status,
                )
    except Exception as err:  # noqa: BLE001
        _LOGGER.debug("Failed to unlink bridge registry entry for %s: %s", switch_id, err)
