# u::Lux System Overview

This repository provides two cooperating components:

- **u::Lux UMP Bridge** Supervisor add-on
- **u::lux Display** HACS integration

## Architecture

```text
Physical u::lux Switch IP
       ↕ UDP 34988 (UMP)
┌─────────────────────────────────┐
│   u::Lux UMP Bridge Add-on      │
│   • Key events → HA events      │
│   • Image streaming to switch   │
│   • Device discovery registry    │
│   • HTTP API on port 8099       │
└──────────────┬──────────────────┘
               │ HTTP (localhost:8099)
┌──────────────▼──────────────────┐
│   u::lux Display Integration    │
│   • PIL rendering               │
│   • HA entities & services      │
│   • Config flow with discovery   │
└─────────────────────────────────┘
```

## Recommended operating model

- The bridge remains the transport layer.
- The Supervisor add-on owns the persistent switch registry.
- The HACS integration reads the registry and instantiates entities.
- The Supervisor UI is the primary place to manage switch records.

## Registry responsibilities

### Bridge
- discover switches from UDP/UMP traffic
- expose discovery results over HTTP
- never own the persistent user-facing registry

### Supervisor UI
- create, edit, and delete switch records
- link records to Home Assistant entries
- merge discovered switches into the persistent registry
- show device health and last-seen status

### HACS integration
- read the registry
- use selected switches for config entries/entities
- push rendered images to the bridge API

## Main flows

### Discovery flow
1. The bridge binds a discovery socket on UDP `34984`.
2. It broadcasts a 48-byte request to `255.255.255.255:34984` at startup and when the Discovery tab's **Scan now** action is used.
3. u::lux switches answer directly to the bridge with a 228-byte response beginning with `e4 80 01 02`.
4. The bridge records the sender IP, discovery port, protocol ID, sequence, timestamp, and raw response.
5. If the sender IP matches a configured switch, its MAC and name are used to update the persistent registry.
6. If no MAC can be confirmed, the response remains a pending discovery result and is shown in the bridge UI without inventing a switch ID.
7. The UI can import only records with a verified switch ID into the persistent registry.

The discovery response currently exposes these useful properties:

- sender IP address and UDP port
- response length and discovery message type
- sequence number
- protocol ID from the response header
- raw response bytes for later decoding
- last-seen timestamp
- MAC address when the HA host can resolve the sender through its neighbor table
- serial number as a clearly marked inference from the known MAC suffix pattern

The configuration software's numeric database ID is intentionally not shown. It
has not been identified as a value in the captured discovery protocol.

### Ownership modes

The normal mode is the HACS integration. It creates the Home Assistant device,
entities, rendering, and views. Optional MQTT Discovery is controlled by
`mode.mqtt_discovery` and should not be enabled for the same switches while HACS
auto-import is active, because that would create duplicate Home Assistant
devices. MQTT Discovery publishes metadata sensors for IP, serial number, and
protocol ID. Deleting a bridge device removes those retained MQTT Discovery
topics when the mode is enabled.

The discovery protocol is separate from normal UMP traffic:

| Purpose | Transport | Default port |
|---|---|---:|
| Active switch discovery | IPv4 broadcast/unicast UDP | `34984` |
| Normal UMP events and streaming | UDP | `34988` |

The discovery port is only used for finding switches. It must not be stored as
the device's UMP port. Imported registry records therefore use `34988` as the
UMP port and retain `34984` separately as `discovery_port`.

The current implementation decodes the broadcast response stage. The follow-up `0x83` and `0x02` handshake visible in `docs/UDPMitschnitt.pcapng` is reserved for a later protocol implementation.

Recurring scans are disabled by default (`discovery_interval_ms: 0`). A positive
value can be configured temporarily for testing or installations that need
continuous discovery.

### Per-device MQTT Discovery

MQTT broker connection settings remain in the add-on configuration. Whether a
specific imported HA device publishes Home Assistant MQTT Discovery entities is
controlled in that device's integration options: open the u::lux device in HA,
choose **Configure**, and enable **MQTT Discovery**. The option is disabled by
default. HACS remains the normal owner of the device; enabling MQTT Discovery
for the same device creates an additional MQTT representation and should only
be used intentionally.

HA config entries are created only by the integration setup wizard. Bridge
discovery and bridge registry imports do not automatically create all switches
in Home Assistant; this prevents a single wizard setup from creating multiple
HA devices.

The wizard offers three setup methods: create a device manually, select one
device from the bridge registry, or add all not-yet-configured registry devices.
Registry-based entries use the serial number for their name when available.

The follow-up handshake is the likely place to investigate for additional device
properties such as firmware version, bootloader version, hardware type, display
type, production date, CPU information, and memory sizes. Those values are not
currently present as readable text in the captured 228-byte discovery response.

### Rendering flow
1. HACS integration renders a frame
2. integration posts PNG to bridge HTTP API
3. bridge converts and streams to the switch

## Next steps

See `docs/ulux-registry-api.md` for the formal registry API proposal.
See `docs/ulux-ump-protocol-notes.md` for the verified UMP framing and initialization sequence.
See `docs/ulux-assignment-assistant-notes.md` for the read-only synchronization handshake on UDP `34984`.
