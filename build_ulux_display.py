#!/usr/bin/env python3
"""Build script for the ulux_display HA integration."""
from __future__ import annotations

import base64
import os
import subprocess

TARGET = "/home/runner/work/ha-addons/ha-addons/custom_components/ulux_display"
REPO = "adrienbrault/geekmagic-hacs"
SRC = "custom_components/geekmagic"


def rename(s: str) -> str:
    """Apply all rename rules."""
    s = s.replace('"GeekMagic Display"', '"u::lux Display"')
    s = s.replace("'GeekMagic Display'", "'u::lux Display'")
    s = s.replace("GeekMagic Display", "u::lux Display")
    s = s.replace("GEEKMAGIC", "ULUX_DISPLAY")
    s = s.replace("GeekMagic", "UluxDisplay")
    s = s.replace("geekmagic", "ulux_display")
    return s


def gh_fetch(path: str) -> str:
    """Fetch file content from GitHub via gh cli."""
    result = subprocess.run(
        ["gh", "api", f"repos/{REPO}/contents/{SRC}/{path}", "--jq", ".content"],
        capture_output=True, text=True, check=True,
    )
    return base64.b64decode(result.stdout.strip()).decode("utf-8")


def read_tmp(path: str) -> str:
    """Read a /tmp file, stripping the 'successfully downloaded' header."""
    with open(path) as f:
        content = f.read()
    if content.startswith("successfully downloaded"):
        content = content[content.index("\n") + 1:]
    return content


def write_file(relpath: str, content: str) -> None:
    """Write content to target path, creating directories as needed."""
    full_path = os.path.join(TARGET, relpath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)
    print(f"  Created: {relpath}")


# ── Create directory structure ────────────────────────────────────────────────
os.makedirs(TARGET, exist_ok=True)
for d in ("layouts", "widgets", "entities", "fonts"):
    os.makedirs(os.path.join(TARGET, d), exist_ok=True)

# ── Simple files: fetch from GitHub and apply renames ────────────────────────
simple_files = [
    "layouts/__init__.py", "layouts/base.py", "layouts/corner_hero.py",
    "layouts/fullscreen.py", "layouts/grid.py", "layouts/hero.py",
    "layouts/hero_simple.py", "layouts/sidebar.py", "layouts/split.py",
    "widgets/__init__.py", "widgets/_flex.py", "widgets/_header.py",
    "widgets/attribute_list.py", "widgets/base.py", "widgets/camera.py",
    "widgets/candlestick.py", "widgets/chart.py", "widgets/climate.py",
    "widgets/clock.py", "widgets/component_helpers.py",
    "widgets/entity.py", "widgets/flex_layout.py", "widgets/gauge.py",
    "widgets/icon.py", "widgets/media.py", "widgets/progress.py",
    "widgets/state.py", "widgets/status.py", "widgets/text.py",
    "widgets/theme.py", "widgets/weather.py",
    "entities/__init__.py", "entities/base.py",
    "button.py", "camera.py", "number.py", "switch.py",
    "services.yaml", "strings.json",
]
pass  # simple_files are written separately via MCP-fetched content

# ── Large files from /tmp ─────────────────────────────────────────────────────
# coordinator.py — needs targeted modifications too
coord_raw = read_tmp("/tmp/1778085768132-copilot-tool-output-j2ssm3.txt")
coord = rename(coord_raw)
# Fix device import (rename turns GeekMagicDevice → UluxDisplayDevice)
coord = coord.replace(
    "from .device import DeviceState, UluxDisplayDevice, SpaceInfo",
    "from .ulux_device import UluxDevice, DeviceState, SpaceInfo",
)
# Remove unavailable constants from the const import block
for token in ("    CONF_DISPLAY_ROTATION,\n", "    CONF_JPEG_QUALITY,\n",
               "    DEFAULT_DISPLAY_ROTATION,\n", "    DEFAULT_JPEG_QUALITY,\n",
               "    MODEL_PRO,\n"):
    coord = coord.replace(token, "")
# Fix type hint: UluxDisplayDevice → UluxDevice
coord = coord.replace("device: UluxDisplayDevice,", "device: UluxDevice,")
coord = coord.replace("UluxDisplayDevice", "UluxDevice")
# Replace _render_display return (JPEG+PNG tuple → PNG only)
coord = coord.replace(
    "        # Encode to both formats\n"
    "        jpeg_quality = self.options.get(CONF_JPEG_QUALITY, DEFAULT_JPEG_QUALITY)\n"
    "        rotation = self.options.get(CONF_DISPLAY_ROTATION, DEFAULT_DISPLAY_ROTATION)\n"
    "        jpeg_data = self.renderer.to_jpeg(img, quality=jpeg_quality, rotation=rotation)\n"
    "        png_data = self.renderer.to_png(img, rotation=rotation)\n\n"
    "        return jpeg_data, png_data",
    "        png_data = self.renderer.to_png(img)\n\n"
    "        return png_data",
)
# Fix tuple unpack in async update
coord = coord.replace(
    "            jpeg_data, png_data = await self.hass.async_add_executor_job(self._render_display)",
    "            png_data = await self.hass.async_add_executor_job(self._render_display)",
)
# Fix debug log after render
coord = coord.replace(
    '            _LOGGER.debug(\n'
    '                "Rendered image: JPEG=%d bytes, PNG=%d bytes",\n'
    '                len(jpeg_data),\n'
    '                len(png_data),\n'
    '            )',
    '            _LOGGER.debug("Rendered image: PNG=%d bytes", len(png_data))',
)
# Fix upload call
coord = coord.replace(
    '            await self.device.upload_and_display(jpeg_data, "dashboard.jpg")',
    "            await self.device.send_image(png_data)",
)
# Fix size log (jpeg_data → png_data)
coord = coord.replace(
    '                "Display update completed: screen=%s, size=%.1fKB",\n'
    '                self.current_screen_name,\n'
    '                len(jpeg_data) / 1024,',
    '                "Display update completed: screen=%s, size=%.1fKB",\n'
    '                self.current_screen_name,\n'
    '                len(png_data) / 1024,',
)
# Remove MODEL_PRO checks (navigate_next/previous after theme change)
coord = coord.replace(
    "            # For Pro devices, also trigger device navigation to help refresh\n"
    "            if self.device.model == MODEL_PRO:\n"
    "                with contextlib.suppress(Exception):\n"
    "                    await self.device.navigate_next()\n",
    "",
)
coord = coord.replace(
    "            # For Pro devices, also trigger device navigation to help refresh\n"
    "            if self.device.model == MODEL_PRO:\n"
    "                with contextlib.suppress(Exception):\n"
    "                    await self.device.navigate_previous()\n",
    "",
)
# Remove set_theme_custom call (HTTP-only feature)
coord = coord.replace(
    "                await self.device.set_theme_custom()\n",
    "",
)
write_file("coordinator.py", coord)

# renderer.py — apply renames, fix DEFAULT_JPEG_QUALITY import, add font warning
renderer_raw = read_tmp("/tmp/1778085768041-copilot-tool-output-wqw0sw.txt")
renderer = rename(renderer_raw)
# DEFAULT_JPEG_QUALITY removed from const — define locally in renderer
renderer = renderer.replace(
    "    DEFAULT_JPEG_QUALITY,\n",
    "",
)
# Add local DEFAULT_JPEG_QUALITY constant after the DISPLAY_WIDTH import
renderer = renderer.replace(
    "from .icons import get_mdi_char",
    "from .icons import get_mdi_char\n\nDEFAULT_JPEG_QUALITY = 92  # High quality JPEG default",
)
# Add import logging and warning for missing MDI font
renderer = renderer.replace(
    "from __future__ import annotations\n\nimport math\n",
    "from __future__ import annotations\n\nimport logging\nimport math\n",
)
renderer = renderer.replace(
    "from pathlib import Path\n",
    "from pathlib import Path\nimport warnings\n",
)
# Add font warning in _load_mdi_font
renderer = renderer.replace(
    "def _load_mdi_font(size: int) -> FreeTypeFont | ImageFont.ImageFont:\n"
    '    """Load MDI icon font at specified size.\n'
    "\n"
    "    Args:\n"
    "        size: Font size in pixels\n"
    "\n"
    "    Returns:\n"
    "        Loaded MDI font or default font\n"
    '    """\n'
    "    try:\n"
    "        return ImageFont.truetype(str(_MDI_FONT), size)\n"
    "    except OSError:\n"
    "        return ImageFont.load_default()",
    "def _load_mdi_font(size: int) -> FreeTypeFont | ImageFont.ImageFont:\n"
    '    """Load MDI icon font at specified size.\n'
    "\n"
    "    Args:\n"
    "        size: Font size in pixels\n"
    "\n"
    "    Returns:\n"
    "        Loaded MDI font or default font\n"
    '    """\n'
    "    if not _MDI_FONT.exists():\n"
    "        warnings.warn(\n"
    '            f"MDI icon font not found at {_MDI_FONT}. Icons will render as boxes. "\n'
    '            f"See {_FONTS_DIR / \'README.md\'} for installation instructions.",\n'
    "            stacklevel=2,\n"
    "        )\n"
    "        return ImageFont.load_default()\n"
    "    try:\n"
    "        return ImageFont.truetype(str(_MDI_FONT), size)\n"
    "    except OSError:\n"
    "        return ImageFont.load_default()",
)
write_file("renderer.py", renderer)

# websocket.py — apply renames only
websocket = rename(read_tmp("/tmp/1778085768034-copilot-tool-output-2e9i0g.txt"))
write_file("websocket.py", websocket)

# widgets/components.py — apply renames only
write_file("widgets/components.py", rename(read_tmp("/tmp/1778085654440-copilot-tool-output-z2akn0.txt")))

# widgets/helpers.py — apply renames only
write_file("widgets/helpers.py", rename(read_tmp("/tmp/1778085654428-copilot-tool-output-m1d9so.txt")))

# icons.py — apply renames only
write_file("icons.py", rename(read_tmp("/tmp/1778085666121-copilot-tool-output-kf24ec.txt")))

# render_context.py — apply renames only
write_file("render_context.py", rename(read_tmp("/tmp/1778085665912-copilot-tool-output-9agfhz.txt")))

# ── Files with inline content (fetched earlier in this session) ───────────────

# store.py — apply renames
STORE_PY = rename('''"""Global view storage for GeekMagic integration.

Views are stored centrally and can be assigned to multiple devices.
Uses Home Assistant\'s built-in Store class for persistence.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any
from uuid import uuid4

if TYPE_CHECKING:
    from collections.abc import Callable

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, LAYOUT_GRID_2X2, THEME_CLASSIC

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY = f"{DOMAIN}.views"
STORAGE_VERSION = 1


class GeekMagicStore:
    """Store for global views shared across all GeekMagic devices."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store.

        Args:
            hass: Home Assistant instance
        """
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, Any] = {"views": {}}
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        """Load stored data from disk."""
        data = await self._store.async_load()
        if data:
            self._data = data
            _LOGGER.debug("Loaded %d views from storage", len(self.views))
        else:
            _LOGGER.debug("No existing views in storage, starting fresh")

    async def async_save(self) -> None:
        """Save current data to disk."""
        await self._store.async_save(self._data)
        self._notify_listeners()

    def _notify_listeners(self) -> None:
        """Notify all listeners of data change."""
        for listener in self._listeners:
            try:
                listener()
            except Exception:
                _LOGGER.exception("Error notifying store listener")

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Add a listener for store updates.

        Args:
            listener: Callback to invoke on updates

        Returns:
            Function to remove the listener
        """
        self._listeners.append(listener)

        def remove_listener() -> None:
            self._listeners.remove(listener)

        return remove_listener

    @property
    def views(self) -> dict[str, dict[str, Any]]:
        """Get all views."""
        return self._data.get("views", {})

    def get_view(self, view_id: str) -> dict[str, Any] | None:
        """Get a specific view by ID."""
        return self.views.get(view_id)

    def get_views_list(self) -> list[dict[str, Any]]:
        """Get all views as a list, sorted by name."""
        views = list(self.views.values())
        views.sort(key=lambda v: v.get("name", "").lower())
        return views

    async def async_create_view(
        self,
        name: str,
        layout: str = LAYOUT_GRID_2X2,
        theme: str = THEME_CLASSIC,
        widgets: list[dict[str, Any]] | None = None,
    ) -> str:
        """Create a new view."""
        view_id = f"view_{uuid4().hex[:8]}"
        now = dt_util.utcnow().isoformat()
        self._data["views"][view_id] = {
            "id": view_id,
            "name": name,
            "layout": layout,
            "theme": theme,
            "widgets": widgets or [],
            "created_at": now,
            "updated_at": now,
        }
        await self.async_save()
        _LOGGER.debug("Created view %s: %s", view_id, name)
        return view_id

    async def async_update_view(self, view_id: str, **updates: Any) -> bool:
        """Update an existing view."""
        if view_id not in self._data["views"]:
            _LOGGER.warning("Cannot update view %s: not found", view_id)
            return False
        view = self._data["views"][view_id]
        allowed_fields = {"name", "layout", "theme", "widgets"}
        for key, value in updates.items():
            if key in allowed_fields:
                view[key] = value
        view["updated_at"] = dt_util.utcnow().isoformat()
        await self.async_save()
        _LOGGER.debug("Updated view %s", view_id)
        return True

    async def async_delete_view(self, view_id: str) -> bool:
        """Delete a view."""
        if view_id not in self._data["views"]:
            _LOGGER.warning("Cannot delete view %s: not found", view_id)
            return False
        del self._data["views"][view_id]
        await self.async_save()
        _LOGGER.debug("Deleted view %s", view_id)
        return True

    async def async_duplicate_view(self, view_id: str, new_name: str | None = None) -> str | None:
        """Duplicate an existing view."""
        source = self.get_view(view_id)
        if not source:
            _LOGGER.warning("Cannot duplicate view %s: not found", view_id)
            return None
        name = new_name or f"{source[\'name\']} (Copy)"
        return await self.async_create_view(
            name=name,
            layout=source["layout"],
            theme=source["theme"],
            widgets=source.get("widgets", []).copy(),
        )

    async def async_migrate_from_screens(
        self,
        screens: list[dict[str, Any]],
        device_name: str = "",
    ) -> list[str]:
        """Migrate old per-device screens to global views."""
        view_ids = []
        prefix = f"{device_name} - " if device_name else ""
        for i, screen in enumerate(screens):
            name = screen.get("name", f"Screen {i + 1}")
            view_id = await self.async_create_view(
                name=f"{prefix}{name}",
                layout=screen.get("layout", LAYOUT_GRID_2X2),
                theme=screen.get("theme", THEME_CLASSIC),
                widgets=screen.get("widgets", []),
            )
            view_ids.append(view_id)
        _LOGGER.info("Migrated %d screens to global views", len(view_ids))
        return view_ids
''')
write_file("store.py", STORE_PY)

# image.py — apply renames + fix CONF_HOST → CONF_SWITCH_IP
IMAGE_PY = rename('''"""Image platform for GeekMagic display preview."""

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
    from .coordinator import GeekMagicCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up GeekMagic image from a config entry."""
    coordinator: GeekMagicCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([GeekMagicPreviewImage(hass, coordinator, entry)])


class GeekMagicPreviewImage(ImageEntity):
    """Image entity showing the GeekMagic display preview."""

    _attr_has_entity_name = True
    _attr_name = "Display Preview"
    _attr_content_type = "image/png"
    _attr_should_poll = False

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: GeekMagicCoordinator,
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
''')
write_file("image.py", IMAGE_PY)

# preview.py — apply renames
write_file("preview.py", rename('''"""Preview rendering for GeekMagic configuration flow."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast

from .const import (
    CONF_LAYOUT,
    CONF_WIDGETS,
    LAYOUT_GRID_2X2,
    LAYOUT_GRID_2X3,
    LAYOUT_GRID_3X2,
    LAYOUT_GRID_3X3,
    LAYOUT_HERO,
    LAYOUT_HERO_BL,
    LAYOUT_HERO_BR,
    LAYOUT_HERO_TL,
    LAYOUT_HERO_TR,
    LAYOUT_SIDEBAR_LEFT,
    LAYOUT_SIDEBAR_RIGHT,
    LAYOUT_SPLIT_H,
    LAYOUT_SPLIT_H_1_2,
    LAYOUT_SPLIT_H_2_1,
    LAYOUT_SPLIT_V,
    LAYOUT_THREE_COLUMN,
    LAYOUT_THREE_ROW,
)
from .layouts.corner_hero import HeroCornerBL, HeroCornerBR, HeroCornerTL, HeroCornerTR
from .layouts.grid import Grid2x2, Grid2x3, Grid3x2, Grid3x3
from .layouts.hero import HeroLayout
from .layouts.sidebar import SidebarLeft, SidebarRight
from .layouts.split import (
    SplitHorizontal,
    SplitHorizontal1To2,
    SplitHorizontal2To1,
    SplitVertical,
    ThreeColumnLayout,
    ThreeRowLayout,
)
from .renderer import Renderer
from .widgets import WIDGET_CLASSES
from .widgets.base import WidgetConfig
from .widgets.state import EntityState, WidgetState

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

LAYOUT_CLASSES = {
    LAYOUT_GRID_2X2: Grid2x2,
    LAYOUT_GRID_2X3: Grid2x3,
    LAYOUT_GRID_3X2: Grid3x2,
    LAYOUT_GRID_3X3: Grid3x3,
    LAYOUT_HERO: HeroLayout,
    LAYOUT_SPLIT_H: SplitHorizontal,
    LAYOUT_SPLIT_H_1_2: SplitHorizontal1To2,
    LAYOUT_SPLIT_H_2_1: SplitHorizontal2To1,
    LAYOUT_SPLIT_V: SplitVertical,
    LAYOUT_THREE_COLUMN: ThreeColumnLayout,
    LAYOUT_THREE_ROW: ThreeRowLayout,
    LAYOUT_SIDEBAR_LEFT: SidebarLeft,
    LAYOUT_SIDEBAR_RIGHT: SidebarRight,
    LAYOUT_HERO_TL: HeroCornerTL,
    LAYOUT_HERO_TR: HeroCornerTR,
    LAYOUT_HERO_BL: HeroCornerBL,
    LAYOUT_HERO_BR: HeroCornerBR,
}


@dataclass
class MockState:
    """Mock entity state for preview rendering."""

    entity_id: str
    state: str
    attributes: dict[str, Any] = field(default_factory=dict)


class MockStates:
    """Mock states registry for preview rendering."""

    def __init__(self) -> None:
        self._states: dict[str, MockState] = {}

    def set(self, entity_id: str, state: str, attributes: dict[str, Any] | None = None) -> None:
        self._states[entity_id] = MockState(entity_id=entity_id, state=state, attributes=attributes or {})

    def get(self, entity_id: str) -> MockState | None:
        return self._states.get(entity_id)


class MockConfig:
    time_zone_obj = None


class MockHass:
    def __init__(self) -> None:
        self.states = MockStates()
        self.config = MockConfig()


def _set_mock_state_for_widget(mock: MockHass, widget_config: dict[str, Any]) -> None:
    widget_type = widget_config.get("type", "")
    entity_id = widget_config.get("entity_id")
    if not entity_id:
        return
    if widget_type == "entity":
        mock.states.set(entity_id, "42", {"unit_of_measurement": "", "friendly_name": widget_config.get("label", "Entity")})
    elif widget_type == "gauge":
        mock.states.set(entity_id, "65", {"unit_of_measurement": "%", "friendly_name": widget_config.get("label", "Gauge")})
    elif widget_type == "progress":
        mock.states.set(entity_id, "75", {"unit_of_measurement": "", "friendly_name": widget_config.get("label", "Progress")})
    elif widget_type == "status":
        mock.states.set(entity_id, "on", {"friendly_name": widget_config.get("label", "Status")})
    elif widget_type == "media":
        mock.states.set(entity_id, "playing", {"friendly_name": "Media Player", "media_title": "Sample Track", "media_artist": "Sample Artist", "media_position": 120, "media_duration": 300})
    elif widget_type == "chart":
        mock.states.set(entity_id, "23", {"unit_of_measurement": "°C", "friendly_name": widget_config.get("label", "Chart")})
    elif widget_type == "weather":
        mock.states.set(entity_id, "sunny", {"temperature": 24, "humidity": 45, "friendly_name": "Weather"})
    elif widget_type == "text" and entity_id:
        mock.states.set(entity_id, widget_config.get("options", {}).get("text", "Sample"), {"friendly_name": widget_config.get("label", "Text")})
    options = widget_config.get("options", {})
    if widget_type == "multi_progress":
        for item in options.get("items", []):
            item_entity = item.get("entity_id")
            if item_entity:
                mock.states.set(item_entity, "50", {"unit_of_measurement": "", "friendly_name": item.get("label", "Item")})
    elif widget_type == "status_list":
        for entry in options.get("entities", []):
            ent_id = entry[0] if isinstance(entry, list | tuple) else entry
            if ent_id:
                friendly = entry[1] if isinstance(entry, list | tuple) and len(entry) > 1 else ent_id
                mock.states.set(ent_id, "on", {"friendly_name": friendly})


def _build_widget_state_for_preview(widget_config: dict[str, Any], mock: MockHass) -> WidgetState:
    widget_type = widget_config.get("type", "")
    entity_id = widget_config.get("entity_id")
    options = widget_config.get("options", {})
    entity: EntityState | None = None
    if entity_id:
        mock_state = mock.states.get(entity_id)
        if mock_state:
            entity = EntityState(entity_id=mock_state.entity_id, state=mock_state.state, attributes=mock_state.attributes)
    entities: dict[str, EntityState] = {}
    if widget_type == "multi_progress":
        for item in options.get("items", []):
            item_entity_id = item.get("entity_id")
            if item_entity_id:
                mock_state = mock.states.get(item_entity_id)
                if mock_state:
                    entities[item_entity_id] = EntityState(entity_id=mock_state.entity_id, state=mock_state.state, attributes=mock_state.attributes)
    elif widget_type == "status_list":
        for entry in options.get("entities", []):
            ent_id = entry[0] if isinstance(entry, list | tuple) else entry
            if ent_id:
                mock_state = mock.states.get(ent_id)
                if mock_state:
                    entities[ent_id] = EntityState(entity_id=mock_state.entity_id, state=mock_state.state, attributes=mock_state.attributes)
    history: list[float] = []
    if widget_type == "chart":
        history = [20, 22, 21, 23, 25, 24, 22, 23, 21, 20, 22, 23]
    forecast: list[dict[str, Any]] = []
    if widget_type == "weather":
        forecast = [
            {"datetime": "2025-12-29T00:00:00+00:00", "condition": "sunny", "temperature": 26, "templow": 14},
            {"datetime": "2025-12-30T00:00:00+00:00", "condition": "cloudy", "temperature": 22, "templow": 12},
            {"datetime": "2025-12-31T00:00:00+00:00", "condition": "rainy", "temperature": 18, "templow": 10},
            {"datetime": "2026-01-01T00:00:00+00:00", "condition": "partlycloudy", "temperature": 20, "templow": 11},
            {"datetime": "2026-01-02T00:00:00+00:00", "condition": "sunny", "temperature": 24, "templow": 13},
        ]
    return WidgetState(entity=entity, entities=entities, history=history, forecast=forecast, image=None, now=datetime.now(tz=UTC))


def render_preview(layout_type: str, widgets_config: list[dict[str, Any]], hass: HomeAssistant | None = None) -> bytes:
    """Render a preview image for the given configuration."""
    mock = MockHass()
    for widget_config in widgets_config:
        _set_mock_state_for_widget(mock, widget_config)
    renderer = Renderer()
    layout_class = LAYOUT_CLASSES.get(layout_type, Grid2x2)
    layout = layout_class()
    widget_states: dict[int, WidgetState] = {}
    for widget_config in widgets_config:
        widget_type = str(widget_config.get("type", "text"))
        slot = int(widget_config.get("slot", 0))
        if slot >= layout.get_slot_count():
            continue
        widget_class = WIDGET_CLASSES.get(widget_type)
        if widget_class is None:
            continue
        entity_id = widget_config.get("entity_id")
        label = widget_config.get("label")
        raw_color = widget_config.get("color")
        widget_options = widget_config.get("options") or {}
        parsed_color: tuple[int, int, int] | None = None
        if isinstance(raw_color, list | tuple) and len(raw_color) == 3:
            parsed_color = (int(raw_color[0]), int(raw_color[1]), int(raw_color[2]))
        config = WidgetConfig(
            widget_type=widget_type, slot=slot,
            entity_id=str(entity_id) if entity_id is not None else None,
            label=str(label) if label is not None else None,
            color=parsed_color,
            options=cast("dict[str, Any]", widget_options),
        )
        widget = widget_class(config)
        layout.set_widget(slot, widget)
        widget_states[slot] = _build_widget_state_for_preview(widget_config, mock)
    img, draw = renderer.create_canvas()
    layout.render(renderer, draw, widget_states)
    return renderer.to_png(img)


def render_screen_preview(screen_config: dict[str, Any], hass: HomeAssistant | None = None) -> bytes:
    """Render a preview for a complete screen configuration."""
    layout_type = screen_config.get(CONF_LAYOUT, LAYOUT_GRID_2X2)
    widgets_config = screen_config.get(CONF_WIDGETS, [])
    return render_preview(layout_type, widgets_config, hass)
'''))

# panel.py — apply renames + update panel names
PANEL_PY = rename('''"""Custom panel registration for GeekMagic integration."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

PANEL_NAME = "ulux-display-panel"
PANEL_TITLE = "u::lux Display"
PANEL_ICON = "mdi:monitor-dashboard"
PANEL_URL_PATH = "ulux_display"
PANEL_MODULE_URL_BASE = "/ulux_display_panel/ulux-display-panel.js"

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"


async def async_register_panel(hass: HomeAssistant) -> bool:
    """Register the u::lux Display configuration panel."""
    try:
        from homeassistant.components import panel_custom
        from homeassistant.components.http import StaticPathConfig
    except ImportError:
        _LOGGER.warning("panel_custom or http component not available. Custom panel will not be registered.")
        return False

    panel_js = FRONTEND_DIR / "ulux-display-panel.js"
    if not panel_js.exists():
        _LOGGER.warning(
            "Frontend panel not found at %s. Panel UI will not be available.",
            panel_js,
        )
        FRONTEND_DIR.mkdir(parents=True, exist_ok=True)
        panel_js.write_text(_get_placeholder_panel())
        _LOGGER.info("Created placeholder panel at %s", panel_js)

    try:
        content_hash = await hass.async_add_executor_job(_get_file_hash, panel_js)
    except Exception:
        content_hash = "dev"
    module_url = f"{PANEL_MODULE_URL_BASE}?h={content_hash}"

    try:
        if hasattr(hass, "http") and hass.http is not None:
            await hass.http.async_register_static_paths(
                [StaticPathConfig(url_path="/ulux_display_panel", path=str(FRONTEND_DIR), cache_headers=False)]
            )
        else:
            return True
    except Exception:
        _LOGGER.exception("Failed to register static path")
        return False

    try:
        await panel_custom.async_register_panel(
            hass,
            webcomponent_name=PANEL_NAME,
            frontend_url_path=PANEL_URL_PATH,
            module_url=module_url,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            require_admin=True,
            config={"domain": DOMAIN},
        )
        _LOGGER.info("Registered u::lux Display panel at /%s", PANEL_URL_PATH)
    except Exception:
        _LOGGER.exception("Failed to register panel")
        return False
    else:
        return True


async def async_unregister_panel(hass: HomeAssistant) -> None:
    """Unregister the u::lux Display panel."""
    try:
        from homeassistant.components import frontend
        if "frontend" in hass.config.components:
            frontend.async_remove_panel(hass, PANEL_URL_PATH)
    except Exception as err:
        _LOGGER.warning("Failed to unregister panel: %s", err)


def _get_file_hash(path: Path) -> str:
    content = path.read_bytes()
    return hashlib.sha256(content).hexdigest()[:8]


def _get_placeholder_panel() -> str:
    return """
// u::lux Display Panel - Placeholder
class UluxDisplayPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: \'open\' });
    }
    set hass(hass) { this._hass = hass; this._render(); }
    set panel(panel) { this._panel = panel; }
    set narrow(narrow) { this._narrow = narrow; }
    _render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: flex; flex-direction: column; align-items: center;
                    justify-content: center; height: 100%; padding: 24px; box-sizing: border-box;
                    background: var(--primary-background-color); color: var(--primary-text-color); }
                .container { max-width: 600px; text-align: center; }
                h1 { margin: 0 0 16px; font-size: 24px; font-weight: 500; }
                p { margin: 0 0 16px; opacity: 0.8; }
                code { background: var(--secondary-background-color); padding: 2px 8px;
                    border-radius: 4px; font-family: monospace; }
            </style>
            <div class="container">
                <h1>u::lux Display Panel</h1>
                <p>The panel frontend needs to be built.</p>
                <p>Run: <code>cd custom_components/ulux_display/frontend && npm install && npm run build</code></p>
            </div>`;
    }
}
customElements.define(\'ulux-display-panel\', UluxDisplayPanel);
"""
''')
write_file("panel.py", PANEL_PY)

# ── Entities ──────────────────────────────────────────────────────────────────
# entities/* and select.py/sensor.py written separately via MCP-fetched content

# ── const.py ─────────────────────────────────────────────────────────────────
CONST_PY = '''"""Constants for u::lux Display integration."""

DOMAIN = "ulux_display"

# Display dimensions
DISPLAY_WIDTH = 240
DISPLAY_HEIGHT = 240

# Default settings
DEFAULT_REFRESH_INTERVAL = 10  # seconds

# UDP connection settings
CONF_SWITCH_IP = "switch_ip"
CONF_ACTOR_ID = "actor_id"
CONF_PAGE_ID = "page_id"
DEFAULT_ACTOR_ID = 22
DEFAULT_PAGE_ID = 4
DEFAULT_UDP_PORT = 34988

# Backoff settings for offline device handling
MAX_BACKOFF_MULTIPLIER = 16
BACKOFF_LOG_INTERVAL = 30

# Config keys
CONF_NAME = "name"
CONF_REFRESH_INTERVAL = "refresh_interval"
CONF_LAYOUT = "layout"
CONF_WIDGETS = "widgets"

# Multi-screen config keys
CONF_SCREENS = "screens"
CONF_SCREEN_NAME = "screen_name"
CONF_SCREEN_CYCLE_INTERVAL = "screen_cycle_interval"
CONF_CURRENT_SCREEN = "current_screen"
CONF_SCREEN_THEME = "theme"
DEFAULT_SCREEN_CYCLE_INTERVAL = 0  # 0 = manual only, >0 = seconds between screens

# Theme types
THEME_CLASSIC = "classic"
THEME_MINIMAL = "minimal"
THEME_NEON = "neon"
THEME_RETRO = "retro"
THEME_SOFT = "soft"
THEME_LIGHT = "light"
THEME_OCEAN = "ocean"
THEME_SUNSET = "sunset"
THEME_FOREST = "forest"
THEME_CANDY = "candy"

THEME_OPTIONS = {
    THEME_CLASSIC: "Classic",
    THEME_MINIMAL: "Minimal",
    THEME_NEON: "Neon",
    THEME_RETRO: "Retro",
    THEME_SOFT: "Soft",
    THEME_LIGHT: "Light",
    THEME_OCEAN: "Ocean",
    THEME_SUNSET: "Sunset",
    THEME_FOREST: "Forest",
    THEME_CANDY: "Candy",
}

# Layout types
LAYOUT_GRID_2X2 = "grid_2x2"
LAYOUT_GRID_2X3 = "grid_2x3"
LAYOUT_GRID_3X2 = "grid_3x2"
LAYOUT_GRID_3X3 = "grid_3x3"
LAYOUT_HERO = "hero"
LAYOUT_SPLIT_H = "split_horizontal"
LAYOUT_SPLIT_V = "split_vertical"
LAYOUT_THREE_COLUMN = "three_column"
LAYOUT_THREE_ROW = "three_row"
LAYOUT_SPLIT_H_1_2 = "split_h_1_2"
LAYOUT_SPLIT_H_2_1 = "split_h_2_1"
LAYOUT_SIDEBAR_LEFT = "sidebar_left"
LAYOUT_SIDEBAR_RIGHT = "sidebar_right"
LAYOUT_HERO_TL = "hero_corner_tl"
LAYOUT_HERO_TR = "hero_corner_tr"
LAYOUT_HERO_BL = "hero_corner_bl"
LAYOUT_HERO_BR = "hero_corner_br"
LAYOUT_HERO_SIMPLE = "hero_simple"
LAYOUT_FULLSCREEN = "fullscreen"

# Widget types
WIDGET_CAMERA = "camera"
WIDGET_CLOCK = "clock"
WIDGET_ENTITY = "entity"
WIDGET_MEDIA = "media"
WIDGET_CHART = "chart"
WIDGET_TEXT = "text"
WIDGET_GAUGE = "gauge"
WIDGET_PROGRESS = "progress"
WIDGET_MULTI_PROGRESS = "multi_progress"
WIDGET_STATUS = "status"
WIDGET_STATUS_LIST = "status_list"
WIDGET_WEATHER = "weather"

LAYOUT_SLOT_COUNTS = {
    LAYOUT_GRID_2X2: 4,
    LAYOUT_GRID_2X3: 6,
    LAYOUT_GRID_3X2: 6,
    LAYOUT_GRID_3X3: 9,
    LAYOUT_HERO: 4,
    LAYOUT_SPLIT_H: 2,
    LAYOUT_SPLIT_V: 2,
    LAYOUT_THREE_COLUMN: 3,
    LAYOUT_THREE_ROW: 3,
    LAYOUT_SPLIT_H_1_2: 2,
    LAYOUT_SPLIT_H_2_1: 2,
    LAYOUT_SIDEBAR_LEFT: 4,
    LAYOUT_SIDEBAR_RIGHT: 4,
    LAYOUT_HERO_TL: 6,
    LAYOUT_HERO_TR: 6,
    LAYOUT_HERO_BL: 6,
    LAYOUT_HERO_BR: 6,
    LAYOUT_HERO_SIMPLE: 2,
    LAYOUT_FULLSCREEN: 1,
}

WIDGET_TYPE_NAMES = {
    WIDGET_CAMERA: "Camera",
    WIDGET_CLOCK: "Clock",
    WIDGET_ENTITY: "Entity",
    WIDGET_MEDIA: "Media Player",
    WIDGET_CHART: "Chart",
    WIDGET_TEXT: "Text",
    WIDGET_GAUGE: "Gauge",
    WIDGET_PROGRESS: "Progress",
    WIDGET_MULTI_PROGRESS: "Multi Progress",
    WIDGET_STATUS: "Status",
    WIDGET_STATUS_LIST: "Status List",
    WIDGET_WEATHER: "Weather",
}

# Colors (RGB tuples)
COLOR_WHITE = (255, 255, 255)
COLOR_BLACK = (0, 0, 0)
COLOR_GRAY = (150, 150, 150)
COLOR_DARK_GRAY = (50, 50, 50)
COLOR_PANEL = (18, 18, 18)
COLOR_PANEL_BORDER = (60, 60, 60)

COLOR_PURPLE = (127, 60, 141)
COLOR_TEAL = (17, 165, 121)
COLOR_BLUE = (57, 105, 172)
COLOR_YELLOW = (242, 183, 1)
COLOR_PINK = (231, 63, 116)
COLOR_GREEN = (128, 186, 90)

COLOR_CYAN = (27, 158, 119)
COLOR_ORANGE = (217, 95, 2)
COLOR_LAVENDER = (117, 112, 179)
COLOR_MAGENTA = (231, 41, 138)
COLOR_LIME = (102, 166, 30)
COLOR_GOLD = (230, 171, 2)
COLOR_BROWN = (166, 118, 29)
COLOR_RED = (231, 76, 60)

# Standard placeholder strings
PLACEHOLDER_VALUE = "--"
PLACEHOLDER_TEXT = "No data"
PLACEHOLDER_NAME = "Unknown"

# Spacing constants (in pixels)
SPACING_XS = 4
SPACING_SM = 6
SPACING_MD = 8
SPACING_LG = 10
SPACING_XL = 14

# Responsive padding percentages
PADDING_COMPACT = 0.04
PADDING_STANDARD = 0.06
PADDING_SPACIOUS = 0.08

# Icon sizing constants
ICON_SIZE_XS = 12
ICON_SIZE_SM = 14
ICON_SIZE_MD = 16
ICON_SIZE_LG = 20
ICON_SIZE_XL = 24
ICON_SIZE_MAX = 32
'''
write_file("const.py", CONST_PY)

# ── __init__.py ───────────────────────────────────────────────────────────────
INIT_PY = '''"""u::lux Display integration for Home Assistant."""

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
'''
write_file("__init__.py", INIT_PY)

# ── ulux_device.py ────────────────────────────────────────────────────────────
ULUX_DEVICE_PY = '''"""UluxDevice — UDP/UMP transport for u::lux display."""

from __future__ import annotations

import asyncio
import logging
import socket
import struct
from dataclasses import dataclass

_LOGGER = logging.getLogger(__name__)

DEFAULT_UDP_PORT = 34988


@dataclass
class DeviceState:
    """Device state (stub — UDP device does not expose state)."""

    theme: int | None = None


@dataclass
class SpaceInfo:
    """Storage space info (stub — not applicable to UDP device)."""

    used: int = 0
    free: int = 0
    total: int = 0


class UluxDevice:
    """UDP/UMP transport for u::lux display.

    Sends rendered PNG frames to a u::lux display unit via UDP datagrams
    using the UMP (Universal Media Protocol) framing.
    Each frame is split into 1400-byte chunks, each prefixed with a
    12-byte UMP header: actor_id (2B), page_id (2B), chunk_index (4B),
    total_chunks (4B).
    """

    def __init__(
        self,
        host: str,
        actor_id: int = 22,
        page_id: int = 4,
        port: int = DEFAULT_UDP_PORT,
    ) -> None:
        """Initialise the device transport."""
        self.host = host
        self.actor_id = actor_id
        self.page_id = page_id
        self.port = port
        self.model: str | None = None

    # ── Primary send method ───────────────────────────────────────────────

    async def send_image(self, image_data: bytes) -> None:
        """Send PNG image data to the display via UDP/UMP."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._send_image_sync, image_data)

    def _send_image_sync(self, image_data: bytes) -> None:
        """Send image synchronously via UDP (runs in executor thread)."""
        chunk_size = 1400
        total = len(image_data)
        num_chunks = max(1, (total + chunk_size - 1) // chunk_size)

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(5.0)
            for i in range(num_chunks):
                chunk = image_data[i * chunk_size : (i + 1) * chunk_size]
                header = struct.pack(">HHII", self.actor_id, self.page_id, i, num_chunks)
                sock.sendto(header + chunk, (self.host, self.port))

        _LOGGER.debug(
            "Sent %d UDP chunks (%d bytes) to %s:%d",
            num_chunks, total, self.host, self.port,
        )

    # ── Compatibility stubs (satisfy coordinator / entity calls) ──────────

    async def test_connection(self) -> bool:
        """Always returns True — UDP is connectionless."""
        return True

    async def get_state(self) -> DeviceState | None:
        """Return device state stub (UDP device exposes no state API)."""
        return None

    async def get_space(self) -> SpaceInfo | None:
        """Return storage info stub (not applicable to UDP device)."""
        return None

    async def get_brightness(self) -> int | None:
        """Return brightness stub."""
        return None

    async def set_brightness(self, brightness: int) -> None:
        """Set brightness stub (no-op for UDP device)."""

    async def upload_and_display(self, data: bytes, filename: str) -> None:
        """Alias for send_image (backward-compat shim)."""
        await self.send_image(data)

    async def set_theme_custom(self) -> None:
        """Set custom theme stub (no-op for UDP device)."""

    async def navigate_next(self) -> None:
        """Navigate to next screen stub (no-op)."""

    async def navigate_previous(self) -> None:
        """Navigate to previous screen stub (no-op)."""

    async def detect_model(self) -> None:
        """Detect model stub (no-op)."""
'''
write_file("ulux_device.py", ULUX_DEVICE_PY)

# ── config_flow.py ────────────────────────────────────────────────────────────
CONFIG_FLOW_PY = '''"""Config flow for u::lux Display integration."""

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
'''
write_file("config_flow.py", CONFIG_FLOW_PY)

# ── manifest.json ─────────────────────────────────────────────────────────────
import json as _json
MANIFEST = {
    "domain": "ulux_display",
    "name": "u::lux Display",
    "version": "0.1.0",
    "documentation": "https://github.com/gelbetomate/ha-addons",
    "requirements": ["pillow>=10.0.0", "palettable>=3.3.0"],
    "dependencies": [],
    "codeowners": [],
    "iot_class": "local_polling",
    "config_flow": True,
}
write_file("manifest.json", _json.dumps(MANIFEST, indent=2) + "\n")

# ── fonts/README.md ────────────────────────────────────────────────────────────
FONTS_README = """# Fonts

This directory holds font files used by the u::lux Display renderer.

## Required fonts

| File | Usage |
|------|-------|
| `DejaVuSans.ttf` | Regular text |
| `DejaVuSans-Bold.ttf` | Bold text / headings |
| `materialdesignicons-webfont.ttf` | MDI icons |

## Installation

### DejaVu fonts

The DejaVu fonts are free (Bitstream Vera licence) and ship with most
Linux distributions:

```bash
# Debian / Ubuntu
apt-get install fonts-dejavu

# Then copy them here:
cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf .
cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf .
```

Or download from https://dejavu-fonts.github.io/

### MDI icon font

Download **materialdesignicons-webfont.ttf** from the
[@mdi/font](https://github.com/Templarian/MaterialDesign-Webfont) release
page and copy it here.

```bash
# Example — adjust version as needed:
curl -L https://github.com/Templarian/MaterialDesign-Webfont/raw/master/fonts/materialdesignicons-webfont.ttf \\
     -o materialdesignicons-webfont.ttf
```

> **Note:** Without the bundled fonts the renderer falls back to system
> fonts (DejaVu) and PIL's built-in bitmap font (for icons).  Icons will
> render as empty boxes if `materialdesignicons-webfont.ttf` is missing.
"""
write_file("fonts/README.md", FONTS_README)

# ── hacs.json at repo root ────────────────────────────────────────────────────
HACS_JSON = {
    "name": "u::lux Display",
    "render_readme": True,
}
hacs_path = "/home/runner/work/ha-addons/ha-addons/hacs.json"
with open(hacs_path, "w") as f:
    _json.dump(HACS_JSON, f, indent=2)
    f.write("\n")
print("  Created: hacs.json (repo root)")

print("\nDone!")
