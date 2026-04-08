# u::Lux UMP Bridge Add-on

This has a very early Stage and not recommended to install in production!!!!! If it doesn't install or breaks something blame yourself.

A Home Assistant add-on that bridges **u::Lux Switch IP** devices to Home Assistant via the
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
2. Search for **"u::Lux UMP Bridge"** in the Add-on Store and install it.
3. Configure the add-on (see below).
4. Start the add-on.

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
| `log_level` | `info` | Log verbosity: `debug`, `info`, `warning`, `error`, `fatal`. |

## Initialization behaviour

When a u::Lux switch powers on (or reconnects), it sends an **ID-State** message with:
- **InitRequest** (StateFlags bit 6 = 1): the add-on immediately sends back an **ID-Control** message with the configured `control_flags` value.
- **TimeRequest** (StateFlags bit 5 = 1): the add-on immediately sends back a **DateTime** message with the current system time.

Both replies are sent to the same `IP:port` that the switch sent from.

## Home Assistant Automations

When `mode.ha_events: true`, the add-on fires HA events for use in automations.

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

## MQTT Topics

When `mode.mqtt: true`:

| Topic | Direction | Description |
|-------|-----------|-------------|
| `ulux/<switch_id>/event/key` | Publish | Key snapshot (`ulux_event` payload for ID-Event). |
| `ulux/<switch_id>/event/key_edge` | Publish | Key edge (`ulux_key` payload). |
| `ulux/<switch_id>/event/state` | Publish | State event (`ulux_event` payload for ID-State). |
| `ulux/<switch_id>/event/raw` | Publish | Raw packet for unhandled message IDs. |

## Networking

The add-on runs with **host networking** so it can bind UDP/34988 and receive packets from the local network. No additional port mapping is needed.

Configure each u::Lux Switch IP to send UMP packets to the Home Assistant host's IP address.

## Protocol Reference

- [u::Lux UMP Protocol PDF](https://www.u-lux.com/fileadmin/user_upload/Downloads/PDF/Technische_Downloads/en/uLux_Switch_UMP_en.pdf)
- [XAMControlUlux (message ID reference)](https://github.com/evondevelop/XAMControlUlux)
