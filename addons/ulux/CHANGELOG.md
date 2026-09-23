# u::Lux UMP Bridge Changelog

## 0.5.38

- Corrected the read-only Discovery request lengths and 8-byte challenge payloads for `0x80/0x02/0x00` and `0x80/0x83/0x01` to match the captured wire format.
- Store per-response decoded packet envelopes (length, message ID, variant, sequence, payload, and `0x83` challenge echo) alongside raw hex.
- Initialize each device synchronization session before sending its first follow-up request.

## 0.5.37

- Extended read-only Discovery synchronization through `0x80/0x02/0x00` and `0x83/0x01` device information responses.
- Retained all additional Discovery responses as raw hex without using UMP writes.

## 0.5.36

- Use serial-number-based names for pending Discovery cards when the name was generated from the IP.

## 0.5.35

- Merge Discovery and synchronization observations by IP to avoid duplicate cards for one switch.
- Preserve MAC-backed identity while retaining synchronization detail data.

## 0.5.34

- Fixed Discovery crashes when a response has no switch ID yet.
- Discovery responses can now reach the UI instead of stopping on a null registry lookup.

## 0.5.33

- Made manual discovery scans asynchronous again to avoid HA ingress `502 Bad Gateway` timeouts.
- The UI polls for responses after one scan request instead of requiring a second click.

## 0.5.32

- Added the first read-only synchronization detail exchange on UDP `34984`.
- Stores raw responses for the `0x80/0x01` and `0x80/0x02/0x04` detail stages.
- Deliberately does not send the later `0x83` request until its device-specific token is decoded.

## 0.5.31

- Display dotted UMP frame versions with a two-digit minor part, e.g. `1.04` instead of `1.4`.
- Keep the stored wire value unchanged (`1.04` is encoded as `0x0104`).

## 0.5.30

- Extended manual discovery completion to include the MAC/ARP resolution window.
- The scan endpoint now waits for the response quiet period before refreshing the UI.

## 0.5.29

- Fixed Registered Devices rendering after import by moving Frame Version helpers into global UI scope.
- UI now reports render errors instead of silently showing an empty device list.

## 0.5.28

- Added an atomic registry import endpoint for Import All.
- Import All now saves and returns the complete registered device set in one request.

## 0.5.27

- Save Registry imports immediately instead of waiting for the periodic dirty-store save.
- Keep Registered Devices persistent across reloads and restarts after Import All.

## 0.5.26

- Import Selected and Import All now report individual registry import failures instead of silently swallowing them.
- Both lists are refreshed after imports complete.

## 0.5.25

- Keep repeated Discovery and UMP observations pending until an explicit import registers the device.

## 0.5.24

- Added complete known UMP device ID mapping for serial numbers 131, 1893, 2888, and 3721.
- Frame Version can now be entered as readable dotted text such as `1.04` or `2.32` and is converted to the UMP word format.

## 0.5.23

- Keep discovery identity when UMP context IDs arrive for the same switch IP.
- Prevent UMP context IDs from creating duplicate `unknown` Discovery entries.

## 0.5.22

- Added per-device UMP Frame Version and UMP Device ID settings for testing different firmware/protocol contexts.
- UMP Probe now uses the configured values instead of one global header context.

## 0.5.21

- Resolve UMP responses through the persistent registry by sender IP before falling back to the UMP header address.
- Prevent successful UMP responses from appearing as `unknown` when the UMP context ID differs from the Ethernet MAC.

## 0.5.20

- Registered Device deletion removes the registry record while retaining the device in Discovery.
- Added a separate queue endpoint for HA to complete pending Config Entry deletion.

## 0.5.19

- Displayed decoded UMP StateFlags, ControlFlags, PageCount, and PageIndex on registered devices.

## 0.5.18

- Used the device context ID observed in the live configuration capture for UMP initialization probes.
- Documented the exact working TX/RX initialization frames from `newudpmitschnitt.pcapng`.

## 0.5.17

- Changed Probe UMP to send the combined initialization request used by the working u::lux software: ID-State, ID-Control, ID-PageCount, and ID-PageIndex.
- Kept TX/RX hexadecimal diagnostics for the initialization exchange.

## 0.5.16

- Deleting a Registered Device always removes it from the persistent Bridge Registry.
- Discovery results remain available separately after a Registered Device is deleted.
- Home Assistant deletion failures are reported as warnings without preventing Bridge Registry deletion.

## 0.5.15

- Clarified unlinked registered devices in the Bridge UI with a `Bridge registry only` badge.
- Kept registry devices available for future HA setup after an HA entry is removed.

## 0.5.14

- Corrected UMP frame offsets and the DateTime/VideoState message layouts using the supplied UMP specification and reference implementation.
- Added persisted UMP TX/RX hex diagnostics to registered devices.

## 0.5.13

- Treat queued HA deletion as a successful asynchronous operation in the Bridge UI instead of showing a misleading error.

## 0.5.12

- The manual scan API now waits for the UDP response window before returning.
- Discovery results are refreshed once from completed scan data instead of requiring a second click.

## 0.5.11

- Import Selected and Import All now prefer the serial-number-based device name over stale MAC-based discovery names.

## 0.5.10

- Extended the Discovery UI refresh window after a manual scan to accommodate slower switch responses.
- Prevented the need for a second scan click when UDP responses arrive late.

## 0.5.9

- Added HA-side pending deletion fallback when the bridge WebSocket cannot remove a config entry directly.
- Bridge deletion now queues the Home Assistant deletion request instead of losing the device record.
- The HACS integration processes pending deletion requests and cleans up the bridge registry afterward.
- Improved deletion diagnostics and retained Bridge Registry data until Home Assistant confirms removal.

## 0.5.8

- Exposed the actual Home Assistant WebSocket authentication or connection error.
- Disabled HA device management explicitly when no Supervisor token is available.

## 0.5.7

- Removed the unverified software database ID from discovery display and registry metadata.
- Documented the confirmed discovery response fields and protocol limitations.

## 0.5.6

- Added explicit Ja/Nein deletion confirmation in the Bridge UI.
- Added HA WebSocket connection status diagnostics.

## 0.5.5

- Enriched registered devices from discovery by matching their IP address.
- Updated generated names to use the inferred serial number when available.

## 0.5.4

- Refreshed Discovery results repeatedly after one manual scan.
- Prevented duplicate scan requests while a scan is in progress.

## 0.5.0

- Separated UDP discovery port `34984` from normal UMP port `34988`.
- Added per-device MQTT Discovery configuration through the HACS integration.
- Added MQTT Discovery cleanup when a device is removed.
