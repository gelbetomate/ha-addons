"""Config flow for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import Any

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

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_BRIDGE_URL, default=DEFAULT_BRIDGE_URL): str,
        vol.Required(CONF_SWITCH_ID): str,
        vol.Optional(CONF_NAME): str,
    }
)


class UluxDisplayConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the config flow for u::lux Display."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle the initial user step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            bridge_url = user_input[CONF_BRIDGE_URL].strip().rstrip("/")
            switch_id = user_input[CONF_SWITCH_ID].strip()

            if not bridge_url:
                errors[CONF_BRIDGE_URL] = "invalid_host"
            elif not switch_id:
                errors[CONF_SWITCH_ID] = "invalid_switch_id"
            else:
                unique_id = f"{bridge_url}_{switch_id}"
                await self.async_set_unique_id(unique_id)
                self._abort_if_unique_id_configured()

                title = user_input.get(CONF_NAME) or f"u::lux Display ({switch_id})"
                return self.async_create_entry(
                    title=title,
                    data={
                        CONF_BRIDGE_URL: bridge_url,
                        CONF_SWITCH_ID: switch_id,
                        CONF_NAME: title,
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
        )
