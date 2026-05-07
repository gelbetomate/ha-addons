# u::lux Integration Repository

This repository provides the **u::lux Display** HACS integration and related Home Assistant Supervisor apps.

This project is work in progress and built for real-world personal use first. Please test carefully in your own environment.

---

## HACS Integration

[![Add HACS Repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gelbetomate&repository=ha-addons&category=integration)

### Available Integration

| Integration | Description |
|-------------|-------------|
| [u::lux Display](custom_components/ulux_display/README.md) | Display engine for u::Lux Switch IP with widgets, layouts, themes, and bridge-backed rendering. |

### Required Components

For a working setup, install both:

- **u::lux Display** (HACS integration): handles Home Assistant entities, configuration flow, and image rendering logic.
- **u::Lux UMP Bridge** (Supervisor app): handles device discovery and transport to u::Lux switches.

Reason: the integration delegates communication to the bridge. Without the bridge, the integration cannot deliver rendered content to the physical switch.

### Install via HACS

1. Open HACS in Home Assistant.
2. Open **Custom repositories**.
3. Add `https://github.com/gelbetomate/ha-addons` with type **Integration**.
4. Install **u::lux Display**.
5. Restart Home Assistant.
6. Go to **Settings -> Devices & Services -> Add Integration** and select **u::lux Display**.

---

## Related Supervisor Apps

[![Add App Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fgelbetomate%2Fha-addons)

The same repository URL can also be added to the Supervisor App Store.

### Available Apps

| App | Description |
|-----|-------------|
| [u::Lux UMP Bridge](addons/ulux/README.md) | UDP bridge for u::Lux Switch IP devices. Decodes UMP key events, auto-initializes switches, and publishes events to Home Assistant and/or MQTT. |

### Install Apps

1. Open Home Assistant.
2. Navigate to **Settings -> Apps -> App Store**.
3. Open **Repositories** from the top-right menu.
4. Add `https://github.com/gelbetomate/ha-addons`.
5. Install the desired app.

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.

