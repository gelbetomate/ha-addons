# u::lux Integration Repository

This repository provides the **u::lux Display** HACS integration and the **u::Lux UMP Bridge** Supervisor add-on for Home Assistant.

***This project is work in progress and built for real-world personal use first. Please test carefully in your own environment.***

---

## Architecture Overview

The two components work together and must both be installed for a functional setup:

```
Physical u::lux Switch IP
       ↕ UDP 34988 (UMP)
┌─────────────────────────────────┐
│   u::Lux UMP Bridge Add-on      │  ← install from Supervisor Add-on Store
│   • Key events → HA events      │
│   • Image streaming to switch   │
│   • Device discovery registry   │
│   • HTTP API on port 8099       │
└──────────────┬──────────────────┘
               │ HTTP (localhost:8099)
┌──────────────▼──────────────────┐
│   u::lux Display Integration    │  ← install from HACS
│   • PIL rendering (layouts,     │
│     widgets, themes)            │
│   • HA entities & services      │
│   • Config flow with discovery  │
└─────────────────────────────────┘
```

**Install the bridge add-on first** — the integration config flow connects to the bridge to discover switches.

---

## HACS Integration

[![Add HACS Repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gelbetomate&repository=ha-addons&category=integration)

| Integration | Description |
|-------------|-------------|
| [u::lux Display](custom_components/ulux_display/README.md) | Display engine for u::lux Switch IP — widgets, layouts, themes, bridge-backed rendering. Full install and testing guide in the integration README. |

### Install via HACS

1. Open HACS in Home Assistant.
2. Open **Custom repositories**.
3. Add `https://github.com/gelbetomate/ha-addons` with type **Integration**.
4. Install **u::lux Display**.
5. Restart Home Assistant.
6. Go to **Settings → Devices & Services → Add Integration** and select **u::lux Display**.

---

## Supervisor Add-on

[![Add Add-on Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fgelbetomate%2Fha-addons)

| Add-on | Description |
|--------|-------------|
| [u::Lux UMP Bridge](addons/ulux/README.md) | UDP bridge for u::Lux Switch IP devices. Decodes UMP key events, auto-initialises switches, streams images, and publishes events to Home Assistant and/or MQTT. |

### Install the Add-on

1. Open Home Assistant.
2. Navigate to **Settings → Add-ons → Add-on Store**.
3. Click **⋮ → Repositories**.
4. Add `https://github.com/gelbetomate/ha-addons`.
5. Find **u::Lux UMP Bridge** and install it.
6. Configure and start it before setting up the integration.

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.
