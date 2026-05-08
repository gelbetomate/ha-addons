# u::Lux Display Integration

This integration renders dashboards for u::Lux Switch IP devices and sends them through the u::Lux UMP Bridge add-on.

## Current role

- Render images in Home Assistant.
- Discover configured switches via the bridge HTTP API.
- Create config entries for selected switches.
- Forward rendered frames to the bridge for streaming.

## Expected registry integration

The integration should consume the canonical switch registry provided by the Supervisor add-on.

It should:
- read the registry
- list available switches in the config flow
- link config entries to registry records
- avoid owning a second, separate list of devices

## Bridge dependency

The bridge add-on remains the transport layer and performs:
- UDP/UMP handling
- device discovery observation
- image streaming to the switch

## Notes

The integration already depends on bridge discovery for the config flow. Future work should switch this from discovery-only behavior to registry-backed behavior where possible.
