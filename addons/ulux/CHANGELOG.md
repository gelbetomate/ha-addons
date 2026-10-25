# u::Lux UMP Bridge Changelog

## 0.5.100

- Use only confirmed or candidate serial numbers for MQTT topic identities; remove MAC fallback.

## 0.5.99

- Allow page index `0` in the bridge device setup UI.

## 0.5.98

- Use confirmed serial number or configured switch ID/MAC as MQTT device identity; never use IP or UMP protocol address.
- Accept serial-based MQTT command topics in addition to legacy switch ID topics.

## 0.5.97

- Separate polled `ulux_state` events from real `ID_EVENT` key events exposed as `ulux_event`.

## 0.5.96

- Fixed discovery scan completion so the first scan response is not missed before the result is rendered.
- Expose the last HA REST event delivery error through `/api/health`.

## 0.5.95

- Corrected `ID_LED` to encode the combined `LEDColor` as the 16-bit field after `LEDIndex`.
- Prefer the Supervisor REST event endpoint for HA event delivery, with WebSocket fallback.

## 0.5.94

- Automatically probe registered devices without a learned UMP device ID at bridge startup, import, or registration.

## 0.5.93

- Persist learned UMP device ID and frame version during normal packet registry updates so UI, HTTP, and MQTT commands use the real device target.

## 0.5.92

- Persist runtime HA/MQTT mode and broker changes from the bridge UI.
- Keep standalone `options.json` writable so UI configuration survives restarts.

## 0.5.91

- Ported the reference video's configurable actor ID, defaulting to actor 23.
- Added start-column and column-count fields to the 16-byte video stream metadata header.

## 0.5.90

- Corrected outbound `ID_LED` commands to send explicit `LEDIndex` and combined `LEDColor` values per LED, matching the existing Loxone command format.

## 0.5.89

- Added runtime configuration for HA events, MQTT, MQTT Discovery, broker host/port, credentials, and base topic.
- MQTT can now be enabled, disabled, or run in parallel with HA events from the bridge UI.

## 0.5.88

- Added MQTT status and publish tester to the bridge web UI.
- Added `/api/mqtt/status` and `/api/mqtt/publish` endpoints for controlled external-system testing.

## 0.5.87

- Encode `ID_TEXT` colors as 16-bit RGB565, matching the TestCenter `Color=0xFFFF` white payload.

## 0.5.86

- Matched `ID_TEXT` message length and trailing padding to the 34-byte TestCenter telegram format.

## 0.5.85

- Poll `ID_STATE (0x01)` together with the sensor requests so motion and display state updates do not depend on unsolicited state packets.

## 0.5.84

- Extended `/api/health` with active HA/MQTT mode flags.
- Added debug logging for successfully delivered HA events via WebSocket or REST.

## 0.5.83

- Added Domiq-compatible `hit`, `make`, and `break` key action events with press duration.
- Added confirmed V2.32 request catalog and device-specific audio/video observations.
- Added named LED color and blink values to LED diagnostics.

## 0.5.82

- Added a Home Assistant Core REST event fallback through the Supervisor proxy when WebSocket authentication is unavailable.
- Sensor, key, page, state, LED, and IR events can now reach HA without depending exclusively on the Core WebSocket session.

## 0.5.81

- Fixed the Home Assistant WebSocket handshake by sending authentication only after `auth_required`.
- Supervisor token authentication now follows the official Core WebSocket sequence.

## 0.5.80

- Fixed Supervisor environment propagation so `SUPERVISOR_TOKEN` reaches the Node bridge process.
- Restored the official Supervisor token fallback for Home Assistant Core WebSocket events.

## 0.5.79

- Stopped using `SUPERVISOR_TOKEN` as a Home Assistant Core WebSocket token.
- Added explicit guidance for `ha.token` Long-Lived Access Tokens and MQTT fallback.

## 0.5.78

- Added proactive Home Assistant WebSocket authentication when the Supervisor token is available.
- Reset authentication state correctly across reconnects.

## 0.5.77

- Fixed key-event handling by passing the discovery registry into the key handler.
- Key snapshots can now be persisted and shown on the Bridge device page without a runtime error.

## 0.5.76

- Fixed add-on metadata by removing an accidental nested `schema.version` field that could prevent Supervisor recognition.

## 0.5.75

- Added visible Bridge device diagnostics for key snapshots, LED values, and IR responses.
- Changed the Bridge Chime action to play once without repeat delay.

## 0.5.71

- Changed the Bridge Chime button to play once with no repeat delay.

## 0.5.74

- Matched the V2.32 TestCenter local-audio payload: repeat count does not set `PlayFlags=0x02`.
- Bridge Chime now uses confirmed SoundIndex `1`, volume `100`, repeats `5`, and delay `2500`.

## 0.5.73

- Installed timezone data in the add-on images.
- Applied the configured `timezone` option to the Node process at startup.

## 0.5.72

- Added explicit `timezone` handling for UMP DateTime synchronization.
- Default timezone is `Europe/Berlin`, avoiding UTC container offsets in the u::lux clock.

## 0.5.71

- Fixed PageIndex transmission for the V2.32 switch: requested page values are sent directly as captured by the TestCenter.

## 0.5.70

- Fixed the Bridge Chime button to send the confirmed TestCenter payload: sound index `3`, volume `100`, repeats `5`, delay `2500`.
- Corrected the UI field name from `sound_id` to `sound_index`.

## 0.5.69

- Fixed control telegram structure to match TestCenter: Page, Activate, and audio messages are sent without embedding `ID_INIT` in the same packet.
- Preserved the observed six-/16-byte control packet lengths for V2.32 devices.

## 0.5.68

- Corrected V2.32 DateTime synchronization to send local clock fields.
- Kept UMP event routing functional when a registry entry has stale identity metadata.

## 0.5.67

- Fixed UMP frame-version parsing/display: wire value `0x0232` is shown as `2.32`, not `2.50`.

## 0.5.66

- Decoded the confirmed V2.32 `RealValue` fixed-point values in tenths, matching TestCenter values such as `0.3`, `1.4`, `2.5`, and `3.6`.

## 0.5.65

- Added periodic `ID_IR (0x81)` requests and raw `ulux_ir` response events for layout discovery.
- Documented the confirmed `ID_LED (0x44)` bit conversion for color, blink mode, and override.

## 0.5.64

- Added inbound `ID_LED (0x44)` decoding with color, blink, override, and raw LED values.
- Published LED status through `ulux_led` and MQTT registry telemetry.

## 0.5.63

- Corrected `ID_INIT` to send `InitFlags=0x0003` and `InitCode=0x5AA5`.
- Aligned V2.32 audio IDs with the TestCenter capture: volume `0x91`, stop `0x92`, local playback `0x98`.
- Prepended the confirmed initialization message to page, activation, and audio control commands.

## 0.5.62

- Enabled the broader verified UMP change-report mask `0xBF08001F` by default.
- Corrected DateTime synchronization to send a consistent UTC protocol timestamp for the u::lux local timezone.

## 0.5.61

- Fixed UMP DateTime synchronization by encoding all calendar and clock fields from one local-time basis.

## 0.5.60

- Probe now retries safe initialization requests with device-ID candidates when registry UMP metadata is missing.
- This repairs devices whose registry entry lost learned UMP parameters without writing actuator values.

## 0.5.59

- Synchronize DateTime once on the first valid UMP State message during initialization.
- Continue responding to explicit device `TimeRequest` flags.

## 0.5.58

- Fixed registry identity handling so UMP protocol addresses do not replace the device MAC/switch ID.
- Discovery MAC data can repair entries that were previously re-keyed to a UMP address.

## 0.5.57

- Fixed one-based page commands and HA `page_index` commands in the Bridge API.
- Accepted six-byte UMP sensor responses, including ambient Lux responses without an explicit validity byte.

## 0.5.56

- Changed environmental sensor polling to a configurable 60-second fallback.
- State, motion, proximity, input, and key events remain event-driven.

## 0.5.55

- Added periodic UMP sensor requests for temperature, humidity, CO2, VOC, IN2, and illuminance.
- Fixed one-based Bridge UI page numbers being sent as zero-based UMP indices.
- Aligned local audio, stop, and volume message IDs with the documented UMP table.
- Used learned device ID and frame version for initialization replies.

## 0.5.54

- Persisted decoded UMP state flags and live sensor readings in the registry for HA consumption.
- Preserved sensor validity and motion/proximity/display/audio state data across registry updates.

## 0.5.53

- Learned `ump_device_id` and `ump_frame_version` from valid inbound UMP response headers.
- Reused the learned parameters for subsequent page, wake, chime, and value control commands.

## 0.5.52

- Fixed discovery so MAC-suffix estimates are no longer presented as confirmed serial numbers.
- Preserved unconfirmed MAC-derived values as `serial_number_candidate` for diagnostics.
- Added registry UI labeling for decoded versus unconfirmed serial information.

## 0.5.51

- Added a native Wyoming TCP satellite endpoint on port `10700`.
- Added Wyoming `describe`, `run-pipeline`, `audio-start`, `audio-chunk`, and `audio-stop` handling.
- Connected push-to-talk u::lux key events to Wyoming pipeline starts and microphone streaming.
- Connected Wyoming audio output events to the paced u::lux speaker sender.

## 0.5.50

- Added separate raw audio UDP transport on port `35000` (`0x88A4`).
- Added PCM 16-bit and G.711 A-Law frame decoding, sequence handling, a 60 ms jitter buffer, and paced 20 ms PCM output.
- Added the 16-byte `ULUX` audio control frame with Big-Endian fields and XOR checksum on UDP port `35004` (`0x88AC`).
- Added bidirectional WebSocket audio endpoint at `/api/audio/ws/:switchId` with `receive`, `send`, and `duplex` modes.
- Added configurable push-to-talk sessions triggered by verified `ulux_key` press/release events, including microphone on/off control and `ulux_assist_session` HA events.
- Added per-device stream serialization, cancellation, status, and stop endpoints for display streams.

## 0.5.49

- Full implementation of the u::Lux Message Protocol (UMP v2.43) on UDP port `34988`.
- Inbound decoders for all standard UMP message types:
  - Complete 16-bit `StateFlags` bitfield (light, proximity, display_active, audio, intro, time/init requests, error, and hardware sensor availability flags).
  - Sensor readings for Temperature (`0x71`), Relative Humidity (`0x72`), CO2 (`0x73`), VOC (`0x75`), Ambient Lux (`0x03`), and Binary Input IN2 (`0x74`).
  - Navigation telemetry for `PageIndex` (`0x2E`), `PageCount` (`0x0E`), and actor enumeration `IdList` (`0x0F`).
  - Value events for `EditValue` (`0x42`), `RealValue` (`0x43`), and `IdValue` (`0x41`).
  - Video stream capability decoding for `VideoState` (`0xA1`) including screen bounds and flags.
- Outbound UMP telegram builders for page navigation, standby/wake activation, LED colors/modes, custom text fields, actuator values, audio chime playback and volume, and video streaming.
- New REST control endpoints under `/api/switch/:switchId/*` (`page`, `activate`, `led`, `text`, `value`, `audio/play`, `audio/stop`, `audio/volume`, `ump/raw`).
- Wildcard MQTT command dispatch on `<base_topic>/+/cmd/#` and granular MQTT telemetry publishing for sensor values, pages, actor values, and state.
- Enhanced Web UI with live sensor badges and quick action controls (Set Page, Wake/Standby, Chime test).
- Preserved strict read-only nature of the UDP `34984` discovery handshake.

## 0.5.48

- Synchronize the UI with an explicit Discovery scan status instead of a fixed polling duration.
- Register the scan callback before sending the broadcast so the first response cannot race initialization.

## 0.5.47

- Merge asynchronous Discovery synchronization responses by `ip` as well as `senderIp`, preventing sync data from being detached from its device.

## 0.5.46

- Log every Discovery synchronization request and response, including destination, sequence, raw hex, and send errors.

## 0.5.45

- Add a unique refresh query to every Bridge API GET and refresh Discovery immediately after starting a scan.

## 0.5.44

- Disable browser caching for Bridge API refreshes.
- Preserve existing Discovery synchronization data when importing a device from a stale UI view.

## 0.5.43

- Refresh Discovery and Devices once more after the monitored scan completes.

## 0.5.42

- Start Discovery scans through the monitored `scanAndWait` flow so delayed synchronization responses remain in the same scan.
- Preserve collected Discovery synchronization data when importing devices.

## 0.5.41

- Support firmware that skips `0x80/0x01` and starts synchronization with `0x83/0x01`.
- Continue the alternate read-only path with `0x80/0x02/0x04` when the device-information response arrives first.

## 0.5.40

- Continue each device's read-only synchronization sequence from the sequence number in its Discovery response.

## 0.5.39

- Validate and store whether each `0x83/0x01` response echoes the request challenge.
- Document the session-dependent opaque device-information payload boundary.

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
