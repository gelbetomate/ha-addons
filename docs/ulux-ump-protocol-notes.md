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
- During initialization the bridge sends a `DateTime` (`0x2F`) message once after
  the first valid `State` response and again whenever the device sets
  `TimeRequest`.
- The DateTime payload is encoded consistently as UTC for seconds, minutes,
  hour, weekday, day, month, and year; the u::lux applies its configured local
  timezone when displaying the clock.
- The bridge defaults to the broader verified change-report mask
  `ControlFlags=0xBF08001F`; it remains configurable per installation.

### Observed u::lux TestCenter control-flag sequence

The u::lux TestCenter was used to toggle the control flags one at a time. The
captured values include `0x17`, `0x14`, `0x12`, `0x1E`, `0x06`, `0x36`,
`0x0116`, `0x0216`, `0x4016`, `0x8016`, and higher variants. This confirms that
the control word enables event/reporting capabilities; it does not create
sensor hardware that is absent.

For the tested Switch (serial `456`, firmware `V2.26`) the following replies
were observed:

- Temperature: `23.6 °C`, `Valid=1`.
- Relative humidity: `46.2 %`, `Valid=1`.
- CO2: `0`, `Valid=0`.
- IN2: `0`, `Valid=0`.
- VOC: `0`, `Valid=0`.

Temperature and humidity therefore come from the add-on/external sensor path
associated with this Switch. CO2, IN2, and VOC must be exposed as unavailable
when their validity byte is zero. The Lux response still needs to be captured
from the lower part of the TestCenter log; the StateFlags indicate that the
light-sensor capability is present.

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

The decoder also reads the frame version at offset `4` and the 16-bit UMP
device ID at offset `12`. For the u::lux Switch with serial `456`, the probe
response identifies device ID `1` and frame version `2.26`; these values are
now learned into the registry and reused for outbound control frames.

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

Frame-version minor bytes are hexadecimal in the wire representation: wire
value `0x0232` is displayed and entered as `2.32`, not decimal `2.50`.

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

### Audio Parameters

The same capture confirms these stream parameters:

- Local playback: sound index `3`, volume `100`, repeats `5`, repeat delay `2500`.
- Remote playback (`0x99`): volume `100`, stream flags `0x02`, sequence `3`,
  `BytesPerFrame=882`, `DelayBetweenFrames=20000`, broadcast IP shown as
  `255.255.255.255`.
- Recording (`0x9A`): record flags `0`, microphone ID `1`, sequence `3`,
  `BytesPerFrame=882`, `DelayBetweenFrames=20000`, target IP shown as
  `255.255.255.255` and an AMSnetID field.

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

## Full UMP v2.43 Protocol Implementation (Bridge 0.5.49+)

The bridge implements the complete standard u::Lux Message Protocol (UMP v2.43) on UDP port `34988`.

### Standard UMP Message IDs

| Message ID | Hex | Name | Direction | Description |
|---|---|---|---|---|
| 1 | `0x01` | `State` | Switch -> Host / Host -> Switch | Device state flags (16-bit status & capability bits) |
| 3 | `0x03` | `Lux` | Switch -> Host | Ambient light intensity (lux) |
| 14 | `0x0E` | `PageCount` | Switch -> Host | Number of configured pages |
| 15 | `0x0F` | `IdList` | Switch -> Host | List of actor IDs active on the current page |
| 33 | `0x21` | `Control` | Bidirectional | Control flags (event reporting masks) |
| 45 | `0x2D` | `Activate` | Host -> Switch | Display standby / wake-up activation |
| 46 | `0x2E` | `PageIndex` | Bidirectional | Active page number (1-based index) |
| 47 | `0x2F` | `DateTime` | Host -> Switch | Date and time synchronization |
| 65 | `0x41` | `IdValue` | Switch -> Host | Actuator value change event (actor ID + Int32) |
| 66 | `0x42` | `EditValue` | Bidirectional | Currently edited value on display |
| 67 | `0x43` | `RealValue` | Bidirectional | Floating-point real actor value (IEEE 754 float) |
| 81 | `0x51` | `Led` | Host -> Switch | Four-quadrant LED colors, blinking, and brightness |
| 97 | `0x61` | `Text` | Host -> Switch | Text display overlay for configurable text fields |
| 113 | `0x71` | `Temperature` | Switch -> Host | Ambient temperature sensor reading (0.1 °C steps) |
| 114 | `0x72` | `Humidity` | Switch -> Host | Relative humidity sensor reading (0.1 % steps) |
| 115 | `0x73` | `CO2` | Switch -> Host | Carbon dioxide sensor reading (ppm) |
| 116 | `0x74` | `IN2` | Switch -> Host | Binary hardware input states (2 digital inputs) |
| 117 | `0x75` | `VOC` | Switch -> Host | Volatile Organic Compounds sensor reading (ppb/ppm) |
| 150 | `0x96` | `AudioPlayLocal`| Host -> Switch | Trigger internal chime sound index (1..N) and volume |
| 151 | `0x97` | `AudioStop` | Host -> Switch | Immediately stop currently playing audio |
| 152 | `0x98` | `AudioVolume` | Host -> Switch | Set master audio volume (0..100) |
| 153 | `0x99` | `AudioPlayRemote`| Host -> Switch| Stream remote audio chunk |
| 161 | `0xA1` | `VideoState` | Bidirectional | Screen bounds and video rendering capabilities |
| 162 | `0xA2` | `VideoStart` | Host -> Switch | Start video stream session with sequence token |
| 163 | `0xA3` | `VideoStream` | Host -> Switch | Encoded display frame / tile video packet |
| 164 | `0xA4` | `VideoStop` | Host -> Switch | Terminate video streaming session |
| 177 | `0xB1` | `KeyAction` | Switch -> Host | Hardware key press / release action |
| 193 | `0xC1` | `Config` | Bidirectional | Device configuration parameter access |

---

### Inbound Message Telegram Decoding

Each message inside a received UMP frame starts with a 4-byte header:
`[Length_LE: 2 bytes] [MessageID: 1 byte] [ActorID: 1 byte] [Payload: N bytes]`

#### 1. StateFlags (`0x01`)
The 16-bit state word exposes both operational states and hardware sensor flags:
- `bit 0`: `light` (threshold reached)
- `bit 1`: `proximity` (near-field detection)
- `bit 2`: `display_active` (0 = standby/screensaver, 1 = awake)
- `bit 3`: `audio_active` (chime currently playing)
- `bit 4`: `intro_active` (boot/splash sequence running)
- `bit 5`: `time_request` (switch requires `0x2F DateTime`)
- `bit 6`: `init_request` (switch requires `0x21 Control`)
- `bit 7`: `device_error` (hardware fault detected)
- `bit 8`: `lux_valid` (light sensor hardware present and valid)
- `bit 9`: `temperature_valid` (temperature sensor present and valid)
- `bit 10`: `humidity_valid` (humidity sensor present and valid)
- `bit 11`: `co2_valid` (CO2 sensor present and valid)
- `bit 12`: `in2_valid` (binary inputs IN2 present and valid)
- `bit 13`: `voc_valid` (VOC sensor present and valid)

#### 2. Sensors
- **Temperature (`0x71`)**: Signed 16-bit little-endian divided by 10.0 (e.g. `257` = 25.7 °C).
- **Humidity (`0x72`)**: Unsigned 16-bit little-endian divided by 10.0 (e.g. `588` = 58.8 % rH).
- **CO2 (`0x73`)**: Signed 16-bit integer in ppm (`400..4000`). Values `-1` indicate sensor warmup, `-2` sensor error.
- **VOC (`0x75`)**: Signed 16-bit integer in ppb/ppm (`125..600`). Values `-1` warmup, `-2` error.
- **Ambient Light (`0x03`)**: Unsigned 16-bit integer in lux.
- **Binary Inputs IN2 (`0x74`)**: Bit 0 = Input 1, Bit 1 = Input 2.

#### 3. Navigation & Pages
- **PageIndex (`0x2E`)**: Payload contains 2-byte word: active page (1-based index).
- **PageCount (`0x0E`)**: Payload contains 2-byte word: total number of pages configured on device.
- **IdList (`0x0F`)**: Payload contains an array of 2-byte actor IDs configured on the active page.

#### 4. Actor Values
- **EditValue (`0x42`)**: Actor ID at byte offset 3, 32-bit signed integer value at offset 4..7.
- **RealValue (`0x43`)**: Actor ID at byte offset 3, IEEE 754 32-bit single-precision float.
- **IdValue (`0x41`)**: Actor ID at byte offset 3, 32-bit signed integer.

#### 5. Initialization and tested V2.32 audio

The TestCenter sends `ID_INIT (0x02)` with `InitFlags=0x0003` and
`InitCode=0x5AA5` before activation and later control actions. For the tested
V2.32 switch, the confirmed audio IDs are `0x91` volume, `0x92` stop,
`0x98` local playback, `0x99` remote playback, and `0x9A` recording.

#### 6. Text Overlay (`0x45`)

The TestCenter capture confirms an outbound `ID_TEXT` message to Actor `1`
with `TextID=5` and a variable-length text payload (`TEXT ID5_RANDOM70862`).
The message contains color bytes, text/visibility flags, and a null-terminated
text string. This matches the bridge `buildTextMessage()` layout and confirms
that text overlays are a separate UMP actor feature, not part of page rendering.

#### 7. Video State (`0xA1`)
- State flags: 32-bit LE word at offset 4..7.
- Bounds: Left (X1, Int16LE), Top (Y1, Int16LE), Right (X2, Int16LE), Bottom (Y2, Int16LE).
- Total dimensions: `Width = Right - Left`, `Height = Bottom - Top`.

---

### Outbound Telegram Builders (`src/ump/builder.js`)

All outbound telegrams are formatted inside the 16-byte UMP header using `buildTelegramForDevice(device, ...messages)`.

- `buildPageIndexMessage(pageIndex)`: Sets the current active page (`0x2E`).
- `buildActivateMessage(active)`: Activates display or puts into standby (`0x2D`).
- `buildIdInitMessage()`: Sends `InitFlags=0x0003`, `InitCode=0x5AA5` (`0x02`).
- `buildEditValueMessage(actorId, value)`: Updates an actor's edit value (`0x42`).
- `buildRealValueMessage(actorId, floatVal)`: Sends a floating point value (`0x43`).
- `buildLedMessage(led, color, mode)`: Controls the 4 status LEDs (`0x51`).
- `buildClearLedsMessage()`: Turns off all 4 status LEDs.
- `buildTextMessage(actorId, textId, text, color)`: Sends a custom text overlay (`0x45`).
- `buildAudioPlayLocalMessage(soundId, volume)`: Plays internal chime (`0x98` on V2.32).
- `buildAudioStopMessage()`: Stops playback immediately (`0x92` on V2.32).
- `buildAudioVolumeMessage(volume)`: Sets master volume 0..100 (`0x91` on V2.32).
- `buildVideoStartMessage(actorId, sequenceId)`: Starts video stream session (`0xA2`).
- `buildVideoStopMessage()`: Stops video streaming session (`0xA4`).
- Sensor & diagnostic queries: `buildReadTemperatureMessage()`, `buildReadHumidityMessage()`, `buildReadCo2Message()`, `buildReadVocMessage()`, `buildReadIn2Message()`, `buildReadLuxMessage()`, `buildReadPageCountMessage()`, `buildReadPageIndexMessage()`.

---

### Home Assistant Events

When UMP packets arrive on UDP `34988`, the bridge fires the following HA events:
- `ulux_state`: `{ switch_id, state_flags, is_active, proximity, light, audio, init_request, time_request, raw_flags }`
- `ulux_sensor`: `{ switch_id, sensor_type, value, unit }`
- `ulux_page`: `{ switch_id, page, page_count }`
- `ulux_value`: `{ switch_id, actor_id, value, value_type }`
- `ulux_action`: `{ switch_id, key, action }`

The bridge publishes `ulux_sensor`, `ulux_event`, and `ulux_key` immediately
when the device sends corresponding telegrams. The HA integration consumes
these events directly. Temperature, humidity, and motion may therefore come
from an external sensor integrated into the u::lux/Loxone setup; they are not
assumed to be physically measured by the Switch itself. The Lux value is the
separate ambient-light sensor message (`0x03`) from the Switch.

For `ID_LED (0x44)`, each of the four LED bytes is interpreted as:

```text
bits 0..2  color code (0..7)
bits 4..6  blink mode (0..7)
bit 7      UMP override flag
```

The TestCenter LED sequence changes the LED byte values, but the color-name
mapping for codes `0..7` still needs one controlled test per color. The bridge
exposes the raw byte and decoded fields so that mapping can be completed
without losing information.

The IR request is `ID_IR (0x81)` with Actor-ID `1`. The bridge sends this
request during polling and emits any response as `ulux_ir` with raw hexadecimal
payload until its response layout is confirmed.

The TestCenter key test confirms `ID_EVENT (0x51)` as the physical key-state
message. For Actor `0x14`, `KeyState=0x01` means the first key is pressed and
`KeyState=0x00` means it is released. The corresponding `State` frames also
toggle the display-active bit (`0x23000004` versus `0x23000000`).

The microphone stream is directed, not broadcast by default: the audio control
message's `TargetIP` and `TargetPort` determine where UDP audio packets are
sent. For Home Assistant, configure the HA host/add-on address as target and
UDP port `35000`; the u::lux UMP control messages and key events continue to
use UDP port `34988`.

The tested V2.32 device is an exception to the generic RealValue description:
the TestCenter reports four values such as `0.3`, `1.4`, `2.5`, and `3.6`,
which are encoded as signed 16-bit fixed-point values in tenths. The bridge
decodes these V2.32 values accordingly.

The Bridge UI accepts human page numbers starting at 1 and converts them to
the zero-based UMP page index. HA `page_index` requests use the zero-based
form explicitly.

Key presses are exposed as `ulux_key` edge events and as HA binary sensors
`Key 1` through `Key 4`. LED output commands are implemented, but the current
UMP input decoder now handles the confirmed inbound `ID_LED (0x44)` response.
HA exposes `LED 1` through `LED 4` with color code, blink mode, override,
active, and raw-byte attributes.

---

### MQTT Interface

When MQTT mode is enabled (`mode.mqtt: true`), the bridge publishes telemetry and accepts commands.

#### Telemetry Topics
- `<base_topic>/<switch_id>/state`: Complete JSON state dump.
- `<base_topic>/<switch_id>/sensor/<type>`: Sensor values (`temperature`, `humidity`, `co2`, `voc`, `in2`, `lux`).
- `<base_topic>/<switch_id>/page`: Current page number.
- `<base_topic>/<switch_id>/value/<actor_id>`: Individual actor values.

#### Command Topics (wildcard subscription `${base_topic}/+/cmd/#`)
- `<base_topic>/<switch_id>/cmd/page`: Payload `{"page": 2}` or plain string `"2"`
- `<base_topic>/<switch_id>/cmd/activate`: Payload `{"active": true}`
- `<base_topic>/<switch_id>/cmd/led`: Payload `{"led": 1, "color": "red", "mode": 0}`
- `<base_topic>/<switch_id>/cmd/text`: Payload `{"field": 1, "text": "Hello"}`
- `<base_topic>/<switch_id>/cmd/value`: Payload `{"actor_id": 5, "value": 42}`
- `<base_topic>/<switch_id>/cmd/audio/play`: Payload `{"sound_id": 1, "volume": 80}`
- `<base_topic>/<switch_id>/cmd/audio/stop`: Empty payload or `{}`
- `<base_topic>/<switch_id>/cmd/audio/volume`: Payload `{"volume": 75}`
- `<base_topic>/<switch_id>/cmd/raw`: Payload `{"hex": "0186..."}`

