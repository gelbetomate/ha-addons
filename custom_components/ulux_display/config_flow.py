"""Config flow for u::lux Display integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant

from .const import (
    CONF_ACTOR_ID,
    CONF_PAGE_ID,
    CONF_SWITCH_IP,
    DEFAULT_ACTOR_ID,
    DEFAULT_PAGE_ID,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_SWITCH_IP): str,
        vol.Optional(CONF_NAME): str,
        vol.Optional(CONF_ACTOR_ID, default=DEFAULT_ACTOR_ID): vol.Coerce(int),
        vol.Optional(CONF_PAGE_ID, default=DEFAULT_PAGE_ID): vol.Coerce(int),
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
            switch_ip = user_input[CONF_SWITCH_IP].strip()
            actor_id = user_input.get(CONF_ACTOR_ID, DEFAULT_ACTOR_ID)
            page_id = user_input.get(CONF_PAGE_ID, DEFAULT_PAGE_ID)

            if not switch_ip:
                errors[CONF_SWITCH_IP] = "invalid_host"
            else:
                unique_id = f"{switch_ip}_{actor_id}_{page_id}"
                await self.async_set_unique_id(unique_id)
                self._abort_if_unique_id_configured()

                title = user_input.get(CONF_NAME) or f"u::lux Display ({switch_ip})"
                return self.async_create_entry(
                    title=title,
                    data={
                        CONF_SWITCH_IP: switch_ip,
                        CONF_ACTOR_ID: actor_id,
                        CONF_PAGE_ID: page_id,
                        CONF_NAME: title,
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
        )
