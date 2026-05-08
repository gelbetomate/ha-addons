# u::Lux UMP Bridge App

[![Add App Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fgelbetomate%2Fha-addons)

This has a very early Stage and not recommended to install in production!!!!! If it doesn't install or breaks something blame yourself.

A Home Assistant app that bridges **u::Lux Switch IP** devices to Home Assistant via the
[u::Lux Message Protocol (UMP)](https://www.u-lux.com/fileadmin/user_upload/Downloads/PDF/Technische_Downloads/en/uLux_Switch_UMP_en.pdf)
over UDP (port **34988** / `0x88AC`).

## Features

- Listens for inbound UMP telegrams on UDP port **34988** from one or more u::Lux Switch IP devices.
- Decodes the UMP telegram structure (16-byte header + variable-length messages, little-endian).
- **ID-Event (0x51)** — parses key presses/releases from the 4-key bitfield:
  - Emits a snapshot `ulux_event` on every key-state change.
  - Emits per-key edge events `ulux_key` (pressed/released) by tracking state per actor.
  - On first packet after restart: only snapshot, no spurious edges.
- **ID-State (0x01)** — parses StateFlags and auto-responds to the switch:
  - **InitRequest** (bit 6): replies with an `ID-Control` message.
  - **TimeRequest** (bit 5): replies with a `DateTime` message (system clock).
  - Replies always go to **`remote.address:remote.port`** (dynamic, multi-switch safe).
- Publishes events to Home Assistant via the native **WebSocket API** (configurable).
- Optional **MQTT** mode: publish inbound events to MQTT topics (see below).
- Supports **multiple switches** — configured by name, switch ID, IP and optional port.

## Installation

1. Add this repository to your Home Assistant instance (see the [repository README](../../README.md)).
2. Search for **"u::Lux UMP Bridge"** in the App Store and install it.
3. Configure the app (see below).
4. Start the app.

## Configuration

Example configuration:

```yaml
switches:
  - name: "Living Room"
    switch_id: "01:23:45:67:89:AB"
    ip: "192.168.1.100"
  - name: "Hallway"
    switch_id: "AA:BB:CC:DD:EE:FF"
    ip: "192.168.1.101"
listen_host: "0.0.0.0"
listen_port: 34988
control_flags: 0
mode:
  ha_events: true
  mqtt: false
ha:
  ws_url: "ws://supervisor/core/websocket"
  token: ""           # Leave empty to use the Supervisor token automatically
mqtt:
  host: "core-mosquitto"
  port: 1883
  username: ""
  password: ""
  base_topic: "ulux"
stream:
  width: 86
  height: 90
  lines_per_packet: 5
  inter_packet_delay_ms: 5
log_level: "info"
```

### Option descriptions

| Option | Default | Description |
|--------|---------|-------------|
| `switches` | `[]` | List of known u::Lux switches. Each entry requires `name`, `switch_id` and `ip`. |
| `listen_host` | `0.0.0.0` | Host/IP address to bind the UDP socket to. |
| `listen_port` | `34988` | UDP port to listen on (UMP default: `0x88AC` = 34988). |
| `control_flags` | `0` | 32-bit ControlFlags value sent to the switch during initialisation (ID-Control reply). `0` is a safe default; consult the UMP spec or your switch documentation for flag definitions. |
| `mode.ha_events` | `true` | Publish received events to HA via the WebSocket API. |
| `mode.mqtt` | `false` | Also publish events to MQTT (requires broker config). |
| `ha.ws_url` | `ws://supervisor/core/websocket` | Home Assistant WebSocket URL. |
| `ha.token` | `""` | Long-lived access token. Leave empty to use the Supervisor-provided token (`SUPERVISOR_TOKEN`). |
| `mqtt.host` | `core-mosquitto` | MQTT broker hostname. |
| `mqtt.port` | `1883` | MQTT broker port. |
| `mqtt.username` | `""` | MQTT username. |
| `mqtt.password` | `""` | MQTT password. |
| `mqtt.base_topic` | `ulux` | MQTT topic prefix. |
| `stream.width` | `86` | Target display width used for image scaling before streaming. |
| `stream.height` | `90` | Target display height used for image scaling before streaming. |
| `stream.lines_per_packet` | `5` | Number of image lines sent in each video-stream datagram. |
| `stream.inter_packet_delay_ms` | `5` | Delay between video-stream datagrams to reduce packet drops. |
| `log_level` | `info` | Log verbosity: `debug`, `info`, `warning`, `error`, `fatal`. |

## Initialization behaviour

When a u::Lux switch powers on (or reconnects), it sends an **ID-State** message with:
- **InitRequest** (StateFlags bit 6 = 1): the app immediately sends back an **ID-Control** message with the configured `control_flags` value.
- **TimeRequest** (StateFlags bit 5 = 1): the app immediately sends back a **DateTime** message with the current system time.

Both replies are sent to the same `IP:port` that the switch sent from.

## Home Assistant Automations

When `mode.ha_events: true`, the app fires HA events for use in automations.

### `ulux_event` — snapshot event (every key-state change and every ID-State)

```yaml
automation:
  - alias: "Any u::Lux key event"
    trigger:
      platform: event
      event_type: ulux_event
    action:
      - service: notify.persistent_notification
        data:
          message: >
            Switch {{ trigger.event.data.switch_name }}:
            keys_down={{ trigger.event.data.keys_down }}
```

| Field | Type | Description |
|-------|------|-------------|
| `switch_id` | string | Switch ID from config (or null if unknown). |
| `switch_name` | string | Human-readable switch name from config. |
| `ip` | string | Sender IP address. |
| `actor_id` | number | Actor ID from the UMP message (usually 0). |
| `key_state_raw` | number | Raw 4-bit bitmask: bit 0=Key1, bit 1=Key2, bit 2=Key3, bit 3=Key4. *(ID-Event only)* |
| `keys_down` | number[] | Array of key numbers (1–4) currently pressed. *(ID-Event only)* |
| `state_flags` | number | Raw 32-bit StateFlags. *(ID-State only)* |
| `init_request` | boolean | True if switch requested init. *(ID-State only)* |
| `time_request` | boolean | True if switch requested time sync. *(ID-State only)* |
| `timestamp` | string | ISO 8601 timestamp. |

### `ulux_key` — edge event (key pressed or released)

Fires once per key per transition, after the first ID-Event for that actor context.

```yaml
automation:
  - alias: "Living Room Key 1 Pressed"
    trigger:
      platform: event
      event_type: ulux_key
      event_data:
        switch_id: "01:23:45:67:89:AB"
        key: 1
        action: "pressed"
    action:
      - service: light.toggle
        target:
          entity_id: light.living_room
```

| Field | Type | Description |
|-------|------|-------------|
| `switch_id` | string | Switch ID from config. |
| `switch_name` | string | Switch name from config. |
| `ip` | string | Sender IP address. |
| `actor_id` | number | Actor ID from the UMP message. |
| `key` | number | Key number that changed (1–4). |
| `action` | string | `"pressed"` or `"released"`. |
| `key_state_raw` | number | New key state bitmask. |
| `prev_key_state_raw` | number | Previous key state bitmask. |
| `timestamp` | string | ISO 8601 timestamp. |

## Networking

The app runs with **host networking** so it can bind UDP/34988 and receive packets from the local network. No additional port mapping is needed.

Configure each u::Lux Switch IP to send UMP packets to the bridge host's IP address.

## HTTP API

The bridge exposes a JSON REST API on port **8099** (configurable via `api_port`).

### `GET /api/health`

Health check — returns `200 OK` as soon as the server is ready.

```json
{ "ok": true }
```

### `GET /api/discovery/devices`

Returns all switches that have been seen on the network since the bridge started.

```json
{
  "devices": [
    { "switch_id": "AA:BB:CC:DD:EE:FF", "ip": "192.168.1.100", "lastSeen": "2026-05-08T12:00:00.000Z" }
  ]
}
```

Used by the `ulux_display` integration config flow to populate the device picker.

### `POST /api/display/image/:switchId`

Push a rendered image to a specific switch. The bridge converts it to RGB565 and streams it to the device over UMP/UDP.

| Parameter | Location | Description |
|-----------|----------|-------------|
| `switchId` | URL path | Switch ID (MAC address) as configured — URL-encoded |
| `base64` | JSON body | **Required.** Base64-encoded PNG (or other image format) |
| `width` | JSON body | Optional. Target width in pixels (default: `stream.width` from config) |
| `height` | JSON body | Optional. Target height in pixels (default: `stream.height` from config) |

**Request example:**

```http
POST /api/display/image/AA%3ABB%3ACC%3ADD%3AEE%3AFF
Content-Type: application/json

{
  "base64": "<base64-encoded PNG>",
  "width": 240,
  "height": 240
}
```

**Responses:**

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{ "ok": true }` | Image streamed successfully |
| `400` | `{ "error": "..." }` | Invalid JSON or missing `base64` field |
| `404` | `{ "error": "Unknown switch_id: ..." }` | `switchId` not in configured switches list |
| `500` | `{ "error": "..." }` | Streaming failed (UDP error etc.) |

---

## MQTT Topics

Enable with `mode.mqtt: true`. All topics are prefixed with `mqtt.base_topic` (default `ulux`).

### Inbound events (bridge → MQTT broker, published by bridge)

| Topic | Trigger | Payload |
|-------|---------|---------|
| `ulux/<switch_id>/event/key` | Any key-state change | `ulux_event` JSON (ID-Event) |
| `ulux/<switch_id>/event/key_edge` | Per-key press/release transition | `ulux_key` JSON |
| `ulux/<switch_id>/event/state` | Switch initialisation / time request | `ulux_event` JSON (ID-State) |
| `ulux/<switch_id>/event/raw` | Unhandled message IDs | Raw hex packet info |

**Example — key edge event:**

```json
{
  "switch_id": "AA:BB:CC:DD:EE:FF",
  "switch_name": "Living Room",
  "ip": "192.168.1.100",
  "actor_id": 0,
  "key": 1,
  "action": "pressed",
  "key_state_raw": 1,
  "prev_key_state_raw": 0,
  "timestamp": "2026-05-08T12:00:00.000Z"
}
```

**Example — key snapshot event:**

```json
{
  "switch_id": "AA:BB:CC:DD:EE:FF",
  "switch_name": "Living Room",
  "ip": "192.168.1.100",
  "actor_id": 0,
  "key_state_raw": 3,
  "keys_down": [1, 2],
  "timestamp": "2026-05-08T12:00:00.000Z"
}
```

### Outbound commands (MQTT broker → bridge → switch, subscribed by bridge)

| Topic | Direction | Description |
|-------|-----------|-------------|
| `ulux/<switch_id>/cmd/display/image` | Subscribe | Stream an image to the switch display |

**Publish to `ulux/<switch_id>/cmd/display/image`:**

```json
{
  "base64": "<base64-encoded image>",
  "width": 240,
  "height": 240,
  "lines_per_packet": 5,
  "inter_packet_delay_ms": 5
}
```

Image source fields (choose exactly one):

| Field | Description |
|-------|-------------|
| `base64` | Base64-encoded image data (plain base64 or data URL) |
| `url` | HTTP/HTTPS URL — bridge fetches it at command time |
| `path` | Local file path inside the bridge container |

The `width`, `height`, `lines_per_packet` and `inter_packet_delay_ms` fields are optional and override the corresponding `stream.*` config defaults per command.

---

## UMP/UDP Interface

All communication with u::Lux Switch IP devices uses the **u::Lux Message Protocol (UMP)** over UDP port **34988** (`0x88AC`).

### Wire format

Every UDP datagram is a single UMP **telegram**:

```
Telegram (n bytes, all fields little-endian)
├── Header (16 bytes)
│   ├── [0-1]  TotalLength   UInt16LE — total datagram size incl. header
│   ├── [2-3]  ProtocolVersion / reserved
│   ├── [4-9]  DeviceAddress  6-byte MAC of the sender
│   ├── [10-11] PacketID      UInt16LE — incrementing sequence counter
│   └── [12-15] Reserved
└── Messages (one or more, back-to-back)
    ├── [0]    MessageLength  UInt8 — total size of this message incl. this byte
    ├── [1]    MessageID      UInt8
    ├── [2-3]  ActorID        UInt16LE
    └── [4+]   Payload        (varies by MessageID)
```

### Inbound messages (switch → bridge)

| MessageID | Name | Description |
|-----------|------|-------------|
| `0x01` | **ID-State** | StateFlags (32-bit LE). Bit 6 = InitRequest, bit 5 = TimeRequest. Bridge auto-replies. |
| `0x51` | **ID-Event** | Key-state bitmask (4 bits). Bit 0=Key1, bit 1=Key2, bit 2=Key3, bit 3=Key4. |

### Outbound messages (bridge → switch)

| MessageID | Name | When sent | Description |
|-----------|------|-----------|-------------|
| `0x21` | **ID-Control** | On InitRequest | 8 bytes. Carries `control_flags` (UInt32LE). Safe default: `0x00000000`. |
| `0x2F` | **DateTime** | On TimeRequest | 12 bytes. Year (UInt16LE), Month, Day, Hour, Minute, Second, DayOfWeek (ISO: 1=Mon). |
| `0x8601` | **VideoStart** | Before image stream | Signals start of a new video frame; carries a 32-bit sequence ID. |
| `0x8602` | **VideoStream** | Per image chunk | Carries RGB565 LE pixel data for `linesPerPacket` lines, with `startLine` offset. |

### Image streaming sequence

```
Bridge                              Switch
  │  VideoStart(seqId)                │
  │ ─────────────────────────────────▶│
  │  VideoStream(seqId, line=0, ...)  │
  │ ─────────────────────────────────▶│
  │  VideoStream(seqId, line=5, ...)  │
  │ ─────────────────────────────────▶│
  │           … (one packet per N lines, with inter_packet_delay_ms pause)
  │  VideoStream(seqId, line=235,...) │
  │ ─────────────────────────────────▶│
```

Pixels are encoded as **RGB565 little-endian**: 5 red bits, 6 green bits, 5 blue bits, packed into a UInt16LE per pixel, sent row by row. The number of lines per datagram and the inter-packet delay are tunable via `stream.lines_per_packet` and `stream.inter_packet_delay_ms`.

---

## Standalone Docker

Use this deployment method when you are **not** running the Home Assistant Supervisor (e.g. HA Container, HA Core, a NAS, or any plain Linux/Docker host), but you still want the UMP Bridge running alongside your HA instance.

### Prerequisites

- Docker and Docker Compose installed on the host
- The host must run **Linux** — `network_mode: host` is required for UDP to work correctly.  
  On macOS or Windows Docker Desktop, host networking behaves differently and UDP port binding may not work as expected.

### Step-by-step setup

1. **Clone or download this repository:**

   ```bash
   git clone https://github.com/gelbetomate/ha-addons.git
   cd ha-addons/addons/ulux
   ```

2. **Copy the example config and edit it:**

   ```bash
   cp options.example.json options.json
   ```

   Open `options.json` and update at minimum:

   | Key | What to set |
   |-----|-------------|
   | `switches[].switch_id` | MAC address of your u::Lux Switch IP |
   | `switches[].ip` | Local IP address of the switch |
   | `stream.width` / `stream.height` | `240` — the u::Lux Switch IP display is 240×240 |

3. **Choose a Home Assistant integration mode** (or disable HA events entirely):

   **Option A — with HA long-lived access token** (most common for standalone):

   Set in `options.json`:
   ```json
   "mode": { "ha_events": true, "mqtt": false },
   "ha": {
     "ws_url": "ws://<your-ha-host>:8123/api/websocket",
     "token": "<long-lived-access-token>"
   }
   ```
   In HA go to **Profile → Security → Long-Lived Access Tokens → Create Token**, copy the token and paste it into `ha.token`.

   **Option B — MQTT only, no HA token required**:

   Set in `options.json`:
   ```json
   "mode": { "ha_events": false, "mqtt": true },
   "mqtt": {
     "host": "<broker-host>",
     "port": 1883,
     "base_topic": "ulux"
   }
   ```
   Key events are published to MQTT topics; no HA WebSocket connection is established.

   **Option C — HTTP API only** (use the `ulux_display` HACS integration or custom clients):

   Set in `options.json`:
   ```json
   "mode": { "ha_events": false, "mqtt": false }
   ```
   The bridge still listens for UMP packets and exposes the HTTP API, but does not push events anywhere automatically. Push images via `POST /api/display/image/<switchId>`.

4. **Start the bridge:**

   ```bash
   docker compose up -d
   ```

5. **Verify it is running:**

   ```bash
   curl http://localhost:8099/api/health
   ```

   You should receive a `200 OK` response.

### HTTP API and the `ulux_display` HACS integration

The bridge HTTP API runs on port **8099** (configurable via `api_port`).  
The [`ulux_display` HACS integration](https://github.com/gelbetomate/ha-addons/tree/main/custom_components/ulux_display) uses this API to push display images to the switch.

When running standalone, set the **Bridge URL** in the integration config flow to:

```
http://<docker-host-ip>:8099
```

### Supervisor add-on vs standalone Docker

| | Supervisor add-on | Standalone Docker |
|---|---|---|
| **Config source** | `/data/options.json` (managed by HA UI) | `options.json` mounted into the container |
| **HA token** | `SUPERVISOR_TOKEN` (auto-injected) | Long-lived access token in `options.json`, or omit if `mode.ha_events: false` |
| **HA WebSocket URL** | `ws://supervisor/core/websocket` | `ws://<ha-host>:8123/api/websocket` |
| **Networking** | Host network (Supervisor-managed) | `network_mode: host` (Linux only) |
| **Updates** | Via HA Add-on Store | `docker compose pull` / rebuild |

### macOS / Windows note

`network_mode: host` **only works on Linux Docker hosts**. On macOS or Windows running Docker Desktop, the container is inside a Linux VM and host networking does not expose the host's physical network interfaces. UDP port 34988 may not receive packets from the switch. A Linux server or NAS is the recommended deployment target.

## Protocol Reference

- [u::Lux UMP Protocol PDF](https://www.u-lux.com/fileadmin/user_upload/Downloads/PDF/Technische_Downloads/en/uLux_Switch_UMP_en.pdf)
- [XAMControlUlux (message ID reference)](https://github.com/evondevelop/XAMControlUlux)
