# Weedbreed.AI — System Facade

_A tech‑agnostic, simulation‑first façade that cleanly decouples UI and engine, aligned with the latest DD/TDD (UUID `id`, lineage parents as UUIDs, device purpose binding, phase‑based NPK, currency‑neutral costs, treatments with tick fields, agentic employees, hot‑reload, determinism)._

---

## 1) Purpose & Responsibilities

**Goal.** Provide a **stable, high‑level API** between any client (UI, tests, CLI, worker) and the simulation engine. The façade exposes **intents** and **queries**, never internal object graphs.

**Responsibilities**

- Own the **authoritative state** handle and expose **read‑only snapshots**.
- Accept **commands** (player/AI intents), route to engine services, enforce **invariants**.
- Coordinate the **tick loop** (start/stop/speed/catch‑up) or proxy to an external scheduler.
- Emit **events** with minimal, serializable payloads.
- Handle **persistence** (save/load/export/import) and **hot‑reload** of data.

**Non‑Responsibilities**

- No rendering or UI logic.
- No direct mutation of deep objects by callers (strictly through intents).

---

## 2) Contract & Guarantees

- **Decoupling:** UI never traverses engine internals. All side‑effects go through façade commands.
- **Determinism:** With identical inputs (state, blueprints, tick schedule, seed), results are identical. All RNG uses named streams.
- **Atomicity:** Each tick commits atomically; events correspond to committed state only.
- **Identity:** All references use **`id` (UUID v4)**; no `uuid` field exists.
- **Validation:** Commands and hot‑reloads are validated against the **Data Dictionary** before effect.

---

## 3) Data Surfaces

### 3.1 Read API (snapshots & queries)

- `getState(): Readonly<GameState>` — immutable snapshot, serializable.
- `select(query): Result` — filtered/projection queries (e.g., by `id`, by room purpose, by active tasks, by alarms).
- `subscribe(eventFilter, handler): Unsubscribe` — event stream (see §6).

### 3.2 Write API (intents/commands)

Commands are **idempotent per tick** where reasonably possible and validate against DD constraints. The façade builds domain
registries (`world`, `devices`, `plants`, `health`, `workforce`, `finance`) and exposes them through both the in-process API
(`facade.world.createRoom(payload)`) and the Socket.IO envelope (`facade.intent`). Each registration binds a Zod schema to a
service handler and emits results on `<domain>.intent.result`.

Common categories are below.

---

## 4) Command Surface (categories)

### 4.1 Time & Simulation Control

- `start({ gameSpeed?, maxTicksPerFrame? })`
- `pause()` / `resume()`
- `step(nTicks = 1)` — advance deterministically by n ticks.
- `setSpeed(multiplier: number)`

### 4.2 Data Lifecycle

- `loadBlueprints(blueprintBundle | paths)` — validate then stage.
- `hotReload(blueprintBundle | paths)` — validate → stage → atomic swap on tick boundary.
- `newGame(options)` — seed, initial capital, difficulty.
- `save(): Snapshot` / `load(snapshot)`
- `exportState()` / `importState(serialized)`

### 4.3 World Building (Structures → Rooms → Zones)

- `getStructureBlueprints()` / `getStrainBlueprints()` /
  `getDeviceBlueprints()` — read-only catalogs with IDs, names,
  compatibility hints (room purposes or method affinity), default settings, and
  price hints sourced from the active blueprint repository.
- `rentStructure(structureId: UUID)` — validates availability; applies CapEx/Fixed cost rules.
- `renameStructure({ structureId, name })` — trims whitespace, preserves determinism, emits rename events.
- `deleteStructure(structureId)` — enforces empty structure + accounting clean-up.
- `createRoom(structureId, { name, purpose, area, height? })`
- `updateRoom(roomId, patch)` / `deleteRoom(roomId)`
- `duplicateRoom({ roomId, name? })` — clones geometry, zones, and device loadout; returns `{ roomId }` for the copy.
- `createZone(roomId, { name, area, methodId, targetPlantCount? })`
- `updateZone(zoneId, patch)` / `deleteZone(zoneId)`
- `duplicateZone({ zoneId, name? })` — copies cultivation method, automation, and device placement (subject to allowed purposes).
- `duplicateStructure({ structureId, name? })` — creates a structure-level clone including rooms/zones; returns `{ structureId }`.
- Guards: geometry, purpose bindings, and blueprint availability validated for every mutation.

### 4.4 Devices

- `installDevice(targetId, deviceId, settings?)` — checks **`allowedRoomPurposes`**, clones blueprint defaults,
  clamps coverage/airflow via zone geometry, and emits `device.installed` telemetry with the created instance ID.
- `updateDevice(instanceId, settingsPatch)`
- `moveDevice(instanceId, targetZoneId)` — re‑validate purpose.
- `removeDevice(instanceId)`
- `toggleDeviceGroup({ zoneId, kind, enabled })` — flips operational status in bulk and returns `{ deviceIds }` of affected units.

### 4.5 Plants & Plantings

- `addPlanting(zoneId, { strainId, count, startTick? })` — enforces cultivation method capacity, strain/method
  compatibility hints, and emits `plant.planted` telemetry including all generated plant IDs.
- `cullPlanting(plantingId, count?)`
- `harvestPlanting(plantingId)` — creates inventory lots, emits events.
- `applyIrrigation(zoneId, liters)` / `applyFertilizer(zoneId, { N,P,K } in g)` — optional manual overrides.
- `togglePlantingPlan({ zoneId, enabled })` — activates/deactivates automation; returns `{ enabled }` plus a follow-up task event.

### 4.6 Health (Pests/Diseases & Treatments)

- `scheduleScouting(zoneId)` — generates scouting tasks.
- `applyTreatment(zoneId, treatmentOptionId)` — enforces **`reentryIntervalTicks`**, **`preHarvestIntervalTicks`**, cooldowns, and certifications.
- `quarantineZone(zoneId, enabled)` — affects spread graph & safety constraints.

### 4.7 Personnel & Tasks

- See [Job Market Population](./job_market_population.md) for deterministic
  refresh cadence, external provider usage, and fallback rules.

- `refreshCandidates()` — seeded refresh per policy; uses external name provider iff enabled, fallback to local lists.
- `hire(candidateId, role, wage?)` / `fire(employeeId)`
- `setOvertimePolicy({ policy: "payout"|"timeOff", multiplier? })`
- `assignStructure(employeeId, structureId?)`
- `enqueueTask(taskKind, payload)` — manual job board additions.

### 4.8 Finance & Market

- `sellInventory(lotId, quantity_g)` — revenue = `harvestBasePricePerGram × modifiers`.
- `setUtilityPrices({ electricityCostPerKWh, waterCostPerM3, nutrientsCostPerKg })`
- `setMaintenancePolicy(patch)`

**All commands** return `{ ok: boolean, warnings?: string[], errors?: string[] }` and emit events on success.

---

## 5) Error Handling & Validation

- **Schema validation** for every payload (types, ranges).
- **Cross‑ref checks** by UUID `id` (strain/device/method/structure/room/zone).
- **Safety gates**: device placement rules, treatment re‑entry/PHI, quarantine access, task tool requirements.
- **Determinism guard**: disallow commands that would change RNG order within a committed tick; schedule for next tick if needed.

**Standard errors**

- `ERR_NOT_FOUND`, `ERR_FORBIDDEN`, `ERR_CONFLICT`, `ERR_INVALID_STATE`, `ERR_VALIDATION`, `ERR_RATE_LIMIT`, `ERR_DATA_RELOAD_PENDING`.

---

## 6) Events (taxonomy)

**Simulation**

- `sim.tickCompleted`, `sim.speedChanged`, `sim.paused`, `sim.resumed`, `sim.hotReloaded`, `sim.reloadFailed`.

**World**

- `world.structureRented`, `world.roomCreated`, `world.zoneCreated`, `world.deviceInstalled`, `world.deviceMoved`, `world.deviceRemoved`.

**Plants**

- `plant.stageChanged`, `plant.harvested`, `plant.qualityUpdated`.

**Environment**

- `env.safetyExceeded`, `env.setpointReached`, `env.setpointLost`.

**Health**

- `pest.detected`, `disease.confirmed`, `health.spread`, `treatment.applied`, `treatment.blocked`.

**Tasks & HR**

- `task.created`, `task.claimed`, `task.completed`, `task.failed`, `task.abandoned`.
- `hr.candidatesRefreshed`, `hr.hired`, `hr.fired`, `hr.overtimeAccrued`, `hr.overtimePaid`, `hr.timeOffScheduled`.

**Finance**

- `finance.capex`, `finance.opex`, `finance.saleCompleted`, `finance.tick`.

_All event payloads are minimal, serializable, and reference entities by UUID `id`._

---

## 7) Concurrency Models

- **Same‑thread:** façade calls engine methods directly; use micro‑task queue for event delivery.
- **Worker/Process:** façade marshals commands/events over a message bus. Contract remains identical (opaque transport). Back‑pressure by command queue with ordering guarantees.

---

## 8) Tick Orchestration (conformance to Simulation Deep Dive)

Default phase order per tick:

1. **Device Control** (evaluate setpoints & hysteresis)
2. **Apply Device Deltas** (T/RH/CO₂/PPFD)
3. **Normalize to Ambient** (mixing, airflow)
4. **Irrigation/Nutrients** (NPK g/m²/day → per‑tick, per‑plant)
5. **Plants** (growth, stress, health update)
6. **Health** (detect, progress, spread, treat; enforce re‑entry & PHI)
7. **Tasks & Agents** (generate, claim, execute; overtime policy)
8. **Inventory/Market**
9. **Finance**
10. **Commit & Emit**

Façade controls `start/pause/step/setSpeed` and publishes `sim.tickCompleted` after commit.

---

## 9) Identity & Referencing

- Only **`id` (UUID v4)** is authoritative.
- `name`/`slug` are optional, human‑friendly, never used for joins.
- Strain `lineage.parents` is an array of parent UUIDs; empty/missing ⇒ ur‑plant.

---

## 10) Security & Safety

- **Read isolation:** snapshots are immutable; no shared mutability leaks.
- **Write guards:** commands check purpose binding, quarantines, re‑entry, certifications, inventory locks.
- **Budget fences:** per‑phase time budgets; commands may be deferred to preserve frame budgets.

---

## 11) Testing & Observability

- **Mockable façade**: swap engine with a stub; same contract.
- **Golden tests**: fixed seed + fixed inputs → identical event sequences & snapshots.
- **Metrics**: tick duration, queue depths, task throughput, overtime accrued/paid, environment violations.
- **Tracing**: correlate commands → events → state deltas.

---

## 12) Example API Shape (pseudo‑types)

```ts
// Read
getState(): Readonly<GameState>
select(q: Query): Result
subscribe(filter: EventFilter, handler: (e: Event) => void): Unsubscribe

// Time
start(opts?: { gameSpeed?: number; maxTicksPerFrame?: number }): Ack
pause(): Ack
resume(): Ack
step(nTicks?: number): Ack
setSpeed(multiplier: number): Ack

// Data lifecycle
loadBlueprints(bundleOrPaths: BlueprintInput): ValidationReport
hotReload(bundleOrPaths: BlueprintInput): ValidationReport
newGame(opts: NewGameOptions): Ack
save(): Snapshot
load(snap: Snapshot): Ack

// World
rentStructure(structureId: UUID): Ack
createRoom(structureId: UUID, room: { name: string; purpose: string; area_m2: number; height_m?: number }): Ack
createZone(roomId: UUID, zone: { name: string; area_m2: number; methodId: UUID }): Ack
installDevice(targetId: UUID, deviceId: UUID, settings?: object): Ack

// Plants & health
addPlanting(zoneId: UUID, p: { strainId: UUID; count: number; startTick?: number }): Ack
applyTreatment(zoneId: UUID, optionId: UUID): Ack
quarantineZone(zoneId: UUID, enabled: boolean): Ack

// HR & tasks
refreshCandidates(): Ack
hire(candidateId: UUID, role: string, wage?: number): Ack
setOvertimePolicy(p: { policy: 'payout'|'timeOff'; multiplier?: number }): Ack
enqueueTask(kind: string, payload: object): Ack

// Finance
sellInventory(lotId: UUID, grams: number): Ack
setUtilityPrices(p: { electricityCostPerKWh?: number; waterCostPerM3?: number; nutrientsCostPerKg?: number }): Ack
```

Return type `Ack` = `{ ok: boolean; warnings?: string[]; errors?: string[] }`.  
All `Event` payloads include minimal fields and entity UUIDs.

---

## 13) Anti‑Patterns (explicitly disallowed)

- UI accessing deep state paths and mutating objects directly.
- Commands that leak internal references (must pass UUIDs).
- Blocking the tick loop for long operations (I/O must be async/queued).
- Event payloads containing heavy object graphs; pass UUIDs and query on demand.

---

## 14) Migration & Hot‑Reload Notes

- During hot‑reload, façade queues commands until the new data set is staged and validated, then swaps atomically and emits `sim.hotReloaded`.
- If validation fails, keep last good set; emit `sim.reloadFailed` with diagnostics.

---

## 15) Extensibility

- Additional services (research, contracts, dynamic market, predictive control) plug into the same façade via new intents and events without breaking existing ones.

---

**Summary.** The façade is the system’s "dashboard": it provides stable, intention‑centric controls, upholds invariants, and makes the engine safely composable and testable—no matter which client consumes it.
