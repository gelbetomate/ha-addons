"""Custom panel registration for UluxDisplay integration."""

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
        this.attachShadow({ mode: 'open' });
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
customElements.define('ulux-display-panel', UluxDisplayPanel);
"""
