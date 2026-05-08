# u::Lux Display Integration

This Home Assistant integration renders dashboards for u::lux Switch IP devices and streams them through the u::Lux UMP Bridge add-on.

---

## What It Does

### Rendering

- **PIL-based rendering**: Renders dashboard images using Python Imaging Library
- **Layouts**: Grid, hero, sidebar, split, and custom layouts
- **Widgets**: Cards for entity state, climate, media, camera, charts, gauges, weather, and more
- **Themes**: Configurable colors, fonts, spacing, and effects
- **Responsive**: Adapts to different display sizes

### Home Assistant Integration

- **Config entries**: One entry per u::lux Switch device
- **Entities**: Binary sensors for state, number controls for brightness, select for display mode
- **Services**: Render display, cycle views, refresh, navigate
- **Device linking**: Devices appear in HA Device Registry

### Bridge Communication

- **Config Flow**: Discovers devices from bridge persistent registry
- **Auto-Registration**: Registers devices in bridge when created in HA
- **Rendering Delegation**: Renders frames and POSTs to bridge for streaming
- **Status Tracking**: Checks bridge connectivity on startup

---

## Installation

**Prerequisites**: u::Lux UMP Bridge add-on must be installed and running first.

### Step 1: Install via HACS

1. Open **HACS → Custom repositories**
2. Add `https://github.com/gelbetomate/ha-addons` (type: Integration)
3. Find **u::lux Display** and install it
4. **Restart Home Assistant**

### Step 2: Add Integration

1. Go to **Settings → Devices & Services → Create Automation**
2. Search for **u::lux Display**
3. Choose setup method:
   - **Discover**: Lists devices from bridge registry (recommended)
   - **Manual**: Enter switch MAC and IP manually
4. Select device and configure optional name
5. Finish setup

---

## Configuration

### Setup Method: Discovery

The config flow will:

1. Connect to the bridge at `http://localhost:8099` (default)
2. Fetch device list from `/api/registry/devices`
3. Display discovered devices for selection
4. Auto-fill device IP and port from registry

**Requirements**:
- Bridge must be running
- Bridge must be accessible at the configured URL
- Device must be registered in the bridge registry

### Setup Method: Manual

If discovery doesn't find your device:

1. Enter the **Switch ID** (MAC address, format: `XX:XX:XX:XX:XX:XX`)
2. Enter the **IP address** of the switch on your network
3. Optionally set a display **name**
4. Device is auto-registered in the bridge

---

## Troubleshooting

### Device not found in discovery

**Causes**:
- Bridge is not running
- Bridge URL is incorrect
- Device not registered in bridge

**Solutions**:
1. Check bridge is running: **Settings → Add-ons → u::Lux UMP Bridge → Info**
2. Verify bridge URL in HA config flow (default: `http://localhost:8099`)
3. Register device manually:
   - Visit bridge web UI: `http://homeassistant.local:8099`
   - Use "Add Device" button, enter MAC and IP
   - Restart HA config flow

### "Bridge API returned HTTP 404" errors

**Cause**: Device is registered in HA but not yet discovered by the bridge.

**Solutions**:
1. Power on the u::lux device
2. Trigger a key event (press a button on the device)
3. Wait for the bridge to see it on the network (10-30 seconds)
4. Logs should show: `Switch not yet discovered by bridge — device will be sent once discovered`

### Preview images too small or missing

**Cause**: Font files not installed.

**Solutions**:
1. See [fonts README](fonts/README.md)
2. Ensure font files are present in `custom_components/ulux_display/fonts/`
3. Restart Home Assistant

### "Cannot reach the u::lux bridge URL"

**Cause**: Integration can't connect to bridge.

**Solutions**:
1. Ensure bridge is running: **Settings → Add-ons → u::Lux UMP Bridge**
2. Check network connectivity between HA and bridge
3. Try accessing bridge UI directly: `http://<bridge-ip>:8099`
4. Check bridge logs for errors

---

## Features

### Displays (Config Entries)

Each config entry represents one u::lux Switch:

- **Friendly name**: Customizable display name
- **Status entity**: Binary sensor showing if rendering is active
- **Services**: Render custom frames, cycle displays, refresh
- **Automatic rendering**: Renders on-demand when assigned views change

### Views (Dashboards)

Each display can have multiple views:

- **Layouts**: Choose from grid, hero, sidebar, split, or custom
- **Widgets**: Add entity cards, climate controls, media players, cameras, charts, weather, etc.
- **Styling**: Per-widget and global theme configuration
- **Cycling**: Automatic view rotation (configurable interval)

### Rendering

- **Real-time**: Renders on config change or manual refresh
- **Efficient**: Only renders changed views
- **High-quality**: 2× supersampling (renders at 2× resolution, downscales)
- **RGB565**: Output optimized for u::lux hardware

---

## Services

### Render Display

Render a custom image to the display:

```yaml
service: ulux_display.render_display
target:
  entity_id: select.kitchen_display
data:
  view_name: "Custom View"  # Optional, uses current view if omitted
```

### Refresh Display

Force re-render of the current view:

```yaml
service: ulux_display.refresh_display
target:
  entity_id: select.kitchen_display
```

### Cycle Display

Move to the next view:

```yaml
service: ulux_display.cycle_display
target:
  entity_id: select.kitchen_display
```

---

## Widgets & Layouts

See [widgets documentation](widgets/README.md) for details on:

- **Layouts**: Grid, hero, sidebar, split
- **Widgets**: Text, icon, state, entity, climate, media, camera, chart, gauge, weather
- **Theming**: Colors, fonts, spacing, effects

---

## Bridge API Used

The integration uses the bridge HTTP API:

- `GET /api/registry/devices` — List registered devices
- `GET /api/registry/devices/:switchId` — Get device details
- `POST /api/registry/devices` — Register new device
- `POST /api/display/image/:switchId` — Stream rendered image

---

## Architecture Notes

The integration is **registry-backed**:

1. **Source of truth**: Bridge persistent registry (`/data/registry.json`)
2. **Config entries**: HA creates entries for selected devices
3. **No duplication**: HA doesn't maintain a second device list
4. **Auto-sync**: New devices in HA are registered in bridge
5. **Status tracking**: Online status from bridge feeds into HA

This design allows the bridge to work standalone (with its own UI) while HA provides Home Assistant-specific features (entities, automations, services).

---

## Advanced Configuration

### Custom Bridge URL

If the bridge is not at `http://localhost:8099`, set it during setup:

- Discovery step: Enter bridge URL before selecting device
- Manual step: Enter bridge URL before entering MAC

### Font Customization

Custom fonts can be added to the `fonts/` directory:

1. Add `.ttf` files to `custom_components/ulux_display/fonts/`
2. Restart Home Assistant
3. Reference in widget config by filename (without extension)

### Building from Source

Frontend is built with TypeScript + Vite:

```bash
cd custom_components/ulux_display/frontend
npm install
npm run build
```

Output: `dist/ulux-display-panel.js`

---

## Support

Open an issue at <https://github.com/gelbetomate/ha-addons/issues>
