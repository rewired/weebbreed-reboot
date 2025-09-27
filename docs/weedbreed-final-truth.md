# Weedbreed Final Truth

## Table of Contents

- [Title & Scope](#title--scope)
- [Core Principles](#core-principles)
- [Domain Model](#domain-model)
- [Simulation Lifecycle](#simulation-lifecycle)
- [Math Formulas Overview](#math-formulas-overview)
- [Devices and Effects](#devices-and-effects)
- [Economy and Costs](#economy-and-costs)
- [Data and Blueprints](#data-and-blueprints)
- [Telemetry and UI Views](#telemetry-and-ui-views)
- [Assumptions and Constraints](#assumptions-and-constraints)
- [Open Questions](#open-questions)
- [Provenance Index](#provenance-index)

## Title & Scope

**Sources:** docs/vision_scope.md § 1. Vision; docs/backend-overview.md § 1. Purpose & Non-Goals

- **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】
- The simulation core’s mandate is to deliver reproducible cultivation and economy modelling with structured telemetry and validated intent handling, keeping internal coupling hidden from clients.【F:docs/backend-overview.md†L3-L11】
- Experience pillars emphasise planning and optimisation of climate and lighting, risk management around pests and devices, and an economy loop that balances OpEx/CapEx, cash flow, and quality-driven pricing.【F:docs/vision_scope.md†L25-L29】
- Anti-scope guardrails exclude political or regulatory modelling, shooter-style mechanics, and lab-grade growth modelling so the project can favour plausible, playable systems over exhaustive realism.【F:docs/vision_scope.md†L19-L23】

## Core Principles

**Sources:** docs/vision_scope.md § 1. Vision; docs/system/simulation_philosophy.md §§ 1–5; docs/backend-overview.md § 3. Blueprints Provided & How to Use Them

- **Determinism first.** The simulation favours reproducibility over spectacle: every run uses seeded randomness, a fixed one-hour tick, and catch-up rules that prioritise fairness and responsiveness over raw step throughput.【F:docs/vision_scope.md†L13-L17】【F:docs/system/simulation_philosophy.md†L5-L8】
- **Emergent systems over monoliths.** Environment control is modelled as composable deltas (each device or plant contributes its own change), enabling extensibility and transparent root-cause analysis for players and developers alike.【F:docs/system/simulation_philosophy.md†L10-L12】
- **Stress → health → growth clarity.** Cultivation gameplay hinges on the player managing stressors so that health multiplies potential growth, making the optimisation loop explicit instead of opaque.【F:docs/system/simulation_philosophy.md†L14-L21】
- **Managerial control surface.** Autonomous employees claim tasks via utility scores so players focus on strategic decisions rather than micromanagement, aligning with the project’s indirect-control philosophy.【F:docs/system/simulation_philosophy.md†L23-L26】
- **Economic pressure with rewards.** Per-tick costs maintain constant tension while non-linear pricing amplifies high-quality harvests, rewarding mastery without relaxing deterministic accounting.【F:docs/system/simulation_philosophy.md†L27-L31】
- **Blueprint Doctrine.** Blueprints are delivered with the new repo as a validated set covering structures, room purposes, cultivation methods, strains, devices, pests, diseases, personnel roles, and price maps; they are immutable templates and are never instantiated directly, because runtime instances are created by copying a blueprint before the engine consumes them, which enables many simultaneous instances from a single template such as multiple small warehouses, rooms, or zones.【F:docs/backend-overview.md†L40-L52】

## Domain Model

**Sources:** docs/vision_scope.md § 4. Canonical Domain Model; docs/DD.md §§ 1–3

- **Spatial hierarchy.** Structures contain rooms that contain zones; zones host plantings and the devices that condition their microclimate, mirroring the gameplay drill-down from buildings to individual plants.【F:docs/vision_scope.md†L84-L89】
- **Lifecycle coverage.** Plant entities progress from seed through vegetative and flowering stages into harvest and post-harvest handling, while devices degrade over time, requiring maintenance and replacement decisions.【F:docs/vision_scope.md†L90-L94】
- **Tick scale.** The simulation advances in fixed one-hour ticks (24 ticks per in-game day, 7×24 per week), anchoring telemetry aggregation, audits, and replays to tick identifiers.【F:docs/vision_scope.md†L95-L99】
- **Blueprint-backed entities.** Strains define genetics, environmental preferences, nutrient and water demand, phenology, resilience, and lineage; cultivation methods govern area per plant, spacing, labour intensity, and compatible traits; devices declare type-specific settings such as power, PPFD, airflow, temperature targets, and dehumidification rates.【F:docs/DD.md†L12-L115】【F:docs/DD.md†L203-L331】

## Simulation Lifecycle

**Sources:** docs/system/simulation-engine.md §§ Timebase & Core Loop, Environment Model, Plant Growth, Stress, Health, Tasks & Agentic Employees, Economics

- **Fixed-step scheduler.** Wall-time deltas accumulate until they exceed `tickIntervalMs / gameSpeed`; each loop consumes the budget, runs one full tick, reduces the accumulator, and then publishes committed snapshots and batched events, ensuring deterministic pacing even when catch-up frames occur.【F:docs/system/simulation-engine.md†L12-L25】
- **Environment phase.** Every tick starts from the previous zone state, applies device deltas (lighting heat and PPFD, HVAC cooling/heating, humidity control, CO₂ injection), folds in plant-driven transpiration and photosynthesis, normalises toward ambient with airflow-scaled exponential pull, clamps to safety limits, and emits environmental anomaly events as needed.【F:docs/system/simulation-engine.md†L35-L66】
- **Plant phase.** Phenology advances by tick, resource requirements convert NPK and water curves to per-plant, per-tick demand, stress aggregates weighted penalties across climate and resource drivers, health adjusts via stress thresholds, potential growth factors (light, temperature, CO₂) combine with health to yield actual biomass gains, and quality tracking respects harvest windows.【F:docs/system/simulation-engine.md†L80-L105】
- **Health and workforce phases.** Pests and diseases progress through detect → progress → spread → treat steps with blueprint-driven risk and safety gates, while employees pull tasks by maximising utility functions, execute until `progressTicks ≥ durationTicks`, and accrue overtime per policy when energy dips below zero.【F:docs/system/simulation-engine.md†L115-L170】
- **Accounting phase.** CapEx posts immediately, OpEx aggregates maintenance, energy, and inputs using tick-hour scaling, rent multiplies hourly rates by tick length, labour costs respect overtime policies, and revenue applies quality-modified harvest pricing before finance events are emitted.【F:docs/system/simulation-engine.md†L173-L190】

## Math Formulas Overview

**Source:** docs/\_extraction/formulas.md § Extracted Formulas

### Breeding

- `T_gen = veg + flower + tail + post`【F:docs/\_extraction/formulas.md†L3-L12】
- `veg   = avg(vegetationDays[A], vegetationDays[B])`【F:docs/\_extraction/formulas.md†L14-L23】
- `flower= avg(floweringDays[A],  floweringDays[B])`【F:docs/\_extraction/formulas.md†L25-L34】
- `tail  = max(0, seedMaturationDays - (flower - pollinationDayInFlower))`【F:docs/\_extraction/formulas.md†L36-L45】
- `post  = postProcessingDays`【F:docs/\_extraction/formulas.md†L47-L56】
- `effectiveDays ≈ ceil(T_gen / parallelBatches)`【F:docs/\_extraction/formulas.md†L58-L67】
- `±noise × base`【F:docs/\_extraction/formulas.md†L113-L122】

### Terpenes

- `w_t = mg_g_t / total_mg_g`【F:docs/\_extraction/formulas.md†L69-L78】
- `axis = Σ (share_terpene × weight_terpene→axis) → clamp \[0..1]`【F:docs/\_extraction/formulas.md†L80-L89】

### Genetics & Resilience

- `sum ≤ 1`【F:docs/\_extraction/formulas.md†L91-L100】
- `1.0 = neutral`【F:docs/\_extraction/formulas.md†L102-L111】

### Capacity

- `Max plant count = floor(zoneArea / areaPerPlant)`【F:docs/\_extraction/formulas.md†L123-L133】

### Time Scaling

- `tickLengthMinutes / 60`【F:docs/\_extraction/formulas.md†L135-L144】
- `tickHours = tickLengthMinutes / 60`【F:docs/\_extraction/formulas.md†L366-L375】

### Tasks & Workforce

- `progressTicks >= durationTicks`【F:docs/\_extraction/formulas.md†L146-L155】
- `U = w1*priority + w2*skillMatch + w3*roleAffinity + w4*urgency`【F:docs/\_extraction/formulas.md†L421-L430】
- `w5*distance - w6*fatigue + w7*morale + w8*toolAvailability ± traitMods`【F:docs/\_extraction/formulas.md†L432-L440】

### Economics

- `revenue = harvestBasePricePerGram × modifiers`【F:docs/\_extraction/formulas.md†L157-L166】
- `device.power_kW × tickHours × electricityCostPerKWh`【F:docs/\_extraction/formulas.md†L355-L364】

### Scheduler & Seeding

- `Math.floor(tick / 2016)`【F:docs/\_extraction/formulas.md†L168-L177】
- `apiSeed = override ?? "<gameSeed>-<weekIndex>"`【F:docs/\_extraction/formulas.md†L179-L188】
- `accumulatedMs += now - lastNow`【F:docs/\_extraction/formulas.md†L212-L221】
- `accumulatedMs ≥ tickIntervalMs / gameSpeed`【F:docs/\_extraction/formulas.md†L223-L232】
- `accumulatedMs -= tickIntervalMs / gameSpeed`【F:docs/\_extraction/formulas.md†L234-L243】

### Probability

- `P(other) = pDiverse`【F:docs/\_extraction/formulas.md†L190-L199】
- `P(male) = P(female) = (1 - pDiverse) / 2`【F:docs/\_extraction/formulas.md†L201-L210】

### Environment & Humidity

- `ΔRH = (mass_kg ÷ (volume_m3 × SATURATION_VAPOR_DENSITY_KG_PER_M3)) × efficiency × powerMod`【F:docs/\_extraction/formulas.md†L245-L254】
- `Δ = k_mix * (ambient − current)`【F:docs/\_extraction/formulas.md†L256-L265】
- `Tₜ = Tₐ + (T₀ − Tₐ) · exp(−k · Δt)`【F:docs/\_extraction/formulas.md†L377-L386】

### Nutrition & Growth

- `req_phase = curve[phase]`【F:docs/\_extraction/formulas.md†L267-L276】
- `req_tick_plant = req_phase * (zoneArea / plantCount) * (tickHours / 24)`【F:docs/\_extraction/formulas.md†L278-L287】
- `stress_raw = Σ w_D * penalty_D`【F:docs/\_extraction/formulas.md†L289-L298】
- `stress = clamp01(stress_raw * (1 − generalResilience))`【F:docs/\_extraction/formulas.md†L300-L309】
- `stress > θ_stress`【F:docs/\_extraction/formulas.md†L311-L320】
- `health -= α * stress`【F:docs/\_extraction/formulas.md†L322-L331】
- `health += β_recovery`【F:docs/\_extraction/formulas.md†L333-L342】
- `actualGrowth = potentialGrowth * health * (1 − γ * stress)`【F:docs/\_extraction/formulas.md†L344-L353】

### Temperature & Transpiration

- `g_c = g₀ · clamp(LAI / 3, 0.3, 2)`【F:docs/\_extraction/formulas.md†L388-L397】
- `E = g_c · VPD · f_stomatal`【F:docs/\_extraction/formulas.md†L400-L408】
- `litres = E · area · Δt ÷ 3600 · 0.018`【F:docs/\_extraction/formulas.md†L410-L419】

## Devices and Effects

**Sources:** docs/system/simulation-engine.md § Environment Model; docs/DD.md § 2) Devices — `/data/blueprints/devices/*.json`; docs/backend-overview.md § 3.2 Blueprint–to–Subsystem Mapping

- **Device deltas.** Grow lights contribute heat proportional to power and map photon flux over coverage area to canopy PPFD, HVAC units steer temperature toward setpoints within hysteresis bands, dehumidifiers and humidifiers translate mass flow into relative humidity deltas, and CO₂ injectors push concentration toward targets capped by safety limits.【F:docs/system/simulation-engine.md†L35-L55】
- **Ambient normalisation.** After device and plant deltas, zones apply an exponential pull (`Δ = k_mix * (ambient − current)`) with airflow-dependent gain so ventilation hardware accelerates the return to ambient conditions.【F:docs/system/simulation-engine.md†L57-L59】
- **Blueprint parameters.** Device templates declare kind-specific settings (e.g., power, PPFD, coverage area, cooling capacity, airflow, targetTemperature, latent removal), quality and lifespan metadata, and allowed room purposes, giving the engine enough data to evaluate placement rules and runtime behaviour.【F:docs/DD.md†L203-L331】

## Economy and Costs

**Sources:** docs/vision_scope.md §§ 6–6a; docs/system/simulation-engine.md § Economics (currency-neutral); docs/system/simulation_philosophy.md § 5. Economic Model: Constant Pressure and Rewarding Mastery

- **Dual loops.** Expansion decisions manage CapEx—renting structures, purchasing or replacing devices, unlocking cultivation methods—while daily operations juggle OpEx via climate control, irrigation, pest mitigation, staffing, and consumables.【F:docs/vision_scope.md†L112-L123】
- **Cost mechanics.** Maintenance costs rise with device wear, energy spend is derived from power draw per tick hour, water and nutrient purchases follow per-m²/day demand curves, rent multiplies hourly base rates by tick length, and labour costs respect overtime policies, ensuring all recurring charges scale with the current tick duration.【F:docs/system/simulation-engine.md†L173-L190】
- **Quality-driven revenue.** Harvest sales multiply base price by quality modifiers, with the quality model rewarding high health and low stress while a non-linear price function amplifies above-baseline quality and penalises poor output.【F:docs/vision_scope.md†L129-L195】
- **Design intent.** Persistent per-tick expenses maintain financial pressure so passive play is unviable, whereas mastering the systems to raise quality yields outsized rewards, reinforcing the tycoon-style tension.【F:docs/system/simulation_philosophy.md†L27-L31】

## Data and Blueprints

**Sources:** docs/backend-overview.md § 3. Blueprints Provided & How to Use Them; docs/system/data-validation.md § Blueprint Data Validation Workflow; docs/DD.md § Conventions (apply to all files)

- **Blueprint Doctrine.** Blueprints are delivered with the new repo as a validated collection spanning structures, room purposes, cultivation methods, strains, devices, pests, diseases, personnel roles, and price maps; they are immutable templates, never instantiated directly, because runtime systems always materialise instances by copying a blueprint, which enables multiple simultaneous instances—such as many small warehouses, rooms, or zones—from the same template without mutating the source data.【F:docs/backend-overview.md†L40-L52】
- **Schema conventions.** All blueprints follow shared rules: UUID `id` keys, camelCase naming without unit suffixes, SI units for physical quantities, inclusive ranges, and validation that enforces required fields, numeric bounds, and cross-references before runtime use.【F:docs/DD.md†L1-L41】【F:docs/backend-overview.md†L46-L52】【F:docs/backend-overview.md†L123-L139】
- **Validation workflow.** The `pnpm validate:data` command parses each blueprint family, enforces casing-sensitive control setpoints, emits machine- and human-readable reports, and fails CI when errors appear, ensuring data drift is caught before integration.【F:docs/system/data-validation.md†L1-L53】
- **Materialisation pipeline.** Loading blueprints involves validation, copying template values into runtime records, resolving cross-map identifiers (e.g., price tables), and exposing read-only instances to subsystems so deterministic state changes never mutate source JSON.【F:docs/backend-overview.md†L123-L129】

## Telemetry and UI Views

# User-provided custom instructions

# Product Requirements Document (PRD)

## Modular Plant Growth Simulation (Open Architecture)

### Document Status

- **Owner:** Björn Ahlers
- **Audience:** Backend (Node.js) & Frontend (React) engineers, QA, DevOps
- **Version:** v1.0 (Initial)
- **References:** Architecture & naming conventions and domain schemas from the Weed Breed project are authoritative for units, tick semantics, and data blueprints. &#x20;

---

## 1) Goals & Non-Goals

### 1.1 Goals

- Deliver a **modular, extensible** simulation of plant physiology and climate that runs on Node.js and streams real-time telemetry to a web dashboard.
- Favor **proven libraries** (math/units, schema validation, charts, state management) over bespoke implementations.
- Ensure **determinism and replaceability** of the biology/physics module: drop-in upgrade of formulas without ripple effects.
- Provide **save/load** (JSON) with schema validation and versioning.

### 1.2 Non-Goals (v1)

- No 3D rendering or heavy CFD/psychrometrics (advanced models may be introduced later).&#x20;
- No multiplayer game logic (prepare event stream but keep single-user focus).&#x20;
- No persistence layer beyond file-based saves (DB offloading can be evaluated later).

---

## 2) Users, Personas & Use Cases

### 2.1 Personas

- **Simulation Engineer:** Develops & calibrates env/plant models; needs fast iteration and testability.
- **Gameplay/UX Engineer:** Builds dashboards and controls; needs stable event API and compact payloads.
- **Tuner/Designer:** Adjusts parameters (light setpoints, schedules, strain/method blueprints) without code changes.

### 2.2 Primary Use Cases

1. **Run a tick-based simulation** with configurable tick length (e.g., 1–10 minutes of sim time per tick).
2. **Adjust conditions at runtime** (pause/resume, tick rate, setpoints for light/temperature/CO₂).
3. **Visualize telemetry** (time-series charts for T, RH, VPD, PPFD; tables for plants/devices).
4. **Save & load** full state with schema validation and versioning.

---

## 3) System Overview

### 3.1 Architecture Summary

- **Backend (Node.js, ESM):** Simulation core (physics & plant model), scheduler/loop, event bus, save/load, Socket.IO gateway. Event-driven and deterministic.&#x20;
- **Frontend (React + Vite):** Real-time dashboard using Socket.IO, Zustand store, Recharts, TanStack Table.
- **Contracts:** JSON event payloads & schemas; SI units & naming conventions uniform across modules.&#x20;

### 3.2 World Model (v1)

- Hierarchy: **Building → Rooms → Zones → Plants**; zone-scoped environment state feeds plant model each tick.&#x20;
- Geometry utilities: room volumes, zone areas; coverage/limits of devices (lamp coverage m², HVAC airflow m³/h). &#x20;

---

## 4) Functional Requirements

### 4.1 Plant Physiology & Bioclimatics Module

- **Inputs per tick:** temperature (°C), relative humidity (0–1), CO₂ (ppm), PPFD (µmol·m⁻²·s⁻¹), zone volume (m³), leaf area index (LAI), water/nutrient status.
- **Outputs per tick:** VPD proxy, transpiration, photosynthesis rate, biomass increment, health/stress indicators.
- **Implementation Guidance:**
  - Provide a lightweight closed-form **VPD proxy, transpiration, and photosynthesis** (“arcade” model) with tunables and clamps.&#x20;
  - Keep all formulas in one module (e.g., `src/engine/plantModel.js` + `src/engine/envPhysics.js`) to allow **drop-in replacement** with more advanced models (e.g., Penman-Monteith) later.&#x20;
  - Use **Math.js** for unit handling/expressions where helpful; base units SI (implicit).&#x20;

- **Acceptance Examples (physics sanity):**
  - If **PPFD = 0**, photosynthesis increment must be ~0 (respiration ignored in v1).
  - If **RH decreases** (other factors constant), **VPD increases**, raising transpiration until clamped.
  - If **T deviates** strongly from `T_opt`, growth/stress functions reflect penalties.&#x20;

### 4.2 Simulation Loop & Scheduler

- Fixed or adjustable **tick length** (default minutes of sim time per tick), **pause/resume**, **step**, **fast-forward**.
- After each tick, emit an event `sim.tickCompleted` with snapshot/diff payloads for UI.&#x20;
- Provide optional discrete-event lib evaluation later; v1: Node timers + state machine orchestration.
- **Tick phase order (must):**
  1. `applyDevices` → 2) `deriveEnvironment` → 3) `irrigationAndNutrients` → 4) `updatePlants` → 5) `harvestAndInventory` → 6) `accounting` → 7) `commit`.&#x20;

### 4.3 Geometry & Environment Model

- **Room/Zone data:** area (m²), height (m), volume (m³), environmental state (T, RH, CO₂, PPFD).
- **Utilities:** `getVolume(room)`, lamp **coverageArea** checks, HVAC airflow → temperature delta via capacity model. &#x20;
- **Extensibility:** Prepared for later 2D/3D grid and more accurate psychrometrics (Magnus/psychrolib).&#x20;

### 4.4 Formula Evaluation & Units

- **Units:** SI throughout; **no unit suffixes** in keys. Convert at edges if needed.&#x20;
- **Dynamic formulas:** Concentrate tunables (e.g., `L50`, `C50`, `T_opt`) in config so designers can calibrate without code.&#x20;
- **Validation:** On load, verify formulas/parameters; surface precise errors.

### 4.5 Data Serialization (Save/Load) & Schema

- **Savegames:** Serialize full simulation state to **JSON** with `version`, timestamp, and deterministic RNG seed.
- **Schema Validation:** Use JSON Schema (Ajv) or Zod to validate saves & blueprints; include **versioning** for migration.
- **Blueprint Inputs:**
  - **Strains:** genotype, chemotype, morphology, environment prefs, photoperiod, disease & harvest windows.&#x20;
  - **Cultivation Methods:** area per plant, substrate, containerSpec, compatibility.&#x20;
  - **Devices:** kind, settings (power, airflow, cooling…), meta; prices/maintenance externalized.&#x20;
  - **Strain Prices:** `seedPrice`, `harvestPricePerGram` (max at quality=1; runtime modifiers apply).&#x20;

### 4.6 WebSocket Communication (Socket.IO)

- **Events (server → client):**
  - `simulationUpdate` (batched diff/min snapshot per tick),
  - `sim.tickCompleted`, domain events (`plant.stageChanged`, `plant.harvested`, `device.degraded`, `zone.thresholdCrossed`, `market.saleCompleted`).&#x20;

- **Events (client → server):**
  - `simulationControl` (`play|pause|step|fastForward`, `setTickLength`, `setSetpoint`),
  - `config.update` (optional gated: update tunables).

- **Payloads:** JSON, compact, with SI units implied; include `tick` and monotonic millisecond `ts`.

### 4.7 Client Application (React)

- **State:** Zustand global store; normalized slices for env time-series, plant/device tables.
- **Visualization:** Recharts (line for T/RH/PPFD/CO₂, small multiples), TanStack Table for inventory & events.
- **Controls:** Play/pause/step, tick rate slider, setpoint inputs (T, RH/target VPD, CO₂, light).
- **Performance:** Throttle chart updates (e.g., last N points), virtualize tables if needed.

### 4.8 Testing & Validation

- **Unit tests:** VPD, growth/stress clamps, device coverage checks, unit conversions.
- **Integration tests:** Multi-tick scenarios (e.g., lights off → zero growth; humidity drop → VPD↑ → transpiration↑).&#x20;
- **Schema tests:** Round-trip save/load; validate blueprints (strain/device/method/price).
- **Benchmarks:** Target per-tick compute **≤ 100 ms** at 10 ticks/sec on a dev laptop.

---

## 5) Non-Functional Requirements

- **Determinism:** Given same seed and inputs, state must be identical across runs.
- **Extensibility:** Hot-swappable plant/physics modules without touching loop, UI, or schemas.
- **Observability:** Structured logs (pino); event bus mirrors key domain events for UI and debugging.&#x20;
- **Resilience:** Graceful error handling at phase boundaries; no partial commits (commit-at-end per tick).&#x20;
- **Config:** `.env` for tick length, log level, seed; JSON for tunables & blueprints.

---

## 6) Detailed Design

### 6.1 Tick Orchestration

- Implement the tick order as a small **state machine** (XState) for clarity and testability; transitions on success/failure; **commit** at end.&#x20;

### 6.2 Event Bus

- Internal bus (RxJS Subject) with `emit(type, payload, tick, level)`, UI stream is buffered/throttled and forwarded to Socket.IO.&#x20;
- Event types use dotted namespaces (`plant.*`, `device.*`, `sim.*`, `market.*`).

### 6.3 Devices & Physical Limits

- Device blueprints define **settings**; runtime instantiation accounts for **coverageArea** (lamps), **airflow** and **coolingCapacity** (HVAC). Multiple devices may be needed for larger zones. &#x20;

### 6.4 Data & Naming Rules

- Use camelCase, **no unit suffixes**, SI implied, time in **hours/days**, prices in EUR (implicit), as per conventions.&#x20;

---

## 7) Interfaces & Payloads (Examples)

### 7.1 `simulationUpdate` (server → client)

```json
{
  "type": "simulationUpdate",
  "tick": 124,
  "ts": 1725712345678,
  "env": {
    "zoneId": "zone-a1",
    "temperature": 25.3,
    "humidity": 0.62,
    "co2": 980,
    "ppfd": 540,
    "vpd": 1.3
  },
  "plants": [{ "id": "p-01", "stage": "vegetation", "biomass_g": 142.1, "health": 0.93 }],
  "events": [{ "type": "device.degraded", "deviceId": "lamp-01", "severity": "info" }]
}
```

### 7.2 `simulationControl` (client → server)

```json
{ "type": "simulationControl", "action": "pause" }
```

```json
{ "type": "simulationControl", "action": "setTickLength", "minutes": 3 }
```

```json
{ "type": "simulationControl", "action": "setSetpoint", "target": "temperature", "value": 24 }
```

### 7.3 Savegame Header

```json
{
  "kind": "WeedBreedSave",
  "version": "1.0.0",
  "createdAt": "2025-09-07T08:00:00Z",
  "tickLengthMinutes": 3,
  "rngSeed": "wb-42-abc",
  "state": {
    /* ... */
  }
}
```

---

## 8) Data Blueprints (Authoritative)

- **Strain schema** (genetics, morphology, environment prefs, photoperiod, disease, harvest): used by plant factory.&#x20;
- **Cultivation method schema** (substrate, containerSpec, areaPerPlant, compatibility): drives capacity & plausibility checks.&#x20;
- **Device schema** (settings & meta; prices & maintenance externalized): per-tick effects derived from settings.&#x20;
- **Strain prices schema** (seed & harvest base price, runtime modifiers apply via market engine).&#x20;

---

## 9) Validation & QA

### 9.1 Unit Tests (Jest)

- **Physics:** VPD proxy monotonicity; temperature update with power/heat capacity; PPFD → photosynthesis saturation curve.&#x20;
- **Data:** Ajv/Zod validation for saves and blueprints (strain/device/method/price).
- **Naming:** Lint test to forbid unit suffixes in keys per conventions.&#x20;

### 9.2 Integration Scenarios

- **Dark Run:** PPFD=0 for 24h → biomass increment ~0; transpiration minimal (bounded by floor).
- **Dry Air:** Lower RH by 10% with constant T → VPD↑, transpiration↑, water store ↓ with irrigation controller reacting.
- **Coverage Limit:** Oversized zone with one lamp → PPFD cap; adding second lamp raises PPFD within geometric bounds.

### 9.3 Performance

- **Target:** ≤ 100 ms per tick at 10 tps with 1 room, 2 zones, 50 plants, 4 devices.
- Provide a `npm run bench` script with fixed seed and fixture data.

---

## 10) Security, Logging & Telemetry

- **Logging:** pino JSON logs (level from ENV), include `{ tick, zoneId, plantId? }` in context.&#x20;
- **Socket:** Namespaces/rooms (future-proof); in v1 single client namespace.
- **Config:** `dotenv` for tick length, seeds, log levels; hot reload of blueprint files with chokidar (dev only).&#x20;

---

## 11) Milestones & Deliverables

1. **M1 – Core Loop & Bus (Backend)**
   - Tick state machine with ordered phases; RxJS event bus; Socket.IO gateway; dummy zone & single plant.
   - Unit tests for tick order and `sim.tickCompleted`.

2. **M2 – Physics & Plant Model**
   - Env physics + arcade plant model; tunables in JSON; tests for VPD/photosynthesis/transpiration; coverage checks.

3. **M3 – Save/Load & Schemas**
   - Ajv/Zod validation for savegames; versioned saves; blueprint loaders (strain/device/method/prices).

4. **M4 – Dashboard (Frontend)**
   - Zustand store; charts & tables; controls (play/pause/step/rate/setpoints); basic theming.

5. **M5 – Benchmarks & Hardening**
   - Bench suite; error handling; graceful shutdown; docs & examples.

---

## 12) Risks & Mitigations

- **Over-complex models** slow ticks → **Mitigation:** start with simplified formulas; keep upgrade path documented.&#x20;
- **Payload bloat** over WebSocket → **Mitigation:** diffs or downsampling; UI throttling.
- **Schema drift** in blueprints → **Mitigation:** strict validation and version gates; migration scripts.

---

## 13) Open Questions

- Do we require **psychrometric coupling** (T↔RH via saturation vapor pressure) in v1 or v1.1?&#x20;
- Should **market/price modifiers** (quality, brand, demand) ship in v1 or remain stubbed?&#x20;
- How many **zones/plants** are the default stress test targets for CI?

---

## 14) Definition of Done (DoD)

- All functional requirements implemented with passing unit/integration tests.
- Dashboard reflects `simulationUpdate` in real time and controls work (pause/step/rate/setpoints).
- Save/load round-trips validated; blueprint schemas locked with version headers.
- Benchmarks meet performance target on reference hardware.

---

## 15) Appendix: Tick Physics (Reference)

Core formula references used for v1 arcade model (transpiration, photosynthesis, temperature, humidity pool, device control hysteresis) are documented in **WB-Formeln.md** and MUST remain encapsulated behind the physics module boundary for future model swaps.&#x20;

---

### Implementation Notes for Codex

- **Node:** ESM only; modules under `src/engine`, `src/sim`, `src/lib`.
- **Events:** Mirror the ADR’s event taxonomy; forward UI-safe stream over Socket.IO.&#x20;
- **Schemas:** Load & validate blueprints per their schema docs before runtime use. &#x20;
- **Naming & Units:** Enforce conventions (lint/CI check).&#x20;

> This PRD is designed to be “open architecture”: physics and plant models are boxed behind a single module boundary; devices, strains, and methods are pure JSON blueprints; the loop and event bus are stable contracts for UI and future systems. &#x20;

## Assumptions and Constraints

**Sources:** docs/vision_scope.md §§ 3, 12, 15, 16

- **Performance envelope.** The reference scenario must sustain at least one tick per second at 1× speed with a per-tick CPU budget under 50 ms, aligning balancing and benchmark work around that baseline.【F:docs/vision_scope.md†L61-L77】
- **Deterministic numerics.** All randomness flows through seeded generators, SI units underpin every quantity, persistence uses JSON numbers with up to six decimal places, and audit comparisons apply tight relative and absolute tolerances, constraining both engine and content design.【F:docs/vision_scope.md†L305-L315】
- **Validation and safety.** Safe defaults on parameter errors, strict schema validation at load, and prohibition of `Math.random` in the core guard against drift and ensure deterministic recovery.【F:docs/vision_scope.md†L245-L249】【F:docs/vision_scope.md†L311-L315】
- **Community expectations.** The roadmap assumes modding demand, deterministic replays as a core value proposition, and broad acceptance of SI units, guiding documentation and tooling priorities.【F:docs/vision_scope.md†L293-L296】
- **Localization and privacy.** Out-of-the-box support targets German and English with SI units and configurable formatting, while saves remain local and avoid personal data, bounding compliance scope.【F:docs/vision_scope.md†L247-L250】

## Open Questions

**Sources:** docs/vision_scope.md §§ 3, 4, 8, 13

- **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】
- **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】
- **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】
- **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】
- **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】
- **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

## Provenance Index

**Sources:** docs/vision_scope.md § 1. Vision; docs/backend-overview.md § 3. Blueprints Provided & How to Use Them; docs/system/simulation-engine.md §§ Timebase & Core Loop, Environment Model, Plant Growth, Tasks, Economics; docs/\_extraction/formulas.md § Extracted Formulas; docs/system/socket_protocol.md § UI Stream (`uiStream$`); docs/ui-building_guide.md § Guiding Principles; docs/system/data-validation.md § Blueprint Data Validation Workflow; docs/DD.md § Conventions (apply to all files); docs/system/simulation_philosophy.md § 1. Time & Simulation Loop: Stability and Fairness

<!-- prettier-ignore-start -->
| Final Section | Primary Sources |
| --- | --- |
| 01-title-scope | `docs/vision_scope.md § 1. Vision`, `docs/backend-overview.md § 1. Purpose & Non-Goals`【F:docs/vision_scope.md†L5-L29】【F:docs/backend-overview.md†L3-L11】 |
| 02-core-principles | `docs/vision_scope.md § 1. Vision`, `docs/system/simulation_philosophy.md §§ 1–5`, `docs/backend-overview.md § 3.1 Operating Principles`【F:docs/vision_scope.md†L13-L17】【F:docs/system/simulation_philosophy.md†L5-L31】【F:docs/backend-overview.md†L40-L52】 |
| 03-domain-model | `docs/vision_scope.md § 4. Canonical Domain Model`, `docs/DD.md §§ 1–3`【F:docs/vision_scope.md†L84-L99】【F:docs/DD.md†L12-L331】 |
| 04-simulation-lifecycle | `docs/system/simulation-engine.md §§ Timebase & Core Loop, Environment Model, Plant Growth, Health, Tasks, Economics`【F:docs/system/simulation-engine.md†L12-L190】 |
| 05-math-formulas-overview | `docs/_extraction/formulas.md § Extracted Formulas`【F:docs/_extraction/formulas.md†L3-L440】 |
| 06-devices-and-effects | `docs/system/simulation-engine.md § Environment Model`, `docs/DD.md § 2) Devices`, `docs/backend-overview.md § 3.2 Blueprint–to–Subsystem Mapping`【F:docs/system/simulation-engine.md†L35-L59】【F:docs/DD.md†L203-L331】【F:docs/backend-overview.md†L54-L64】 |
| 07-economy-and-costs | `docs/vision_scope.md §§ 6–6a`, `docs/system/simulation-engine.md § Economics`, `docs/system/simulation_philosophy.md § 5`【F:docs/vision_scope.md†L112-L195】【F:docs/system/simulation-engine.md†L173-L190】【F:docs/system/simulation_philosophy.md†L27-L31】 |
| 08-data-and-blueprints | `docs/backend-overview.md § 3`, `docs/system/data-validation.md`, `docs/DD.md § Conventions`【F:docs/backend-overview.md†L40-L139】【F:docs/system/data-validation.md†L1-L53】【F:docs/DD.md†L1-L41】 |
| 09-telemetry-and-ui-views | `docs/system/socket_protocol.md §§ UI Stream, Connection & Handshake`, `docs/ui-building_guide.md §§ Guiding Principles, Layout & Navigation, Dashboard & Global Chrome`【F:docs/system/socket_protocol.md†L3-L145】【F:docs/ui-building_guide.md†L1-L127】 |
| 10-assumptions-constraints | `docs/vision_scope.md §§ 3, 12, 15, 16`【F:docs/vision_scope.md†L61-L315】 |
| 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |
<!-- prettier-ignore-end -->
