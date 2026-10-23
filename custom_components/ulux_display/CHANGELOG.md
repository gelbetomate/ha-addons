# u::lux Display HACS Integration Changelog

## 0.2.23

- Added event-driven LED 1-4 sensors with color, blink-mode, override, active, and raw attributes.

## 0.2.22

- Added event-driven `Key 1` through `Key 4` binary sensors.
- Fixed physical next/previous page fallback when no local HA views are configured.
- Applied physical Active wake/standby and page control through the learned UMP device parameters.

## 0.2.21

- Switched UMP sensor and state updates to the bridge's event bus events.
- Kept the bridge registry request only as an initial startup snapshot.
- Motion, proximity, inputs, display state, audio state, and sensor values now update immediately when events arrive.

## 0.2.20

- Fixed physical Active wake/standby control.
- Added live UMP sensor and binary-state entities backed by bridge registry polling.
- Added physical page navigation support through the bridge control path.

## 0.2.19

- Added UMP sensors for temperature, humidity, CO2, VOC, and illuminance.
- Added binary sensors for motion, proximity, light state, audio activity, and display activity.
- Connected the Active control to physical u::lux wake/standby commands.
- Added bridge-registry state polling for live UMP values.

## 0.2.18

- Added the newer GeekMagic-compatible themes: watchOS, StandBy, Night, Blueprint, Ink, Aurora, and Brutal.
- Kept all themes on the existing Pillow renderer and u::lux transport.

## 0.2.17

- Fixed integration startup on Home Assistant versions without `async_track_event` by using the native event bus listener API.

## 0.2.16

- Ported compatible non-rendering GeekMagic updates without replacing the existing Pillow renderer.
- Added the Date / Time widget with relative, date, time, datetime, custom, and entity-attribute formats.
- Added configurable Stream Page and Stream Refresh Rate entities.
- Added page-event-driven image streaming through the u::lux UMP Bridge with rate limiting up to 5 FPS.

## 0.2.15

- Added a `media_player` entity for local u::lux sounds, stop, and volume control.
- Added the `ulux_display.configure_audio` service for microphone and speaker control through the bridge.
- Added documented integration points for the bridge audio WebSocket and future Assist Satellite support.

## 0.2.14

- Process bridge-requested HA deletions through a separate pending-deletions endpoint while keeping Discovery visible.

## 0.2.12

- Clear stale bridge deletion requests when a device is linked to a newly created HA config entry.
- Prevent newly created HA devices from being removed by an earlier deletion request.

## 0.2.11

- Removing a Home Assistant config entry now unlinks it from the Bridge Registry instead of deleting the registry device.
- Discovery and imported Bridge Registry devices remain available for later HA setup.

## 0.2.10

- Process bridge-requested HA deletions immediately at integration startup and with a named periodic callback.
- Added explicit logging after a requested HA config entry is removed.

## 0.2.9

- Added HA-side processing of bridge-requested device deletions.
- Removed automatic creation of all bridge registry devices at integration startup.
- Added wizard support for manual setup, selecting one registry device, or importing all unconfigured registry devices.
- Registry metadata is used for serial-based device names, MAC addresses, and protocol IDs.
- Added per-device MQTT Discovery option in the Home Assistant device settings.

## 0.2.8

- Enriched manual setup from an existing bridge registry record when available.
- Manual setup now retains registry serial number, MAC address, and protocol metadata.

## 0.2.7

- Removed the unverified software database ID from device metadata.
- Kept the confirmed discovery metadata and serial-number inference explicit.

## 0.2.6

- Added wizard-only Home Assistant device creation.
- Prevented automatic creation of all bridge registry devices during integration startup.

## 0.2.5

- Exposed discovered MAC and serial information in Home Assistant DeviceInfo.
- Improved serial number handling for Home Assistant device metadata.

## 0.2.4

- Added per-device MQTT Discovery configuration support.
- Added Home Assistant device linking to the bridge registry.
