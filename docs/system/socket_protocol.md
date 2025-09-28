# Socket Protocol — Simulation Gateway

The backend exposes a shared UI event stream (`uiStream$`) that aggregates
simulation telemetry and domain events with bounded buffers for downstream UI
adapters. Both the Socket.IO gateway and the server-sent events (SSE) gateway
subscribe to the same observable, ensuring identical payloads regardless of
transport. All payloads are JSON and use SI units unless stated otherwise.

> **Version parity.** The Socket.IO server (`socket.io`) and browser client
> (`socket.io-client`) **must** stay on the same minor version. See ADR 0006 for
> the rationale and upgrade checklist.

## UI Stream (`uiStream$`)

- `createUiStream` (from `runtime/eventBus.ts`) returns an observable of
  `UiStreamPacket` objects. Adapter authors supply:
  - `snapshotProvider`: typically `facade.select((state) =>
buildSimulationSnapshot(state, repository))`.
  - `timeStatusProvider`: usually `() => facade.getTimeStatus()`.
- Default backpressure:
  - Simulation batches: **120 ms** window, max **5** ticks.
  - Domain events: **250 ms** window, max **25** events.
- Events are sanitised to `{ type, payload, tick, ts, level?, tags? }` before
  leaving the runtime.
- Subscribers receive four packet kinds:
  1. `{ channel: 'simulationUpdate', payload: SimulationUpdateMessage }`
  2. `{ channel: 'sim.tickCompleted', payload: UiSimulationTickEvent }`
  3. `{ channel: 'domainEvents', payload: UiDomainEventsMessage }`
  4. `{ channel: <event.type>, payload: event.payload ?? null }`
- The observable is hot (`share({ resetOnRefCountZero: false, … })`). Provide the
  **same** instance to every transport adapter to reuse buffers and ordering.

## Connection & Handshake

1. The client connects to the single Socket.IO namespace (`/`).
2. Immediately after the connection the gateway emits:
   - `gateway.protocol` – `{ version: 1 }` to allow clients to negotiate
     breaking changes.
   - `time.status` – `{ status: TimeStatus }`, mirroring the façade scheduler
     state (running/paused, tick, speed, targetTickRate). This event is sent as
     part of the handshake so dashboards can boot their clock, but ongoing time
     deltas are conveyed inside every `simulationUpdate` payload (see `time`
     below). There is no separate heartbeat event for the scheduler.
   - `simulationUpdate` – a seed payload containing the latest snapshot. The
     structure is identical to the regular update batches documented below and
     always contains exactly one entry.

### Frontend Configuration

- `src/frontend/src/config/socket.ts` centralises the browser endpoint lookup
  and exports a `SOCKET_URL` constant for hooks/components to consume.
- `SOCKET_URL` inspects `import.meta.env.VITE_SOCKET_URL`; create a `.env` file
  next to the frontend package (see `.env.example`) to point the UI at a
  different host/port during development or when the app is served separately
  from the backend.
- When `VITE_SOCKET_URL` is omitted the helper falls back to
  `http://localhost:7331/socket.io`, matching the default backend dev server
  (`WEEBBREED_BACKEND_PORT=7331`).

## Outgoing Events

### `simulationUpdate`

Batched snapshot diff and event bundles. Payload:

```json
{
  "updates": [
    {
      "tick": 123,
      "ts": 1725712345678,
      "durationMs": 8.1,
      "phaseTimings": {
        "applyDevices": { "startedAt": 0, "completedAt": 1.1, "durationMs": 1.1 },
        "deriveEnvironment": { "startedAt": 1.1, "completedAt": 2.6, "durationMs": 1.5 },
        "irrigationAndNutrients": { "startedAt": 2.6, "completedAt": 3.7, "durationMs": 1.1 },
        "updatePlants": { "startedAt": 3.7, "completedAt": 5.0, "durationMs": 1.3 },
        "harvestAndInventory": { "startedAt": 5.0, "completedAt": 6.6, "durationMs": 1.6 },
        "accounting": { "startedAt": 6.6, "completedAt": 7.6, "durationMs": 1.0 },
        "commit": { "startedAt": 7.6, "completedAt": 8.1, "durationMs": 0.5 }
      },
      "events": [
        {
          "type": "plant.stageChanged",
          "tick": 123,
          "ts": 1725712345678,
          "payload": { "plantId": "plant-1", "from": "vegetative", "to": "flowering" }
        }
      ],
      "snapshot": {
        "tick": 123,
        "clock": {
          "tick": 123,
          "isPaused": false,
          "targetTickRate": 1,
          "startedAt": "2025-09-23T08:00:00Z",
          "lastUpdatedAt": "2025-09-23T08:05:00Z"
        },
        "structures": [
          {
            "id": "structure-1",
            "name": "Flagship Campus",
            "status": "active",
            "footprint": { "length": 40, "width": 24, "height": 8, "area": 960, "volume": 7680 },
            "rentPerTick": 540,
            "roomIds": ["room-1"]
          }
        ],
        "rooms": [
          {
            "id": "room-1",
            "name": "Bloom Room A",
            "structureId": "structure-1",
            "structureName": "Flagship Campus",
            "purposeId": "purpose-bloom",
            "purposeKind": "bloom",
            "purposeName": "Bloom Suite",
            "purposeFlags": { "allowsFlowering": true },
            "area": 240,
            "height": 4,
            "volume": 960,
            "cleanliness": 0.92,
            "maintenanceLevel": 0.88,
            "zoneIds": ["zone-1"]
          }
        ],
        "zones": [
          {
            "id": "zone-1",
            "name": "North Bloom",
            "structureId": "structure-1",
            "structureName": "Flagship Campus",
            "roomId": "room-1",
            "roomName": "Bloom Room A",
            "area": 240,
            "ceilingHeight": 4,
            "volume": 960,
            "environment": {
              "temperature": 24.1,
              "relativeHumidity": 0.52,
              "co2": 980,
              "ppfd": 540,
              "vpd": 1.28
            },
            "resources": {
              "waterLiters": 180,
              "nutrientSolutionLiters": 45,
              "nutrientStrength": 1.1,
              "substrateHealth": 0.84,
              "reservoirLevel": 0.66,
              "lastTranspirationLiters": 3.2
            },
            "metrics": {
              "averageTemperature": 23.8,
              "averageHumidity": 0.53,
              "averageCo2": 960,
              "averagePpfd": 530,
              "stressLevel": 0.12,
              "lastUpdatedTick": 123
            },
            "devices": [
              {
                "id": "device-1",
                "blueprintId": "hvac-basic",
                "kind": "hvac",
                "name": "HVAC A1",
                "zoneId": "zone-1",
                "status": "operational",
                "efficiency": 0.95,
                "runtimeHours": 320,
                "maintenance": {
                  "lastServiceTick": 90,
                  "nextDueTick": 210,
                  "condition": 0.92,
                  "runtimeHoursAtLastService": 300,
                  "degradation": 0.08
                },
                "settings": { "targetTemperature": 24 }
              }
            ],
            "plants": [
              {
                "id": "plant-1",
                "strainId": "strain-1",
                "stage": "flowering",
                "health": 0.93,
                "stress": 0.1,
                "biomassDryGrams": 152.4,
                "yieldDryGrams": 45.2
              }
            ],
            "control": {
              "setpoints": {
                "temperature": 24,
                "humidity": 0.52,
                "co2": 1000,
                "ppfd": 520,
                "vpd": 1.2
              }
            },
            "health": {
              "diseases": 0,
              "pests": 0,
              "pendingTreatments": 0,
              "appliedTreatments": 1,
              "reentryRestrictedUntilTick": 1440,
              "preHarvestRestrictedUntilTick": 1500
            }
          }
        ],
        "personnel": {
          "employees": [
            {
              "id": "emp-1",
              "name": "R. Botanist",
              "role": "grower",
              "salaryPerTick": 120,
              "morale": 0.82,
              "energy": 0.76,
              "maxMinutesPerTick": 300,
              "status": "active",
              "assignedStructureId": "structure-1"
            }
          ],
          "applicants": [
            {
              "id": "app-7",
              "name": "J. Apprentice",
              "desiredRole": "technician",
              "expectedSalary": 80
            }
          ],
          "overallMorale": 0.79
        },
        "finance": {
          "cashOnHand": 125000,
          "reservedCash": 5000,
          "totalRevenue": 182000,
          "totalExpenses": 76000,
          "netIncome": 106000,
          "lastTickRevenue": 2400,
          "lastTickExpenses": 860
        }
      },
      "time": {
        "running": true,
        "paused": false,
        "speed": 1,
        "tick": 123,
        "targetTickRate": 1
      }
    }
  ]
}
```

> **Normalization note:** The `structures[].rentPerTick` value in snapshots is an hourly
> base rent despite the legacy field name. Multiply by `tickLengthMinutes / 60` when
> presenting or applying per-tick rent so UI and automation stay aligned with the
> accounting normalization.

- Batching window defaults to **120 ms** (configurable) or a maximum of five
  ticks before the buffer flushes.
- `snapshot` is generated via `buildSimulationSnapshot` and mirrors the
  `SimulationSnapshot` TypeScript contract (structures, rooms, zones, personnel,
  finance). All nested objects are read-only views over the authoritative state;
  clone before mutating.
- `clock` is the persisted simulation clock (`GameState.clock`). The ISO string
  fields (`startedAt`, `lastUpdatedAt`) represent wall-clock timestamps and are
  stable across save/load.
- `time` mirrors `SimulationFacade.getTimeStatus()` and carries
  `{ running, paused, speed, tick, targetTickRate }`. It is computed when the
  packet is produced and may briefly diverge from the persisted clock while a
  control command is settling (e.g. `running: false`, `paused: false` during a
  scheduler restart). `time.tick` always matches the snapshot tick emitted in
  the same entry.
- The `events` array repeats the domain events emitted during the tick for
  convenience and matches the structure forwarded via `domainEvents`.
- `ts` represents the emission timestamp. If the originating simulation event
  lacks a timestamp the gateway falls back to `Date.now()` when the packet is
  assembled.
- `durationMs` and `phaseTimings` surface tick duration metrics when the loop
  supplies them. Manual `step` calls that short-circuit instrumentation omit
  these fields.

### `sim.tickCompleted`

A raw forwarding of the façade event. Each entry contains:

```json
{
  "tick": 123,
  "ts": 1725712345678,
  "durationMs": 8.1,
  "eventCount": 4,
  "phaseTimings": {
    /* same as above */
  },
  "events": [
    /* domain events for that tick */
  ]
}
```

The gateway always emits this message after the corresponding `simulationUpdate`
flush to keep telemetry ordering deterministic.

### `domainEvents`

Bundled domain-level notifications (plant/device/zone/market/finance/health,
including pests/diseases). Payload:

```json
{
  "events": [
    {
      "type": "plant.stageChanged",
      "tick": 123,
      "ts": 1725712345678,
      "payload": { "plantId": "plant-1", "from": "vegetative", "to": "flowering" }
    },
    {
      "type": "device.degraded",
      "tick": 123,
      "ts": 1725712345685,
      "level": "warning",
      "payload": { "deviceId": "lamp-1", "severity": "warning" }
    }
  ]
}
```

- Default throttling window: **250 ms** with a maximum batch size of 25 events.
- Every individual event is also re-emitted using the event’s `type` as the
  Socket.IO channel for legacy listeners (e.g. `plant.stageChanged`).

## Server-Sent Events (`/events`)

- Default endpoint: `/events` (configurable via `SseGatewayOptions.path`).
- Methods: `GET` for the live stream, `OPTIONS` for CORS preflight. Responses
  include `Access-Control-Allow-Origin: *` and disable proxy buffering.
- Handshake events are identical to the socket gateway (`gateway.protocol`,
  `time.status`, and an initial `simulationUpdate`).
- Keep-alive comments (`: keep-alive`) are emitted every **15 s** by default.
- Each packet from `uiStream$` is forwarded as an SSE event (`event: <channel>`
  - `data: <json>`). Individual domain events keep their original event names.
- Shut down via `SseGateway.close()` to unsubscribe all clients and stop the
  keep-alive timer.

## Incoming Commands

### Common Envelope

Every command payload may include an optional `requestId` string. When present it
is mirrored in the corresponding `*.result` response message and in the
acknowledgement callback. All command responses follow the façade’s
`CommandResult<T>` contract and are echoed back over Socket.IO so UIs without ACK
handlers can still observe outcomes.

Generic response structure:

```json
{
  "requestId": "cmd-1",
  "ok": false,
  "warnings": ["Speed multiplier unchanged."],
  "errors": [
    { "code": "ERR_VALIDATION", "message": "ticks must be greater than zero.", "path": ["ticks"] }
  ]
}
```

### `facade.intent` — Domain Command Envelope

Unified entry point for all simulation-side mutations beyond scheduler control.
Payloads contain the target domain and action name plus an optional payload
object:

```json
{
  "domain": "world",
  "action": "duplicateRoom",
  "payload": { "roomId": "room_8d92e4", "name": "North Bloom Copy" },
  "requestId": "intent-42"
}
```

- `domain` must match one of the façade-registered intent domains. Current
  values: `world`, `devices`, `plants`, `health`, `workforce`, `finance`.
- `action` selects a command within that domain. Actions are validated against
  the domain catalog that `SimulationFacade` builds during startup.
- `payload` is validated with the command’s Zod schema before any engine service
  executes. Missing payloads default to `{}` when a schema allows it.
- Responses are emitted on `<domain>.intent.result` and include the merged
  `CommandResult` (`{ ok, data?, warnings?, errors? }`). Unknown domains/actions
  yield `ERR_VALIDATION` with the offending field path (`['facade.intent',
'domain']` or `['facade.intent', 'action']`). Internal failures surface as
  `ERR_INTERNAL` while preserving the request id.

#### Supported actions per domain

- **time** — `start`, `pause`, `resume`, `step`, `setSpeed`. Each call mirrors
  the in-process scheduler API and resolves with the updated `TimeStatus`.
- **world** — `getStructureBlueprints`, `getStrainBlueprints`,
  `getDeviceBlueprints`, `rentStructure`, `createRoom`, `updateRoom`,
  `deleteRoom`, `createZone`, `updateZone`, `deleteZone`, `renameStructure`,
  `deleteStructure`, `duplicateStructure`, `duplicateRoom`, `duplicateZone`,
  `resetSession`, `newGame`. Duplication commands accept an optional `name`
  override and return `{ structureId | roomId | zoneId }` for the newly
  created copy.
- **devices** — `installDevice`, `updateDevice`, `moveDevice`, `removeDevice`,
  `toggleDeviceGroup`. The toggle action returns `{ deviceIds: string[] }` with
  every instance that changed status.
- **plants** — `addPlanting`, `cullPlanting`, `harvestPlanting`,
  `applyIrrigation`, `applyFertilizer`, `togglePlantingPlan`. The automation
  toggle responds with `{ enabled: boolean }` and emits a follow-up maintenance
  task when the state flips.
- **health** — `scheduleScouting`, `applyTreatment`, `quarantineZone`.
- **workforce** — `refreshCandidates`, `hire`, `fire`, `setOvertimePolicy`,
  `assignStructure`, `enqueueTask` (payload defaults to `{}` when omitted).
- **finance** — `sellInventory`, `setUtilityPrices`, `setMaintenancePolicy`.
- **config** — `getDifficultyConfig` (payload defaults to `{}`).

##### Blueprint catalog commands

- `getStructureBlueprints` returns the raw `StructureBlueprint[]` catalog
  (geometry, rent, upfront fee). Payload defaults to `{}`.
- `getStrainBlueprints` returns an alphabetised strain catalog with compatibility
  and defaults. Example entry:

```json
{
  "id": "00000000-0000-0000-0000-000000000401",
  "slug": "helios",
  "name": "Helios",
  "lineage": { "parents": [] },
  "genotype": { "sativa": 0.6, "indica": 0.4, "ruderalis": 0 },
  "chemotype": { "thcContent": 0.22, "cbdContent": 0.01 },
  "generalResilience": 0.8,
  "germinationRate": 0.95,
  "compatibility": {
    "methodAffinity": { "85cc0916-0e8a-495e-af8f-50291abe6855": 0.85 },
    "stressTolerance": { "temp_C": 1, "vpd_kPa": 0.15 }
  },
  "defaults": {
    "envBands": { "default": { "temp_C": { "green": [23, 27] } } },
    "phaseDurations": { "vegDays": 21, "flowerDays": 63 },
    "photoperiod": { "vegetationTime": 2419200, "floweringTime": 5443200 },
    "nutrientDemand": { "dailyNutrientDemand": { "flowering": { "nitrogen": 0.07 } } },
    "waterDemand": { "dailyWaterUsagePerSquareMeter": { "flowering": 0.54 } },
    "growthModel": { "maxBiomassDry": 0.18 },
    "yieldModel": { "baseGmPerPlant": 45 }
  },
  "traits": {
    "morphology": { "growthRate": 1, "yieldFactor": 1 },
    "noise": { "enabled": true, "pct": 0.02 }
  },
  "metadata": { "description": "Hybrid strain tuned for balanced growth." },
  "price": { "seedPrice": 1.1, "harvestPricePerGram": 4.4 }
}
```

- `getDeviceBlueprints` returns device catalog entries with compatibility and
  default settings:

```json
{
  "id": "00000000-0000-0000-0000-000000000501",
  "kind": "Lamp",
  "name": "Orion Lamp",
  "quality": 0.95,
  "complexity": 0.5,
  "lifetimeHours": 72000,
  "capexEur": 1350,
  "efficiencyDegeneration": 0.01,
  "compatibility": { "roomPurposes": ["growroom"] },
  "defaults": {
    "settings": { "power": 0.68, "ppfd": 810, "coverageArea": 8 },
    "coverage": { "maxArea_m2": 12 },
    "limits": { "maxPPFD": 1000 }
  },
  "maintenance": { "intervalDays": 90, "costPerService_eur": 80, "hoursPerService": 2 },
  "metadata": { "description": "Balanced flowering lamp" },
  "price": {
    "capitalExpenditure": 1350,
    "baseMaintenanceCostPerTick": 0.0023,
    "costIncreasePer1000Ticks": 0.0005
  }
}
```

Each response is regenerated from the active blueprint repository on demand to
avoid stale caches.

Clients may optimistically update UI state after receiving a successful
`*.intent.result` packet but must still observe follow-up telemetry for the
authoritative snapshot.

### `simulationControl`

Discriminated union on `action`:

| Action        | Payload fields                    | Delegated façade call              |
| ------------- | --------------------------------- | ---------------------------------- |
| `play`        | `gameSpeed?`, `maxTicksPerFrame?` | `start()` (or `resume` if running) |
| `pause`       | –                                 | `pause()`                          |
| `resume`      | –                                 | `resume()`                         |
| `step`        | `ticks?`                          | `step()`                           |
| `fastForward` | `multiplier`                      | `setSpeed()`                       |

Clients emit the raw discriminant payload without an additional `type`
wrapper, e.g. `socket.emit('simulationControl', { action: 'pause' })`. The
gateway performs the discriminant check based on the `action` field alone.

All payloads are validated with Zod before the façade command is executed. If
validation fails the façade is not touched and the client receives an
`ERR_VALIDATION` response immediately.

Successful control commands return the updated `TimeStatus` in
`simulationControl.result.data` (mirroring the `time` block in telemetry) and may
trigger a new `simulationUpdate` batch if a tick is processed as part of the
operation.

### `config.update`

Currently supported targets:
| Type | Payload fields | Behaviour |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------- |
| `tickLength` | `minutes` (> 0) | Reconfigures the scheduler (restarts if required) and emits a `sim.tickLengthChanged` event. |
| `setpoint` | `zoneId`, `metric`, `value` | Routes a zone setpoint to device settings. Use the `zones[].id` string from telemetry (UUID v4 or legacy slug); see the metric table below. |

Supported setpoint metrics:

| Metric             | Device routing & behaviour                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `temperature`      | Requires at least one HVAC device in the zone. Writes `targetTemperature` to each eligible device and stores the target on the zone control state.                                                                                                                                                           |
| `relativeHumidity` | Requires humidifier/dehumidifier coverage (device kinds: `HumidityControlUnit`, `Dehumidifier`). Clamps the value to `[0,1]`, updates `targetHumidity` on each device, clears any active VPD target, and stores the humidity setpoint.                                                                       |
| `vpd`              | Requires humidity control. Clamps the VPD to ≥ 0, converts it to a humidity target using the zone control reference temperature, applies the derived `targetHumidity` to devices, and stores both humidity and VPD setpoints. The derived humidity is echoed in the command response as `effectiveHumidity`. |
| `co2`              | Requires CO₂ enrichment/scrubber devices. Clamps the value to ≥ 0, writes `targetCO2` on devices, and stores the CO₂ setpoint.                                                                                                                                                                               |
| `ppfd`             | Requires dimmable lighting. Clamps the value to ≥ 0, updates each light’s `ppfd` setting, and if the device exposes a finite `power` setting scales it proportionally to the new PPFD (power is forced to zero when the target PPFD is zero).                                                                |

Additional notes:

- `zoneId` must match the zone identifier emitted in snapshots. The gateway trims whitespace and accepts any non-empty string, so UUID v4 identifiers work without prefixes.
- All values must be finite. Clamps trigger warning strings in the
  `config.update.result` payload so the UI can surface them alongside the
  successful response.
- When a zone lacks the required devices the command returns
  `ERR_INVALID_STATE`.
- Successful updates emit an `env.setpointUpdated` domain event containing the
  updated `control` snapshot (including derived humidity when applicable).

Additional configuration mutations can be layered onto the same endpoint in the
future without breaking existing clients.

## Error Handling

- Validation errors (`ERR_VALIDATION`) map 1:1 to the offending field path.
- Internal failures (`ERR_INTERNAL`) surface the error message and the command
  path. The gateway never throws – failures are returned via the Socket.IO ACK
  callback and the mirrored `*.result` event.
- Unsupported commands yield `ERR_INVALID_STATE`.

## Batching Guarantees

- Simulation updates are emitted in tick order. No batch spans ticks out of
  order and the gateway never drops ticks – throttling only coalesces them.
- Domain events preserve emission order inside each batch.
- Closing the gateway (`SocketGateway.close()`) flushes pending timers and
  detaches all façade subscriptions.

## Versioning

The protocol version is incremented when payload structures change in a
non-backwards-compatible way. Clients should subscribe to `gateway.protocol` and
fail fast if an unknown version is announced.
