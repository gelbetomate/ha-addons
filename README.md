# u::lux Integration Repository

This repository provides the **u::lux Display** HACS integration and the **u::Lux UMP Bridge** Supervisor add-on for Home Assistant.

***This project is work in progress and built for real-world personal use first. Please test carefully in your own environment.***

---

## Architecture Overview

The two components work together to provide a unified device management and rendering system:

```
                          Physical u::lux Switch IP
                                    ↕ UDP 34988 (UMP)
┌────────────────────────────────────────────────────────────┐
│           u::Lux UMP Bridge Add-on                         │
│                                                            │
│  • UDP listener & device discovery                        │
│  • Persistent device registry (/data/registry.json)       │
│  • Image streaming to switches                            │
│  • Standalone web UI for device management (port 8099)    │
│                                                            │
│  APIs exposed:                                            │
│    - /api/registry/* (device CRUD)                        │
│    - /api/discovery/devices (observed devices)            │
│    - /api/display/image/:switchId (image streaming)       │
│    - MQTT topics: registry/add_device, etc.               │
└──────────────┬─────────────────────────────┬──────────────┘
               │ HTTP (localhost:8099)       │ MQTT
               │                             │
    ┌──────────▼─────────────┐     ┌────────▼──────────┐
    │  Bridge Web UI         │     │   MQTT Broker     │
    │  • Device list         │     │   (optional)      │
    │  • Add/edit/delete     │     │                   │
    │  • Discovery import    │     │   register device │
    │  • Status monitoring   │     │   via MQTT        │
    └──────────┬─────────────┘     └───────────────────┘
               │
               │ HTTP (uses /api/registry/*)
               │
┌──────────────▼──────────────────┐
│  u::lux Display Integration (HA)│
│                                 │
│  • PIL rendering                │
│  • Layouts & widgets            │
│  • Themes & fonts               │
│  • Entity management            │
│  • Config flow (discovers from  │
│    bridge registry)             │
│  • Auto-registers devices in    │
│    bridge when created in HA    │
└─────────────────────────────────┘
```

### Key Design Points

1. **Persistent Registry**: The bridge maintains a persistent device registry (JSON file) that survives restarts
2. **Single Source of Truth**: Device list is centralized in the bridge; HA integration consumes it
3. **Standalone Capable**: The bridge web UI allows full device management without Home Assistant
4. **Multiple Access Paths**: Devices can be managed via:
   - Bridge web UI (port 8099)
   - HTTP API (`/api/registry/*`)
   - MQTT topics (`registry/add_device`, etc.)
   - Home Assistant config flow

---

## Component Responsibilities

### u::Lux UMP Bridge
- **Transport**: UDP listener for UMP packets, image streaming
- **Discovery**: Observes device traffic, feeds discovery data into registry
- **Persistence**: Maintains `/data/registry.json` with device records
- **APIs**: HTTP REST API, MQTT topics, standalone web UI
- **Status**: Online/offline tracking per device

### u::lux Display Integration
- **Rendering**: PIL-based image rendering with layouts, widgets, themes
- **Home Assistant Integration**: Creates entities, services, config entries
- **Registry Consumer**: Reads device list from bridge registry API
- **Auto-Registration**: Registers devices in bridge when created in HA
- **Delegated Streaming**: Sends rendered frames to bridge for UDP streaming

---

## Installation

**Install the bridge add-on first** — the integration config flow requires the bridge to be running.

### 1. Install Bridge Add-on

[![Add Add-on Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fgelbetomate%2Fha-addons)

1. Open Home Assistant → **Settings → Add-ons → Add-on Store**
2. Click **⋮ → Repositories**
3. Add `https://github.com/gelbetomate/ha-addons`
4. Install **u::Lux UMP Bridge**
5. Configure (optional) and **Start** it
6. The bridge UI is available at **http://homeassistant.local:8099** (or your HA IP)

| Add-on | Description |
|--------|-------------|
| [u::Lux UMP Bridge](addons/ulux/README.md) | UDP bridge for u::Lux Switch IP devices with device registry, discovery, and web UI. |

### Bridge Quick Config (What You Really Need)

For most setups (u::lux Display integration + bridge web UI, no MQTT), keep the bridge config minimal:

1. `switches`: empty
2. `listen_host`: `0.0.0.0`
3. `listen_port`: `34988`
4. `control_flags`: `0`
5. `mode.ha_events`: `false`
6. `mode.mqtt`: `false`
7. `api_port`: `8099`
8. `log_level`: `info`

Everything else can stay at defaults.

Enable extras only when needed:

1. Enable `mode.mqtt` only if you actively use MQTT topics.
2. Add `switches` when you want static pre-seeding or MQTT command topics per switch.
3. Enable `mode.ha_events` only if you need bridge events on HA event bus (`ulux_event`, `ulux_raw`).

For copy-ready JSON profiles, see:

- [Bridge Minimal Configuration Profiles](addons/ulux/README.md#minimal-configuration-profiles)

### Supervisor Form Mapping (Safe Defaults)

Use this when filling the bridge add-on configuration form in Home Assistant.

| Supervisor field | Set to | Notes |
|---|---|---|
| `switches` | empty list | Add entries only for static pre-seeding or MQTT command topics per switch. |
| `listen_host` | `0.0.0.0` | Keep default unless you intentionally restrict bind address. |
| `listen_port` | `34988` | Default UMP UDP port. |
| `control_flags` | `0` | Advanced protocol flag; keep default. |
| `mode.ha_events` | `false` | Enable only if you need HA event bus events (`ulux_event`, `ulux_raw`). |
| `mode.mqtt` | `false` | Enable only if you actively use MQTT. |
| `ha.ws_url` | default | Ignored unless `mode.ha_events` is true. |
| `ha.token` | empty | Usually optional in Supervisor; token is auto-resolved when needed. |
| `mqtt.host` / `mqtt.port` / `mqtt.username` / `mqtt.password` / `mqtt.base_topic` | defaults | Only relevant when `mode.mqtt` is true. |
| `stream.width` / `stream.height` | defaults (`86` / `90`) | Advanced tuning only; usually leave unchanged. |
| `stream.lines_per_packet` / `stream.inter_packet_delay_ms` | defaults (`5` / `5`) | Advanced UDP streaming tuning; usually leave unchanged. |
| `api_port` | `8099` | Change only if needed; then also update integration bridge URL. |
| `log_level` | `info` | Use `debug` temporarily for troubleshooting. |

### MQTT Enabled Preset (Delta Only)

If you want MQTT command/event topics, change only these fields from the safe defaults:

| Supervisor field | Set to |
|---|---|
| `mode.mqtt` | `true` |
| `mqtt.host` | your broker host (for HA add-on broker usually `core-mosquitto`) |
| `mqtt.port` | broker port (usually `1883`) |
| `mqtt.username` / `mqtt.password` | credentials if your broker requires auth |
| `mqtt.base_topic` | topic prefix, e.g. `ulux` |
| `switches` | add known devices if you use per-switch MQTT command topics |

### HA Events Enabled Preset (Delta Only)

If you want bridge events on the Home Assistant event bus (`ulux_event`, `ulux_raw`), change only these fields from the safe defaults:

| Supervisor field | Set to |
|---|---|
| `mode.ha_events` | `true` |
| `ha.ws_url` | your Home Assistant WebSocket URL (usually `ws://homeassistant.local:8123/api/websocket` or use the default) |
| `ha.token` | your long-lived access token (optional in Supervisor; usually auto-resolved) |

### 2. Install HACS Integration

[![Add HACS Repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gelbetomate&repository=ha-addons&category=integration)

1. Open HACS → **Custom repositories**
2. Add `https://github.com/gelbetomate/ha-addons` (type: Integration)
3. Install **u::lux Display**
4. **Restart Home Assistant**
5. Go to **Settings → Devices & Services → Add Integration** → select **u::lux Display**
6. Config flow will discover devices from the bridge registry

| Integration | Description |
|-------------|-------------|
| [u::lux Display](custom_components/ulux_display/README.md) | Rendering engine for u::lux displays with widgets, layouts, themes, and Home Assistant integration. |

---

## Usage

### Managing Devices via Bridge Web UI

1. Open **http://homeassistant.local:8099** (or bridge IP)
2. **Devices tab**: View registered devices, add manually, edit, delete
3. **Discovery tab**: See devices observed on network, bulk import to registry
4. Changes are persisted automatically

### Managing Devices via Home Assistant

1. Go to **Settings → Devices & Services → Add Integration**
2. Select **u::lux Display**
3. Choose discovery (bridge finds devices) or manual (enter MAC + IP)
4. Device is created in HA config and auto-registered in bridge registry
5. Once registered, you can create displays and assign views

### Managing Devices via MQTT

Publish to these topics (requires MQTT enabled in bridge config):

```bash
# Add device
mosquitto_pub -t ulux/registry/add_device -m '{"switch_id":"00:11:22:33:44:55","name":"Kitchen","ip":"192.168.1.100","port":50000}'

# Update device
mosquitto_pub -t ulux/registry/update_device -m '{"switch_id":"00:11:22:33:44:55","name":"Kitchen Display"}'

# Delete device
mosquitto_pub -t ulux/registry/delete_device -m '{"switch_id":"00:11:22:33:44:55"}'
```

---

## Troubleshooting

**Bridge won't connect to HA?**
- Check that the token is provided to the bridge (see bridge README)
- The bridge can run standalone if token is missing; HA integration will fail

**Devices not showing in HA config flow?**
- Ensure the bridge is running and accessible at the configured URL
- Check bridge logs: **Settings → Add-ons → u::Lux UMP Bridge → Logs**
- Visit bridge web UI to verify devices are registered

**Text/icons too small in preview?**
- Ensure font files are installed in the integration fonts directory
- See [fonts README](custom_components/ulux_display/fonts/README.md)

**Images not streaming to switch?**
- Verify switch IP and port in bridge registry
- Check that switch is powered on and has network connectivity
- Review bridge logs for "Bridge API" error messages

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.
