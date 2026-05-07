"""Config flow for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp
import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant

from .const import (
    CONF_BRIDGE_URL,
    CONF_SWITCH_ID,
    DEFAULT_BRIDGE_URL,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

CONF_ACTION = "action"
ACTION_DISCOVER = "discover"
ACTION_MANUAL = "manual"

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_BRIDGE_URL, default=DEFAULT_BRIDGE_URL): str,
        vol.Required(CONF_ACTION, default=ACTION_DISCOVER): vol.In(
            {
                ACTION_DISCOVER: "Discover devices from bridge",
                ACTION_MANUAL: "Enter switch ID manually",
            }
        ),
    }
)


class UluxDisplayConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the config flow for u::lux Display."""

    VERSION = 1

    def __init__(self) -> None:
        self._bridge_url: str = DEFAULT_BRIDGE_URL
        self._discovered_devices: dict[str, dict[str, Any]] = {}

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle the initial user step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            bridge_url = user_input[CONF_BRIDGE_URL].strip().rstrip("/")
            action = user_input[CONF_ACTION]

            if not bridge_url:
                errors[CONF_BRIDGE_URL] = "invalid_host"
            else:
                self._bridge_url = bridge_url

                if action == ACTION_DISCOVER:
                    return await self.async_step_discover()
                return await self.async_step_manual()

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
        )

    async def async_step_discover(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Discover devices seen by the bridge and let user pick one."""
        errors: dict[str, str] = {}

        if user_input is not None:
            switch_id = user_input[CONF_SWITCH_ID].strip().upper()
            if not switch_id:
                errors[CONF_SWITCH_ID] = "invalid_switch_id"
            else:
                return await self._async_create_switch_entry(
                    bridge_url=self._bridge_url,
                    switch_id=switch_id,
                    name=user_input.get(CONF_NAME),
                )

        try:
            devices = await self._async_fetch_discovered_devices(self._bridge_url)
        except aiohttp.ClientConnectionError:
            errors["base"] = "bridge_unreachable"
            devices = []
        except aiohttp.ClientError:
            errors["base"] = "bridge_error"
            devices = []
        except ValueError:
            errors["base"] = "invalid_response"
            devices = []

        if not devices and not errors:
            errors["base"] = "no_devices_found"

        self._discovered_devices = {d["switch_id"]: d for d in devices if d.get("switch_id")}

        selector = {
            sw_id: f"{sw_id} ({meta.get('ip', 'unknown ip')})"
            for sw_id, meta in self._discovered_devices.items()
        }
        schema = vol.Schema(
            {
                vol.Required(CONF_SWITCH_ID): vol.In(selector) if selector else str,
                vol.Optional(CONF_NAME): str,
            }
        )

        return self.async_show_form(
            step_id="discover",
            data_schema=schema,
            errors=errors,
        )

    async def async_step_manual(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Manually enter a switch ID."""
        errors: dict[str, str] = {}

        if user_input is not None:
            switch_id = user_input[CONF_SWITCH_ID].strip().upper()
            if not switch_id:
                errors[CONF_SWITCH_ID] = "invalid_switch_id"
            else:
                return await self._async_create_switch_entry(
                    bridge_url=self._bridge_url,
                    switch_id=switch_id,
                    name=user_input.get(CONF_NAME),
                )

        return self.async_show_form(
            step_id="manual",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_SWITCH_ID): str,
                    vol.Optional(CONF_NAME): str,
                }
            ),
            errors=errors,
        )

    async def _async_fetch_discovered_devices(self, bridge_url: str) -> list[dict[str, Any]]:
        """Fetch discovered devices from bridge API."""
        url = f"{bridge_url}/api/discovery/devices"
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as response:
                response.raise_for_status()
                data = await response.json()

        devices = data.get("devices")
        if not isinstance(devices, list):
            raise ValueError("Invalid discovery response shape")
        return [d for d in devices if isinstance(d, dict)]

    async def _async_create_switch_entry(
        self,
        bridge_url: str,
        switch_id: str,
        name: str | None,
    ) -> ConfigFlowResult:
        """Create config entry for chosen switch."""
        unique_id = f"{bridge_url}_{switch_id}"
        await self.async_set_unique_id(unique_id)
        self._abort_if_unique_id_configured()

        title = name or f"u::lux Display ({switch_id})"
        return self.async_create_entry(
            title=title,
            data={
                CONF_BRIDGE_URL: bridge_url,
                CONF_SWITCH_ID: switch_id,
                CONF_NAME: title,
            },
        )

    async def async_step_import(self, user_input: dict[str, Any]) -> ConfigFlowResult:
        """Handle entries created by background auto-discovery."""
        bridge_url = str(user_input.get(CONF_BRIDGE_URL, "")).strip().rstrip("/")
        switch_id = str(user_input.get(CONF_SWITCH_ID, "")).strip().upper()
        name = user_input.get(CONF_NAME)

        if not bridge_url or not switch_id:
            return self.async_abort(reason="invalid_switch_id")

        return await self._async_create_switch_entry(bridge_url, switch_id, name)
