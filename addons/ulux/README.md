# u::Lux UMP Bridge Add-on

The bridge add-on handles transport, device discovery observation, persistent registry management, and provides both HTTP and MQTT APIs for device management.

---

## What It Does

### Core Responsibilities

- **UDP Listener** (port 34988): Listens for UMP packets from u::lux Switch IP devices
- **Device Discovery**: Observes UDP traffic, extracts device info (MAC, IP, port, name)
- **Persistent Registry** (`/data/registry.json`): Maintains canonical device list that survives restarts
- **Image Streaming**: Encodes PIL images and streams via UDP to switches
- **Web UI** (port 8099): Standalone device management interface
- **HTTP API** (`/api/registry/*`): REST endpoints for device CRUD
- **MQTT Integration**: Optional MQTT topics for device management

### What It Does NOT Do

- **Home Assistant config entries**: That's the integration's responsibility
- **Rendering**: PIL rendering happens in the HA integration
- **Entity management**: HA handles entities, services, automations

---

## Features

### Device Registry

The bridge maintains a persistent JSON registry with:

- **Device records**: MAC, name, IP address, UDP port
- **Status tracking**: Online/offline status, last-seen timestamp
- **Linkage metadata**: Home Assistant config entry ID (for cross-referencing)
- **Extensible fields**: Custom metadata for future features

Records are automatically:
- Persisted to disk at `/data/registry.json`
- Merged with discovered devices (UDP traffic)
- Validated on load/save (schema versioning support)

### Discovery Integration

Devices observed on the network are merged into the persistent registry:

1. Switch sends UDP packet (UMP telegram)
2. Bridge extracts MAC, IP, port, device name
3. Record is added/updated in registry
4. Status marked as "online", `last_seen` updated

The registry bridges discovery and configuration — devices don't need to be pre-configured; they're auto-added when first observed.

### Multiple Access Paths

Manage devices via:

1. **Web UI** (port 8099)
   - Device list with status & timestamps
   - Add device manually (MAC + IP)
   - Edit device details
   - Delete devices
   - Discovery tab: import observed devices in bulk

2. **HTTP API** (`/api/registry/*`)
   - `GET /api/registry/devices` — list all
   - `GET /api/registry/devices/:switchId` — get one
   - `POST /api/registry/devices` — create/update
   - `PUT /api/registry/devices/:switchId` — update
   - `DELETE /api/registry/devices/:switchId` — delete

3. **MQTT Topics** (if enabled)
   - `<base_topic>/registry/add_device` — create/update
   - `<base_topic>/registry/update_device` — update
   - `<base_topic>/registry/delete_device` — delete

---

## Configuration

The bridge is configured via `options.json` in Supervisor. Key options:

```json
{
  "switches": [
    { "name": "Kitchen", "switch_id": "00:11:22:33:44:55", "ip": "192.168.1.100", "port": 50000 }
  ],
  "listen_host": "0.0.0.0",
  "listen_port": 34988,
  "mode": {
    "ha_events": true,
    "mqtt": false
  },
  "ha": {
    "ws_url": "ws://supervisor/core/websocket",
    "token": ""
  },
  "mqtt": {
    "host": "core-mosquitto",
    "port": 1883,
    "username": "",
    "password": "",
    "base_topic": "ulux"
  },
  "api_port": 8099,
  "log_level": "info"
}
```

### Key Settings

- **`ha.token`**: Home Assistant token for WebSocket integration (optional)
  - If not provided, HA integration is disabled (bridge still works standalone)
  - If empty, check that `SUPERVISOR_TOKEN` env var is set by Supervisor

- **`switches`**: Pre-configured switches (optional)
  - Used for backwards compatibility
  - Auto-populated into registry on startup if not already present
  - Discovery will add/update additional switches as they're observed

- **`mode.mqtt`**: Enable/disable MQTT integration (default: false)
  - If enabled, devices can be managed via MQTT topics

---

## Web UI

Visit **http://homeassistant.local:8099** (or your bridge IP) to access the device registry UI.

### Devices Tab

- **Device list**: Shows all registered devices with status, IP, port
- **Status badges**: Green (online), red (offline), gray (unknown)
- **Add Device**: Register a device manually by MAC and IP
- **Edit**: Modify device name, IP, or port
- **Delete**: Remove a device
- **Bulk import**: (See Discovery tab)

### Discovery Tab

- **Discovered devices**: Shows devices observed on UDP traffic
- **Multi-select**: Click cards to select multiple devices
- **Import Selected**: Add checked devices to registry
- **Import All**: Bulk import all discovered devices
- **Auto-refresh**: Updates every 5 seconds

---

## HTTP API Reference

### List all devices

```bash
GET /api/registry/devices
```

Response:
```json
{
  "devices": [
    {
      "switch_id": "00:11:22:33:44:55",
      "name": "Kitchen Display",
      "ip": "192.168.1.100",
      "port": 50000,
      "online_status": "online",
      "last_seen": "2026-05-08T19:42:03.123Z",
      "discovered_at": "2026-05-08T19:41:00.000Z",
      "created_at": "2026-05-08T19:41:00.000Z",
      "linked_entry_id": "abc123def456",
      "metadata": {}
    }
  ]
}
```

### Get a single device

```bash
GET /api/registry/devices/00:11:22:33:44:55
```

### Create or update a device

```bash
POST /api/registry/devices
Content-Type: application/json

{
  "switch_id": "00:11:22:33:44:55",
  "name": "Kitchen Display",
  "ip": "192.168.1.100",
  "port": 50000
}
```

Response: `201 Created` with device record, or `400 Bad Request` on validation error.

### Update device details

```bash
PUT /api/registry/devices/00:11:22:33:44:55
Content-Type: application/json

{
  "name": "Kitchen Display",
  "ip": "192.168.1.101",
  "port": 50001
}
```

### Delete a device

```bash
DELETE /api/registry/devices/00:11:22:33:44:55
```

Response: `204 No Content` on success, or `404 Not Found`.

---

## MQTT Topics

(Requires `"mqtt": { ... }` config and `mode.mqtt: true`)

### Add/update device

```bash
mosquitto_pub -t ulux/registry/add_device -m '{
  "switch_id": "00:11:22:33:44:55",
  "name": "Living Room",
  "ip": "192.168.1.100",
  "port": 50000
}'
```

### Update device

```bash
mosquitto_pub -t ulux/registry/update_device -m '{
  "switch_id": "00:11:22:33:44:55",
  "name": "Living Room Display"
}'
```

### Delete device

```bash
mosquitto_pub -t ulux/registry/delete_device -m '{"switch_id": "00:11:22:33:44:55"}'
```

---

## Persistence & Restarts

- Registry is saved to `/data/registry.json` (Supervisor persistent storage)
- Saved automatically on changes (debounced)
- Saved on graceful shutdown (SIGTERM)
- Loaded automatically on startup
- If load fails, bridge starts with empty registry (logs warning)
- Pre-configured switches (from `options.json`) are auto-added on startup

---

## Integration with u::lux Display

The HA integration consumes the bridge registry:

1. **Config Flow**: Pulls device list from `/api/registry/devices`
2. **Discovery**: Also considers devices from `/api/discovery/devices` (ephemeral discovery)
3. **Auto-Registration**: When user adds device in HA, it's registered in bridge registry
4. **Rendering**: Integration renders frames and POSTs to `/api/display/image/:switchId`

---

## Logs & Debugging

Check bridge logs in **Settings → Add-ons → u::Lux UMP Bridge → Logs**.

Key log messages:

- `Registry loaded: N devices` — startup successful
- `Switch not yet discovered by bridge` — device added manually but not on network yet
- `MQTT registry command received: action=add_device` — device added via MQTT
- `Bridge shutting down, saving registry` — graceful shutdown
