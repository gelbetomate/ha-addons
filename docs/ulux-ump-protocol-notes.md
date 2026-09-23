# u::lux UMP Protocol Notes

These notes capture the currently verified UMP findings from:

- `docs/uLux_Switch_UMP_en (1).pdf`, UMP specification version 2.43, 2020-11-26
- `brammh/ULux`, especially `ulux.js`
- `docs/UDPMitschnitt.pcapng`

## Transport

- Active configuration discovery uses UDP `34984` and IPv4 broadcast `255.255.255.255`.
- Normal UMP traffic uses UDP `34988`.
- The reference Node.js project uses `0x88AC`, which is decimal `34988`.

## UMP frame header

The reference project uses this 16-byte message-frame header:

```text
01 86 10 00 32 02 25 00 00 00 00 00 01 00 01 00
```

Important offsets:

- offset `0`: frame/type marker `0x01`
- offset `1`: frame ID `0x86`
- offset `2`: total frame length, little endian
- offset `6`: packet ID, little endian
- remaining bytes: fixed protocol/header fields

The earlier implementation incorrectly treated offsets `0`, `10`, and the zeroed header as the packet length/ID fields. The current builder and decoder were corrected using this reference format.

The working `U--lux-node.js-master` project uses a device-specific variant:

```text
01 86 10 00 32 02 25 00 00 00 A8 01 17 00 01 00
```

Its comments state that this variant worked with the real switch after the
neutral header was replaced. The bytes at offsets 10-13 may therefore identify
controller/project/protocol context and should not be assumed universally zero.

### Device context IDs confirmed from the configuration software

The current project data provides this mapping:

| Serial number | Software/device ID | Example MAC |
|---:|---:|---|
| 131 | 17 | `00:50:C2:73:0F:83` |
| 1893 | 92 | `D0:22:12:E0:07:65` |
| 2888 | 93 | `D0:22:12:E0:0B:48` |
| 3721 | 94 | `D0:22:12:E0:0E:89` |

These IDs are used in the UMP header context for diagnostic probes. They are
not the Ethernet MAC address and should not be displayed as the switch MAC.

### Frame version input

The Bridge UI accepts the frame version in the readable form used by the
configuration software, for example:

```text
1.04
2.32
```

It is encoded into the two-byte UMP frame-version word as:

```text
1.04 -> 0x0104
2.32 -> 0x0232
```

The frame version and device context ID are stored per registered device and
used when `Probe UMP` builds its TX frame. They are not global protocol values;
different firmware/design combinations may require different values.

The live capture `docs/newudpmitschnitt.pcapng` confirms the configuration
software's first exchange for switch ID `0x005D` (decimal 93):

```text
TX: 01 86 20 00 32 02 05 00 00 00 00 00 5D 00 01 00
  04 01 00 00 04 21 00 00 04 0E 00 00 04 2E 00 00

RX: 01 86 2C 00 32 02 05 00 00 00 54 02 5D 00 01 00
  08 01 00 00 00 10 00 00
  08 21 00 00 00 08 00 1F
  06 0E 00 00 06 00
  06 2E 00 00 03 00
```

This is the first known-good exchange from the actual configuration software,
not just a generic PDF example.

## Startup and initialization

The PDF states that after startup/power-on the switch sets `InitRequest` and `TimeRequest` in `ID-State`.

When initialization is pending, the switch periodically sends approximately every five seconds:

```text
ID-State      0x01
ID-Control    0x21
ID-IDList     0x0F
ID-PageCount  0x0E
```

The controller must respond with:

```text
ID-Control    0x21
```

including the current `ControlFlags`. Receiving this clears `InitRequest`.

When `TimeRequest` is set, the controller must send:

```text
ID-DateTime   0x2F
```

Receiving this clears `TimeRequest`.

The reference project uses a hard-coded control block:

```text
08 21 00 00 16 00 00 00
```

Therefore the current default `ControlFlags` is `0x16`, but this should remain configurable until verified against more devices.

The working project confirms this practical order: bind the controller socket to
UDP `34988`, receive `ID-State`, send `ID-Control` with `ControlFlags=0x16` for
InitRequest, send `ID-DateTime` for TimeRequest, wait for the dummy/target page
flow, and request `ID-VideoState` only after the target page is active.

## DateTime message

The reference project serializes `ID-DateTime` as:

```text
0C 2F 00 00 SS MM HH DOW DD MO YYYY
```

with the year as little-endian at the final two bytes. The current builder follows this layout using UTC values.

## Video capability query

The PDF says `ID-VideoState` (`0xA1`) should be requested before video transmission. The PDF/reference examples use actor IDs such as `22`; the working `U--lux-node.js-master` project uses actor ID `23` for its real switch/design and sends:

```text
04 A1 16 00
```

The response provides video flags and bounds. `VideoStream` packets must use the returned bounds and the `SequenceID` negotiated during video start. A direct `VideoState` probe before initialization is not a reliable test.

The working project reads bounds from response offsets 8, 10, 12, and 14, then returns to a home page. Actor IDs and page IDs are design-specific and must not be hard-coded globally.

## Current diagnostic strategy

The safe diagnostic sequence should be:

```text
ID-State request
  -> parse ID-State / InitRequest / TimeRequest
ID-Control response when InitRequest is set
ID-DateTime response when TimeRequest is set
ID-IDList / ID-PageCount observation
ID-VideoState request only after initialization
```

The diagnostic UI should retain and display TX/RX hex for every step. No actor value, page, edit value, or other Loxone control write should be sent during diagnostics.

The Bridge `Probe UMP` action now starts with the combined request frame used by
the working configuration software:

```text
04 01 00 00 04 21 00 00 04 0E 00 00 04 2E 00 00
```

This is intentionally a read/request-only diagnostic frame. The next test
should compare its TX hex and the received RX hex with the Protocoltest view.

## Discovery capture findings

The configuration software sends a 48-byte UDP discovery request to `255.255.255.255:34984`. Switches answer with 228-byte responses beginning with:

```text
e4 80 01 02
```

The discovery response is not readable text. It contains repeated/binary data. The current implementation reliably extracts IP, protocol ID, sequence, timestamp, raw hex, and MAC through the host neighbor table. The serial number is currently an explicitly labeled inference from the confirmed MAC suffix pattern for the captured devices.

## Open questions

- Confirm the exact UMP protocol/version fields for every switch firmware.
- Capture a full startup exchange on UDP `34988` including ID-State, ID-Control, ID-IDList, ID-PageCount, and ID-DateTime.
- Confirm whether the switch expects requests from a fixed source port.
- Decode `ID-IDList` and `ID-PageCount` before implementing actuator reads/writes.
- Decode the complete `ID-VideoState` response and bounds.

## Useful additional repositories and captures

Additional repositories are useful when they contain actual packet builders, parsers, or startup traces, especially:

- C# or .NET implementations of `XAMControlUlux` / `UmpMessageID`
- Loxone/u::lux integrations with raw UMP frame construction
- Projects that implement `ID-IDList`, `ID-PageCount`, `ID-Control`, or `ID-DateTime`
- Packet captures showing a complete switch startup and initialization exchange
- Captures showing the response to `04 A1 16 00`
- Working projects with a known-good header and actor ID for the exact switch design

A repository containing only high-level device entities or UI code is less useful for the protocol work than one containing raw UDP hex or message builders.
