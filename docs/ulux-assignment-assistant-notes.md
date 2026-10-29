# u::lux Assignment Assistant: Synchronization Capture

Source capture:

- `docs/MitschnittZuordnungsassistent.pcapng`
- `docs/MitschnittSynchronisierung2888.pcapng` (follow-up synchronization capture)
- Configuration software host: `192.168.178.98`
- Capture purpose: network search/synchronization only

## Scope

This capture is intentionally limited to the assistant's read/search flow. The
write/configuration options for IP assignment, address deletion, and project
changes are out of scope. We do not want to reproduce those operations.

The implementation goal remains:

```text
Discovery -> read detail handshake -> decode device information -> update local registry
```

No switch configuration or actuator write should be sent by this path.

## Observed transport

The relevant traffic uses only:

```text
UDP 34984 -> 34984
```

There is no u::lux UMP traffic on UDP `34988` in this capture.

The capture also contains unrelated LAN traffic, including multicast discovery,
mDNS, SSDP, and other UDP services. Those are not part of the u::lux assistant
exchange.

The follow-up `MitschnittSynchronisierung2888.pcapng` also contains the same
UDP `34984` exchange and no UDP `34988` frames. It is therefore part of the
read-only discovery/detail track, not the UMP track.

## Observed device search

The assistant sends one broadcast request:

```text
192.168.178.98:34984 -> 255.255.255.255:34984
Payload length: 48 bytes
Header: 30 80 01 02
```

Three switches answer directly:

```text
192.168.178.24:34984 -> 192.168.178.98:34984   228 bytes
192.168.178.23:34984 -> 192.168.178.98:34984   228 bytes
192.168.178.22:34984 -> 192.168.178.98:34984   228 bytes
```

The response header is:

```text
e4 80 01 02
```

## Per-device synchronization handshake

After the broadcast responses, the assistant queries each switch separately.
For each device the sequence is:

```text
Assistant -> switch: 16 bytes   10 80 83 01 ...
switch -> assistant: 79 bytes   4f 80 83 01 ...
Assistant -> switch: 8 bytes    08 80 02 04 ...
switch -> assistant: 48 bytes   30 80 02 04 ...
```

The packet sequence appears once for each of the three discovered IPs:

- `192.168.178.24`
- `192.168.178.23`
- `192.168.178.22`

The sequence counters in the payload increase between devices. The responses
are binary/obfuscated and are not readable text, but this is the correct read
handshake to reproduce for device-detail synchronization.

## Synchronization capture for switch 2888

`docs/MitschnittSynchronisierung2888.pcapng` captures a longer read-only
sequence for `192.168.178.24` (serial `2888`). In order:

```text
30 80 01 02 ...              48-byte discovery request
E4 80 01 02 ...              228-byte discovery response
08 80 01 00 ...               8-byte detail request
A8 80 01 00 ...              168-byte detail response
08 80 02 04 ...               8-byte detail request
30 80 02 04 ...               48-byte detail response
10 80 02 00 ...              16-byte detail request
08 80 02 00 ...                8-byte response
10 80 83 01 ...              16-byte device-information request
4F 80 83 01 ...               79-byte device-information response
```

The capture contains no UDP `34988` traffic. This confirms that the
configuration software can obtain additional device information entirely over
the read-only discovery/synchronization protocol on UDP `34984`.

The binary responses are not yet decoded, but the request sequence and packet
families are now known and can be implemented without using the UMP control or
actuator protocol.

The scanner now follows the known read-only sequence through `0x80/0x02/0x00`
and then sends the `0x83/0x01` device-information request with a fresh random
8-byte challenge. The 79-byte response starts by echoing that challenge,
followed by the device-information payload. All responses remain available as
raw hex and as decoded packet envelopes.

Comparison of the available captures shows that the 63-byte information
payload after the echoed challenge is not stable between sessions, even for
the same switch. It contains no readable text and appears to be
session-dependent/obfuscated. The bridge therefore validates and stores the
challenge echo, but does not assign firmware, date, hardware, or memory fields
until the encoding is identified from additional controlled captures.

## Serial number caution

The MAC suffix is not a reliable serial-number field. For example, the device
with MAC `00:50:C2:73:03:14` has serial number `456` in the u::lux TestCenter,
while the old fallback interpreted the final two MAC octets as hexadecimal and
displayed `788`. The bridge now stores such a value only as
`serial_number_candidate`; confirmed serial numbers must come from configured
metadata or a decoded protocol field.

## Live debugger capture of `uLuxConfig.exe`

A live capture (x32dbg breakpoint on `ws2_32.dll!recvfrom`, running the real
configuration software against real switches) confirms the discovery response
structure byte-for-byte against the format documented above. Header:

```text
E4 80 01 02 00 00 9D 07 2C 63 56 70 13 74 ...
```

`E4`=228-byte length, `80/01/02`=family/message/variant, `9D 07`=sequence
(matches the outgoing request's sequence), followed by a 6-byte protocol_id
(`2C 63 56 70 13 74` in this capture).

Important structural finding confirmed live: bytes ~14-63 repeat a fixed
8-byte unit (`D7 9C D9 C7 13 74 10 9C` in this capture), then from roughly
byte 48 onward the remainder of the packet is high-entropy/non-repeating data
through to the end of the packet. This exact repeating-then-random shape also
appears in every static `.pcapng` capture analyzed earlier, confirming it is a
real protocol feature rather than a capture artifact.

Working hypothesis: the repeating block is per-session key/seed material, and
the high-entropy tail is that material expanded and combined (e.g. XORed)
with the actual field data — a lightweight obfuscation/encryption layer rather
than directly readable fields. This is the most concrete lead so far toward
decoding the `0x80/0x01`, `0x80/0x02/0x04`, and `0x83/0x01` payloads. Not yet
verified: the exact expansion/combination function, and whether the seed is
per-connection, per-sequence, or per-device.

A second live capture (same method, switch `192.168.178.23`) refined this
finding precisely: the discovery response's repeating 8-byte payload unit
consistently has its **last 2 bytes equal to the last 2 bytes of the 6-byte
`protocol_id` field** at offset 8-13. Confirmed in two independent captures:

```text
protocol_id tail 13 74  <->  repeat unit ... 13 74 (capture for one switch)
protocol_id tail 14 74  <->  repeat unit ... 14 74 (capture for 192.168.178.23)
protocol_id tail 24 74  <->  repeat unit ... 24 74 (docs/MitschnittSynchronisierung2888.pcapng, switch 2888)
```

The repeating unit itself differs between captures/switches (not a fixed
constant), but always ends with the same 2 bytes as `protocol_id`. This
repeats for roughly the first 40-48 payload bytes, then the rest of the
228-byte packet becomes high-entropy/non-repeating.

This repeating-prefix behavior does **not** generalize to the later sync
responses in the same capture (switch 2888):

- `0x80/0x01` response (168 bytes): no repeating structure anywhere; looks
  high-entropy from byte 0 of the payload.
- `0x80/0x02/0x04` response (48 bytes): partial structure —
  three 8-byte blocks share a common `fe 60 .. 5d 76 ..` shape with only 1-2
  bytes varying between them (possibly a small counter/subfield), followed by
  an **exact** repeated 8-byte block in the last 16 bytes
  (`6b 75 91 20 c8 63 3f 85` twice).
- `0x80/0x02/0x00` response (8 bytes): header only, no payload to analyze.
- `0x83/0x01` response (79 bytes): payload begins with the echoed 8-byte
  challenge (see above), the remaining 63 bytes show no simple repetition.

So the discovery response's protocol_id-tied repeating prefix is specific to
that packet type; the sync-family responses do not share the same simple
repetition and remain effectively opaque without further captures (ideally
multiple syncs of the *same* switch back-to-back, to isolate which bytes stay
constant vs change between requests).

The app itself (`uLuxConfig.exe`) is a Delphi/VCL binary using the Indy
networking library (`TIdUDPServer`/`TIdUDPClient`), which resolves
`ws2_32.dll` dynamically via `LoadLibrary`/`GetProcAddress` rather than static
imports — this is why the executable's import table shows no Winsock
functions. This also means the corresponding IP-assignment feature
(`AssignWizard`, `AutoAssignIPAddresses`, `TIPAssignThreadState`) uses
`GetIpNetTable`/`DeleteIpNetEntry` to flush stale ARP entries; this remains
out of scope and was not analyzed further.

## Full Synchronization capture v2

`docs/MitschnittSynchronisierung2888_v2.pcapng` captures the u::lux Config
2.54.930.2865 **Synchronisierung** operation for switch `192.168.178.24`
(serial `2888`), with the controller at `192.168.178.98`. It contains a longer
exchange than the earlier capture and reveals a bulk transfer phase. This
operation is not equivalent to passive Discovery: after the metadata exchanges,
the controller sends opaque data to the switch. Do not reproduce this phase in
the Bridge's read-only scanner.

### Observed order

On UDP `34984`, the trace shows the known broadcast request/response, then:

```text
08 80 01 00 ...   request detail 0x01
A8 80 01 00 ...   168-byte response
08 80 02 04 ...   request detail 0x02/0x04
30 80 02 04 ...   48-byte response
08 80 03 00 ...   request; matching 8-byte response arrives ~559 ms later
08 80 02 01 ...   request; matching responses; this poll repeats
10 80 06 01 ...   16-byte request with an 8-byte value
10 80 06 01 ...   matching 16-byte response
08 80 01 00 ...   another detail request and 168-byte response
10 85 05 01 ...   extended-length bulk data transfer begins
20 80 05 01 ...   32-byte acknowledgement for each data chunk
...
F0 82 05 01 ...   final short extended-length data chunk
20 80 05 01 ...   final chunk acknowledgement
10 80 03 01 ...   request, followed by 20 80 03 01 acknowledgement
20 80 08 01 ...   request/response exchange
08 80 01 00 ...   further detail request/response
10 80 02 00 ...   16-byte request; 08 80 02 00 response
10 80 03 01 ...   additional polling/acknowledgement exchanges
10 80 83 01 ...   device-info request with an 8-byte challenge
4F 80 83 01 ...   79-byte response echoing that challenge
```

There are repeated `0x80/0x01` requests/responses during the operation. The
trace shows this is a multi-stage synchronization workflow, not a single
one-shot Discovery scan. Requests and responses may be delayed or repeated;
correlate by device, message/variant, sequence, and token rather than assuming
strict immediate one-to-one ordering.

### Bulk transfer framing

The capture contains 92 controller-to-switch data chunks on UDP `34984`:

- 91 datagrams have UDP length 1304 bytes (UDP payload 1296 bytes).
- One final datagram has UDP length 760 bytes (UDP payload 752 bytes).
- Each data chunk is acknowledged by a 40-byte UDP datagram from the switch.
- Chunk sequence runs from `0x07AA` through `0x0805`, crossing
  `0x07FF` to `0x0800` without resetting.

The first full chunk begins:

```text
10 85 05 01 00 00 AA 07 02 62 5E 67 81 74 D0 EA ...
```

The final short chunk begins:

```text
F0 82 05 01 00 00 05 08 DB 10 89 2D 20 7B 7F E2 ...
```

Interpreting the first two bytes as little-endian words gives `0x8510` and
`0x82F0`. Clearing bit 15 yields `0x0510` (1296) and `0x02F0` (752), exactly
the corresponding UDP payload lengths. This strongly supports bit 15 acting
as an extended-length marker for these packets. The following prefix contains
`05 01`, two zero bytes, a little-endian sequence, and an 8-byte value echoed
by the acknowledgement. After the 16-byte prefix, each full packet carries
1280 data bytes; the final packet carries 736. Total transferred data is
117,216 bytes.

Example acknowledgement for the first chunk:

```text
20 80 05 01 00 00 AA 07 02 62 5E 67 81 74 D0 EA
F1 CD 80 B3 20 4E 55 B0 CE A5 B3 36 ED 0C F4 13
```

The acknowledgement repeats the chunk's 8-byte transfer value and appends 16
opaque bytes. Their semantics are unknown; do not label them a checksum or
cryptographic tag without additional evidence.

The trace also contains one UDP `34988` UMP datagram from the switch during
this session. The earlier no-UMP observation applies only to
`MitschnittSynchronisierung2888.pcapng`, not to v2.

### Implementation boundary

- The Bridge's read-only Discovery scanner may use confirmed metadata
  requests/responses but must stop before the `0x05/0x01` bulk transfer.
- Full Config **Synchronisierung** is a configuration-transfer workflow, even
  though preceding stages look like reads.
- The transferred content remains opaque. Current evidence does not identify
  compression, encryption, a configuration schema, or write safety.
- Do not implement or send this extended transfer unless the user explicitly
  changes the read-only scope and the payload format is understood.

## What this proves

The earlier `MitschnittSynchronisierung2888.pcapng` capture shows the
configuration software discovering a device and performing a per-device
detail exchange entirely on UDP `34984`, without UDP `34988` traffic. The v2
capture below is a longer synchronization session and includes one separate
UDP `34988` UMP datagram as well as the `34984` bulk transfer.

For our read-only implementation, the next protocol work should target:

1. send the 48-byte discovery request on UDP `34984`;
2. collect the 228-byte responses;
3. send the 16-byte `0x83` request to each device;
4. parse/store the 79-byte response;
5. send the 8-byte `0x02/0x04` follow-up request;
6. parse/store the 48-byte response;
7. decode known properties where correlation with screenshots and multiple
   devices makes the field mapping reliable;
8. update the Bridge Registry without changing the physical switch.

## Out of scope

Do not implement or analyze these assistant options as part of synchronization:

- assigning new IP addresses
- deleting switch addresses
- changing network configuration
- writing project/configuration data
- adding or modifying project membership

Those operations could change or overwrite the device configuration and are not
needed for the current read-only discovery goal.
