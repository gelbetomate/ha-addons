# u::lux UMP Protocol Notes

These notes capture the currently verified UMP findings from:

- `docs/uLux_Switch_UMP_en (1).pdf`, UMP specification version 2.43, 2020-11-26
- `brammh/ULux`, especially `ulux.js`
- `docs/UDPMitschnitt.pcapng`

The read-only synchronization capture from the assignment assistant is
documented separately in `docs/ulux-assignment-assistant-notes.md`. Its write
and IP-configuration options are intentionally out of scope.

The longer serial-2888 synchronization capture adds a separate read-only
detail protocol on UDP `34984`; it is documented in the assignment-assistant
notes and must not be confused with UMP on UDP `34988`.

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

### Initialization details from independent implementations

Three independent implementations provide additional interaction details. They
all concern UMP on UDP `34988`; none implements the binary Discovery detail
payloads on UDP `34984`.

#### `bpw23/ukm`

The Python project uses these transport constants:

```text
UMP / communication:  0x88AC = 34988
audio:                0x88A4 = 34980
management:           0x88A8 = 34984
frame version:        2.32
```

The project binds its actual UMP protocol listener to `34988`. Its source calls
`34984` the management port, but does not implement the `E4 80 01 02` Discovery
exchange documented in `docs/ulux-assignment-assistant-notes.md`.

Its `init_switch()` function sends a read/write UMP frame containing:

```text
08 21 00 00 BF 08 00 1F
06 2E 00 00 <page> 00
```

The first message is `ID-Control` (`0x21`) for actor `0`. The four control flag
bytes are configurable in the source; the example enables change reporting for
the available state/value changes. The second message is `ID-PageIndex`
(`0x2E`) and selects the configured initial page. This is an interaction frame,
not a read-only diagnostic request, and must not be sent by the Discovery
scanner.

`ukm` parses the first state-flags byte as follows:

| Bit | Meaning |
|---:|---|
| 0 | light sensor state |
| 1 | proximity sensor detected |
| 2 | display active |
| 3 | audio active |
| 4 | intro active |
| 5 | time requested |
| 6 | initialization requested |
| 7 | device error |

Higher state-flag bits expose hardware/sensor capabilities. The implementation
checks flags for temperature, humidity, CO2, VOC, addon input, and motion
sensors. These are UMP state information and are unrelated to the Discovery
`0x83` device-information payload.

The project sends the DateTime message every hour and when the switch sets
`TimeRequest`. Its frame layout is:

```text
0C 2F 00 00 SS MM HH DOW DD MO YY YY
```

with the year in the final two bytes in little-endian order. Its parser also
confirms that UMP messages are length-prefixed and concatenated after the
16-byte frame header.

#### `evondevelop/XAMControlUlux`

The C# implementation provides a blocking connection check and initialization:

```text
ID-State + ID-Control read requests
-> wait for ID-State and ID-Control response
-> send ID-Control when InitRequest is set
-> ID-PageCount + ID-PageIndex read requests
-> wait for both responses
-> send DateTime when TimeRequest is set
```

The source exposes these UMP message IDs:

```text
0x01  IdState
0x21  IdControl
0x0F  IdList
0x0E  PageCount
0x2E  PageIndex
0x42  EditValue
0x2F  DateTime
0x71  I2C temperature
0xA2  VideoStart
0xA1  VideoState
0x99  AudioPlayRemote
```

The C# stream waits up to approximately one second for the first state/control
pair and then for the page count/index pair. It treats the switch as initialized
only when state has been received and `InitRequest` is no longer set. If the
state is stale for more than ten seconds, it requests state/control again.

The UMP header context is configured per device as:

```text
IP:ProjectID:FirmwareVersion:SwitchID:DesignID
```

This confirms that Project ID, Firmware Version, Switch ID, and Design ID are
required interaction parameters for normal UMP traffic. They are not the
Ethernet MAC address and are not derived from the Discovery protocol ID.

The C# implementation decodes the state flags using the same low-byte mapping
shown above. Its video-state parser reads four signed 16-bit bounds after the
state flags:

```text
StateFlags  : 32-bit
BoundsLeft  : 16-bit
BoundsTop   : 16-bit
BoundsRight : 16-bit
BoundsBottom: 16-bit
```

#### `Averelll/U--lux-node.js`

The Node.js project is a practical UMP implementation rather than a Discovery
implementation. It binds to UDP `34988`, uses a 16-byte UMP header beginning
with `01 86`, and handles incoming state/page/video messages.

Its startup behavior is event driven:

1. Receive a state/control message from the switch.
2. If the state contains the initialization bit, send the Control message.
3. If the state contains the time bit, send DateTime.
4. When the dummy page or target page becomes active, request VideoState.
5. Read the video bounds and use them for subsequent video frames.

Relevant message builders in the project are:

```text
CreateActivateMessage:     06 2D 00 00 01 00
CreatePageIndexMessage:    06 2E 00 00 <page> 00
CreatePageIndexReqMessage: 04 2E 00 00
CreateVideoStateMessage:   04 A1 <actor little-endian>
CreateVideoStartMessage:   0C A2 <actor> <state flags> <sequence ID>
```

The project reads video bounds from the VideoState response and derives image
dimensions from them. Actor IDs and page IDs are design-specific. It therefore
supports the conclusion that normal UMP initialization is device/design
context dependent and must not be confused with the broadcast Discovery
handshake.

### What these repositories do not provide

None of the three repositories contains a decoder for the captured Discovery
detail responses:

```text
A8 80 01 00 ...  168-byte response
30 80 02 04 ...   48-byte response
08 80 02 00 ...    8-byte response
4F 80 83 01 ...   79-byte response
```

The repositories do provide a reliable UMP interaction model: state/control
negotiation, page metadata reads, DateTime handling, state-flag semantics, and
VideoState bounds. The 34984 payloads remain a separate proprietary management
protocol. Their opaque payloads must not be decoded using the UMP state-flag
layout without additional evidence.

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

### Known-good Bridge UI test

The Bridge UI produced a successful initialization response for switch serial
`2888` using:

```text
FrameVersion: 2.32
UMP Device ID: 93
```

Observed response messages:

```text
0x01 ID-State
0x21 ID-Control
0x0E ID-PageCount
0x2E ID-PageIndex
```

Observed decoded values in that test:

```text
PageCount:    6
PageIndex:    3
ControlFlags: 0x00000800
```

This is a confirmed working baseline for that switch/firmware combination. It
must not be generalized to every u::lux switch without another test.

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
