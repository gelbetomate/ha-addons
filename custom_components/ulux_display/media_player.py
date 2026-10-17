"""Media player platform for verified u::lux audio playback."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.media_player import (
    MediaPlayerEntity,
    MediaPlayerEntityFeature,
    MediaPlayerState,
    MediaType,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entities.base import UluxDisplayEntity

if TYPE_CHECKING:
    from .coordinator import UluxDisplayCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the u::lux media player."""
    coordinator: UluxDisplayCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([UluxDisplayMediaPlayer(coordinator)])


class UluxDisplayMediaPlayer(UluxDisplayEntity, MediaPlayerEntity):
    """Control verified audio capabilities exposed by the UMP bridge."""

    _attr_name = "Media Player"
    _attr_icon = "mdi:speaker-wireless"
    _attr_supported_features = (
        MediaPlayerEntityFeature.PLAY_MEDIA
        | MediaPlayerEntityFeature.STOP
        | MediaPlayerEntityFeature.VOLUME_SET
    )
    _attr_media_content_type = MediaType.MUSIC

    def __init__(self, coordinator: UluxDisplayCoordinator) -> None:
        """Initialize the media player."""
        super().__init__(coordinator, "media_player")
        self._state = MediaPlayerState.IDLE
        self._volume = 1.0

    @property
    def state(self) -> MediaPlayerState:
        """Return the last commanded playback state."""
        return self._state

    @property
    def volume_level(self) -> float:
        """Return the last commanded volume."""
        return self._volume

    async def async_media_play(self) -> None:
        """Resume playback when the selected media is a local sound."""
        self._state = MediaPlayerState.PLAYING
        self.async_write_ha_state()

    async def async_media_stop(self) -> None:
        """Stop playback on the u::lux."""
        await self.coordinator.device.stop_audio()
        self._state = MediaPlayerState.IDLE
        self.async_write_ha_state()

    async def async_set_volume_level(self, volume: float) -> None:
        """Set the u::lux master volume."""
        self._volume = max(0.0, min(1.0, volume))
        await self.coordinator.device.set_audio_volume(round(self._volume * 100))
        self.async_write_ha_state()

    async def async_play_media(
        self,
        media_type: str,
        media_id: str,
        **kwargs: Any,
    ) -> None:
        """Play a sound stored in the u::lux flash memory.

        The sound:// scheme is deliberately narrow until AudioPlayRemote is
        validated against a captured payload and timing contract.
        """
        del media_type, kwargs
        if not media_id.startswith("sound://"):
            raise ValueError("Only sound://<index> media is currently supported")

        try:
            sound_index = int(media_id.removeprefix("sound://"))
        except ValueError as err:
            raise ValueError("The sound index must be an integer") from err
        if sound_index < 1:
            raise ValueError("The sound index must be greater than zero")

        await self.coordinator.device.play_local_sound(
            sound_index=sound_index,
            volume=round(self._volume * 100),
        )
        self._state = MediaPlayerState.PLAYING
        self._attr_media_content_id = media_id
        self.async_write_ha_state()