# Weedbreed.AI — Technical Design Document (TDD)

## 0) Goals & Principles
- **Data-driven simulation**: All gameplay is configured by JSON files described in the DD.
- **Separation of concerns**: Headless simulation engine; any UI consumes snapshots/events.
- **Determinism**: Given same seed and inputs, outcomes are reproducible.
- **Performance**: Fixed-step simulation with catch-up and per-phase budgets.
- **Extensibility**: Add new devices/strains/treatments/pests/diseases via data without code changes.

---
## 1) Authoritative State & Public API
- **Single authoritative state**: Composite object covering Company → Structures → Rooms → Zones → Plantings/Plants; Devices; Inventory; Personnel; Tasks; Finance; Health; Clocks; RNG seed.
- **Mutation constraints**:
	- Only via **tick processing** and **explicit actions** (player / AI).- All external consumers get read-only snapshots (immutable from the UI perspective).
- **Event stream** (pub/sub): `sim.tickCompleted`, `plant.stageChanged`, `device.failed`, `market.saleCompleted`, `pest.detected`, `treatment.applied`, `employee.taskPicked`, `task.completed`, etc.
- **Persistence**: Load/save full state; load/merge blueprints; support hot-reload with validation and atomic swap.

---

## 2) Simulation Loop (fixed-step)

- **Scheduler-agnostic**: The loop may run on a server timer, a worker, or a frame callback. The contract is fixed-step:
    1. Accumulate real time.    
    2. Execute ticks when `accumulated ≥ tickInterval / gameSpeed`.    
    3. **Catch-up**: Process up to `maxTicksPerFrame` to avoid long stalls.    
- **Recommended tick phases (order)**:
    1. **Device control** (evaluate setpoints, on/off, hysteresis).    
    2. **Apply device effects** (to zone environment: ΔT, ΔRH, PPFD, CO₂).    
    3. **Environment mixing/normalization** (ambient exchange scaled by airflow/enclosure).    
    4. **Irrigation/Nutrients** (compute per-tick water/N/P/K demands from phase-based curves; update stocks, log deficits).    
    5. **Plants** (growth, phenology, stress from temp/RH/CO₂/light & resource status; stage changes).    
    6. **Health** (detect → progress → spread → treatments; apply PHI/re-entry).    
    7. **Tasks & Agents** (generate tasks; employees seek/claim/execute respecting skills/tools/locks).    
    8. **Harvest/Inventory/Market** (lot creation, timestamps, quality decay).    
    9. **Accounting** (OPEX: maintenance/energy/water/nutrients/labor/rent; CapEx events).    
    10. **Commit** (snapshot + batched events).    

---

## 3) Environment & Device Models

- **Devices** act as sources/sinks per tick:
    - **GrowLight**: Heat + PPFD to covered area. Use `ppf_umol_s` & geometry factor to translate to canopy PPFD; cap by `coverage_m2`.    
    - **Climate/HVAC**: `coolingCapacity` and `airflow` drive ΔT; dehumidifiers reduce RH using `moistureRemoval_Lph`; fans mix air (faster normalization).    
    - **CO₂Injector**: Pulsed injection towards `targetCO2_ppm` capped by `maxSafeCO2_ppm`.    
- **Normalization**: Exponential decay towards ambient for T/RH/CO₂, scaled by ventilation (`airflow`) and enclosure leakage.

**Implementation note**: Start with a simplified “well-mixed bucket” model. Permit future upgrades (Magnus formula for saturation vapor pressure, Penman–Monteith for ET0) behind the same API.

---

## 4) Plants & Growth

- **Plantings**: Group of same-strain plants started together. Each Plant tracks `biomass`, `health`, `stress`, `stage`, `age`.
- **Phenology**: Stage transitions by elapsed days & photoperiod rules; events emitted on transitions.
- **Growth model**:
    - Potential growth from light/CO₂/temperature response curves (saturating light response, Gaussian temperature response, CO₂ half-saturation).    
    - Modulate by health, stress, and resource fulfillment (water, NPK).    
    - Enforce caps (e.g., `maxBiomassDry_g` × `phaseCapMultiplier`).    
- **Resources**:
    - Convert **NPK g/m²/day** to per-tick, per-plant requirement using zone area and plant count from cultivation method.    
    - Under-supply increments stress and reduces growth; over-supply may raise disease risk via `overfertilizationRisk`.    

---

## 5) Health System (Pests & Diseases)

- **Data-first**: Diseases and pests are fully described in JSON blueprints; operational treatments in `treatment_options.json`.
- **Tick logic**:
    1. **Detect**: Visibility increases over time; **scouting tasks** and traps add detection rolls.    
    2. **Progress**: Severity grows with favorable environment and balancing multipliers.    
    3. **Spread**: Probabilistic transmission within zone and to neighbors; influenced by airflow/sanitation/tools.    
    4. **Treatments**: Apply efficacy to severity/infection; respect `cooldownDays`, **`reentryIntervalTicks`**, **`preHarvestIntervalTicks`**.    
    5. **Events**: `pest.detected`, `disease.confirmed`, `health.spread`, `treatment.applied`, `outbreak.contained`.
        
- **IPM**: Cultural/biological first, chemical last; PHI enforced; sanitation score reduces background risk and tool-borne transmission.

---

## 6) Personnel as Agents

- **Model**: Employees have `skills`, `traits`, `certifications`, `hourlyWage`, state (`Idle`, `Working`, `Resting`, `OffDuty`), `energy`, `morale`.
- **Task generation**: Each tick, scan world → produce tasks with `priority`, `requiredSkills`, `location`, `estimatedDuration`, `deadline`, `toolsRequired`, `safetyConstraints`.
- **Utility-based claiming** (per Idle employee):
	U = w1*priority + w2*skillMatch + w3*roleAffinity + w4*urgency
	     w5*distance - w6*fatigue + w7*morale + w8*toolAvailability ± traitMods
- **Locks**: Tools/resources are exclusive; tasks can be `blocking` or `splittable`.
- **Safety**: Treatments set PHI/re-entry timers; employees without certification or before re-entry may not claim.
- **Progress & learning**: Time accrues; completion mutates state & emits events; optional skill XP.

### Personnel & Labor Market

- **Weekly refresh** of the candidate pool (e.g., every 168 ticks).
- **Seeded external name [provider][username.me]** (results & `inc=name` only) to generate **deterministic** candidate names from `apiSeed = "{gameSeed}-week-{weekIndex}"`.
- **Fallback** to `/data/personnel/` when offline/unavailable.
- **Profile synthesis**: for each candidate, generate `skills`, `traits`, and `hourlyWage` from balancing rules (deterministic when seeded).
- **Privacy constraint**: requests must be name-only (no additional PII).
- **Events**: `hr.candidatesRefreshed`, `hr.candidateHired`, `hr.candidateRejected`.
### Task Engine (augment)

- **Generation**: Every tick, scan world state to create tasks; read base parameters from `task_definitions.json`.
- **Scaling**: Support `perAction`, `perPlant`, `perSquareMeter` to compute `durationTicks`.
- **Lifecycle**: `durationTicks`, `progressTicks`, completion triggers state mutation and event emission.
- **Safety/Access**: Tasks honor zone locks (quarantine/PHI); include `toolsRequired` and `safetyConstraints`.
- **Decomposition**: Allow `splitable` tasks for batch labor (optional multi-agent).
- **Events**: `task.created`, `task.claimed`, `task.completed`, `task.failed`, `task.abandoned`.

### Agentic Employees (augment)

- **Utility scoring** per Idle agent: priority, skill match, role affinity, urgency, distance/travel cost, fatigue (energy), morale, tool availability; trait modifiers apply.
- **Claiming**: Highest utility claims; implement backoff to avoid thrash; aging to prevent starvation.
- **Status transitions**: Idle → Working → Resting/OffDuty; interruptions permitted for emergencies.
- **Learning**: Optional skill XP on completion; trait-based learning rates.

### Overtime Mechanics

- **Energy coupling**: Each tick of work reduces energy; employees finish the **current task** even if energy dips below 0.
- **Overtime calculation**: convert negative energy at completion into **overtime hours**.
- **Compensation policy**:
    - `payout`: pay **overtimeMultiplier × hourlyWage** instantly; proceed to standard rest.
    - `timeOff`: credit overtime to `leaveHours`; the next OffDuty window is extended accordingly.
- **Events**: `hr.overtimeAccrued`, `hr.overtimePaid`, `hr.timeOffScheduled`.
    
### Data & Validation Hooks (augment)

- **Personnel schema** must include: `id (UUID)`, `name`, `role`, `skills`, `traits`, `hourlyWage`, `energy`, `morale`, `status`, optional `leaveHours`, optional `certifications`, optional `assignedStructureId`.
- **Task records** must include IDs, location, scaling basis, and progress fields.
- **Policies** must define `overtimePolicy` and `overtimeMultiplier`; provide defaults.

---

## 7) Economy & Inventory

- **CapEx**: Purchases (devices, setup); tracked in device price map (`capitalCost`).
- **OpEx**: Maintenance (base + aging), energy, water, nutrients, labor, rent per tick.
- **Revenue**: `harvestBasePricePerGram` × (quality × market modifiers).
- **Inventory**: Lots are timestamped; shelf-life decay uses half-life; quarantines can block moves.

---

## 8) Device Placement Rules

- Enforce `allowedRoomPurposes` on device install/move.
    - Lights & HVAC default to `["growroom"]`.    
    - Neutral items (shelves/furniture/sensors) default to `["*"]`.    
- Validation emits warnings/errors with actionable messages.

---

## 9) Data Loading, Validation, & Hot Reload

- **Loading order**: (a) schemas/manifest, (b) blueprints, (c) configs/prices, (d) balancing.
- **Validation**:
    - Types, ranges, required keys.    
    - Cross-file references by **`id` (UUID)**. Try slug fallback only in price maps if needed.    
- **Hot reload**:
    - Load → validate → stage → swap at phase boundary to avoid partial state.    
    - Emit `data.reloaded` with a summary of diffs.    

---

## 10) Identifier Policy (final)

- **Primary key everywhere**: `id` (UUID v4).
- **No `uuid` field**.
- **Migration rules**:
    - If old `id` is already a UUID → keep.    
    - If old `id` is not a UUID:    
        - If `name` exists → create a new UUID for `id` (keep `name`).        
        - If `name` missing → derive a readable `name` from the old id/filename, then assign new UUID to `id`.        
- **Strain lineage**:
    - `lineage.parents` must list parent `id` (UUID). Empty or missing ⇒ ur-plant.    
    - During migration, map parents by prior `name`, `slug`, or old `id`. Unresolved → leave empty and report.    

---

## 11) Events & Telemetry (examples)

- **Simulation**: `sim.tickCompleted`, `sim.phaseChanged`
- **Plants**: `plant.stageChanged`, `plant.harvested`, `plant.healthAlert`
- **Devices**: `device.degraded`, `device.failed`, `device.repaired`
- **Health**: `pest.detected`, `disease.confirmed`, `health.spread`, `treatment.applied`
- **Personnel/Tasks**: `employee.taskPicked`, `task.completed`, `task.failed`
- **Economy**: `finance.tick`, `market.saleCompleted`, `inventory.lotExpired`
- Implement batching/throttling for UI streams.

---

## 12) Determinism, Performance, Testing

- **Determinism**: All stochastic draws come from an injected RNG (seeded). `noise` in strains modulates breeding variance.
- **Performance targets**: Document max zones × plants × devices × agents × health checks per tick; measure and enforce budgets per phase.
- **Testing**:
    - Schema tests (JSON validation).    
    - Deterministic scenario tests (fixed seed, golden outputs).    
    - Health/treatment scenarios (efficacy, PHI/re-entry).    
    - Performance regression tests (tick time under target loads).    

---

## 13) Security & Safety

- **Data acceptance**: Validate external JSON before merge; reject on critical errors.
- **Sandbox**: No dynamic code execution from data.
- **Boundaries**: Enforce max values (e.g., `maxSafeCO2_ppm`) and sensible clamps to avoid runaway states.

---

## 14) Extensibility & Roadmap

- **Physics**: Optional upgrade to psychrometrics (Magnus), evapotranspiration (Penman–Monteith), canopy light models (multi-layer LAI).
- **Agents**: Multi-actor coordination for large tasks; shift planning; training/XP curves.
- **Market**: Dynamic demand/prices; contracts; reputation systems.
- **Editor UX**: Schema-driven validators and wizards for strains/devices/treatments.

---

## 15) Example Public API (shape-only, stack-neutral)

- `loadBlueprints(blueprintDbOrPaths) -> ValidationReport`
- `newGame(options) -> GameState`
- `loadGame(snapshot) -> GameState`
- `tick(n=1) -> GameState`
- `actions.*` (e.g., `rentStructure`, `createRoom`, `addZone`, `installDevice`, `addPlanting`, `hireEmployee`, `applyTreatment`, `sellLot`)
- `events.subscribe(type|filter, handler) -> unsubscribe`
- `save() -> Snapshot`
- `getState() -> Readonly<GameState>`

(Exact signatures/types are left open by design.)