# u::lux Display HACS Integration Changelog

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
