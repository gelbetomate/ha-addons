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

## What this proves

The configuration software's normal synchronization/search path can discover
multiple devices and perform a per-device detail exchange without using UDP
`34988` UMP traffic.

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
