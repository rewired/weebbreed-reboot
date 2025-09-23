# ADR 0004 — Zone Setpoint Routing

- **Status:** Accepted (2025-09-23)
- **Owner:** Simulation Platform
- **Context:** Zone control + device coordination

## Context

The dashboard exposes temperature, humidity, VPD, CO₂, and lighting setpoints
per zone and has been emitting `config.update` commands with `{ type: 'setpoint',
zoneId, metric, value }`. Until now the backend rejected these updates with
`ERR_INVALID_STATE`, leaving UI controls in limbo and forcing designers to tweak
devices manually. We needed a deterministic mapping between a zone-level target,
the devices capable of regulating that metric, and the control state emitted to
telemetry so frontends and automation scripts have a single contract.

## Decision

- Teach `SimulationFacade.setZoneSetpoint` to validate and route setpoints based
  on the metric:
  - `temperature` programs `targetTemperature` on HVAC devices.
  - `relativeHumidity` programs `targetHumidity` on humidifier/dehumidifier
    devices and clears any VPD override.
  - `vpd` converts the target VPD (using the zone control reference temperature)
    into a humidity target, applies it to humidity devices, and persists both
    humidity and VPD setpoints.
  - `co2` programs `targetCO2` on enrichment/scrubber devices.
  - `ppfd` programs the dimmable lighting `ppfd` setting and scales power when a
    finite value is present.
- Reject non-finite values and clamp invalid ranges (`< 0` for PPFD/CO₂/VPD,
  humidity constrained to `[0,1]`). Any clamp emits a warning string in the
  `CommandResult` so the UI can surface the adjustment.
- Zones lacking the required device capability return `ERR_INVALID_STATE` to the
  caller.
- Successful updates raise an `env.setpointUpdated` domain event that includes
  the updated control snapshot plus an `effectiveHumidity` field when the target
  was expressed as VPD.

## Consequences

- Frontend controls now operate against a stable backend contract with explicit
  warnings and failure semantics.
- Device settings stay the single source of truth for climate control while zone
  control state mirrors the last requested targets for telemetry and save/load.
- Translating VPD to humidity in the façade keeps device logic unchanged and
  avoids pushing psychrometric math into the UI.
- Future control strategies (PID, predictive) can consume the same zone control
  record without reworking socket payloads.

## Alternatives Considered

1. **Expose direct device updates over the socket.** Rejected because it would
   bypass zone invariants, require the UI to understand per-device settings, and
   fragment validation logic.
2. **Store setpoints only in zone state and let devices poll it.** Rejected to
   keep device settings authoritative and avoid introducing a polling loop or
   duplicated clamps.
3. **Interpret VPD in the UI.** Rejected to keep physics-derived conversions on
   the backend where the reference temperature and psychrometric helpers already
   exist.

## Rollback Plan

Revert `SimulationFacade.setZoneSetpoint` to the previous stub that rejected
setpoint updates and mark the ADR as superseded. UI controls should then be
hidden or disabled until a new contract is negotiated.
