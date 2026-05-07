# gelbetomate Home Assistant Add-ons

A collection of Home Assistant add-ons and HACS custom integrations.

Be advised, this repository is work in progress and I'm creating these integrations because I'm personally missing this integrations. Test and use on your own risk.

---

## Add-ons

[![Add Add-on Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fgelbetomate%2Fha-addons)

### Available Add-ons

| Add-on | Description |
|--------|-------------|
| [u::Lux UMP Bridge](addons/ulux/README.md) | UDP bridge for u::Lux Switch IP devices — decodes UMP key events, auto-initialises switches, and publishes `ulux_event` / `ulux_key` events to Home Assistant and/or MQTT. |

### Installation

1. Open your Home Assistant instance.
2. Navigate to **Settings → Add-ons → Add-on Store**.
3. Click the three-dot menu (⋮) in the top-right corner and select **Repositories**.
4. Paste the following URL and click **Add**:
   ```
   https://github.com/gelbetomate/ha-addons
   ```
5. The add-ons from this repository will now appear in the Add-on Store.

Alternatively, click the badge above to add the repository automatically.

---

## HACS Integrations

[![Add HACS Repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gelbetomate&repository=ha-addons&category=integration)

### Available HACS Integrations

| Integration | Description |
|-------------|-------------|
| [u::lux Display](custom_components/ulux_display/README.md) | Rich display engine for u::Lux Switch IP devices with widgets, layouts, themes, and WebSocket-powered management. |

### Installation

1. Open your Home Assistant instance and navigate to **HACS** in the sidebar.
2. Click the three-dot menu (⋮) in the top-right corner and select **Custom repositories**.
3. Paste the following URL, set the category to **Integration**, and click **Add**:
   ```
   https://github.com/gelbetomate/ha-addons
   ```
4. Search for the integration in HACS and click **Download**.
5. Restart Home Assistant.
6. Go to **Settings → Devices & Services → Add Integration** and select the integration.

Alternatively, click the badge above to add the repository automatically.

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.

