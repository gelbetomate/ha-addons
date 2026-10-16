# u::Lux Switch Registry API

This document defines the device registry and discovery API used by the u::lux Supervisor add-on and the `ulux_display` Home Assistant integration.

## Design goals

- Keep the UMP bridge as the transport layer only.
- Maintain a persistent canonical switch registry in the Supervisor add-on.
- Allow the HACS integration to read the registry and instantiate entities.
- Allow the Supervisor UI to create, update, and remove registry entries.
- Keep bridge-discovered devices in sync with configured devices.

## Terms

- **Bridge**: the u::Lux UMP Bridge add-on. Handles UDP/UMP transport and discovery observation.
- **Registry**: persistent device store owned by the Supervisor app.
- **Configured device**: a device explicitly saved in the registry.
- **Discovered device**: a device seen by the bridge, but not necessarily saved in the registry.

## Data model

### SwitchDevice

```json
{
  "id": "ulux:AA:BB:CC:DD:EE:FF",
  "switch_id": "AA:BB:CC:DD:EE:FF",
  "name": "Living Room",
  "ip": "192.168.1.100",
  "port": 34988,
  "discovery_port": 34984,
  "bridge_url": "http://localhost:8099",
  "online_status": "online",
  "last_seen": "2026-05-08T12:00:00Z",
  "discovered": true,
  "configured": true,
  "enabled": true,
  "linked_entry_id": "abcd1234",
  "ump_frame_version": 562,
  "ump_device_id": 93,
  "current_page": 1,
  "page_count": 6,
  "actor_ids": [1, 2, 5, 22],
  "sensors": {
    "temperature": 21.5,
    "humidity": 45.2,
    "co2": 620,
    "voc": 180,
    "in2": 0,
    "lux": 150,
    "last_updated": "2026-05-08T12:00:00Z"
  },
  "state_flags": {
    "raw": 2052,
    "light": false,
    "proximity": false,
    "display_active": true,
    "audio_active": false,
    "intro_active": false,
    "time_request": false,
    "init_request": false,
    "device_error": false,
    "lux_valid": true,
    "temperature_valid": true,
    "humidity_valid": true,
    "co2_valid": false,
    "in2_valid": false,
    "voc_valid": false
  },
  "video_state": {
    "bounds": { "left": 0, "top": 0, "right": 86, "bottom": 90, "width": 86, "height": 90 }
  }
}
```

### DiscoveryEvent

```json
{
  "switch_id": "AA:BB:CC:DD:EE:FF",
  "ip": "192.168.1.100",
  "port": 34988,
  "seen_at": "2026-05-08T12:00:00Z",
  "bridge_url": "http://localhost:8099",
  "source": "udp_ump"
}
```

### RegistrySnapshot

```json
{
  "schema_version": 1,
  "updated_at": "2026-05-08T12:01:00Z",
  "devices": []
}
```

## API endpoints

Base path: `/api/registry`

### GET `/api/registry`
Returns the full registry snapshot.

Response `200`:

```json
{
  "schema_version": 1,
  "updated_at": "2026-05-08T12:01:00Z",
  "devices": [
    {
      "id": "ulux:AA:BB:CC:DD:EE:FF",
      "switch_id": "AA:BB:CC:DD:EE:FF",
      "name": "Living Room",
      "ip": "192.168.1.100",
      "port": 34988,
      "bridge_url": "http://localhost:8099",
      "status": "online",
      "last_seen": "2026-05-08T12:00:00Z",
      "first_seen": "2026-05-08T11:44:00Z",
      "discovered": true,
      "configured": true,
      "enabled": true,
      "ha_entry_id": "abcd1234",
      "notes": ""
    }
  ]
}
```

### GET `/api/registry/devices`
Returns a list of devices only.

### GET `/api/registry/devices/{switch_id}`
Returns a single device.

### POST `/api/registry/devices`
Create a device.

Request body:

```json
{
  "switch_id": "AA:BB:CC:DD:EE:FF",
  "name": "Living Room",
  "ip": "192.168.1.100",
  "bridge_url": "http://localhost:8099",
  "enabled": true,
  "notes": ""
}
```

Rules:
- `switch_id` is required.
- `name` defaults to `u::Lux <switch_id>` if omitted.
- `ip` and `bridge_url` are optional but recommended.

### PATCH `/api/registry/devices/{switch_id}`
Update a device.

Supported fields:
- `name`
- `ip`
- `bridge_url`
- `enabled`
- `notes`
- `ha_entry_id`

### DELETE `/api/registry/devices/{switch_id}`
Remove a device from the registry.

### POST `/api/registry/sync`
Merge bridge discovery into the registry.

Request body optional:

```json
{
  "bridge_url": "http://localhost:8099"
}
```

Behavior:
- fetch `/api/discovery/devices` from one or more bridge URLs
- update `last_seen`, `ip`, `status`, and `discovered`
- do not overwrite `name` if the device is already configured
- create a new registry entry for unseen devices if auto-import is enabled

### POST `/api/registry/devices/{switch_id}/link`
Link a Home Assistant config entry.

Request body:

```json
{
  "ha_entry_id": "abcd1234"
}
```

### POST `/api/registry/devices/{switch_id}/unlink`
Remove a Home Assistant link from a device.

---

## Switch Control Endpoints

Base path: `/api/switch/{switch_id}`

These endpoints send standard UMP v2.43 commands to the targeted u::Lux switch via UDP `34988`.

### POST `/api/switch/{switch_id}/page`
Switch active display page.

Request body:
```json
{
  "page": 2
}
```

### POST `/api/switch/{switch_id}/activate`
Wake display from standby or put it to sleep.

Request body:
```json
{
  "active": true
}
```

### POST `/api/switch/{switch_id}/led`
Control one or all 4 corner LEDs.

Request body:
```json
{
  "led": 1,
  "color": "red",
  "mode": 0
}
```
* `led`: 1..4 (or 0 for all)
* `color`: `"red"`, `"green"`, `"blue"`, `"white"`, `"yellow"`, `"magenta"`, `"cyan"`, `"off"`, or 16-bit integer
* `mode`: `0` (on), `1` (blink slow), `2` (blink fast)

### POST `/api/switch/{switch_id}/text`
Display a custom text string overlay.

Request body:
```json
{
  "field": 1,
  "text": "Living Room 21.5°C",
  "color": "white",
  "x": 0,
  "y": 0
}
```

### POST `/api/switch/{switch_id}/value`
Update an actuator or edit value.

Request body:
```json
{
  "actor_id": 1,
  "value": 42,
  "is_real": false
}
```

### POST `/api/switch/{switch_id}/audio/play`
Play a built-in chime or sound file from local switch storage.

Request body:
```json
{
  "sound_id": 1,
  "volume": 80
}
```

### POST `/api/switch/{switch_id}/audio/stop`
Stop currently playing audio.

Request body: `{}`

### POST `/api/switch/{switch_id}/audio/volume`
Adjust master audio volume.

Request body:
```json
{
  "volume": 75
}
```

### POST `/api/switch/{switch_id}/ump/raw`
Send a raw hex UMP payload string.

Request body:
```json
{
  "hex": "018610003202..."
}
```

---

## Sync rules

1. Bridge sees a device on UDP traffic.
2. Bridge updates its discovery list.
3. Supervisor UI polls or syncs discovery into the persistent registry.
4. Registry marks the device as `discovered: true` and refreshes timestamps.
5. Home Assistant integration reads the registry and creates or updates its entries.
6. The bridge remains responsible only for transport and discovery observation.

## Suggested states

- `online`
- `offline`
- `unknown`

## Error responses

```json
{
  "error": "message",
  "details": "optional details"
}
```

Common codes:
- `400` invalid request
- `404` device not found
- `409` duplicate switch ID
- `500` internal error
