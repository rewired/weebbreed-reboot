# ADR 0005 — Snapshot & Time Status Telemetry Contract

- **Status:** Accepted (2025-09-24)
- **Owner:** Simulation Platform
- **Context:** Socket/SSE telemetry contract & dashboard integration

## Context

The simulation gateway streams `simulationUpdate` batches to both Socket.IO and
SSE clients. Over time the `SimulationSnapshot` shape evolved to include
additional structures (room purpose metadata, control setpoints, finance and
personnel summaries) and the scheduler began exposing a richer time status with
pause/running semantics for the UI. Documentation and onboarding guides still
reflected the early, zone-only payload without the persisted clock metadata or
`TimeStatus` envelope, leading to client misunderstandings about where to source
pause/resume state and when to expect updates.

## Decision

- Treat `buildSimulationSnapshot` as the authoritative schema provider. The
  emitted payload includes:
  - `clock` with `{ tick, isPaused, targetTickRate, startedAt, lastUpdatedAt }`.
  - Structures, rooms, and zones (including control/resources/health and device
    snapshots).
  - Personnel and finance summaries.
- Every `simulationUpdate` entry carries the scheduler’s `TimeStatus`
  (`{ running, paused, speed, tick, targetTickRate }`) alongside the snapshot.
  This value is sourced from `SimulationFacade.getTimeStatus()` at emission time
  and complements the persisted clock.
- `time.status` remains a handshake event only. Ongoing changes propagate through
  the `time` field on simulation updates and the `CommandResult` envelopes that
  respond to time-control commands.
- Update the protocol guide, AGENTS brief, README, and dashboards to reference
  this contract. Future schema changes must land in the same documents and bump
  the socket protocol version when they break compatibility.

## Consequences

- UI clients have a single, complete contract for both persisted clock data and
  live scheduler state, reducing ad-hoc polling or inference.
- Documentation debt around snapshot payloads is cleared, preventing new
  services from shipping against stale assumptions.
- Introduces a standing requirement to update the protocol guide and ADR when the
  snapshot/time status shapes change.

## References

- `docs/system/socket_protocol.md`
- `AGENTS.md` §4.8
- `src/backend/src/lib/uiSnapshot.ts`
- `src/backend/src/facade/index.ts` (`getTimeStatus`)
