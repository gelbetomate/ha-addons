# u::lux Display — Home Assistant Custom Integration

[![Add HACS Repository](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gelbetomate&repository=ha-addons&category=integration)

A Home Assistant custom integration that renders rich, customisable dashboards on the **u::lux Switch IP** (a 240×240 pixel wall-mounted smart display). It bridges Home Assistant entity state with live visuals through a flexible widget/layout system. Rendered images are pushed to the **ulux UMP Bridge** add-on via HTTP, which handles all UMP/UDP communication with the physical device.

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
| **Transport** | HTTP → UMP Bridge add-on → UMP/UDP (port 34988) — fully local, no cloud |
| **IOT class** | `local_polling` |

---

## Requirements

- Home Assistant 2024.1+
- [HACS](https://hacs.xyz/) for installation
- Python packages (installed automatically):
  - `pillow >= 10.0.0`
  - `palettable >= 3.3.0`

---

## Installation

### Via HACS (recommended)

1. Open your Home Assistant instance and navigate to **HACS** in the sidebar.
2. Click the three-dot menu (⋮) and select **Custom repositories**.
3. Add `https://github.com/gelbetomate/ha-addons` with category **Integration**.
4. Search for **u::lux Display**, click **Download**, and restart Home Assistant.
5. Go to **Settings → Devices & Services → Add Integration** and search for **u::lux Display**.

### Manual

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
| `bridge_url` | `http://localhost:8099` | Base URL of the UMP Bridge add-on HTTP API |
| `switch_id` | — | Switch identifier as reported by the bridge (e.g. `AA:BB:CC:DD:EE:FF`) — discovered automatically or entered manually |
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

### Architecture — integration → bridge → device

The integration does **not** speak UMP or UDP directly. Instead it follows a two-hop path:

```
HA Integration  ──HTTP POST──▶  UMP Bridge add-on  ──UMP/UDP──▶  u::lux Switch IP
 (Python/PIL)                    (Node.js, port 8099)             (port 34988)
```

1. **Render** — The coordinator renders the current screen into a 240×240 PIL image (with 2× supersampling for anti-aliased text and graphics).
2. **Push to bridge** — The rendered image is base64-encoded as a PNG and sent to the bridge via:
   ```
   POST <bridge_url>/api/display/image/<switch_id>
   Body: { "base64": "<png>", "width": 240, "height": 240 }
   ```
3. **UMP streaming** — The bridge decodes the PNG, converts it to **RGB565** (5-bit red, 6-bit green, 5-bit blue, little-endian) and streams it line-by-line to the physical device over UDP (port 34988) using stop-and-wait flow control.

The bridge also exposes `GET /api/discovery/devices`, which the config flow uses to discover switches that have announced themselves over UDP.

### Smart Backoff

When the bridge is unreachable (HTTP connection error) the integration backs off exponentially (1×, 2×, 4×, 8×… up to 16× the refresh interval) to avoid log spam and reduce network overhead. It recovers automatically as soon as the bridge responds again.

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>.
