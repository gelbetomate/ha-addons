# u::Lux Switch Registry Implementation Plan

## Phase 1 — Define the contract
- Finalize registry schema.
- Confirm device fields and lifecycle states.
- Agree on ownership between bridge, Supervisor UI, and HACS integration.
- Freeze API endpoints and response shapes.

## Phase 2 — Persist the registry
- Replace any ephemeral discovery-only storage with a persistent registry store.
- Add load/save helpers.
- Include schema versioning and migration support.
- Keep backwards-compatible import from discovery state if needed.

## Phase 3 — Expose registry APIs
- Implement read endpoints for list/detail.
- Implement create/update/delete.
- Implement sync endpoint for discovery merge.
- Implement link/unlink endpoints for Home Assistant entry association.

## Phase 4 — Supervisor UI
- Build a switch list screen.
- Add discovery results and bulk import UX.
- Add detail/edit screens.
- Add status, health, and link indicators.

## Phase 5 — HACS integration wiring
- Read the registry from the Supervisor API.
- Use registry records to seed config flow and entity setup.
- Keep rendering logic unchanged.
- Treat registry updates as the source of truth for configured switches.

## Phase 6 — Bridge sync
- Continue UDP discovery observation.
- Push discovery data to the persistent registry layer.
- Avoid duplicating registry ownership in the bridge.

## Phase 7 — Testing
- Unit test registry CRUD.
- Integration test discovery merge behavior.
- Validate UI sync against bridge discovery.
- Validate HACS integration can load devices from the registry.

## Phase 8 — Documentation
- Update README with architecture overview.
- Document registry API.
- Document Supervisor management flow.
- Document HACS integration behavior.

## Suggested implementation order
1. schema and store
2. registry API
3. Supervisor UI
4. integration sync
5. tests and docs
