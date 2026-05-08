# u::Lux System Overview

This repository provides two cooperating components:

- **u::Lux UMP Bridge** Supervisor add-on
- **u::lux Display** HACS integration

## Architecture

```text
Physical u::lux Switch IP
       ↕ UDP 34988 (UMP)
┌─────────────────────────────────┐
│   u::Lux UMP Bridge Add-on      │
│   • Key events → HA events      │
│   • Image streaming to switch   │
│   • Device discovery registry    │
│   • HTTP API on port 8099       │
└──────────────┬──────────────────┘
               │ HTTP (localhost:8099)
┌──────────────▼──────────────────┐
│   u::lux Display Integration    │
│   • PIL rendering               │
│   • HA entities & services      │
│   • Config flow with discovery   │
└─────────────────────────────────┘
```

## Recommended operating model

- The bridge remains the transport layer.
- The Supervisor add-on owns the persistent switch registry.
- The HACS integration reads the registry and instantiates entities.
- The Supervisor UI is the primary place to manage switch records.

## Registry responsibilities

### Bridge
- discover switches from UDP/UMP traffic
- expose discovery results over HTTP
- never own the persistent user-facing registry

### Supervisor UI
- create, edit, and delete switch records
- link records to Home Assistant entries
- merge discovered switches into the persistent registry
- show device health and last-seen status

### HACS integration
- read the registry
- use selected switches for config entries/entities
- push rendered images to the bridge API

## Main flows

### Discovery flow
1. switch sends UMP packet
2. bridge observes the device
3. bridge updates discovery list
4. Supervisor UI syncs discovery into registry
5. user reviews and saves the device

### Rendering flow
1. HACS integration renders a frame
2. integration posts PNG to bridge HTTP API
3. bridge converts and streams to the switch

## Next steps

See `docs/ulux-registry-api.md` for the formal registry API proposal.
