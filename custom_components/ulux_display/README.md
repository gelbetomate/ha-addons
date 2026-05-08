# u::lux Display — Home Assistant Custom Integration

[![Add HACS Repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gelbetomate&repository=ha-addons&category=integration)

A Home Assistant custom integration that renders rich, customisable dashboards on the **u::lux Switch IP** (a 240×240 pixel wall-mounted smart display). It bridges Home Assistant entity state with live visuals through a flexible widget/layout system and the UMP (u::lux Message Protocol) over UDP.

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
| **Transport** | UMP over UDP (port 34988) — fully local, no cloud |
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

## Requirements

### UMP Bridge add-on

This integration does **not** communicate directly with the u::lux Switch IP hardware. It delegates all device communication to the **ulux UMP Bridge** Home Assistant add-on, which must be installed and running first. The bridge exposes a local HTTP API (default port **8099**) that the integration uses to push rendered images.

Install the bridge add-on from the same HACS repository before setting up this integration.

---

## Configuration

Setup is fully UI-driven via the config flow. You will be prompted for:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `switch_ip` | — | IP address of the u::lux Switch IP device |
| `actor_id` | `22` | UMP actor ID |
| `page_id` | `4` | Page index on the device |
| `refresh_interval` | `10` s | How often to re-render and push the display |
| `screen_cycle_interval` | `0` s | Auto-cycle interval between screens (0 = manual) |

Further options (screens, layouts, widgets, themes) are configured in the integration's **Options** panel or via the custom panel at `/ulux_display`.

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

### Transport — UMP over UDP

All communication uses the **u::lux Message Protocol** (UMP) over UDP port 34988. Images are encoded as **RGB565** (5-bit red, 6-bit green, 5-bit blue, little-endian) and streamed line-by-line with stop-and-wait flow control. The integration uses `asyncio.DatagramProtocol` for non-blocking I/O.

### Smart Backoff

When a device is unreachable the integration backs off exponentially (1×, 2×, 4×, 8×… up to 16× the refresh interval) to avoid log spam and reduce network overhead. It recovers automatically when the device comes back online.

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.
