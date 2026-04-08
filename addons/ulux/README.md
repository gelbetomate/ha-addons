# u::Lux UMP Bridge Add-on

A Home Assistant add-on that bridges **u::Lux Switch IP** devices to Home Assistant via the
[u::Lux Message Protocol (UMP)](https://www.u-lux.com/fileadmin/user_upload/Downloads/PDF/Technische_Downloads/en/uLux_Switch_UMP_en.pdf)
over UDP (port **34988** / `0x88AC`).

## Features

- Listens for inbound UMP packets from one or more u::Lux Switch IP devices.
- Logs each received packet (hex + sender address) for diagnostics.
- Basic UMP frame parsing (descriptor + message ID); full button-press decoding scaffolded and ready for expansion once sample packets are available.
- Publishes events to Home Assistant via the native **WebSocket API** (configurable).
- Optional **MQTT** mode: publish inbound events to MQTT and subscribe for outbound commands (see TODOs in source).
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
    port: 34988
  - name: "Hallway"
    switch_id: "AA:BB:CC:DD:EE:FF"
    ip: "192.168.1.101"
listen_host: "0.0.0.0"
listen_port: 34988
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
| `switches` | `[]` | List of known u::Lux switches. Each entry requires `name`, `switch_id` and `ip`. `port` defaults to `listen_port`. |
| `listen_host` | `0.0.0.0` | Host/IP address to bind the UDP socket to. |
| `listen_port` | `34988` | UDP port to listen on (UMP default: `0x88AC` = 34988). |
| `mode.ha_events` | `true` | Publish received events to HA via the WebSocket API. |
| `mode.mqtt` | `false` | Also publish events to MQTT (requires broker config). |
| `ha.ws_url` | `ws://supervisor/core/websocket` | Home Assistant WebSocket URL. |
| `ha.token` | `""` | Long-lived access token. Leave empty to use the Supervisor-provided token (`SUPERVISOR_TOKEN`). |
| `mqtt.host` | `core-mosquitto` | MQTT broker hostname. |
| `mqtt.port` | `1883` | MQTT broker port. |
| `mqtt.username` | `""` | MQTT username. |
| `mqtt.password` | `""` | MQTT password. |
| `mqtt.base_topic` | `ulux` | MQTT topic prefix. Events are published to `<base_topic>/<switch_id>/event/...`. |
| `log_level` | `info` | Log verbosity: `debug`, `info`, `warning`, `error`, `fatal`. |

## Home Assistant Automations

When `mode.ha_events: true`, the add-on fires HA events that you can use in automations:

```yaml
automation:
  - alias: "Handle u::Lux Button Press"
    trigger:
      platform: event
      event_type: ulux_button
      event_data:
        switch_id: "01:23:45:67:89:AB"
    action:
      - service: light.toggle
        target:
          entity_id: light.living_room
```

### Event schema (`ulux_button`)

| Field | Type | Description |
|-------|------|-------------|
| `switch_id` | string | Switch ID from config (matched by packet sender IP or UMP header). |
| `switch_name` | string | Human-readable switch name from config. |
| `ip` | string | Sender IP address. |
| `raw_msg_id` | number | Raw UMP message ID (decimal). |
| `raw_hex` | string | Full packet as hex string. |
| `timestamp` | string | ISO 8601 timestamp. |

> **Note:** Full button-press field decoding (key number, page, press/release) will be added once sample packets or the full UMP message spec is available.

## MQTT Topics

When `mode.mqtt: true`:

| Topic | Direction | Description |
|-------|-----------|-------------|
| `ulux/<switch_id>/event/raw` | Publish | Raw UMP packet (hex + metadata) for every received packet. |
| `ulux/<switch_id>/event/button` | Publish | Button press event (same payload as HA event). |
| `ulux/<switch_id>/cmd/#` | Subscribe | Outbound commands to the switch (TODO: implement UMP command encoding). |

## Networking

The add-on runs with **host networking** so it can bind UDP/34988 and receive multicast/broadcast packets from the local network. No additional port mapping is needed.

Configure each u::Lux Switch IP to send UMP packets to the Home Assistant host's IP address (or broadcast, if supported by your switch firmware).

## Protocol Reference

- [u::Lux UMP Protocol PDF](https://www.u-lux.com/fileadmin/user_upload/Downloads/PDF/Technische_Downloads/en/uLux_Switch_UMP_en.pdf)
- [Integration example (Domiq)](https://www.u-lux.com/fileadmin/user_upload/Bilder/uLux_Switch/Steuerungspartner/Domiq/CM-BL-EN-ULUX.pdf)
