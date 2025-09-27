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

**Sources:** docs/system/socket_protocol.md §§ UI Stream, Connection & Handshake; docs/ui-building_guide.md §§ Guiding Principles, Layout & Navigation, Dashboard & Global Chrome

- **Shared UI stream.** The backend exposes a hot observable that batches simulation updates, tick-completion notices, and domain events with bounded buffers; all transports subscribe to the same stream so Socket.IO and SSE clients receive identical JSON payloads in SI units.【F:docs/system/socket_protocol.md†L3-L31】
- **Handshake cadence.** On connect the gateway emits protocol metadata, current time status (tick, speed, pause state), and an initial `simulationUpdate` snapshot before continuing with batched updates that include phase timings, telemetry, and UUID-referenced entities.【F:docs/system/socket_protocol.md†L33-L145】
- **UI contract.** The dashboard renders read-only snapshots, routes every intent through the System Facade, and keeps unidirectional dataflow (render → intent → commit → event → re-render) so the engine remains authoritative.【F:docs/ui-building_guide.md†L1-L27】
- **Navigation model.** The application shells persist header controls, breadcrumbs, sidebar, and content area, supporting a structure → room → zone drill-down with responsive layouts, modal pauses, and consistent design-system primitives across breakpoints.【F:docs/ui-building_guide.md†L5-L111】
- **Global controls.** The dashboard header surfaces capital, cumulative yield, plant capacity, and tick progress, with play/pause, multi-speed presets, finance and personnel shortcuts, notification popovers, and menu actions that mirror telemetry events.【F:docs/ui-building_guide.md†L49-L127】

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
