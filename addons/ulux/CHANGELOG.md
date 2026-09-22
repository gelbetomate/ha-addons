# u::Lux UMP Bridge Changelog

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
