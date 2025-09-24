# ADR 0003 — Facade Messaging Overhaul

- **Status:** Accepted (2025-09-23)
- **Owner:** Simulation Platform
- **Context:** Backend facade & transport gateways

## Context

Frontend stores were emitting intents such as `world.duplicateRoom`,
`devices.toggleDeviceGroup`, and `plants.togglePlantingPlan`, but the backend
facade only exposed the legacy CRUD surface. Socket commands were scattered
across bespoke handlers and the documentation still described the pre-facade
command set, leaving UI teams to guess which actions were safe. The gap meant
that duplication workflows and automation toggles silently failed even though
the UI exposed them. We needed a unified contract that the backend, socket
layer, and documentation could share.

## Decision

- Introduce a modular intent registry inside `SimulationFacade`. Domains such as
  `world`, `devices`, and `plants` register actions with a `{ schema, handler }`
  pair so validation, execution, and cataloguing live together.
- Generalise the Socket.IO command surface behind a single
  `facade.intent` envelope (`{ domain, action, payload?, requestId? }`).
  Responses are emitted on `<domain>.intent.result` and follow
  `CommandResult<T>`.
- Codify the telemetry contract (event levels, queue helpers) in the runtime
  shared module `@runtime/eventBusCore` so gateway transports and headless
  consumers reuse the same implementation without depending on backend source
  paths.
- Expand the façade to cover the missing workflows:
  - World: `renameStructure`, `deleteStructure`, `duplicateStructure`,
    `duplicateRoom`, `duplicateZone` (optional name overrides, new IDs returned).
  - Devices: `toggleDeviceGroup` returning affected `deviceIds`.
  - Plants: `togglePlantingPlan` returning `{ enabled }`.
- Update the socket protocol, façade reference docs, and UI interaction spec so
  duplication flows, structure renames, and automation toggles are captured as
  first-class, supported actions.

## Consequences

- UI teams now have an authoritative catalogue of façade intents and matching
  documentation; Socket clients only need to learn one envelope instead of
  bespoke events per command.
- New domains/actions can be added by registering them with the façade builders,
  guaranteeing schema validation and catalogue updates without touching the
  gateway.
- Automated workflows (duplication, group toggles, planting plan automation) now
  return structured data, enabling optimistic UI updates and easier testing.
- Documentation drift is reduced because ADRs and protocol references are tied
  directly to the registry.
- Shared runtime contracts remove the brittle runtime→backend import, making it
  easier to package the gateway separately or embed the facade into tooling
  without bundling backend internals.

## Alternatives Considered

1. **Add ad-hoc socket events per workflow.** Rejected because each new command
   would need bespoke validation and documentation; the catalogue would still be
   fragmented across files.
2. **Expose engine services directly over the socket.** Rejected to avoid
   leaking internal state mutations and to preserve the façade’s invariants
   (determinism, validation, atomic commits).
3. **Keep the legacy CRUD surface and emulate missing workflows in the UI.**
   Rejected because cloning/automation logic belongs in the engine, not the
   client, and it would break determinism.

## Rollback Plan

If the unified `facade.intent` envelope blocks critical flows:

- Re-enable the previous discrete socket events (`simulationControl`,
  bespoke duplication handlers) while keeping the registry for validation.
- Update the UI bridge to call the legacy events and mark the registry-backed
  domains as experimental until parity is restored.
- As a last resort, revert to commit prior to the registry introduction and
  restore the CRUD-only façade methods while keeping this ADR in “superseded”
  state for auditability.
