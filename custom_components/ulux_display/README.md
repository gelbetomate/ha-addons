# u::lux Display — Home Assistant Custom Integration

[![Add HACS Repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gelbetomate&repository=ha-addons&category=integration)

A Home Assistant custom integration that renders rich, customisable dashboards on the **u::lux Switch IP** (a 240×240 pixel wall-mounted smart display). It bridges Home Assistant entity state with the device display via the **u::Lux UMP Bridge** add-on.

> ⚠️ **The UMP Bridge add-on must be installed and running before this integration will work.** See [Installation order](#installation-order) below.

---

## Architecture

The integration and the bridge add-on are two separate but tightly coupled components. The integration handles all Home Assistant logic (entities, rendering, config flow). The bridge add-on owns all UDP/UMP communication with the physical switch.

```
Physical u::lux Switch IP
       ↕ UDP 34988 (UMP)
┌─────────────────────────────────┐
│   u::Lux UMP Bridge Add-on      │
│   (Node.js, HA Supervisor)      │
│                                 │
│  • Receives key events          │
│  • Handles switch init & time   │
│  • Streams images to switch     │
│  • Device discovery registry    │
│                                 │
│  HTTP API on port 8099:         │
│    GET  /api/health             │
│    GET  /api/discovery/devices  │
│    POST /api/display/image/:id  │
└──────────────┬──────────────────┘
               │ HTTP (localhost:8099)
┌──────────────▼──────────────────┐
│   u::lux Display Integration    │
│   (Python, HACS custom comp.)   │
│                                 │
│  • Config flow (discover/manual)│
│  • PIL image rendering          │
│  • Layouts, widgets, themes     │
│  • HA entities & services       │
│  • POSTs base64 PNG to bridge   │
└─────────────────────────────────┘
```

The integration **does not speak UDP**. It renders a PIL image and sends it as a base64-encoded PNG to the bridge via HTTP. The bridge converts it to RGB565 and streams it to the switch over UMP/UDP.

Key events travel in the opposite direction: the switch sends UMP packets to the bridge, which decodes them and fires `ulux_event` / `ulux_key` events into Home Assistant via the WebSocket API.

---

## Features

| Feature | Details |
|---------|---------|
| **Display resolution** | 240×240 pixels |
| **Rendering** | PIL-based with 2× supersampling (anti-aliased text & graphics) |
| **Themes** | 10 built-in colour themes |
| **Layouts** | 20 layout templates |
| **Widgets** | 16 widget types |
| **Multi-screen** | Multiple screens per device with optional auto-cycling |
| **Global views** | Shared views assignable to multiple devices |
| **Transport** | UMP over UDP (port 34988) via bridge — fully local, no cloud |
| **IOT class** | `local_polling` |

---

## Requirements

- Home Assistant 2024.1+ with Supervisor (for the bridge add-on)
- [HACS](https://hacs.xyz/) for integration installation
- **u::Lux UMP Bridge** add-on running (see [Installation order](#installation-order))
- Python packages (installed automatically):
  - `pillow >= 10.0.0`
  - `palettable >= 3.3.0`

---

## Installation Order

**Install the bridge add-on first.** The integration config flow talks to the bridge to discover your switch — if the bridge is not running, the config flow will fail.

### Step 1 — Install the UMP Bridge Add-on

1. Navigate to **Settings → Add-ons → Add-on Store**.
2. Click **⋮ → Repositories** and add `https://github.com/gelbetomate/ha-addons`.
3. Find **u::Lux UMP Bridge** and install it.
4. Configure it with your switch details (see the [bridge README](../../addons/ulux/README.md)):

```yaml
switches:
  - name: "Living Room"
    switch_id: "AA:BB:CC:DD:EE:FF"   # MAC address of your switch
    ip: "192.168.1.100"
listen_port: 34988
api_port: 8099
stream:
  width: 240
  height: 240
  lines_per_packet: 5
  inter_packet_delay_ms: 5
mode:
  ha_events: true
  mqtt: false
log_level: "info"
```

5. Start the add-on and confirm it is running (green status, no errors in the log tab).

### Step 2 — Install the Integration via HACS

1. Open **HACS** in the sidebar.
2. Click **⋮ → Custom repositories**.
3. Add `https://github.com/gelbetomate/ha-addons` with category **Integration**.
4. Search for **u::lux Display**, click **Download**, and restart Home Assistant.
5. Go to **Settings → Devices & Services → Add Integration** and search for **u::lux Display**.

### Step 3 — Config Flow

The config flow asks for:

| Field | Default | Description |
|-------|---------|-------------|
| **Bridge URL** | `http://localhost:8099` | URL of the UMP Bridge add-on HTTP API. Use the default if bridge and HA run on the same host. |
| **Action** | Discover | **Discover** fetches known switches from the bridge. **Manual** lets you enter a switch MAC directly. |

> **Tip — Discover vs Manual:** The discovery endpoint only lists switches that have already sent at least one UMP packet to the bridge (i.e. the switch has powered on and communicated). If you run the config flow before the switch has sent any packet, use **Manual** entry instead — it works identically, just skips the discovery call.

### Manual Installation (without HACS)

Copy the `custom_components/ulux_display/` folder into your Home Assistant `config/custom_components/` directory and restart.

---

## Testing Your Setup

Follow this sequence to verify each layer independently before testing end-to-end.

### 1 — Verify the bridge add-on

| Check | How |
|-------|-----|
| Add-on started | Log tab shows `HTTP API server listening on port 8099` |
| Health endpoint | HA terminal: `curl http://localhost:8099/api/health` → `{"ok":true}` |
| Switch discovered | Power-cycle the switch, then: `curl http://localhost:8099/api/discovery/devices` → switch MAC appears in the `devices` array |
| Init handled | Log shows `Sent ID-Control` and `Sent DateTime` after switch powers on |
| Key press received | Developer Tools → Events → listen to `ulux_key`, press a key on the switch |

### 2 — Verify the display integration

| Check | How |
|-------|-----|
| Integration loads | Device appears in Settings → Devices & Services, no errors in HA logs |
| Image pushed | Bridge log shows `streamed image to switch` every ~10 s |
| Display shows content | Default clock widget appears on the physical switch |
| Preview entity | `image.ulux_display_<name>` shows the live rendered PNG in HA |
| Refresh button | Press `button.refresh` — display updates immediately |
| Next/Prev screen | Press next/previous screen buttons — display cycles |
| Active switch | Toggle `switch.active` off — display goes dark; toggle on — resumes |

### 3 — Test the notify service

```yaml
service: ulux_display.notify
data:
  device_id: <your device id from Settings → Devices>
  message: "Hello from HA!"
  icon: "mdi:home"
  duration: 8
```

Expected: overlay appears on the physical display for 8 seconds, then returns to the normal screen.

### 4 — End-to-end round-trip: key press → display change

This automation wires a key press on the switch to a screen change on the display, proving the full loop:

```yaml
automation:
  - alias: "u::lux Key 1 → Next Screen"
    trigger:
      platform: event
      event_type: ulux_key
      event_data:
        action: "pressed"
        key: 1
    action:
      - service: button.press
        target:
          entity_id: button.ulux_display_next_screen
```

Other useful round-trip automations:

```yaml
automation:
  - alias: "u::lux Key 2 → Notify overlay"
    trigger:
      platform: event
      event_type: ulux_key
      event_data:
        action: "pressed"
        key: 2
    action:
      - service: ulux_display.notify
        data:
          device_id: <your device id>
          message: "Key 2 pressed!"
          icon: "mdi:gesture-tap-button"
          duration: 5

  - alias: "u::lux Key 3 → Toggle display"
    trigger:
      platform: event
      event_type: ulux_key
      event_data:
        action: "pressed"
        key: 3
    action:
      - service: switch.toggle
        target:
          entity_id: switch.ulux_display_active
```

---

## Widgets

Widgets are responsive — they adapt their layout based on available height (MICRO / TINY / SMALL / MEDIUM / LARGE).

| Widget | Description |
|--------|-------------|
| `attribute_list` | Entity attributes displayed as a list |
| `camera` | Live camera feed (re-fetched each cycle) |
| `candlestick` | OHLC candlestick chart for financial/time-series data |
| `chart` | Line / area chart with history from HA recorder |
| `climate` | Thermostat (current temp, setpoint, mode, fan) |
| `clock` | Digital or analogue time display (default widget) |
| `entity` | Generic entity state with unit |
| `gauge` | Radial gauge (e.g. 0–100 %) |
| `icon` | Static Material Design Icon |
| `media` | Media player (album art, title, artist, progress bar) |
| `multi_progress` | Multiple stacked progress bars |
| `progress` | Single progress bar with percentage |
| `status` | Binary entity on/off state with icon and colour |
| `status_list` | Multiple binary entity statuses in a list |
| `text` | Static or entity-driven text |
| `weather` | Current weather with temperature, humidity, and forecast |

---

## Layouts

| Layout | Slots | Description |
|--------|-------|-------------|
| `fullscreen` | 1 | Single full-size slot |
| `split_horizontal` | 2 | 50/50 horizontal split |
| `split_vertical` | 2 | 50/50 vertical split |
| `split_h_1_2` | 2 | 33/67 horizontal split |
| `split_h_2_1` | 2 | 67/33 horizontal split |
| `three_column` | 3 | Equal columns |
| `three_row` | 3 | Equal rows |
| `hero` | varies | Large hero + small details grid |
| `hero_simple` | 2 | Hero dominant + one detail |
| `hero_corner_tl/tr/bl/br` | varies | Hero anchored to a corner |
| `sidebar_left` | 2 | Left sidebar + main area |
| `sidebar_right` | 2 | Right sidebar + main area |
| `grid_2x2` | 4 | 2×2 grid |
| `grid_2x3` | 6 | 2×3 grid |
| `grid_3x2` | 6 | 3×2 grid |
| `grid_3x3` | 9 | 3×3 grid |

---

## Themes

`classic` · `minimal` · `neon` · `retro` · `soft` · `light` · `ocean` · `sunset` · `forest` · `candy`

---

## Entities Created

Each device gets the following entities:

| Platform | Entity | Description |
|----------|--------|-------------|
| `image` | Display preview | Live PNG of the current rendered frame |
| `sensor` | Device state | Brightness, storage, model info |
| `number` | Brightness / Refresh interval | Adjustable numeric controls |
| `select` | Screen / Theme / Layout | Drop-down selectors |
| `button` | Refresh / Cycle screen / Pause/Resume | Action triggers |
| `switch` | Display on/off / Sleep mode | Toggle controls |

---

## Services

### `ulux_display.notify`

Push a temporary overlay notification to a device:

```yaml
service: ulux_display.notify
data:
  device_id: device.ulux_display_192_168_1_100
  message: "Temperature Alert"
  icon: "mdi:thermometer-high"
  duration: 10        # seconds the overlay is shown
  theme: "classic"    # optional, overrides device theme
```

---

## Global Views

Views can be created once and shared across multiple devices. They are stored in Home Assistant's persistent storage and managed via the custom panel at `/ulux_display` or the WebSocket API.

---

## Technical Details

### Transport — Bridge-mediated UMP over UDP

The integration does not communicate with the switch directly. On each render cycle it:
1. Renders the current screen as a PIL image at 480×480 px (2× supersampling).
2. Downscales to 240×240 and encodes as a base64 PNG.
3. POSTs the image to `POST /api/display/image/<switch_id>` on the bridge (default `http://localhost:8099`).
4. The bridge decodes the PNG, converts to **RGB565** (little-endian, 2 bytes/pixel), and streams it to the switch line-by-line via UMP video datagrams over UDP port 34988.

### Smart Backoff

When the bridge reports an error (or is unreachable), the integration backs off exponentially (1×, 2×, 4×, 8×… up to 16× the refresh interval) to avoid log spam and reduce load. It recovers automatically as soon as a push succeeds again.

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.
