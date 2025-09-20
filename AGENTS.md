# Weedbreed.AI — Vision & Scope

---

## 1. Vision

**Elevator Pitch.** *Weed Breed* is a modular, deterministic plant/grow simulation as a game. Players plan structures (Buildings → Rooms → Zones → Plants), control climate and devices, balance cost and yield, and experience complete cultivation cycles—from seeding to harvest and post-harvest. The system is open, extensible, and content-driven (blueprint JSONs) so that community, modders, and researchers can easily contribute content.

**Why now?** There are plenty of “tycoon” games, but few that combine **physically plausible climate & plant physiology** with **economic gameplay** and **determinism**. *Weed Breed* fills this gap.

**Guiding Principles.**

1. **Determinism over visuals.** Reproducible runs beat visual effects.
2. **Playability over realism.** Plausible rather than strictly scientific—with explicit simplifications where needed.
3. **Open architecture.** Data/modding first, clear interfaces, stable formats.
4. **Transparency.** Visible metrics, explainable decisions (logs, audits, replays).
5. **Tight feedback loops.** Fun comes from meaningful micro-decisions in day-to-day operations.

**Non-Goals (Anti-Scope).**

* No political/regulatory simulation; legal aspects remain abstracted.
* No shooter/action mechanics.
* No exact lab-grade growth models; the focus remains “plausible & playable.”

**Experience Pillars.**

* **Planning & Optimization:** Climate, light, CO₂, device upgrades.
* **Risk Management:** Pests/diseases, resource bottlenecks, device wear.
* **Economy:** OpEx/CapEx, cash flow, break-even, price/quality.

---

## 2. Target Audiences & Stakeholders

**Primary Personas.**

* **The Optimizer** — loves spreadsheets, wants to improve KPIs (PPFD, VPD, €/g).
* **The Builder** — creates beautiful, efficient setups; enjoys upgrades & layout.
* **The Learner** — wants to understand the relationship between climate, plant, and yield.

**Stakeholders & Decision Authority (RACI-light).**

* **Product/Design:** Vision, priorities, balancing guardrails.
* **Engineering:** Architecture, quality, deterministic simulation foundation.
* **Content:** Blueprints (strains/devices/methods), data quality, sources.

**Usage Context.** Solo play, optional sandbox/editor mode. Streaming-friendly (clear visuals, readable KPIs).

---

## 3. Success Criteria

**Outcome KPIs (Goals).**

* **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). *(OPEN: validate)*
* **Retention Proxy:** 70% of players reach day 7 of a sandbox save. *(OPEN: measure)*
* **Determinism Score:** Reference run (200 days) reproducible within **±0.5%** on core metrics.

**Quality Goals/SLOs.**

* **Performance:** Reference scenario (see below) runs at **1× speed** with **≥ 1 tick/s** (1 in-game day in ≤ 24 s). Per-tick CPU budget ≤ **50 ms**.
* **Stability:** No sim deadlocks; crash recovery without data loss (< 1 tick).
* **Memory Target:** Reference scenario uses < **1.0 GB RAM**. *(OPEN: finalize)*

**Reference Scenario (Performance Benchmark & Balancing Baseline).**

* **Structure:** 1 medium warehouse.
* **Rooms 1:** 2 grow rooms

  * **Zones:** 5 zones with different **cultivationMethods** and **MAX** plants per zone. 10,000 L water and 100 kg nutrients.
* **Rooms 2:** 1 break room for 8 employees

  * **Zones:** none required for the break room
* **Staff:** 8 employees (at least 4× Gardener, 2× Technician, 2× Janitor).
* **Starting Capital:** 100,000,000.
* **Goal:** Fixed load profile for performance measurements (≥ 1 tick/s at 1×) and baseline for balancing passes.

---

## 4. Canonical Domain Model

**Core Entities & Relationships.**

* **Structure → Room → Zone → Plant** (hierarchical).
* **Devices** (e.g., Lamp, ClimateUnit, CO₂ Injector, Dehumidifier) are assigned to **zones**.
* **Strains** (JSON blueprints) define photoperiod, DLI/PPFD ranges, NPK/water curves, stress tolerances.
* **CultivationMethods** (e.g., SOG/SCROG) set topology, plant density, and labor requirements.
* **Pests/Diseases** as events/states with incidence probability, progression, effects & treatments.

**Lifecycles.**

* **Plant:** Seed → Vegetative → Flowering → Harvest → Post-harvest (drying/curing).
* **Device:** Efficiency degradation, maintenance, replacement triggers (OpEx vs CapEx tipping points).

**Time Scale.** Tick-based with fixed tick duration: **1 tick = 1 in-game hour**; **24 ticks = 1 in-game day**, **7×24 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. *(OPEN: standard wall-clock tick duration, e.g., 1 min)*

**Glossary (Excerpt).**

* **PPFD** (µmol·m⁻²·s⁻¹), **DLI** (mol·m⁻²·d⁻¹), **VPD** (kPa), **Photoperiod**, **Stress**, **Biomass**, **Bud Yield**.

---

## 5. Simulation Philosophy

* **Realism Levels:** Climate \[plausible], growth \[semi-empirical], economy \[playfully plausible].
* **Determinism & RNG:** Global seed; all randomness is seedable; deterministic ordering.
* **Calibration:** Literature values + expert plausibility checks; golden runs as reference.
* **Balancing:** Curves/blueprint parameters; editor-assisted fine-tuning; automated smokes (daily audits).

---

## 6. Progression & Economy

**Macro Loop (Expansion/CapEx).** Rent/expand structures, purchase/replace devices, unlock methods.
**Micro Loop (Daily Ops/OpEx).** Control climate, irrigation/NPK, pest control, staffing/tasks.

**Cost Logic.**

* **CapEx:** Device purchase price, depreciation/residual value.
* **OpEx:** Energy, water, nutrients, maintenance (**increasing**), consumables.
* **Replacement Tipping Point:** If maintenance + efficiency loss > savings from upgrade → **agent proposes replacement**.

**Revenue.** Quality × quantity × market price (balancing matrix).

---

## 6a. Quality Grades & Price Functions

**Numeric Quality Concept.**

* Quality is tracked **numerically** on a **0–100** integer scale, where **70** is the market **baseline** (list price without premium/discount).
* **Device quality (blueprint field `quality`)** affects **initial durability** and **initial efficiency** of a device.

**Device Quality → Durability/Efficiency.**

* *Durability:* `baseMTBF = spec.MTBF * (1 + (quality - 70) / 100)`
* *Efficiency:* `baseEfficiency = spec.efficiency * (1 + (quality - 70) / 200)`
  (Both are placeholder curves and may be differentiated per device type.)

**Harvest Quality (Pseudocode).**

```pseudo
function calculateHarvestQuality(finalHealth /*0..1*/, avgStress /*0..1*/, geneticQuality /*0..100*/, methodModifier /*~0.9..1.1*/): int {
  // Normalize base components
  let healthScore   = clamp01(finalHealth)
  let stressPenalty = clamp01(avgStress)

  // Weights (sum ≈ 1.0)
  const W_HEALTH = 0.55
  const W_STRESS = 0.25
  const W_GENET  = 0.20

  // Raw quality 0..100
  let q = 100 * (
      W_HEALTH * healthScore
    + W_GENET  * (geneticQuality / 100)
    + W_STRESS * (1 - stressPenalty)
  )

  // Method (SOG/SCROG etc.) acts mildly multiplicatively
  q = q * methodModifier

  // Soft caps and clamps
  if (q > 95) q = 95 + 0.5 * (q - 95)   // flatten near maximum
  return round(clamp(q, 0, 100))
}
```

**Price Function (Non-linear, Pseudocode).**

```pseudo
function calculateSalePrice(basePrice, quality /*0..100*/): number {
  const BASELINE = 70
  const q = clamp(quality, 0, 100)

  if (q >= BASELINE) {
    // Above-average quality is rewarded disproportionately
    // Exponent > 1 amplifies the bonus
    const alpha = 1.25
    const factor = Math.pow(q / BASELINE, alpha)
    return basePrice * factor
  } else {
    // Below-average quality receives a strong discount (convex)
    const beta = 1.5
    const factor = Math.pow(q / BASELINE, beta) // 0..1
    // Additional penalty kink below 50
    const kink = (q < 50) ? 0.85 : 1.0
    return basePrice * factor * kink
  }
}
```

**Design Intent.**

* **Excellence pays off strongly** (exponential bonus), **average is neutral**, **poor quality is penalized hard**. This creates a clear incentive to optimize climate/methods/staff and device quality.

---

## 7. Automation & Agents

**Agent Roles (Examples).**

* **Auto-Replant Agent:** Trigger “zone ready” → plant seedling; priority *high*; fallback: manual task queue.
* **Harvest Scheduler:** Ripeness detection, slot planning, buffer for post-harvest capacity.
* **Climate Controller:** Keep target corridor (temp/RH/CO₂/PPFD), cost-sensitive (energy prices).
* **Maintenance Advisor:** Monitor degradation/MTBF, plan maintenance windows, recommend replacement.
* **Pest/Disease Manager:** Risk assessment, plan treatments (cost/benefit/quality impact).

**Conflict Resolution & Priorities.** Central **task arbiter** allocates slots by importance (plant protection > harvest > replant > comfort).
**Failure States.** Resource shortage → degrade mode (safe defaults); dead device → emergency shutdown & alarm.

---

## 8. Content & Data Strategy

* **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. *(OPEN: finalize list)*
* **Sources/Licenses:** Document data provenance, attribution, OSS-friendly licenses.
* **Modding/Editors:** JSON formats stable (SemVer); in-game editors for strains/devices/methods planned.

---

## 9. UX & Presentation Vision (Technology-Agnostic)

* **Key Screens:** Start (New/Load/Import), Dashboard (time/tick, energy/water/€), Structure Explorer (Structure → Room → Zone → Plant), detail pane with KPIs & stress breakdown, Shop/Research, Logs/Audits.
* **Information Hierarchy:** Top: tick/time, daily costs, energy/water, balance; middle: active zone/plant KPIs; bottom: events/tasks.
* **Accessibility:** Strict SI units, clear tooltips, color-vision-friendly palettes, scalable typography.

---

## 10. Persistence & Compatibility

* **Save/Load Promise:** Forward migrations with schema versions (SemVer), migration scripts; crash-safe saves.
* **Export/Replay:** JSONL logs per day/harvest; deterministic replays from seed + input stream.

---

## 11. Telemetry, Validation & Tests

* **Sim Audits:** Daily summaries (biomass, water, NPK, energy, costs, stress), harvest summaries (yield, quality, €/g).
* **Deterministic Test Runs:** Reference seeds (e.g., `WB_SEED=golden-200d`), golden files, tolerances.
* **Observability:** Event bus probes, tick latency, dropped tasks, OOM guard.

---

## 12. Non-Functional Requirements (NFR)

* **Performance:** Target ticks/s per reference scenario (see §3); linear scaling per zone/plant with upper bounds.
* **Robustness:** Safe defaults on parameter errors; validate all blueprints at load time (schema).
* **Security/Privacy:** Local saves by default; no personal data.
* **Internationalization:** Languages DE/EN, SI units; configurable decimal/date formats.

---

## 13. Legal & Ethics

* **Portrayal:** Neutral, factual representation; no glorification; respect age ratings.
* **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. *(OPEN: decide)*

---

## 14. Roadmap & Release Criteria

**Milestones.**

1. **MVP:** One structure, basic climate control, 1–2 strains, 1 method, basic economy, save/load, deterministic 30-day run.
2. **Alpha:** Pests/diseases + treatments, device degradation/maintenance, shop/research loop, editor v1.
3. **Beta:** Balancing pass, golden runs (200 days), stability SLOs met, localization EN/DE.
4. **1.0:** Content polish, modding docs, replay exporter, performance tuning.

**Definition of Done (MVP).**

* First harvest < 30 min in the default scenario.
* Reproducible reference run (±0.5%).
* Schema versioning & migrations present.
* Crash-safe saves & restart.

---

## 15. Risks & Assumptions

**Top Risks.**

* **Balancing complexity:** Multiplicative effects from climate × strain × devices.
* **Agent standoffs:** “No one feels responsible” → deadlocks.
* **Data quality:** Incomplete/inconsistent blueprints.

**Mitigations.**

* Strict audit metrics, phased system enablement (feature flags).
* Central task arbiter, deadlock detector, fallback tasks.
* Schema validation, content reviews, test seeds.

**Assumptions.**

* The community wants modding; deterministic replays are core value; SI units are acceptable.

---

## 16. Binding Rules & Technical Guardrails (Coding‑Ready)

> These rules are **technology‑agnostic** and intended to be consumed verbatim by a Coding‑AI. They define deterministic behavior, validation, and acceptance thresholds for the simulation.

### 16.1 Units & Numerics (SI policy, rounding, tolerances)

* Store **all physical quantities in SI units**.
* Display formats are **UI‑only**.
* Internal representation: **float64**.
* Persistence: **JSON number** with **max 6 decimal places**.
* Audit comparisons use tolerances **ε\_rel = 1e‑6** and **ε\_abs = 1e‑9**.

### 16.2 Seed policy & RNG sources

* **All randomness** must go through **RNG(seed, streamId)**.
* **No** use of `Math.random` or system RNG in the sim core.
* Each subsystem (Pests, Events, Loot, Market, …) uses a **fixed `streamId`**.

### 16.3 Time scaling & pause semantics

* Time acceleration changes **only** the UI scheduler / loop frequency, **not** tick semantics.
* **One tick equals exactly one in‑game hour**.
* Pause = **stop ticking**. No half‑ticks or sub‑ticks (for now).

### 16.4 Task arbiter – deterministic priorities & fairness

* Priority order: **Plant‑Protection (100) > Harvest (90) > Replant (80) > Climate‑Comfort (70) > Maintenance (60) > Housekeeping (30)**.
* Within the same priority: **stable round‑robin**.
* Hard deadline classes (e.g., harvest windows) may **boost once** by **+10**.

### 16.5 Device degradation & maintenance

* Efficiency decay over runtime hours:

  * **Efficiency(t) = baseEfficiency × (1 – λ\_deg × runtime\_hours^k)**
  * Defaults: **λ\_deg = 1e‑5**, **k = 0.9** (sub‑linear).
* Maintenance resets efficiency to **min(0.98, 1 – wear\_residual)**.
* Maintenance costs increase **linearly** with the number of maintenances × device maintenance factor.

### 16.6 Market / price baseline

* `basePrice` originates from **`strainPrices.json`** (quality baseline **70**).
* Optional market modifier **`marketIndex(t)` ∈ \[0.85, 1.15]**, deterministic via RNG stream **"market"**.

### 16.7 Storage & post‑harvest quality decay

* Post‑harvest quality decays **starting on day 7**:

  * **Q(t) = Q0 × exp(–ρ × daysOver7)**
  * Default **ρ = 0.02 / day** without cooling; **cold storage halves ρ**.

### 16.8 Pest/disease treatments – side effects

* Each treatment option specifies **efficacy**, a **stress spike** (+ΔStress for **24–72 h**), and a **quality penalty** (**0–3 points**).
* The arbiter schedules treatments only if **net benefit > 0**.

### 16.9 Savegame schema & migrations

* Every savegame carries **`schemaVersion` (SemVer)**.
* Migrations are **pure functions** from v → v+1.
* Golden‑replay validates **Load → Run → Export** equality within **±ε**.

### 16.10 Audit metrics – definitions & thresholds

* Daily audit must record: **energy\_kWh, water\_L, npk\_g, biomass\_kg, stress\_avg, quality\_avg, opex\_eur, capex\_eur, tasks\_dropped**.
* Golden‑run thresholds in the reference scenario: **tasks\_dropped = 0**, **stress\_avg ≤ 0.35**, **quality\_avg ≥ 72**.

### 16.11 Maximum plants per zone – binding formula

* **`maxPlants = floor(zone.area_m2 / method.plantArea_m2)`**.
* Additional constraints must hold: **PPFD\_uniformity ≥ 0.7 (min/avg)** and minimum spacing of the cultivation method.

### 16.12 Climate controller – control strategy

* Use a **PI controller per variable** (Temperature / RH / CO₂) with **anti‑windup**.
* Actuators are **discrete device power levels (0–100%)**.
* Cost‑aware objective: **J = w\_err · Σ|e| + w\_cost · energy\_kWh** with **w\_err = 1.0**, **w\_cost = 0.1**.

### 16.13 Staff shift model

* **8 staff** members in a **2×12 h** shift system with **1 h overlap**.
* Task time: **`setup_time + per_plant_time × N`**.
* Tasks may be **preempted**, except **Harvest** (atomic).

### 16.14 Device conflict / capacity rules

* Exactly **one active climate controller per zone** controls devices.
* Conflicting actuators (heating vs cooling) must **not** run simultaneously **> 10%**; apply **0.5 K hysteresis**.

### 16.15 Failure & degrade‑mode matrix

* **Sensor failure:** use **last‑known‑good** for **6 h**, then **safe defaults**.
* **OOM** or **tick overrun (> 50 ms for 60 consecutive ticks):** engage **slow‑mode (0.5× UI speed)** and raise a warning; audit marks **`throttled = true`**.

---

> **Note:** This document is **technology-agnostic**. Concrete technology choices (engine, UI stack, etc.) are ore have to be documented separately in “Architecture & Implementation Choices.”

---

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

---

# Weedbreed.AI — Data Dictionary (DD)

## Conventions (apply to all files)

- **Primary key**: `id` (string, **UUID v4**). No `uuid` attribute is used anywhere.
- **Human identifiers**: `name` (display), `slug` (URL-friendly), optional; never authoritative.
- **Units** (SI, no unit suffixes in keys):  RH `0–1`; temperature `°C`; power `kW`; airflow `m³/h`; PPFD `µmol·m⁻²·s⁻¹`; CO₂ `ppm`; area `m²`; volume `L`; costs/prices are currency-neutral numbers.
- **Booleans** are explicit `true/false`; no “truthy” strings.
- **Ranges**: show as inclusive unless stated otherwise.
- **Validation principles**:
- Required keys must exist with the right type.- Optional keys may be omitted; if omitted, default behavior is defined below.- Cross-references must use **`id` (UUID)**; never free text.    
- **Formatting**: JSON with 2-space indentation; UTF-8; LF line endings.

---

## 1) Strains — `/data/blueprints/strains/*.json`

### Purpose

Defines cultivar genetics, physiology, environmental requirements, nutrition profile, phenology, resilience, and lineage.

### Schema (fields & meaning)

- `id: string (UUID v4)` — Primary key.
- `slug?: string` — URL-friendly slug (lowercase, `a–z0–9-`).
- `name: string` — Display name.

**Genetics & chemistry**

- `genotype?: { sativa?: number, indica?: number, ruderalis?: number }` — Fractions `0–1`; sum ≤ 1 (remainder = unspecified).
- `chemotype?: { thcContent?: number, cbdContent?: number }` — Dry matter fraction `0–1` at ideal harvest/curing.

**Resilience & traits**

- `generalResilience?: number (0–1)` — Aggregate resistance against stressors (used as a weight in stress/health models).
- `tolerances?: object` — Optional numeric tolerance multipliers by category (e.g., `temp`, `humidity`, `co2`, `underwatering`, `overnutrient`), `1.0` = neutral.
- `resistanceTraits?: object` — Optional disease/pest-specific resistances `0–1` (e.g., `"powderyMildew": 0.3`).

**Environment**

- `environment: {`
- `temperature: { optMin_C: number, optMax_C: number }` — Optimal canopy temperature.- `humidity: { optMin: number, optMax: number }` — RH `0–1`.- `co2?: { opt_ppm?: number }` — Target CO₂ concentration.- `light?: { ppfdTarget?: number }` — Target PPFD at canopy.      `}`      _Engine clamps deviations and converts distance to stress._    

**Nutrition & water**

- `nutrients: {`
- `npkCurve: {`- `vegetative: { N: number|null, P: number|null, K: number|null },`- `flowering: { N: number|null, P: number|null, K: number|null }`- `} // Units for N/P/K: g/m²/day`      `}`    
- `water?: { dailyUsePerM2_L: number }` — Liters per m² per day at baseline conditions.

**Growth & morphology** _(project-specific keys allowed; examples below)_

- `morphology?: { leafAreaIndex?: number, yieldFactor?: number }`
- `growthModel?: {`
- `maxBiomassDry_g?: number` — Per plant.- `baseLUE_gPerMol?: number` — Light-use efficiency (g dry per mol photons).- `maintenanceFracPerDay?: number (0–1)` — Respiration cost.- `dryMatterFraction?: { vegetation?: number, flowering?: number }`- `harvestIndex?: { targetFlowering?: number }`- `phaseCapMultiplier?: { vegetation?: number, flowering?: number }`- `stressPenaltyCap?: number (0–1)`      `}`    

**Phenology & photoperiod**

- `phenology: { seedlingDays: number, vegetativeDays: number, floweringDays: number }`
- `photoperiod?: { vegHoursLight?: number, flowerHoursLight?: number }`  _Defaults: if missing, engine policy may assume `18/6` veg, `12/12` flower._

**Harvest & post-harvest**

- `harvest?: { windowDays: number }` — Window around ideal ripeness.
- `postHarvest?: { storageHalfLifeDays: number }` — Quality half-life.

**Heuristics for UI/AI**

- `environmentalPreferences?: string[]` — Qualitative hints (e.g., `"highAirflow"`, `"lowNutrient"`). No direct physics effect unless mapped in rules.
- `noise?: number (0–1)` — **Breeding variability**; max fractional deviation for sampled offspring traits (e.g., `±noise × base`).

**Lineage**

- `lineage?: { parents: string[] }` — **List of parent `id` (UUID)**.  If `parents` is empty or missing ⇒ **ur-plant** (foundational strain).

### Example (minimal)

```json
{
  "id": "3d6c5c0b-5b68-4c6a-8a2a-1c17f3f2a5a7",
  "slug": "ak-47",
  "name": "AK-47",
  "environment": {"temperature": { "optMin_C": 22, "optMax_C": 28 },"humidity": { "optMin": 0.45, "optMax": 0.65 },"light": { "ppfdTarget": 700 }
  },
  "nutrients": {"npkCurve": {  "vegetative": { "N": 2.5, "P": 0.8, "K": 2.0 },  "flowering":  { "N": 1.3, "P": 1.2, "K": 2.5 }}
  },
  "phenology": { "seedlingDays": 10, "vegetativeDays": 28, "floweringDays": 63 },
  "lineage": { "parents": [] }
}
```

---

## 2) Devices — `/data/blueprints/devices/*.json`

### Purpose

Declares physical equipment (lights, HVAC, CO₂, dehumidifiers, fans, furniture, sensors…) with operating parameters and placement policy. **No economic fields here**.

### Schema

- `id: string (UUID v4)`
- `slug?: string`
- `name: string`
- `kind: string` — e.g., `GrowLight`, `ClimateUnit`, `Dehumidifier`, `ExhaustFan`, `CO2Injector`, `Shelf`, `Sensor`.
- `quality?: number (0–1)` — Reliability proxy.
- `complexity?: number (0–1)` — Maintenance difficulty proxy.
- `lifespanInHours?: number` — Technical lifetime horizon.
- `allowedRoomPurposes: string[]` — **Placement rule**.  Defaults:
- **GrowLight, Climate/HVAC** ⇒ `["growroom"]`- Other devices ⇒ `["*"]` (allowed anywhere) unless otherwise specified.    
- `settings: object` — Kind-specific parameters:

**GrowLight**

- `power?: number (kW)`
- `ppf_umol_s?: number` — Photon flux.
- `ppe_umol_J?: number` — Efficacy.
- `coverage_m2?: number` — Recommended coverage area.
- `dliTarget_mol_m2_day?: number` — Optional DLI target.

**Climate/HVAC (incl. AC, dehumidifier, exhaust/fan)**

- `power?: number (kW)`
- `coolingCapacity?: number (kW)`
- `moistureRemoval_Lph?: number` — Dehumidification rate.
- `airflow?: number (m³/h)`
- `targetTemperature?: number (°C)` — If used for thermostatic control.
- `targetTemperatureRange?: [number, number] (°C)` — Hysteresis; if missing and `targetTemperature` exists, default is `±1 °C`.
- `dutyCycle?: number (0–1)`

**CO2Injector**

- `injectionRate_ppmPerMin: number`
- `targetCO2_ppm: number`
- `maxSafeCO2_ppm: number`

### Example (Grow light)

```json
{
  "id": "e2e3b0af-f47e-4a2d-9c01-5cfc2a9ab0f6",
  "name": "Veg Light 01",
  "kind": "GrowLight",
  "allowedRoomPurposes": ["growroom"],
  "settings": {"power": 0.6,"ppf_umol_s": 1500,"ppe_umol_J": 2.5,"coverage_m2": 1.2
  }
}
```

---

## 3) Cultivation Methods — `/data/blueprints/cultivationMethods/*.json`

### Purpose

Defines planting density, substrate/container baseline, setup costs, and phase suitability.

### Schema

- `id: string (UUID v4)`
- `slug?: string`
- `name: string`
- `areaPerPlant: number (m²)` — Max plant count = `floor(zoneArea / areaPerPlant)`.
- `minimumSpacing?: number (m)` — Optional geometric limit.
- `laborIntensity?: number (0–1)` — Affects labor time multipliers.
- `setupCost?: number` — Currency-neutral.
- `substrate?: { type: string, costPerSquareMeter?: number }`
- `containerSpec?: { volume_L: number, costPerUnit?: number }`
- `compatibility?: { strainTags?: string[] }`
- `recommendedPhases?: string[]`
- `meta?: object`

---

## 4) Diseases — `/data/blueprints/diseases/*.json`

### Purpose

Data-driven pathogen behavior for infection/progression/damage, env & transmission risk, detection symptoms.

### Schema

- `id: string (UUID v4)`
- `slug?: string`
- `name: string`
- `kind: "Disease"`
- `pathogenType: "fungus" | "bacteria" | "virus" | "physiological"`
- `targets: string[]` — E.g., `"leaves"`, `"stems"`, `"buds"`, `"roots"`.
- `environmentalRisk?: {`
- `temperatureRange?: [number, number] (°C)`- `idealHumidityRange?: [number, number] (0–1)`- `leafWetnessRequired?: boolean`- `lowAirflowRisk?: number (0–1)`- `overwateringRisk?: number (0–1)`- `overfertilizationRisk?: number (0–1)`      `}`    
- `transmission?: { airborne?: boolean, contact?: boolean, tools?: boolean }`
- `model?: {`
- `dailyInfectionIncrement?: number` — Baseline infection growth/day (will be modulated by env/balancing).- `infectionThreshold?: number (0–1)` — Established infection point.- `degenerationRate?: number` — Symptom severity growth/day.- `recoveryRate?: number` — Passive recovery/day under good conditions.- `regenerationRate?: number` — Tissue repair/day if modeled separately.- `fatalityThreshold?: number (0–1)`      `}`    
- `detection?: { symptoms?: string[] }`

---

## 5) Pests — `/data/blueprints/pests/*.json`

### Purpose

Population models for pests, their damage mechanisms, environment preferences, and detection/monitoring hints.

### Schema

- `id: string (UUID v4)`
- `slug?: string`
- `name: string`
- `kind: "Pest"`
- `category: string` — E.g., `mites`, `sap-sucking`, `larvae`.
- `targets: string[]`
- `environmentalRisk?: { temperatureRange?: [°C,°C], humidityRange?: [0–1,0–1], lowAirflowRisk?: number, overwateringRisk?: number }`
- `populationModel?: { reproductionPerDay?: number, mortalityPerDay?: number, carryingCapacityFactor?: number }`
- `damageModel?: {`
- `photosynthesisReductionPerDay?: number (0–1)`- `rootUptakeReductionPerDay?: number (0–1)`- `budLossFractionPerDay?: number (0–1)`- `diseaseVectorRisk?: number (0–1)`- `honeydew?: boolean`      `}`    
- `detection?: { symptoms?: string[], monitoring?: string[] }`
- `controlOptions?: { cultural?: string[], biological?: string[], mechanical?: string[], chemical?: string[] }`  _(descriptive; operational details are in treatment options)_

---

## 6) Treatment Options — `/data/configs/treatment_options.json`

### Purpose

Catalog of actionable treatments; global stacking/safety/cost rules; tick-based timing fields (engine converts from human-readable inputs if present).

### Schema

- `kind: "TreatmentOptions"`
- `version?: string`
- `notes?: string`
- `global?: {`
- `stackingRules?: {`    - `maxConcurrentTreatmentsPerZone?: number`        - `mechanicalAlwaysStacks?: boolean`        - `chemicalAndBiologicalCantShareSameMoAWithin7Days?: boolean`        - `cooldownDaysDefault?: number`          `}`    - `sideEffects?: { phytotoxicityRiskKeys?: string[], beneficialsHarmRiskKeys?: string[] }`- `costModel?: {`    - `costBasis?: "perZone" | "perPlant" | "perSquareMeter"` — Default scaling base.        - `totalCostFormula?: string` — Human description; engine computes actuals.          `}`          `}`        
- `options: Array<{`
- `id: string (UUID v4)`- `name: string`- `category: "cultural" | "biological" | "chemical" | "mechanical" | "UV"`- `targets: Array<"disease" | "pest">`- `applicability?: string[]` — Growth phases where it’s allowed.- `materialsCost?: number` — Neutral cost per application; scaled by `costBasis`.- `laborMinutes?: number`- `energyPerHourKWh?: number`- `cooldownDays?: number`- `reentryIntervalTicks?: number` — Access restriction; engine can derive this from hours/days if present elsewhere.- `preHarvestIntervalTicks?: number` — PHI; same conversion rule.- `effects?: {`    - `pest?: { reproductionMultiplier?: number, mortalityMultiplier?: number, damageMultiplier?: number }`        - `disease?: { infectionMultiplier?: number, degenerationMultiplier?: number, recoveryMultiplier?: number }`          `}`    - `costBasis?: "perZone" | "perPlant" | "perSquareMeter"` — Overrides global default.- `notes?: string`      `}>`    

---

## 7) Prices — `/data/prices/*.json`

**Utilities** — `utilityPrices.json`

- `electricityCostPerKWh: number` — Default `0.30`.
- `waterCostPerM3: number` — Default `3.00`.
- `nutrientsCostPerKg: number` — Default `2.00`.

**Strains** — `strainPrices.json`

- `strainPrices: { [strainIdOrSlug: string]: {`
- `seedCost?: number` — Currency-neutral (alias for legacy `seedPrice`).- `harvestBasePricePerGram?: number` — Base sales price (alias for legacy `harvestPricePerGram`); runtime quality/market adjusters apply.      `}}`      _Keys MAY be UUID `id` or legacy slugs—engine should try UUID first, then slug fallback._    

**Devices** — `devicePrices.json`

- `devicePrices: { [deviceIdOrSlug: string]: {`
- `capitalCost?: number` — Alias for legacy `capitalExpenditure`.- `baseMaintenanceCostPerTick?: number`- `costIncreasePer1000Ticks?: number` — Aging curve scalar.      `}}`    

---

## 8) Task Definitions — `/data/configs/task_definitions.json`

**Keys**: task codes (e.g., `repair_device`, `maintain_device`, `harvest_planting`, `health_scouting`, `treat_zone`, `refill_supplies_*`).

**Values** (template):

- `priority: number` — Higher = sooner.
- `requiredRole?: string` — e.g., `Gardener`, `Technician`, `IPMSpecialist`.
- `requiredSkill?: string` — Engine’s skill taxonomy (free-text name).
- `minSkillLevel?: number` — 0..n.
- `costModel?: { basis: "perAction" | "perMinute" | "perUnit", laborMinutes?: number }`
- `description?: string` — Template with placeholders, e.g., `{deviceName}`, `{zoneName}`.

---

## 9) Structures — `/data/blueprints/structures/*.json`

- `id: string (UUID v4)`
- `slug?: string`
- `name: string`
- `area_m2: number|null` — Usable floor area.
- `height_m: number|null` — Interior height (default project standard if null).
- `fixedCostsPerTick: number` — Default `0`.
- `meta?: object`

---

## 10) Personnel Pools — `/data/personnel/*.json`

- `firstNames.json: string[]`
- `lastNames.json: string[]`
- `traits.json: Array<{ id: string, name: string, description: string, type: "positive"|"negative"|string }>`  _(HR roles/skills/wages can be separate or engine defaults.)_

---

# Weedbreed.AI — Employee System

## Overview

Employees are the heart of automation in Weedbreed.AI. They are **autonomous agents** that pick, claim, and complete work based on their **skills**, **role**, and **current state** (energy, morale). Instead of the player micromanaging every step, the simulation **generates tasks** (“Harvest plants in Zone A”, “Repair device in Zone B”), and employees choose the **highest-priority suitable task** to execute. This reduces player burden and naturally scales with company growth.

---
## 1) Candidate Generation & External Name Provider

To keep the labor market dynamic and credible, the game continuously injects new, unique candidates. Rather than relying only on a fixed local name list, the game **optionally** queries a **seedable external name provider** (e.g., an API that returns first/last names) and falls back to local data if unavailable. An free and open provider is https://randomuser.me/. For detailed information about the API, check the providers documentation.

- **Periodic refresh**  
    Once per in-game week (e.g., every **168 ticks** if 1 tick = 1 hour), refresh the candidate pool.
- **Deterministic, efficient fetch**  
    Use an endpoint that accepts `results` (e.g., 12), `inc=name` (only first/last names), and a deterministic `seed`.
    - **Seed construction**: derive `apiSeed` from the game’s original seed + current in-game week index, e.g.  
        `apiSeed = "{gameSeed}-week-{weekIndex}"`  
        This guarantees **reproducible candidates** for identical runs.
- **Privacy-aware payload**  
    Request **first/last names, age, gender and password only**; no other personal data. The age should range between `[18;65]`. For employee the age should play am altering role for random skill creation.
    A random password will be mapped as "personal" RNG seed. For the ease of use request the password with `password=number,8` as additional parameter from API. The attribute in our Employee-Object is called `personalSeed`, not `password`.
- **Offline-safe fallback**  
    If the external provider is unreachable or disabled, **fallback** to `/data/personnel/` local lists to synthesize names.
- **Profile synthesis**  
    After names are obtained, the game **generates full candidate profiles**:  
    randomized **skills**, **traits**, and a **wage** consistent with the generated profile and company difficulty/balancing rules.

---
## 2) Work as Discrete Tasks

Work is modeled as **discrete Tasks** rather than continuous processes.

- **Task generation**  
    Each tick, the **task engine** scans the world and generates a list of required tasks.  
    Examples: a broken device creates a `repair_device` task; harvest-ready plants create `harvest_plants`; sanitation needs create `clean_zone`; etc.  
    Base properties (priority, required skill/role, default labor) come from `/data/configs/task_definitions.json`.
- **Duration & scaling**  
    Each task has `durationTicks`. It can **scale** depending on its **cost basis**:
    - `perAction` — fixed duration (e.g., repair a device)
    - `perPlant` — duration × number of plants affected (e.g., harvest)
    - `perSquareMeter` — duration × area (e.g., clean a zone)
- **Progress & completion**  
    When an employee claims a task, their status becomes **Working**. Each tick spent on the task increases `progressTicks` by 1. When `progressTicks >= durationTicks`, the task completes and its **effects** are applied to the game state (device repaired, harvest added to inventory, cleanliness improved, etc.).

---
## 3) Overtime (Energy-Linked)

Overtime is directly tied to **employee energy**.

- **Trigger**  
    Employees have **energy** in the range `0..100`. Each hour (tick) of work consumes energy.  
    An employee **always finishes the current task**, even if their energy dips **below 0** during execution. Any negative energy at completion counts as **overtime**.
- **Computation**  
    At task completion, convert the **magnitude of negative energy** into **overtime hours** (ticks). Energy is then clamped/reset according to rest policy.
- **Compensation policy (player-defined)**  
    Company policy `overtimePolicy` determines how overtime is compensated:
    - **`payout`** — pay overtime immediately at **1.5× hourly wage** (or a configurable multiplier). This costs cash now but keeps availability high (after the standard rest).
    - **`timeOff`** — credit overtime hours to the employee’s **`leaveHours`** balance. In their next **OffDuty** period, they take this extra time off. This saves immediate cash but reduces near-term availability.

---

# DD Additions 

## Personnel (new or clarified fields)

- `id: string (UUID v4)` — primary key.
- `name: string` — display name (full name).
- `role: string` — e.g., `Gardener`, `Technician`, `IPMSpecialist`.
- `skills: { [skillName: string]: number }` — skill levels `0..n`.
- `traits: string[]` — e.g., `Meticulous`, `Slacker` (modulate utility/learning).
- `hourlyWage: number` — currency-neutral cost per hour.
- `energy: number` — `0..100`.
- `morale: number` — `0..100`.
- `status: "Idle" | "Working" | "Resting" | "OffDuty"`.
- `leaveHours: number` — accrued time-off hours (from overtime when `overtimePolicy = "timeOff"`).
- `certifications?: string[]` — e.g., pesticide handling.
- `assignedStructureId?: string (UUID)` — optional current workplace scope.
## Hiring / Candidate Source

- `hiring.candidateRefreshIntervalTicks: number` — e.g., `168`.
- `hiring.externalNameProvider.enabled: boolean` — on/off.
- `hiring.externalNameProvider.results: number` — e.g., `12`.
- `hiring.externalNameProvider.includeFields: string[]` — e.g., `["name"]`.
- `hiring.externalNameProvider.apiSeedFormat: string` — e.g., `"{gameSeed}-week-{weekIndex}"`.
- `hiring.fallback.useLocalNames: boolean` — default `true`.
## Tasks (augment existing section)

- `task.id: string (UUID v4)`
- `task.kind: string` — task code (must exist in `task_definitions.json`).
- `task.priority: number`
- `task.requiredRole?: string`
- `task.requiredSkills?: { [skillName: string]: number }`
- `task.location: { structureId: string, roomId?: string, zoneId?: string }`
- `task.toolsRequired?: string[]`
- `task.safetyConstraints?: string[]` — e.g., “no entry before `reentryIntervalTicks` expires”.
- `task.costBasis: "perAction" | "perPlant" | "perSquareMeter"`
- `task.quantity?: number` — plants count / area in m² / 1 for perAction.
- `task.durationTicks: number` — computed from template × scaling.
- `task.progressTicks: number` — 0..durationTicks.
- `task.splitable?: boolean` — may be batched across agents.
- `task.blocking?: boolean` — requires exclusive access.
- `task.deadlineTick?: number` — optional.
## Overtime & Policy

- `companyPolicies.overtimePolicy: "payout" | "timeOff"`
- `companyPolicies.overtimeMultiplier: number` — default `1.5`.
- `companyPolicies.maxShiftHours?: number` — optional soft cap before mandatory rest.
- `companyPolicies.restRecoveryPerTick?: number` — energy restored per tick while Resting/OffDuty.

---

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

Commands are **idempotent per tick** where reasonably possible and validate against DD constraints. Common categories are below.

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

- `rentStructure(structureId: UUID)` — validates availability; applies CapEx/Fixed cost rules.
- `createRoom(structureId, { name, purpose, area_m2, height_m? })`
- `updateRoom(roomId, patch)` / `deleteRoom(roomId)`
- `createZone(roomId, { name, area_m2, methodId, targetCounts? })`
- `updateZone(zoneId, patch)` / `deleteZone(zoneId)`
- Guards: areas must respect geometry; room/zone purposes validated.
### 4.4 Devices

- `installDevice(zoneId | roomId, deviceId, settings?)` — checks **`allowedRoomPurposes`**.
- `updateDevice(instanceId, settingsPatch)`
- `moveDevice(instanceId, targetZoneId)` — re‑validate purpose.
- `removeDevice(instanceId)`
### 4.5 Plants & Plantings

- `addPlanting(zoneId, { strainId, count, startTick? })`
- `cullPlanting(plantingId, count?)`
- `harvestPlanting(plantingId)` — creates inventory lots, emits events.
- `applyIrrigation(zoneId, liters)` / `applyFertilizer(zoneId, { N,P,K } in g)` — optional manual overrides.
### 4.6 Health (Pests/Diseases & Treatments)

- `scheduleScouting(zoneId)` — generates scouting tasks.
- `applyTreatment(zoneId, treatmentOptionId)` — enforces **`reentryIntervalTicks`**, **`preHarvestIntervalTicks`**, cooldowns, and certifications.
- `quarantineZone(zoneId, enabled)` — affects spread graph & safety constraints.
### 4.7 Personnel & Tasks

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

---

# Weedbreed.AI — Simulation Philosophy Deep Dive

This section details the core design philosophies that underpin each major subsystem of the simulation. It focuses on the "why" behind the mechanics, providing insight into the intended player experience and architectural goals.

## 1. Time & Simulation Loop: Stability and Fairness
-   **Philosophy**: The game world must be predictable and fair, progressing at a constant rate regardless of the user's hardware. A simulation's integrity depends on its timekeeping.
-   **Implementation Rationale**: It is important to decouple the simulation's "tick rate" from the UI's "frame rate". A tick represents a fixed unit of game time (1 hour), ensuring that a player on a 144Hz monitor experiences the same game progression as a player on a 60Hz monitor. The "catch-up" mechanism, which limits ticks per frame, embodies a user-centric philosophy: **responsiveness is more important than perfect simulation.** The game will never freeze the UI to catch up; it will instead fast-forward gracefully, maintaining a fluid player experience.
- **Example**: In a browser-based tech-stack we probably would use a `requestAnimationFrame` loop with a time accumulator instead of `setInterval`.

## 2. Environmental Model: Emergent Complexity from Simple Rules
-   **Philosophy**: A believable and engaging environment should arise from the interaction of simple, understandable rules, rather than a complex, monolithic formula. The goal is emergent complexity.
-   **Implementation Rationale**: The delta-based system is the cornerstone of this philosophy. Each object in a zone—a lamp, a plant, the outside air—contributes a small, simple "delta" (a positive or negative change) to the environment each tick. A lamp adds heat; an AC unit removes it. The complex, dynamic behavior of the zone's climate is the *emergent result* of summing these simple deltas. This makes the system transparent to the player ("My room is hot because I have too many lamps") and highly extensible for developers (adding a new device just requires defining its delta).

## 3. Plant Growth Model: The Core Feedback Loop
-   **Philosophy**: The central challenge and reward of the game should be the player's mastery of the cultivation process. The relationship between player action, environmental quality, and plant outcome must be direct, transparent, and meaningful.
-   **Implementation Rationale**: The `Stress -> Health -> Growth` cascade is the mechanical expression of this philosophy. It's a clear feedback loop:
    1.  **Input**: The player manages the environment.
    2.  **Problem**: The environment's deviation from the plant's ideal conditions creates `Stress`.
    3.  **State**: `Stress` negatively impacts the plant's `Health`.
    4.  **Output**: `Health` directly multiplies the plant's potential `Growth`.
    This design turns cultivation into an optimization puzzle, not a black box. The player is empowered to diagnose problems (high stress) and see a direct correlation between their solutions and the rewards (better health and yield).

## 4. Personnel & AI: Autonomous Agents and Indirect Control
-   **Philosophy**: The player is a manager, not a micromanager. The gameplay should focus on high-level strategic decisions, with the simulation's agents (employees) intelligently handling the low-level execution. This is a game of indirect control.
-   **Implementation Rationale**: The Task & AI system embodies this. The `taskEngine` acts like a "manager" that observes the state of the world and creates a "to-do list" (the task queue). The employees are autonomous agents who "pull" tasks from this list based on their role and skills. The player doesn't tell a specific employee to harvest a plant; they ensure they have hired enough skilled gardeners, and the system handles the rest. This shifts the player's focus from tedious clicking to strategic questions like "Is my workforce balanced?" and "Do I have enough breakrooms to keep my staff energized?".

## 5. Economic Model: Constant Pressure and Rewarding Mastery
-   **Philosophy**: A compelling tycoon game needs both persistent challenges and strong incentives for skillful play. The economy is designed to create a gentle but constant financial pressure, forcing players to be efficient, while simultaneously offering outsized rewards for true mastery of the game's systems.
-   **Implementation Rationale**:
    -   **Constant Pressure**: Operating costs (rent, salaries, power) are calculated *per tick*. This constant drain prevents a passive "sit and wait" strategy and forces the player to build an operation that is consistently profitable.
    -   **Rewarding Mastery**: The price function for harvested goods is deliberately non-linear. A harvest of average quality might sell for the base price, but a high-quality harvest—achieved only by mastering the environmental and plant health systems—receives an exponential price bonus. This creates a powerful incentive to go beyond "good enough" and strive for perfection.

## 6. Genetics & Breeding: Player-Driven Discovery
-   **Philosophy**: The long-term replayability and "end-game" of a simulation often lie in creative expression and player-driven goals. The breeding system is designed to be this creative outlet.
-   **Implementation Rationale**: The system of averaging parental traits with a slight, deterministic mutation provides a perfect balance of predictability and discovery. Players can strategically combine parents to aim for a specific outcome (e.g., higher THC), but the random mutation factor means there's always a chance for a surprisingly good (or bad) result. This encourages experimentation and gives the player a powerful tool to create their own "ultimate strain," a goal that is defined and pursued entirely by them. It transforms the player from a consumer of pre-defined strains into a creator of new ones.

---

# Weedbreed.AI — Simulation Engine Deep Dive

This document details the engine’s core calculations, tick ordering, and control strategies. It is **stack-neutral** and uses **Data Dictionary** terminology.

## Timebase & Core Loop (fixed-step, scheduler-agnostic)

### Goals

- **Stability** (no drift), **determinism** (seeded RNG), **decoupled rendering**.
- **Catch-up** without UI stalls; **atomic** state commits per tick.
### Process

1. **Wall-time accumulation**: keep `accumulatedMs += now - lastNow`.
2. **Tick threshold**: while `accumulatedMs ≥ tickIntervalMs / gameSpeed`, do:
    - Run **one full tick** (see _Environment_, _Plant_, _Health_, and _Tasks & Agentic Employees_ below).
    - `accumulatedMs -= tickIntervalMs / gameSpeed`.
    - Cap iterations with `maxTicksPerFrame` to prevent long catch-ups.
3. **Snapshot & events**: publish a read-only snapshot and batched events after each committed tick.

**Notes**
- `gameSpeed` > 0 scales progression without changing equations.
- In headless runtimes, replace “frame” with the host scheduler; the contract is the same.
- Determinism: **all stochastic draws** (breeding variance, failure chances, etc.) come from seeded RNG streams.

---
## Environment Model (per Zone; well-mixed, delta-based)

Each **Zone** maintains `temperature_C`, `humidity` (0–1), `co2_ppm`, and optionally canopy **PPFD**. The engine aggregates **deltas**; devices contribute their own changes rather than setting absolutes.

### Tick Order (environment phase)

1. **Start** from last values: `T`, `RH`, `CO2`, (optional `PPFD`).
2. **Device deltas**
    - **GrowLight**
        - Heat gain ∝ `power (kW)` and inefficiency → `+ΔT`.
        - Light: map `ppf_umol_s` over `coverage_m2` to canopy PPFD.
        - Optional `dliTarget_mol_m2_day` → duty suggestions (advisory).
    - **Climate/HVAC**
        - Cooling/heating: proportional approach to `targetTemperature` within `targetTemperatureRange`.
        - **Dehumidifier**: `moistureRemoval_Lph` ⇒ `−ΔRH` via moisture balance.
        - **Exhaust/Fan**: boosts mixing/exchange factor (see normalization).
    - **CO2Injector**: move `CO2` toward `targetCO2_ppm`, capped by `maxSafeCO2_ppm`.
3. **Plant deltas** (coarse canopy physiology)
    - **Transpiration**: `+ΔRH` (scaled by PPFD, temperature, phenological phase).
    - **Photosynthesis**: `−ΔCO2` (scaled by PPFD and saturation curve).
4. **Normalization toward ambient**
    - Exponential pull: `Δ = k_mix * (ambient − current)`.
    - `k_mix` scales with **airflow** (fans/exhaust) and enclosure leakage; higher airflow → faster return to ambient.
5. **Clamp & commit**
    - Clamp **RH to [0,1]**, safety-clamp `CO2 ≤ maxSafeCO2_ppm`, bound `T` to reasonable limits.
6. **Events**
    - Emit anomalies (e.g., `env.safetyExceeded`) for downstream policy (alarms, auto-shutdowns).

**Why delta-based?** Extensible and composable: new device types add a delta without changing the solver.

---
## Plant Growth, Stress, Health (per Planting/Plant)

Plants respond to environment and resources; **stress** reduces **health**; **health** and resources limit **growth** and yield.

### Inputs from DD

- Strain `environment.*` (optima), `nutrients.npkCurve` **(g/m²/day)** for `vegetative` and `flowering`.
- Phenology (days per stage), optional photoperiod hints (`vegHoursLight`, `flowerHoursLight`).
- Strain `generalResilience`, optional `resistanceTraits`.
- **Breeding variance**: `noise (0–1)` affects offspring trait sampling (breeding handled elsewhere).

### Tick Order (plant phase)

1. **Phenology update**  
    Advance age; evaluate transitions (seedling → vegetative → flowering) by elapsed days and photoperiod policy; emit `plant.stageChanged`.
2. **Resource requirement**  
    Convert **NPK (g/m²/day)** → **per-tick, per-plant**:
    `req_phase = curve[phase]          // g/m²/day`
	`req_tick_plant = req_phase * (zoneArea / plantCount) * (tickHours / 24)`
	Water demand analogously from `water.dailyUsePerM2_L`.
3. **Stress computation (0–1)**  
    For each driver D ∈ {T, RH/VPD, CO₂, Light, Water, N, P, K} compute a **distance function** from strain optima (e.g., quadratic or Gaussian penalty).  
    Combine: `stress_raw = Σ w_D * penalty_D`.  
    Resilience mitigation: `stress = clamp01(stress_raw * (1 − generalResilience))`.
4. **Health update (0–1)**  
    If `stress > θ_stress`: `health -= α * stress`; otherwise passive recovery `health += β_recovery`.  
    Additional penalties from **active diseases/pests** and **resource deficits**.
5. **Potential growth**
    - **Light response** (rectangular hyperbola/saturation over PPFD), **temperature response** (Gaussian), **CO₂ factor** (half-saturation).
    - Apply phase caps and **LUE** to get `potentialGrowth_g_dry_per_tick`.
    - Apply health & stress: `actualGrowth = potentialGrowth * health * (1 − γ * stress)`.
    - Accrue `biomassDry_g`; enforce `maxBiomassDry_g` and phase harvest index.
6. **Quality & harvest window**  
    Accumulate quality within `harvest.windowDays`; outside this window, quality decays faster.

**Outputs**: plant metrics (biomass, health, stress), resource consumption, warnings.

---
## Health: Pests & Diseases (detect → progress → spread → treat)

Integrates **data-driven** pests/diseases with **operational** treatments.
### Tick Order (health phase)

1. **Detect**  
    Visibility rises with time/conditions; **scouting tasks** improve detection; traps add passive checks.  
    Emit `pest.detected` / `disease.confirmed` on threshold.
2. **Progress**  
    Advance **severity/infection** using blueprint daily increments (scaled to ticks) × environmental risk × phase multipliers.  
    Apply **damage** to plant processes (growth, transpiration, mortality risk) per blueprint.
   3. **Spread**  
    Stochastic spread within zone and to neighbors; modulated by **airflow (mixing)**, **sanitation**, and **tool transmission**.  
    Quarantine/locks reduce adjacency graph edges.
4. **Treat**  
    Apply active **treatments** from `configs/treatment_options.json`: efficacy multipliers to infection/degeneration/recovery.  
    Enforce **cooldowns**, **reentryIntervalTicks**, **preHarvestIntervalTicks**; set **safety constraints** that block task claiming.
   5. **Emit events**  
    `health.spread`, `treatment.applied`, `outbreak.contained`, `treatment.failed`.

---
## Tasks & Agentic Employees (utility-based; overtime-aware)

### Task generation (per tick)

Scan world state → create **Task** objects (see DD §Tasks) from `task_definitions.json`.  
Compute `durationTicks` via `costBasis`:
- `perAction` fixed
- `perPlant × plantCount`
- `perSquareMeter × area`
### Claiming (pull model with utility)

**Idle** employees compute a **utility** for visible tasks:  
`U = w1*priority + w2*skillMatch + w3*roleAffinity + w4*urgency − w5*distance − w6*fatigue + w7*morale + w8*toolAvailability ± traitMods`  
Highest utility claims; use **backoff** to avoid thrash; **aging** to prevent starvation.  
Honor **safety constraints** (e.g., no entry before `reentryIntervalTicks`).
### Execution & completion

While Working: increment `progressTicks` each tick; when `progressTicks ≥ durationTicks`, resolve effects (repair, harvest, clean…), emit `task.completed`.
### Overtime (energy-linked)

Energy `0..100` decreases per working tick. Employees **finish the current task** even if **energy < 0**.  
At completion: convert negative energy to **overtime hours** (ticks).  
**Company policy**:

- `payout`: pay `overtimeMultiplier × hourlyWage` immediately; employee rests normally.
- `timeOff`: credit overtime to `leaveHours`; next OffDuty extends accordingly.  
    Emit `hr.overtimeAccrued`, `hr.overtimePaid` / `hr.timeOffScheduled`.

---
## Economics (currency-neutral)

**Event-based** and **per-tick** accounting; figures are currency-neutral (UI chooses symbol).
- **CapEx**: device purchases (`capitalCost`), structure setup; log & deduct immediately.
- **OpEx (per tick)**:
    - **Maintenance**: `baseMaintenanceCostPerTick` (+ aging via `costIncreasePer1000Ticks`).
    - **Energy**: sum `(device.power_kW × tickHours × electricityCostPerKWh)` for active devices.
    - **Water/Nutrients**: from zone demand using **g/m²/day** curves → per-tick spend via `waterCostPerM3`, `nutrientsCostPerKg`.
    - **Rent**: structure fixed costs or `area_m2 × rentalRate`, normalized to ticks.
    - **Labor**: daily sweep (every 24 ticks) or continuous accrual; overtime per policy.
- **Revenue**: `harvestBasePricePerGram × quality × market modifiers` on sales.
- **Reports**: emit `finance.tick` summaries; categorize by device/structure/zone.

---
## Persistence, Validation, and Hot-Reload

- **Persistence**: serialize full authoritative state + RNG streams; loading restores determinism.
- **Validation** on data load & hot-reload:
    - Types/ranges; **IDs are UUID** (`id`) in all blueprints; cross-refs by `id`.
    - Strain **`lineage.parents`** must be UUIDs; empty/missing ⇒ **ur-plant**.
    - Devices must honor **`allowedRoomPurposes`**.
    - Treatment options must carry **`reentryIntervalTicks` / `preHarvestIntervalTicks`** (or convert from human-readable inputs).
- **Hot-reload**: validate → stage → swap at a tick boundary; emit `data.reloaded` with a diff summary.

---
## Determinism & RNG Streams

- A **global seed** initializes named streams: `"breeding"`, `"environment.noise"`, `"device.failure"`, `"task.random"`, etc.
- **Breeding variance** uses strain `noise` to set max deviation envelopes around inherited means; clamp to biological bounds.
- Store stream positions in snapshots to guarantee **exact replay**.

---
## Error Handling & Safety

- **Hard clamps**: RH `[0,1]`, `CO2 ≤ maxSafeCO2_ppm`, reasonable temperature bounds, non-negative inventories.
- **Graceful degradation**: if hot-reload data fails, keep last good set and emit `data.reloadFailed`.
- **Task invalidation**: if a referenced object disappears (sold device, culled planting), cancel with `task.abandoned`.

---
## Future Enhancements (compatible with current contracts)

- **Event-driven task creation**: replace polling with device/plant events (e.g., `device.maintenanceRequired`) to cut scan cost.
- **Multi-agent tasking**: coordinated work gangs for large harvests; pre-emption rules.
- **Finer environment**: optional cell/CFD hotspot model; keep well-mixed default.
- **Market dynamics**: demand-driven price curves and contracts.
- **Control policies**: PID / model-predictive controllers behind the same “setpoint → deltas” interface.

---

# Weedbreed.AI — UI Architecture

_A tech‑agnostic overview of the UI and its architecture, aligned with the System Facade, Data Dictionary (DD), and Technical Design Document (TDD). The UI is intentionally logic‑free: it renders **snapshots** and turns user gestures into **facade commands**. All entity references use `id` (UUID v4)._

---
## 1) Core Philosophy — “Dumb” UI, Smart Engine

**Separation of concerns.** The UI contains **no game logic**. It:
- renders a **read‑only snapshot** of the authoritative state; and
- converts user intent into **facade commands** (see System Facade).

**Wrong (tight coupling):** a button computes harvest revenue in the UI.

**Right (loose coupling):** a button calls `facade.harvestPlanting(plantingId)` (or another intent). The engine computes results and emits events.

**Single bridge.** All interactions go through the **System Facade**. The UI never mutates deep objects directly and never dereferences beyond documented read models.

---
## 2) Unidirectional Dataflow (Render → Act → Apply → Notify → Re‑render)

1. **Render (read)**  
    The UI receives a **read‑only Snapshot** of the Game State. Components render from snapshot fields (e.g., `snapshot.company.capital`).
2. **User Action (intent)**  
    A user presses “Add Room”, “Install Device”, “Hire”, etc.
3. **Command (through the Facade)**  
    Event handlers call a **facade intent**, e.g.:
    - `facade.createRoom(structureId, { name, purpose, area_m2, height_m })`
    - `facade.installDevice(targetZoneId, deviceId, settings)`
    - `facade.addPlanting(zoneId, { strainId, count })`
    - `facade.applyTreatment(zoneId, optionId)`  
        All parameters use **UUID `id`** for cross‑refs. The UI does not compute business rules.
4. **Logic (engine)**  
    The Facade validates, routes, and the engine applies rules: geometry checks, `allowedRoomPurposes`, treatment **reentryIntervalTicks**/PHI, costs, task generation, etc.
5. **State Update (commit)**  
    The engine commits a new authoritative state. A **fresh snapshot** is produced.
6. **Notification (events)**  
    The Facade emits batched events (`sim.tickCompleted`, `world.zoneCreated`, `task.created`, `plant.harvested`, …) that reference entity UUIDs only.
7. **Re‑render (subscribe)**  
    The UI’s subscription receives the new snapshot and re‑renders affected components.

This cycle enforces **one‑way dataflow**, making behavior predictable and debuggable.

---
## 3) Technical Building Blocks (UI layer)

> The names below are illustrative. Any framework can be used; a React mapping is provided where helpful.

### 3.1 Bridge Hook (UI ↔ Facade)

**Purpose.** The single gateway for the UI to:
- subscribe to **snapshots** and **events**; and
- expose stable **command callbacks**.

**Behavior.** On mount it subscribes to Facade events (`sim.ready`, `sim.tickCompleted`, `sim.paused`, `sim.hotReloaded`). On event, it swaps in the latest **Snapshot**. It memoizes command functions (e.g., `createRoom`, `installDevice`, `addPlanting`) so children don’t re‑render unnecessarily.
### 3.2 Application Orchestrator

**Purpose.** Root composition that wires providers and high‑level views.  
**Behavior.**
- Requests the initial snapshot (or waits for `sim.ready`).
- Provides **navigation state**, **modal state**, and **theme** to the tree.
- Passes **snapshot** + **command callbacks** down as props/context.
### 3.3 Navigation Manager

**Purpose.** Centralized routing between top‑level views and selected entities.  
**State.** `{ currentView, selectedStructureId?, selectedRoomId?, selectedZoneId? }`.  
**API.** `goTo(view, params)`, `selectEntity({ structureId?, roomId?, zoneId? })`, `back()`, `home()`.
### 3.4 Modal Manager (Input Workflows)

**Purpose.** Unified control of dialogs/wizards (rent structure, add room/zone, install device, hire, treatments).  
**Behavior.** Maintains `{ visibleModal, formState }`. When opening a modal, it **may pause** the sim for clarity; on close, it optionally **resumes** if it was running.

### 3.5 Views vs. Components

- **Views**: page‑scale screens (e.g., `FinancesView`, `PersonnelView`, `ZoneDetail`, `StructuresOverview`), composed of many components, consume snapshots & callbacks.
- **Components**: reusable building blocks (e.g., cards, tables, charts, `SkillBar`, `DeviceList`, `TreatmentPlanner`).
### 3.6 Styling & Theming

- **Design tokens** (CSS variables): colors, spacing, typography under `:root` for quick theme changes.
- **Naming**: BEM‑like or utility‑first—consistent, collision‑free, accessible.
- **Accessibility**: color contrast, keyboard nav, ARIA roles for all interactive elements.

---
## 4) Read Models & Identity in the UI

- The UI reads only what it needs: **derived/projection selectors** (e.g., list of zones with current PPFD/CO₂, active tasks per structure, cost summaries).
- All entity references are **`id` (UUID v4)**. The UI may display `name`/`slug`, but never uses them for joins.
- **Lineage** is displayed by resolving `strain.lineage.parents[]` (UUIDs) to names through snapshot lookups.

---
## 5) Command Usage Patterns (UI)

**World building**
- Add room → `createRoom(structureId, { name, purpose, area_m2, height_m })`
- Add zone → `createZone(roomId, { name, area_m2, methodId })`
- Install device → `installDevice(targetId, deviceId, settings)` (Facade rejects if `allowedRoomPurposes` violate.)

**Cultivation**
- Start planting → `addPlanting(zoneId, { strainId, count })`
- Harvest → `harvestPlanting(plantingId)`
- Apply treatment → `applyTreatment(zoneId, optionId)` (Enforces **reentryIntervalTicks**/PHI.)

**Personnel & tasks**
- Refresh candidates → `refreshCandidates()` (seeded, with offline fallback)
- Hire/fire → `hire(candidateId, role, wage?)` / `fire(employeeId)`
- Overtime policy → `setOvertimePolicy({ policy, multiplier? })`

**Finance**
- Sell lots → `sellInventory(lotId, grams)`
- Adjust utilities → `setUtilityPrices({ electricityCostPerKWh, waterCostPerM3, nutrientsCostPerKg })`

All commands return `{ ok, warnings?, errors? }`; UI displays inline validation/notifications.

---
## 6) Event Consumption

UI subscribes to Facade events and reacts via toasts, banners, and local updates:
- **Simulation**: `sim.tickCompleted`, `sim.paused/resumed`, `sim.hotReloaded/reloadFailed`.
- **World**: `world.structureRented`, `world.roomCreated`, `world.zoneCreated`, `world.deviceInstalled`.
- **Plants/Health**: `plant.stageChanged`, `plant.harvested`, `pest.detected`, `treatment.applied`.
- **HR/Tasks**: `task.created/claimed/completed`, `hr.hired/fired`, `hr.overtimeAccrued`.
- **Finance**: `finance.capex/opex`, `finance.saleCompleted`.

Event payloads contain minimal fields + UUIDs; the UI **looks up details** in the snapshot.

---
## 7) Performance & Robustness

- **Memoized selectors** for derived views (e.g., KPIs).
- **Virtualized lists** for large entity sets (zones, tasks, employees).
- **Incremental re‑render**: keep command callbacks stable; slice snapshots by interest (e.g., per view) to limit diff surface.
- **Error surfaces**: show validation errors from Facade; never try to "fix" state client‑side.

---
## 8) Anti‑Patterns (explicitly disallowed)

- Computing business logic in the UI (e.g., pricing, growth, environment deltas).
- Writing to deep state objects directly (must go through the Facade).
- Using non‑UUID keys to correlate entities.
- Emitting large object graphs in events; always fetch via snapshot.

---
## 9) Optional React Mapping (for teams using React)

- **Bridge Hook** ≈ `useGameState()` that returns `{ snapshot, events, actions }` (memoized `useCallback`s wrapping Facade commands).
- **App Orchestrator** ≈ `App` component wiring providers (theme, router, modals) and placing Views.
- **Navigation** ≈ `useViewManager()` for `{ currentView, selected*Id }`.
- **Modals** ≈ `useModals()` with pause/resume behavior when opening/closing.
- **Styling** ≈ `index.css` with tokens under `:root`; BEM or utility classes.

_This mapping is optional; the architectural rules remain the same regardless of framework._

---

# Weedbreed.AI — UI Elements
If Icons are used the Google Material Icon name is shown in brackets like `... icon (search) ...`

## 1. Start Screen
This is the first screen a new user sees. It is a simple, centered layout.
__Title__: A large, prominent title reading "Weedbreed.AI - Reboot".
__Subtitle__: A smaller line of text below the title: "Your AI-powered cannabis cultivation simulator."
__Action Buttons__: A row of three distinct buttons:
- A primary "New Game" button.
- A secondary "Load Game" button.
- A tertiary "Import Game" button.

## 2. Main Game Interface
Once a game is started or loaded, the main interface appears. It consists of a persistent header (the Dashboard) and a main content area that changes based on user navigation.
### 2.1. The Dashboard (Persistent Header)
This bar is always visible at the top of the screen during gameplay.

*Left Side - Key Metrics:*
__Capital__: Displays the player's current money in a standard currency format (e.g., "$1,000,000.00").
__Cumulative Yield__: Shows the total weight of all harvested product in grams (e.g., "542.10g").
__Game Time__: A dynamic display showing the in-game date and time (e.g., "Y1, D32, 14:00"). It is accompanied by a progress circle that fills up over one in-game hour, providing a visual cue for the passage of time.

*Right Side - Controls & Navigation:*
__Simulation Control:__
- A circular Play/Pause button. It shows a "play" icon (play_circle) when the game is paused and a "pause" icon (pause_circle) when it's running.
- A Game Speed control panel with buttons for "0.5x", "1x", "10x", "25x", "50x", and "100x" speeds. The currently selected speed is highlighted.
- __View Navigation__:
   - A circular button with a graph icon (monitoring) to switch to the Finances view.
   - A circular button with a people icon (groups) to switch to the Personnel view.
Menus & Alerts:
   - A circular button with a notification bell icon (notifications) for Alerts. A small red circle with a number appears on it if there are unread alerts.
   - A circular button with a settings cog icon (settings) for the Game Menu.

### 2.2. Navigation Bar (Breadcrumbs)
This bar appears below the Dashboard whenever the player navigates deeper than the main structure list.
It shows a clickable path of the player's current location, for example: Structures / Small Warehouse #1 / Grow Room 1.
A back-arrow button (←) is present to go up one level in the hierarchy.
## 3. Main Content Views
This is the largest part of the screen, displaying the core game information.
### 3.1. Structures List (Default View)
__Header__: A title reading "Your Structures" and a button to "+ Rent Structure".
__Content__: A grid of cards, where each card represents a building the player has rented. Each card displays:
- The structure's name.
- Its total area in square meters.
- The number of rooms inside.
- A summary of plants (e.g., "Plants: 50/100 (Flowering - 75%)").
The total expected yield from all plants inside.
### 3.2. Structure Detail View
__Header__: The name of the structure, followed by icons to Rename (edit) and Delete (delete). It also shows the used vs. available area and a button to "+ Add Room".
__Content__: A grid of cards, where each card represents a room within the structure.    Each card displays:
- The room's name, with icons to Rename (edit), Duplicate (content_copy), and Delete (delete).
- Its area, purpose (e.g., "Grow Room"), and number of zones.
- A plant and yield summary if applicable.
### 3.3. Room Detail View
__Header__: The room's name and its purpose shown as a badge (e.g., [LABORATORY]), with icons to Rename (edit) and Delete (delete). It also shows the used vs. available area.
__Content__:
- For Grow Rooms: A "Zones" sub-header and a button to "+ Add Zone". Below is a grid of cards, one for each cultivation zone. Each card shows the zone's name, area, cultivation method, and a plant/yield summary.
- For Laboratories: A "Breeding Station" sub-header and a button to "+ Breed New Strain". Below is a grid of cards, each representing a custom-bred strain with its key genetic traits.
### 3.4. Zone Detail View
This is the most detailed management screen, laid out in two columns.
__Header__: The zone's name, flanked by left and right arrow icons (arrow_back_ios, arrow_forward_ios) to cycle through other zones in the same room. It has icons to Rename (edit) and Delete (delete).

*Left Column (Information Panels):*
__General Info__: A card showing the zone's area, cultivation method, and plant count vs. capacity.
__Supplies__: A card showing current Water and Nutrients levels, daily consumption rates, and buttons to add more of each.
__Lighting__: A card displaying the light cycle (e.g., "18h / 6h"), lighting coverage, average light intensity (PPFD), and total daily light (DLI).
Environment & Climate: A card showing the current Temperature, Relative Humidity, and CO₂ levels, along with sufficiency ratings for Airflow, Dehumidification, and CO₂ injection.

*Right Column (Management Panels):*
__Plantings__: A list of all plant groups in the zone. Each group is expandable to show individual plants with their health and progress. It has a button to "+ Plant Strain" and another to "Harvest All" (content_cut).
__Planting Plan__: A panel to configure automation. It shows the planned strain and quantity for auto-replanting, an "Auto-Replant" toggle switch, and buttons to Edit (edit) or Delete (delete) the plan.
__Devices__: A list of all installed device groups. Each group has a status light (on/off/broken), its name, and a count. Groups are expandable to show individual devices. It has buttons to adjust group settings (tune), edit the light cycle (schedule), and a main button to "+ Device".
### 3.5. Finances View
__Header__: "Financial Summary".
__Content__: A series of panels with tables and summary cards:
__Summary Cards__: Large displays for Net Profit/Loss, Total Revenue, Harvest Revenue, Cumulative Yield, and Total Expenses.
__Breakdown Tables__: Detailed tables for Revenue and Expenses, showing the total and average-per-day amount for each category (e.g., Rent, Salaries, Harvests).
### 3.6. Personnel View
__Tabs__: Two main tabs: "Your Staff" and "Job Market".

*Your Staff Tab:*
Displays all hired employees as cards, grouped by the structure they work in.
Each employee card shows their name, salary, a dropdown to set their role, status bars for Energy and Morale, their current task, a list of skills with progress bars, and their personality traits. An icon is available to Fire (person_remove) them.
A "Company Policies" section provides a toggle switch to set the company's overtime policy (Payout vs. Time Off).

*Job Market Tab:*
A dropdown menu to filter available candidates by role.
A grid of candidate cards, identical in layout to the employee cards but with a "Hire" button at the bottom. The content of the grid can be filtered by role of the candidates.
## 4. Modals (Pop-ups)
*Important rule for modals:* If a modal is shown the simulation must be paused. After the modal is closed the simulation must be resumed (if the simulation ran before modal activation).

Modals appear as overlays on top of the main interface for specific actions.
Creation Modals (Rent, Add Room/Zone, Install Device, etc.): These present forms with input fields, dropdowns, and sliders to configure the new item, often showing a cost and a confirmation button.

Management Modals (Rename, Delete, Edit Settings): These are simpler forms for changing a name, confirming a deletion, or adjusting settings like target temperature with a slider.

Game Lifecycle Modals (Save, Load, Reset): These provide an input to name a save file, a list of existing saves to load or delete, or a final confirmation to reset the game.

HR Modals (Hire, Negotiate Salary): The hire modal asks where to assign the employee. The salary negotiation modal presents the employee's request and gives the player options to accept, decline, or offer a one-time bonus.

---

# Weedbreed.AI — UI Interaction Spec

_A comprehensive, façade‑aligned description of user interactions, views, modals, and components. Tech‑agnostic by contract; React names below are **illustrative** only. All mutations go through the **System Facade**; all references use **`id` (UUID v4)**; economics are **currency‑neutral**; data and policies follow the **DD/TDD**._

---
## 1) Overview of Implemented User Interactions

The interface is hierarchical and supports a strategic (macro) and operational (micro) loop. The UI renders **read‑only snapshots** and issues **facade commands**; it contains **no game logic**.

### A. Game Lifecycle & Setup

- **Start a Game**  
    From _StartScreen_, users can:
    - **New Game**: provide company name and optional seed → `facade.newGame({ name, seed? })`.
    - **Load Game**: select a prior snapshot → `facade.load(snapshot)`.
    - **Import Game**: load from a JSON snapshot → `facade.importState(json)`.
- **Saving/Loading**  
    At any time via global menu:
    - **Save** → `facade.save()` (named entry in client storage) and optional `facade.exportState()` for a portable JSON.
    - **Load/Delete Slot** → `facade.load(snapshot)` / remove stored entry (client concern).
- **Reset**  
    Clear current run and stored entries; upon confirmation start fresh via `newGame`.

### B. Infrastructure Management (Macro Loop)

- **Rent Structures**  
    From _Structures_ view: `facade.rentStructure(structureId)`; façade validates availability and applies fixed costs.
- **Drill‑Down Navigation**  
    Structure → Rooms → Zones; breadcrumb navigation updates selected `{ structureId, roomId, zoneId }`.
- **Create & Manage Rooms/Zones**
    - Room: `facade.createRoom(structureId, { name, purpose, area_m2, height_m? })` (purpose validated).
    - Zone: `facade.createZone(roomId, { name, area_m2, methodId })`.
    - Rename/Delete via generic modals → `update*`/`delete*` intents.
- **Duplicate Room/Zone**  
    One‑click duplication creates a copy of geometry and zone configuration; required devices are purchased per price maps and **installed only if `allowedRoomPurposes`** permit. Costs are currency‑neutral.
### C. Cultivation & Zone Management (Micro Loop)

- **Equip Zones**  
    In _ZoneDetail_ users install devices and buy supplies:
    - Devices → `facade.installDevice(targetId, deviceId, settings?)` (placement checks against `allowedRoomPurposes`).
    - Supplies → `facade.applyIrrigation(zoneId, liters)` / fertilizer by grams `{ N,P,K }` (optional manual overrides in addition to automation).
    - **Sufficiency Preview** shows estimated PPFD/DLI or climate coverage from device specs (`ppf_umol_s`, `coverage_m2`, airflow) vs. strain `ppfdTarget` and zone area.
- **Planting**  
    Select strain and quantity → `facade.addPlanting(zoneId, { strainId, count })`. UI warns if exceeding capacity from cultivation method (`areaPerPlant`) or if method/strain hints conflict (qualitative `environmentalPreferences`).
- **Environment Control**  
    Batch‑edit device groups: e.g., set `targetTemperature` (with implicit `targetTemperatureRange` hysteresis), or change lighting cycle for the zone. Commands route through `updateDevice` or zone policy intents.
- **Monitoring**  
    Real‑time panels show `temperature_C`, `humidity` (0–1), `co2_ppm`, PPFD/DLI, water/nutrient stocks, and active safety constraints (e.g., `reentryIntervalTicks`).
- **Harvesting**  
    Harvest per planting or _Harvest All_ in a zone → `facade.harvestPlanting(plantingId)` (creates inventory lots; revenue occurs on sale events).
- **Automation**  
    _Planting Plan_: define default `strainId` and `count`; with **Auto‑Replant**, after harvest/cleaning the engine enqueues tasks automatically.

### D. Personnel Management

- **Hiring**  
    In _Job Market_: review candidates; hire into a structure → `facade.hire(candidateId, role, wage?)`. Candidate refresh uses a seeded provider with offline fallback (per DD/TDD).
- **Managing Staff**  
    _Your Staff_ lists employees; assign role/structure → `facade.assignStructure(employeeId, structureId?)`; fire via `facade.fire(employeeId)`.
- **Salary Negotiation**  
    Alerts surface raise requests; modal offers accept/decline/bonus. Accepted raises patch wage; decline risks morale drop (engine computes effects).
- **Policy Setting**  
    Company‑wide overtime policy → `facade.setOvertimePolicy({ policy: 'payout'|'timeOff', multiplier? })`.
### E. Financial & Strategic Overview

- **Dashboard**  
    At‑a‑glance KPIs (Capital, Cumulative Yield, Date/Time), sim controls (play/pause/speed), and alerts. Clicking an alert deep‑links to the relevant view (structure/room/zone/personnel).
- **Finances View**  
    Detailed breakdown of revenue/expenses (CapEx/OpEx, utilities, labor, maintenance) from façade reports (`finance.tick`).
- **Alerts System**  
    Notifications for low supplies, harvest‑ready, device failures, raise requests, PHI/re‑entry gates. Payloads contain **UUIDs**; UI resolves names from the snapshot.

---
## 2) Technical UI Component Breakdown (illustrative)

> Names are examples for teams using React. The architecture is façade‑first and remains valid with any UI stack.

### A. Core Application Structure

- **App (root)**  
    Initializes bridge hooks (snapshot/events/commands), view manager, and modals; composes main screens (Dashboard + MainView).
- **hooks/bridge**  
    Single contact point with the **System Facade** (subscribe to snapshots & events; expose stable command callbacks).
- **hooks/useViewManager**  
    Navigation state machine managing `{ currentView, selectedStructureId?, selectedRoomId?, selectedZoneId? }` with `goTo`, `back`, `home`.
- **hooks/useModals**  
    Central modal controller; manages `visibleModal` and `formState`. Optionally **pauses** sim on open and **resumes** on close.
### B. Primary Views

- **StartScreen**  
    New/Load/Import flows.
- **MainView**  
    Router‑like composition that decides which primary content to show based on navigation state.
- **FinancesView**  
    Financial reports (CapEx/OpEx, utilities, labor, maintenance, revenue) with summaries and trends.
- **PersonnelView**  
    Two tabs: _Your Staff_ (management) and _Job Market_ (candidates & hiring).
### C. Hierarchical Detail Components

- **Structures**  
    Top‑level list of rented structures (cards with KPIs).
- **StructureDetail**  
    Rooms list + actions (create/rename/delete/duplicate).
- **RoomDetail**  
    Zones list; special rendering if `purpose != 'growroom'` (e.g., Lab/BreedingStation).
- **ZoneDetail**  
    Deep control surface: devices, plantings, plan, environment, and safety state.
### D. UI Chrome & Navigation

- **Dashboard**  
    Persistent header: KPIs, sim controls, quick nav (Finances/Personnel), alerts & game lifecycle (save/load/reset/export/import).
- **Breadcrumbs**  
    Hierarchical trail (e.g., _Structures / Warehouse A / Grow Room 1_); clicking updates selected entity IDs.
### E. Modals (managed by the modal controller)

**Creation**
- **RentModal** → `rentStructure(structureId)`.
- **AddRoomModal** → `createRoom(structureId, { name, purpose, area_m2, height_m? })`.
- **AddZoneModal** → `createZone(roomId, { name, area_m2, methodId })`.
- **AddDeviceModal** → `installDevice(targetId, deviceId, settings?)` (enforces `allowedRoomPurposes`).
- **AddSupplyModal** → `applyIrrigation` / fertilizer grams `{ N,P,K }`.
- **PlantStrainModal** → `addPlanting(zoneId, { strainId, count })`.
- **BreedStrainModal** → select two parent strains by **UUID `id`** to create a new strain (lineage stores parent UUIDs; empty parents ⇒ ur‑plant).

**Management & Editing**
- **RenameModal** → generic rename for structure/room/zone.
- **DeleteModal** → generic delete (contextual warnings, e.g., severance on firing employees).
- **EditDeviceModal** → batch adjust device settings (e.g., `targetTemperature`, hysteresis `targetTemperatureRange`).
- **EditLightCycleModal** → zone light hours; UI does not compute growth—engine does.
- **PlantingPlanModal** → define automation plan (strain/quantity, **Auto‑Replant** toggle).

**HR**
- **HireEmployeeModal** → `hire(candidateId, role, wage?)` and assign structure.
- **NegotiateSalaryModal** → respond to raise alert (accept/decline/bonus) and patch wage.

**Game Lifecycle**
- **NewGameModal** → `newGame` with name/seed.
- **SaveGameModal** → `save`.
- **LoadGameModal** → list/load/delete saved snapshots.
- **ResetModal** → confirm full reset.
### F. Reusable & Specialized Components

- **Card**  
    Generic container for structure/room/zone/employee summaries.
- **BreedingStation**  
    Specialized panel in Lab views listing custom strains (lineage shown via parent UUID resolution to names).
- **ZoneInfoPanel**  
    Zone KPIs: environment (T/RH/CO₂), PPFD/DLI, supplies, safety (PHI/re‑entry timers).
- **ZoneDeviceList**  
    Devices by type; install/remove/update; placement validated by `allowedRoomPurposes`.
- **ZonePlantingList**  
    Plantings with per‑planting harvest; access to PlantStrain modal.
- **ZonePlantingPlan**  
    Automation plan management (auto‑replant pipeline).

---
## 3) Identity, Validation & Safety (UI Contract)

- **Identity**: All cross‑refs are **UUID `id`**; UI may display `name`/`slug` only.
- **Validation**: Errors/warnings come from the Facade; UI displays them verbatim (no client‑side fixes).
- **Safety**: The Facade enforces: device purpose binding, quarantine and **reentryIntervalTicks**/**preHarvestIntervalTicks**, certifications for treatments, inventory locks, and geometry constraints.

---
## 4) Performance & UX Notes

- **Selectors & memoization** for derived views and KPIs.
- **Virtualization** for large lists (structures, zones, employees, tasks).
- **Optimistic UI** is avoided; the UI waits for façade ACK or events before reflecting changes (deterministic ordering).
- **Modals** may pause the sim; resuming is explicit on close.

---
## 5) Anti‑Patterns (explicitly disallowed)

- Computing prices, growth, stress, or environment deltas in the UI.
- Using non‑UUID keys to correlate entities.
- Mutating deep state directly; all changes go through façade commands.
- Emitting or depending on heavy object graphs in events; use UUIDs and snapshot lookups.

---

_This spec aligns with the System Facade and Simulation Deep Dive. It can be used as a checklist for UI implementation and QA._

---

# Game Balance Constants
## Human Resources & Employee Morale

`SEVERANCE_PAY_DAYS = 7`
The number of days' salary paid as severance when an employee is fired.

`FIRE_MORALE_DROP = 10`
The morale penalty applied to all other staff in the same building when an employee is fired.

`RAISE_ACCEPT_MORALE_GAIN = 25`
The morale boost an employee receives when their salary raise request is approved.

`BONUS_OFFER_MORALE_GAIN = 15`
The morale boost from receiving a one-time bonus instead of a permanent raise.

`RAISE_DECLINE_MORALE_DROP = 20`
The morale penalty an employee suffers when their raise request is denied.

`CYCLE_COMPLETION_MORALE_GAIN = 2`
A small morale boost an employee gets after successfully completing a full work-rest cycle.

`TICKS_BETWEEN_RAISE_REQUESTS = 8760` (calculated from 365 * 24)
The minimum in-game time (in hours) before an employee is eligible to ask for another raise.

`LOW_MORALE_QUIT_CHANCE_PER_DAY = 0.05` (or 5%)
The daily probability that an employee with very low morale will quit their job.
Employee Energy

`ENERGY_COST_PER_TICK_WORKING = 10.0`
The amount of energy an employee loses for every hour they are working on a task.

`ENERGY_REGEN_PER_TICK_RESTING = 10.0`
The amount of energy an employee recovers for every hour spent resting in a breakroom.

`IDLE_ENERGY_REGEN_PER_TICK = 2.5`

The small amount of energy an employee recovers for every hour they are idle but not in a designated breakroom.

`ENERGY_REST_THRESHOLD = 20`
If an employee's energy falls below this level, they will stop working and prioritize finding a breakroom to rest.

`OFF_DUTY_DURATION_TICKS = 16`
The number of hours an employee is unavailable for work after their energy is completely depleted, allowing them to fully recover.
## Skills & Experience
`XP_PER_LEVEL = 100`
The amount of experience points needed to increase a skill by one full level.

`TASK_XP_REWARD = 10`
The amount of experience an employee gains in the relevant skill after successfully completing a task.

`DAILY_ROLE_XP_GAIN = 2`
A small amount of "passive" experience an employee gains each day in the primary skill associated with their assigned job role.
## Plant Growth & Health

`PLANT_STRESS_IMPACT_FACTOR = 0.05`
A multiplier that determines how much a plant's health is damaged each hour based on its current stress level.

`PLANT_RECOVERY_FACTOR = 0.003`
A multiplier that determines how quickly a plant's health regenerates each hour when its environmental conditions are ideal.

`PLANT_DISEASE_IMPACT = 0.1`
The amount of health a plant immediately loses when it is afflicted with a new disease.

`PLANT_BASE_GROWTH_PER_TICK = 0.05`
The base amount of biomass (in grams) a perfectly healthy and unstressed plant will gain each hour under light.

`PLANT_SEEDLING_DAYS = 3`
The number of in-game days a plant will remain in the seedling stage before progressing.

`PLANT_STAGE_TRANSITION_PROB_PER_DAY = 0.25` (or 25%)
After a plant has spent the minimum required time in its current growth stage, this is the daily chance it will transition to the next stage.
## General Time
`TICKS_PER_MONTH = 30`
The number of in-game hours that are considered one "month" for calculating recurring costs like rent.

---

# Environmental Simulation Constants
## Zone Sufficiency & Climate Control
`RECOMMENDED_ACH = 5`
The recommended number of air changes per hour for a zone to be considered to have optimal climate control.
`BASE_DEHUMIDIFICATION_LOAD_PER_M2_PER_H = 0.02`
The base amount of water vapor (in kg) that plants are expected to produce per square meter per hour, which dehumidifiers must counteract.
`BASE_CO2_INJECTION_PPM_PER_TICK_PER_M2 = 5`
The required rate of CO₂ injection (in ppm) per hour per square meter needed to maintain optimal levels against plant consumption and natural leakage.
## Ambient (External) Environment Conditions
`AMBIENT_TEMP_C = 20`
The default temperature (in Celsius) of the outside world that the zone's internal temperature will naturally drift towards.
`AMBIENT_HUMIDITY_RH = 0.50`
The default relative humidity (as a fraction from 0 to 1) of the outside world.
`AMBIENT_CO2_PPM = 400`
The default CO₂ concentration (in parts per million) of the outside world.
## Normalization & Physics Factors
`TEMP_NORMALIZATION_FACTOR = 0.1`
A multiplier determining how quickly a zone's temperature normalizes towards the ambient temperature each hour.
`HUMIDITY_NORMALIZATION_FACTOR = 0.05`
A multiplier determining how quickly a zone's humidity normalizes towards the ambient humidity each hour.
`CO2_NORMALIZATION_FACTOR = 0.1`
A multiplier determining how quickly a zone's CO₂ level normalizes towards the ambient CO₂ level each hour.
## Device & Plant Effect Factors
`LAMP_HEAT_FACTOR = 0.5`
A conversion factor that determines how much a lamp's power consumption (in kW) contributes to an increase in the zone's temperature (°C) each hour.
`COOLING_CAPACITY_FACTOR = 0.8`
A conversion factor that determines how much a climate unit's cooling capacity (in kW) contributes to a decrease in the zone's temperature (°C) each hour.
`DEHUMIDIFIER_HEAT_FACTOR = 0.2`
A conversion factor for the waste heat generated by a dehumidifier, determining how much its power consumption (in kW) increases the zone's temperature (°C) each hour.
`PLANT_TRANSPIRATION_RH_PER_PLANT = 0.00005`
The amount of relative humidity (as a fraction from 0 to 1) that a single plant adds to the zone each hour through transpiration.
`PLANT_CO2_CONSUMPTION_PPM_PER_PLANT = 0.2`
The amount of CO₂ (in ppm) that a single plant removes from the zone each hour during photosynthesis.
## Durability & Disease
`BASE_DURABILITY_DECAY_PER_TICK = 0.00002`
The base amount of durability that every active device loses each hour from wear and tear.
`BASE_DISEASE_CHANCE_PER_TICK = 0.0001`
The underlying random probability that any given plant might contract a disease each hour.

---


# All JSON configurations file, currently available in `/data`

*Important rule for the consistency* if in other documents attributes are listed but not in this document, the other document is right and attributes and data has to be added to the following files!
These files are crucial! The blueprinted Objects will be rehidrated from these configuration files, so there is no need, for hardcoded representation!

## blueprints/cultivationMethods/basic_soil_pot.json

```json
{
  "id": "85cc0916-0e8a-495e-af8f-50291abe6855",
  "kind": "CultivationMethod",
  "name": "Basic Soil Pot",
  "setupCost": 2.0,
  "laborIntensity": 0.1,
  "areaPerPlant": 0.5,
  "minimumSpacing": 0.5,
  "maxCycles": 1,
  "substrate": {
    "type": "soil",
    "costPerSquareMeter": 2.5,
    "maxCycles": 1
  },
  "containerSpec": {
    "type": "pot",
    "volumeInLiters": 10,
    "footprintArea": 0.25,
    "reusableCycles": 3,
    "costPerUnit": 1.5,
    "packingDensity": 0.9
  },
  "strainTraitCompatibility": {},
  "idealConditions": {
    "idealTemperature": [
      20,
      28
    ],
    "idealHumidity": [
      0.5,
      0.7
    ]
  },
  "meta": {
    "description": "Simple cultivation method: one plant per pot in soil. Low setup cost, minimal labor, universally compatible.",
    "advantages": [
      "Very low initial cost",
      "Compatible with most strains",
      "Easy to manage"
    ],
    "disadvantages": [
      "Moderate space usage",
      "Lower productivity than advanced methods"
    ]
  }
}
```


## blueprints/cultivationMethods/scrog.json

```json
{
  "id": "41229377-ef2d-4723-931f-72eea87d7a62",
  "kind": "CultivationMethod",
  "name": "Screen of Green",
  "setupCost": 15.0,
  "laborIntensity": 0.7,
  "areaPerPlant": 1.0,
  "minimumSpacing": 0.8,
  "maxCycles": 4,
  "substrate": {
    "type": "soil",
    "costPerSquareMeter": 3.5,
    "maxCycles": 2
  },
  "containerSpec": {
    "type": "pot",
    "volumeInLiters": 25,
    "footprintArea": 0.3,
    "reusableCycles": 6,
    "costPerUnit": 4.0,
    "packingDensity": 0.9
  },
  "strainTraitCompatibility": {
    "preferred": {
      "genotype.sativa": {
        "min": 0.5
      }
    },
    "conflicting": {
      "genotype.indica": {
        "min": 0.7
      }
    }
  },
  "idealConditions": {
    "idealTemperature": [
      21,
      27
    ],
    "idealHumidity": [
      0.55,
      0.7
    ]
  },
  "meta": {
    "description": "Screen of Green (SCROG) is a low-density cultivation method that uses a screen to train plants to grow horizontally, creating a flat, even canopy. It maximizes light exposure for a smaller number of larger plants.",
    "advantages": [
      "Maximizes yield per plant",
      "Excellent light distribution",
      "Good for limited height spaces"
    ],
    "disadvantages": [
      "Longer vegetative phase required",
      "High training effort (pruning, tucking)",
      "Less suitable for very fast-cycling grows"
    ]
  }
}
```


## blueprints/cultivationMethods/sog.json

```json
{
  "id": "659ba4d7-a5fc-482e-98d4-b614341883ac",
  "kind": "CultivationMethod",
  "name": "Sea of Green",
  "setupCost": 10.0,
  "laborIntensity": 0.4,
  "areaPerPlant": 0.25,
  "minimumSpacing": 0.25,
  "maxCycles": 2,
  "substrate": {
    "type": "soil",
    "costPerSquareMeter": 3.5,
    "maxCycles": 2
  },
  "containerSpec": {
    "type": "pot",
    "volumeInLiters": 11,
    "footprintArea": 0.2,
    "reusableCycles": 6,
    "costPerUnit": 2.0,
    "packingDensity": 0.95
  },
  "strainTraitCompatibility": {
    "preferred": {
      "genotype.indica": {
        "min": 0.5
      },
      "photoperiod.vegetationDays": {
        "max": 21
      }
    },
    "conflicting": {
      "genotype.sativa": {
        "min": 0.5
      },
      "photoperiod.vegetationDays": {
        "min": 28
      }
    }
  },
  "idealConditions": {
    "idealTemperature": [
      22,
      28
    ],
    "idealHumidity": [
      0.5,
      0.65
    ]
  },
  "meta": {
    "description": "Sea of Green (SOG) is a high-density cultivation method where many small plants are grown close together to quickly fill a canopy. It emphasizes short vegetative phases and rapid cycling, ideal for fast-flowering indica-dominant strains.",
    "advantages": [
      "Shorter grow cycles",
      "Efficient use of space",
      "Lower training effort"
    ],
    "disadvantages": [
      "More plants to manage",
      "Legal limitations in plant count (IRL)",
      "Not suitable for large or tall plants"
    ]
  }
}
```


## blueprints/devices/climate_unit_01.json

```json
{
  "id": "7d3d3f1a-8c6f-4e9c-926d-5a2a4a3b6f1b",
  "kind": "ClimateUnit",
  "name": "CoolAir Split 3000",
  "quality": 0.9,
  "complexity": 0.4,
  "lifespanInHours": 35040,
  "settings": {
    "power": 1.2,
    "coolingCapacity": 1.6,
    "airflow": 350,
    "targetTemperature": 24,
    "targetTemperatureRange": [18, 30],
    "cop": 3.2,
    "hysteresisK": 0.8,
    "fullPowerAtDeltaK": 2
  },
  "meta": {
    "description": "High-performance climate control unit for clean indoor cultivation rooms; targeted cooling with moderate energy usage and solid airflow.",
    "advantages": [
      "Effective cooling for medium-sized rooms",
      "Reliable airflow distribution",
      "Energy-efficient at moderate loads"
    ],
    "disadvantages": [
      "Higher maintenance costs over time",
      "Limited precision for multi-zone systems"
    ],
    "notes": "Recommended for vegetative and early flowering stages in temperate climates."
  }
}

```


## blueprints/devices/co2injector-01.json

```json
{
  "id": "c701efa6-1e90-4f28-8934-ea9c584596e4",
  "kind": "CO2Injector",
  "name": "CO2 Pulse",
  "quality": 0.85,
  "complexity": 0.15,
  "lifespanInHours": 8760,
  "settings": {
    "power": 0.05,
    "targetCO2": 1100,
    "targetCO2Range": [400, 1500],
    "hysteresis": 60,
    "pulsePpmPerTick": 150
  },
  "meta": {
    "description": "Automated CO2 injector for controlled enrichment.",
    "advantages": [
      "Precise dosing",
      "Energy efficient"
    ],
    "disadvantages": [
      "Requires CO2 supply",
      "Overuse can harm plants"
    ]
  }
}
```


## blueprints/devices/dehumidifier-01.json

```json
{
  "id": "7a639d3d-4750-440a-a200-f90d11dc3c62",
  "kind": "Dehumidifier",
  "name": "DryBox 200",
  "quality": 0.8,
  "complexity": 0.25,
  "lifespanInHours": 26280,
  "settings": {
    "latentRemovalKgPerTick": 0.05,
    "power": 0.3
  },
  "meta": {
    "description": "Compact unit for reducing ambient humidity.",
    "advantages": [
      "Efficient moisture removal",
      "Low energy consumption"
    ],
    "disadvantages": [
      "Limited capacity for large rooms",
      "Generates heat"
    ]
  }
}


```


## blueprints/devices/exhaust_fan_01.json

```json

{
  "id": "f5d5c5a0-1b2c-4d3e-8f9a-0b1c2d3e4f5a",
  "kind": "Ventilation",
  "name": "Exhaust Fan 4-inch",
  "quality": 0.7,
  "complexity": 0.1,
  "lifespanInHours": 17520,
  "settings": {
    "power": 0.05,
    "airflow": 170
  },
  "meta": {
    "description": "A simple and affordable exhaust fan with an airflow of 170 m³/h, perfect for small tents and grow areas. Effectively removes heat, humidity, and stale air by exchanging it with the ambient environment.",
    "advantages": [
      "Low cost",
      "Low power consumption",
      "Effective for small-scale climate control"
    ],
    "disadvantages": [
      "Not as effective as an AC unit for large heat loads",
      "Relies on ambient temperature for cooling"
    ],
    "notes": "Essential for any small grow setup to prevent heat and humidity buildup without the cost of a full climate unit."
  }
}
```


## blueprints/devices/humidity_control_unit_01.json

```json
{
  "id": "3d762260-88a5-4104-b03c-9860bbac34b6",
  "kind": "HumidityControlUnit",
  "name": "Humidity Control Unit L1",
  "quality": 0.8,
  "complexity": 0.3,
  "lifespanInHours": 8760,
  "settings": {
    "power": 0.35,
    "humidifyRateKgPerTick": 0.1,
    "dehumidifyRateKgPerTick": 0.1,
    "targetHumidity": 0.6,
    "hysteresis": 0.05
  },
  "meta": {
    "description": "A standard unit to control humidity.",
    "advantages": [
      "Handles both humidification and dehumidification",
      "Simple to operate"
    ],
    "disadvantages": [
      "Limited capacity for large rooms",
      "Requires regular maintenance"
    ]
  }
}


```


## blueprints/devices/veg_light_01.json

```json
{
  "id": "3b5f6ad7-672e-47cd-9a24-f0cc45c4101e",
  "kind": "Lamp",
  "name": "LED VegLight 600",
  "quality": 0.95,
  "complexity": 0.2,
  "lifespanInHours": 52560,
  "settings": {
    "power": 0.6,
    "ppfd": 800,
    "coverageArea": 1.2,
    "spectralRange": [
      400,
      700
    ],
    "heatFraction": 0.3
  },
  "meta": {
    "description": "Full-spectrum LED grow light optimized for the vegetative phase of cannabis plants. Balanced light distribution with low heat generation.",
    "advantages": [
      "High energy efficiency",
      "Low heat output",
      "Ideal for early growth stages"
    ],
    "disadvantages": [
      "Limited effectiveness for flowering",
      "Higher upfront cost compared to HPS"
    ],
    "notes": "Best used in enclosed environments with adequate canopy management."
  }
}
```


## blueprints/diseases/anthracnose.json

```json
{
  "id": "83c4447f-8439-44cb-84ab-bbed8725e190",
  "kind": "Disease",
  "name": "Anthracnose",
  "pathogenType": "fungus",
  "targets": [
    "leaves",
    "stems"
  ],
  "environmentalRisk": {
    "idealHumidityRange": [
      0.6,
      0.9
    ],
    "temperatureRange": [
      18,
      28
    ],
    "leafWetnessRequired": true
  },
  "transmission": [
    "splashingWater",
    "tools"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.05,
    "infectionThreshold": 0.25,
    "degenerationRate": 0.025,
    "recoveryRate": 0.015,
    "regenerationRate": 0.012,
    "fatalityThreshold": 0.93
  },
  "detection": {
    "symptoms": [
      "Dark, sunken lesions on leaves and stems",
      "Possible spore rings"
    ]
  },
  "treatments": {
    "cultural": [
      "Avoid overhead irrigation",
      "Disinfect tools"
    ],
    "mechanical": [
      "Remove infected shoots"
    ]
  }
}
```


## blueprints/diseases/bacterial_leaf_spot.json

```json
{
  "id": "c1823c46-47df-4106-a039-88e60a6aa5ed",
  "kind": "Disease",
  "name": "Bacterial Leaf Spot",
  "pathogenType": "bacteria",
  "targets": [
    "leaves"
  ],
  "environmentalRisk": {
    "idealHumidityRange": [
      0.6,
      0.95
    ],
    "temperatureRange": [
      18,
      28
    ],
    "leafWetnessRequired": true
  },
  "transmission": [
    "splashingWater",
    "tools",
    "workers"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.06,
    "infectionThreshold": 0.22,
    "degenerationRate": 0.03,
    "recoveryRate": 0.014,
    "regenerationRate": 0.01,
    "fatalityThreshold": 0.9
  },
  "detection": {
    "symptoms": [
      "Water-soaked, later brown spots with yellow halo",
      "Oily sheen, marginal necrosis"
    ]
  },
  "treatments": {
    "cultural": [
      "Keep foliage dry",
      "Disinfect tools"
    ],
    "mechanical": [
      "Remove heavily infected leaves"
    ]
  }
}
```


## blueprints/diseases/bacterial_wilt.json

```json
{
  "id": "01b6d921-88d8-42f0-8009-7111eff56e70",
  "kind": "Disease",
  "name": "Bacterial Wilt (Erwinia-like)",
  "pathogenType": "bacteria",
  "targets": [
    "stems",
    "vascular"
  ],
  "environmentalRisk": {
    "idealHumidityRange": [
      0.5,
      0.9
    ],
    "temperatureRange": [
      20,
      30
    ],
    "woundEntryRisk": 0.8
  },
  "transmission": [
    "tools",
    "substrate",
    "splashingWater"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.07,
    "infectionThreshold": 0.2,
    "degenerationRate": 0.045,
    "recoveryRate": 0.01,
    "regenerationRate": 0.008,
    "fatalityThreshold": 0.96
  },
  "detection": {
    "symptoms": [
      "Sudden wilting despite sufficient soil moisture",
      "Darkened vascular tissue"
    ]
  },
  "treatments": {
    "cultural": [
      "Avoid wounding",
      "Increase hygiene",
      "Maintain low rH"
    ],
    "mechanical": [
      "Remove heavily infected plants"
    ]
  }
}
```


## blueprints/diseases/botrytis_gray_mold.json

```json
{
  "id": "eaca3c76-875c-4ebe-9ea5-c91dc9651f73",
  "kind": "Disease",
  "name": "Botrytis (Gray Mold / Bud Rot)",
  "pathogenType": "fungus",
  "targets": [
    "buds",
    "flowers",
    "leaves"
  ],
  "environmentalRisk": {
    "idealHumidityRange": [
      0.6,
      0.9
    ],
    "temperatureRange": [
      15,
      22
    ],
    "leafWetnessRequired": true,
    "lowAirflowRisk": 0.8,
    "denseCanopyRisk": 0.85
  },
  "transmission": [
    "airborneSpores",
    "wounds"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.08,
    "infectionThreshold": 0.15,
    "degenerationRate": 0.05,
    "recoveryRate": 0.01,
    "regenerationRate": 0.008,
    "fatalityThreshold": 0.9
  },
  "yieldImpact": {
    "budLossFractionPerDay": 0.05
  },
  "detection": {
    "symptoms": [
      "Brown-gray, mushy spots inside buds",
      "Cottony mold growth with musty smell"
    ]
  },
  "treatments": {
    "cultural": [
      "Maintain rH < 0.55 in late flowering",
      "Increase air circulation"
    ],
    "mechanical": [
      "Remove affected buds"
    ]
  }
}
```


## blueprints/diseases/downy_mildew.json

```json
{
  "id": "645b6253-4692-4396-ab6a-f3b02c9783bf",
  "kind": "Disease",
  "name": "Downy Mildew",
  "pathogenType": "fungus",
  "targets": [
    "leaves"
  ],
  "environmentalRisk": {
    "idealHumidityRange": [
      0.7,
      0.95
    ],
    "temperatureRange": [
      15,
      24
    ],
    "leafWetnessRequired": true,
    "lowAirflowRisk": 0.7
  },
  "transmission": [
    "airborneSpores",
    "splashingWater"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.055,
    "infectionThreshold": 0.2,
    "degenerationRate": 0.022,
    "recoveryRate": 0.012,
    "regenerationRate": 0.01,
    "fatalityThreshold": 0.92
  },
  "detection": {
    "symptoms": [
      "Yellowish angular leaf spots",
      "Gray-white fungal growth on leaf undersides"
    ]
  },
  "treatments": {
    "cultural": [
      "Avoid night condensation",
      "Irrigate during day"
    ],
    "mechanical": [
      "Remove infected leaves"
    ]
  }
}
```


## blueprints/diseases/hop_latent_viroid.json

```json
{
  "id": "259acd2f-d4af-49dd-8f0e-450c3045aea1",
  "kind": "Disease",
  "name": "Hop Latent Viroid (HpLVd)",
  "pathogenType": "viroid",
  "targets": [
    "systemic"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      18,
      28
    ]
  },
  "transmission": [
    "clones",
    "sap",
    "tools"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.15,
    "degenerationRate": 0.03,
    "recoveryRate": 0.002,
    "regenerationRate": 0.002,
    "fatalityThreshold": 0.85
  },
  "detection": {
    "symptoms": [
      "General growth suppression ('dudding')",
      "Small, deformed leaves; reduced resin production"
    ]
  },
  "treatments": {
    "cultural": [
      "Use tested clones only",
      "Strict tool hygiene"
    ],
    "mechanical": [
      "Screen and remove infected mother plants"
    ]
  }
}
```


## blueprints/diseases/mosaic_virus.json

```json
{
  "id": "da9b207b-3aeb-4784-875e-bbee1e27ced9",
  "kind": "Disease",
  "name": "Mosaic Virus (TMV/CMV-like)",
  "pathogenType": "virus",
  "targets": [
    "leaves",
    "systemic"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      18,
      28
    ]
  },
  "transmission": [
    "sap",
    "tools",
    "pests"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.04,
    "infectionThreshold": 0.18,
    "degenerationRate": 0.028,
    "recoveryRate": 0.003,
    "regenerationRate": 0.003,
    "fatalityThreshold": 0.9
  },
  "detection": {
    "symptoms": [
      "Mottled light and dark green leaf patterns (mosaic)",
      "Leaf deformation, stunted growth"
    ]
  },
  "treatments": {
    "cultural": [
      "Use pathogen-free plant material",
      "Disinfect tools"
    ],
    "mechanical": [
      "Remove infected plants"
    ]
  }
}
```


## blueprints/diseases/powdery_mildew.json

```json
{
  "id": "818bc83c-0a18-47c5-b861-c378181b0812",
  "kind": "Disease",
  "name": "Powdery Mildew",
  "pathogenType": "fungus",
  "targets": [
    "leaves",
    "stems"
  ],
  "environmentalRisk": {
    "idealHumidityRange": [
      0.5,
      0.7
    ],
    "temperatureRange": [
      20,
      28
    ],
    "leafWetnessRequired": false,
    "lowAirflowRisk": 0.8,
    "overcrowdingRisk": 0.7
  },
  "transmission": [
    "airborneSpores",
    "tools",
    "workers"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.06,
    "infectionThreshold": 0.18,
    "degenerationRate": 0.018,
    "recoveryRate": 0.017,
    "regenerationRate": 0.012,
    "fatalityThreshold": 0.9
  },
  "detection": {
    "symptoms": [
      "White, powdery coating on leaf surfaces",
      "Yellowish spots leading to necrosis"
    ],
    "scoutingHints": [
      "Inspect leaf surfaces in dense canopies",
      "Check during humidity fluctuations"
    ]
  },
  "treatments": {
    "cultural": [
      "Increase air circulation",
      "Prune dense leaves",
      "Avoid humidity spikes"
    ],
    "biological": [
      "Bacillus subtilis",
      "Low-dose sulfur sprays"
    ],
    "mechanical": [
      "Remove heavily infected leaves"
    ]
  }
}
```


## blueprints/diseases/root_rot.json

```json
{
  "id": "55741064-9052-407f-8fbe-9eb3690ff851",
  "kind": "Disease",
  "name": "Root Rot (Pythium/Fusarium/Rhizoctonia)",
  "pathogenType": "fungus-complex",
  "targets": [
    "roots",
    "crown"
  ],
  "environmentalRisk": {
    "idealHumidityRange": [
      0.4,
      0.7
    ],
    "temperatureRange": [
      18,
      26
    ],
    "substrateWaterloggingRisk": 0.9,
    "poorDrainageRisk": 0.85
  },
  "transmission": [
    "contaminatedWater",
    "substrate",
    "tools"
  ],
  "contagious": true,
  "model": {
    "dailyInfectionIncrement": 0.07,
    "infectionThreshold": 0.22,
    "degenerationRate": 0.04,
    "recoveryRate": 0.012,
    "regenerationRate": 0.009,
    "fatalityThreshold": 0.98
  },
  "detection": {
    "symptoms": [
      "Plants wilting despite wet soil",
      "Brown, slimy roots with foul smell"
    ]
  },
  "treatments": {
    "cultural": [
      "Avoid overwatering",
      "Improve drainage",
      "Extend irrigation intervals"
    ],
    "biological": [
      "Trichoderma spp."
    ],
    "mechanical": [
      "Remove heavily affected plants"
    ]
  }
}
```


## blueprints/pests/aphids.json

```json
{
  "id": "90fd2899-4563-468d-9e32-500a75ce9275",
  "kind": "Pest",
  "name": "Aphids",
  "category": "sap-sucking",
  "targets": [
    "leaves",
    "stems"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      18,
      28
    ],
    "humidityRange": [
      0.4,
      0.8
    ]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.32,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.2
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.15,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.5,
    "honeydew": true
  },
  "detection": {
    "symptoms": [
      "Clusters on shoot tips and undersides",
      "Sticky honeydew leading to sooty mold",
      "Leaf curling"
    ],
    "monitoring": [
      "Yellow sticky cards",
      "Visual scouting on new growth"
    ]
  },
  "controlOptions": {
    "biological": [
      "Lady beetles (Coccinellidae)",
      "Aphidius parasitoids"
    ],
    "cultural": [
      "Remove infested shoots",
      "Avoid over-fertilizing with N"
    ],
    "mechanical": [
      "Water jet dislodging",
      "Pruning"
    ],
    "chemical": [
      "Soaps and oils",
      "Azadirachtin (where compliant)"
    ]
  }
}
```


## blueprints/pests/broad_mites.json

```json
{
  "id": "2c574211-0e96-44f1-82ee-327056ac5fcb",
  "kind": "Pest",
  "name": "Broad Mites / Russet Mites",
  "category": "sap-sucking",
  "targets": [
    "meristems",
    "flowers",
    "leaves"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      20,
      28
    ],
    "humidityRange": [
      0.4,
      0.8
    ]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.33,
    "dailyMortalityRate": 0.07,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.2,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.2,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Twisted, hardened new growth",
      "Bronzed, rough leaf surfaces",
      "Flower deformities"
    ],
    "monitoring": [
      "High-magnification scope (≥60x) on meristems",
      "Sentinel plants in hotspots"
    ]
  },
  "controlOptions": {
    "biological": [
      "Predatory mites (Amblyseius swirskii, A. andersoni)"
    ],
    "cultural": [
      "Quarantine and destroy heavily infested stock",
      "Strict sanitation"
    ],
    "mechanical": [
      "Remove infested tips"
    ],
    "chemical": [
      "Targeted miticides where compliant; rotate modes"
    ]
  }
}
```


## blueprints/pests/caterpillars.json

```json
{
  "id": "2335b750-3c2a-4540-a44c-3d510036bafd",
  "kind": "Pest",
  "name": "Caterpillars",
  "category": "chewing",
  "targets": [
    "leaves",
    "buds"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      18,
      30
    ],
    "humidityRange": [
      0.4,
      0.8
    ]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.2,
    "dailyMortalityRate": 0.1,
    "carryingCapacity": 0.8
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.18,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.05,
    "diseaseVectorRisk": 0.3,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Chewed leaves and frass (droppings)",
      "Holes and tunnels in buds",
      "Secondary bud rot (Botrytis)"
    ],
    "monitoring": [
      "Blacklight scouting outdoors",
      "Pheromone traps where available"
    ]
  },
  "controlOptions": {
    "biological": [
      "Bacillus thuringiensis kurstaki (Btk)",
      "Trichogramma wasps"
    ],
    "cultural": [
      "Remove plant debris",
      "Timing: treat early instars"
    ],
    "mechanical": [
      "Hand-pick, inspect buds"
    ],
    "chemical": [
      "Selective stomach poisons (where allowed)"
    ]
  }
}
```


## blueprints/pests/fungus_gnats.json

```json
{
  "id": "33fc7bb4-9ca1-42e8-8d70-8267f8b6abe3",
  "kind": "Pest",
  "name": "Fungus Gnats",
  "category": "soil-dwelling",
  "targets": [
    "roots",
    "substrate"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      18,
      26
    ],
    "humidityRange": [
      0.5,
      0.9
    ],
    "overwateringRisk": 0.9
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.27,
    "dailyMortalityRate": 0.08,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.05,
    "rootUptakeReductionPerDay": 0.15,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.5,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Adults on soil surface and near pots",
      "Larvae feed on roots causing stunting",
      "Algae growth on wet media"
    ],
    "monitoring": [
      "Yellow sticky cards at substrate level",
      "Potato slice test for larvae"
    ]
  },
  "controlOptions": {
    "biological": [
      "Steinernema feltiae (nematodes)",
      "Bacillus thuringiensis israelensis (Bti)"
    ],
    "cultural": [
      "Dry-down cycles",
      "Improve drainage",
      "Avoid algae"
    ],
    "mechanical": [
      "Top-dress with sand/perlite layer"
    ],
    "chemical": [
      "H2O2 drenches (careful), compliant larvicides where allowed"
    ]
  }
}
```


## blueprints/pests/root_aphids.json

```json
{
  "id": "1946a4a4-e2c7-494b-8777-7beffafcffba",
  "kind": "Pest",
  "name": "Root Aphids",
  "category": "sap-sucking",
  "targets": [
    "roots"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      18,
      26
    ],
    "humidityRange": [
      0.5,
      0.9
    ],
    "overfertilizationRisk": 0.5
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.3,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.08,
    "rootUptakeReductionPerDay": 0.25,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.4,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Stunted plants resembling nutrient deficiency",
      "White waxy residue on roots",
      "Poor response to fertilization"
    ],
    "monitoring": [
      "Root inspections during repotting",
      "Yellow sticky cards at substrate level"
    ]
  },
  "controlOptions": {
    "biological": [
      "Beneficial nematodes (Steinernema/ Heterorhabditis)"
    ],
    "cultural": [
      "Avoid overwatering and excess N",
      "Sterilize media/tools"
    ],
    "mechanical": [
      "Discard heavily infested media"
    ],
    "chemical": [
      "Drenches permitted by regulation (jurisdiction-dependent)"
    ]
  }
}
```


## blueprints/pests/spider_mites.json

```json
{
  "id": "7a887ad2-34ed-4284-9c86-b573aadffdb9",
  "kind": "Pest",
  "name": "Spider Mites",
  "category": "sap-sucking",
  "targets": [
    "leaves",
    "stems"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      24,
      32
    ],
    "humidityRange": [
      0.3,
      0.6
    ],
    "lowAirflowRisk": 0.6,
    "dustyCanopyRisk": 0.5
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.35,
    "dailyMortalityRate": 0.05,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.18,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.2,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Fine yellow stippling on upper leaf surfaces",
      "Webbing under leaves at high density",
      "Leaves bronzing and drying out"
    ],
    "monitoring": [
      "Use hand lens (≥40x) under leaves",
      "Sticky traps for presence trends"
    ]
  },
  "controlOptions": {
    "biological": [
      "Predatory mites (Phytoseiulus persimilis, Amblyseius californicus)"
    ],
    "cultural": [
      "Increase humidity short-term",
      "Improve airflow",
      "Quarantine new plants"
    ],
    "mechanical": [
      "Rinse undersides, remove heavily infested leaves"
    ],
    "chemical": [
      "Horticultural oils",
      "Soaps (rotate actives to avoid resistance)"
    ]
  }
}
```


## blueprints/pests/thrips.json

```json
{
  "id": "4bb767d7-403e-49c9-aa10-b957dfc0e881",
  "kind": "Pest",
  "name": "Thrips",
  "category": "sap-sucking",
  "targets": [
    "leaves",
    "flowers"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      20,
      30
    ],
    "humidityRange": [
      0.3,
      0.7
    ]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.3,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.12,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.6,
    "honeydew": false
  },
  "detection": {
    "symptoms": [
      "Silvery streaks and speckling on leaves",
      "Black fecal spots",
      "Distorted new growth"
    ],
    "monitoring": [
      "Blue sticky cards near canopy",
      "Tap test over white paper"
    ]
  },
  "controlOptions": {
    "biological": [
      "Orius spp.",
      "Amblyseius cucumeris"
    ],
    "cultural": [
      "Remove weeds/volunteers",
      "Screen intakes"
    ],
    "mechanical": [
      "Sticky cards mass-trapping"
    ],
    "chemical": [
      "Spinosad where allowed",
      "Soaps and oils (rotate)"
    ]
  }
}
```


## blueprints/pests/whiteflies.json

```json
{
  "id": "ac38b09c-d963-4dd4-b105-54c8f4ba30b6",
  "kind": "Pest",
  "name": "Whiteflies",
  "category": "sap-sucking",
  "targets": [
    "leaves"
  ],
  "environmentalRisk": {
    "temperatureRange": [
      22,
      30
    ],
    "humidityRange": [
      0.4,
      0.8
    ]
  },
  "populationDynamics": {
    "dailyReproductionRate": 0.28,
    "dailyMortalityRate": 0.06,
    "carryingCapacity": 1.0
  },
  "damageModel": {
    "photosynthesisReductionPerDay": 0.1,
    "rootUptakeReductionPerDay": 0.0,
    "budLossFractionPerDay": 0.0,
    "diseaseVectorRisk": 0.4,
    "honeydew": true
  },
  "detection": {
    "symptoms": [
      "Adults fly up when disturbed",
      "Sticky honeydew, sooty mold",
      "Leaf yellowing and drop"
    ],
    "monitoring": [
      "Yellow sticky cards just above canopy",
      "Check leaf undersides for nymphs"
    ]
  },
  "controlOptions": {
    "biological": [
      "Encarsia formosa",
      "Eretmocerus spp."
    ],
    "cultural": [
      "Sanitation, remove lower leaves",
      "Screen air intakes"
    ],
    "mechanical": [
      "Vacuum adults routinely"
    ],
    "chemical": [
      "Soaps/oils (rotate modes)"
    ]
  }
}
```


## blueprints/roomPurposes/breakroom.json

```json
{
  "id": "breakroom",
  "name": "Break Room",
  "description": "A space for employees to rest and recover energy."
}

```


## blueprints/roomPurposes/growroom.json

```json
{
  "id": "growroom",
  "name": "Grow Room",
  "description": "A room designed for cultivating plants under controlled conditions."
}

```


## blueprints/roomPurposes/lab.json

```json
{
  "id": "lab",
  "name": "Laboratory",
  "description": "A facility for research and breeding new plant strains."
}

```


## blueprints/roomPurposes/salesroom.json

```json
{
  "id": "salesroom",
  "name": "Sales Room",
  "description": "A commercial space for selling harvested products."
}

```


## blueprints/strains/ak-47.json

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "ak47",
  "name": "AK-47",
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.95,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry_g": 180.0,
    "baseLUE_gPerMol": 0.9,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [
        400,
        700
      ],
      "flowering": [
        300,
        650
      ]
    },
    "lightIntensity": {
      "vegetation": [
        400,
        600
      ],
      "flowering": [
        600,
        1000
      ]
    },
    "lightCycle": {
      "vegetation": [
        18,
        6
      ],
      "flowering": [
        12,
        12
      ]
    },
    "idealTemperature": {
      "vegetation": [
        20,
        28
      ],
      "flowering": [
        22,
        30
      ]
    },
    "idealHumidity": {
      "vegetation": [
        0.6,
        0.7
      ],
      "flowering": [
        0.5,
        0.6
      ]
    },
    "phRange": [
      5.8,
      6.2
    ]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationDays": 28,
    "floweringDays": 63,
    "transitionTriggerHours": 12
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindowInDays": [
    60,
    75
  ],
  "harvestProperties": {
    "ripeningTimeInHours": 48,
    "maxStorageTimeInHours": 120,
    "qualityDecayPerHour": 0.02
  },
  "meta": {
    "description": "AK-47 is a classic hybrid cannabis strain known for its high THC levels and fast flowering. It combines strong sativa effects with compact indica growth.",
    "advantages": [
      "High THC potential",
      "Reliable yields",
      "Adaptable to indoor systems"
    ],
    "disadvantages": [
      "Humidity-sensitive during flowering",
      "Not ideal for low-light environments"
    ],
    "notes": "Popular choice for both commercial grows and personal use due to its balance."
  }
}
```


## blueprints/strains/northern-lights.json

```json
{
  "id": "3f0f15f4-1b75-4196-b3f3-5f6b6b7cf7a7",
  "slug": "northern_lights",
  "name": "Northern Lights",
  "photoperiodic": true,
  "vegDays": 28,
  "flowerDays": 50,
  "autoFlowerDays": null,
  "light": {
    "ppfdOpt_umol_m2s": 650,
    "ppfdMax_umol_m2s": 1000,
    "dliHalfSat_mol_m2d": 18,
    "dliMax_mol_m2d": 38
  },
  "coeffs": {
    "budGrowthBase_g_per_day": 1.4,
    "tempOptC": 25,
    "tempWidthC": 5.5,
    "co2HalfSat_ppm": 800
  },
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.98,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry_g": 180.0,
    "baseLUE_gPerMol": 0.9,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [
        400,
        700
      ],
      "flowering": [
        300,
        650
      ]
    },
    "lightIntensity": {
      "vegetation": [
        400,
        600
      ],
      "flowering": [
        600,
        1000
      ]
    },
    "lightCycle": {
      "vegetation": [
        18,
        6
      ],
      "flowering": [
        12,
        12
      ]
    },
    "idealTemperature": {
      "vegetation": [
        20,
        28
      ],
      "flowering": [
        22,
        30
      ]
    },
    "idealHumidity": {
      "vegetation": [
        0.6,
        0.7
      ],
      "flowering": [
        0.5,
        0.6
      ]
    },
    "phRange": [
      5.8,
      6.2
    ]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationDays": 28,
    "floweringDays": 50,
    "transitionTriggerHours": 12
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindowInDays": [
    48,
    60
  ],
  "harvestProperties": {
    "ripeningTimeInHours": 48,
    "maxStorageTimeInHours": 120,
    "qualityDecayPerHour": 0.02
  },
  "meta": {
    "description": "Northern Lights is a legendary indica strain prized for its resilience and fast flowering time.",
    "advantages": [
      "Compact growth",
      "Resistant to stress",
      "Classic indica effects"
    ],
    "disadvantages": [
      "Moderate yields",
      "Prefers stable climates"
    ],
    "notes": "Often used as a baseline in breeding projects."
  }
}
```


## blueprints/strains/skunk-1.json

```json
{
  "id": "5a6e9e57-0b3a-4f9f-8f19-12f3f8ec3a0e",
  "slug": "skunk_1",
  "name": "Skunk #1",
  "photoperiodic": true,
  "vegDays": 30,
  "flowerDays": 55,
  "autoFlowerDays": null,
  "light": {
    "ppfdOpt_umol_m2s": 700,
    "ppfdMax_umol_m2s": 1100,
    "dliHalfSat_mol_m2d": 21,
    "dliMax_mol_m2d": 41
  },
  "coeffs": {
    "budGrowthBase_g_per_day": 1.7,
    "tempOptC": 26,
    "tempWidthC": 6,
    "co2HalfSat_ppm": 900
  },
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.96,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry_g": 180.0,
    "baseLUE_gPerMol": 0.9,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [
        400,
        700
      ],
      "flowering": [
        300,
        650
      ]
    },
    "lightIntensity": {
      "vegetation": [
        400,
        600
      ],
      "flowering": [
        600,
        1000
      ]
    },
    "lightCycle": {
      "vegetation": [
        18,
        6
      ],
      "flowering": [
        12,
        12
      ]
    },
    "idealTemperature": {
      "vegetation": [
        20,
        28
      ],
      "flowering": [
        22,
        30
      ]
    },
    "idealHumidity": {
      "vegetation": [
        0.6,
        0.7
      ],
      "flowering": [
        0.5,
        0.6
      ]
    },
    "phRange": [
      5.8,
      6.2
    ]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationDays": 30,
    "floweringDays": 55,
    "transitionTriggerHours": 12
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindowInDays": [
    55,
    65
  ],
  "harvestProperties": {
    "ripeningTimeInHours": 48,
    "maxStorageTimeInHours": 120,
    "qualityDecayPerHour": 0.02
  },
  "meta": {
    "description": "Skunk #1 set the standard for modern hybrids with its skunky aroma and balanced growth.",
    "advantages": [
      "Stable genetics",
      "Fast flowering",
      "Classic flavor"
    ],
    "disadvantages": [
      "Strong odor",
      "Can stretch in veg"
    ],
    "notes": "Widely used as a benchmark strain since the 1970s."
  }
}
```


## blueprints/strains/sour-diesel.json

```json
{
  "id": "8b9a0b6c-2d6c-4f58-9c37-7a6c9d4aa5c2",
  "slug": "sour_diesel",
  "name": "Sour Diesel",
  "photoperiodic": true,
  "vegDays": 36,
  "flowerDays": 70,
  "autoFlowerDays": null,
  "light": {
    "ppfdOpt_umol_m2s": 850,
    "ppfdMax_umol_m2s": 1250,
    "dliHalfSat_mol_m2d": 27,
    "dliMax_mol_m2d": 48
  },
  "coeffs": {
    "budGrowthBase_g_per_day": 1.9,
    "tempOptC": 26.5,
    "tempWidthC": 6.5,
    "co2HalfSat_ppm": 950
  },
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.65,
    "indica": 0.35,
    "ruderalis": 0.0
  },
  "generalResilience": 0.7,
  "germinationRate": 0.92,
  "chemotype": {
    "thcContent": 0.2,
    "cbdContent": 0.01
  },
  "morphology": {
    "growthRate": 1.0,
    "yieldFactor": 1.0,
    "leafAreaIndex": 3.2
  },
  "growthModel": {
    "maxBiomassDry_g": 180.0,
    "baseLUE_gPerMol": 0.9,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [
        400,
        700
      ],
      "flowering": [
        300,
        650
      ]
    },
    "lightIntensity": {
      "vegetation": [
        400,
        600
      ],
      "flowering": [
        600,
        1000
      ]
    },
    "lightCycle": {
      "vegetation": [
        18,
        6
      ],
      "flowering": [
        12,
        12
      ]
    },
    "idealTemperature": {
      "vegetation": [
        20,
        28
      ],
      "flowering": [
        22,
        30
      ]
    },
    "idealHumidity": {
      "vegetation": [
        0.6,
        0.7
      ],
      "flowering": [
        0.5,
        0.6
      ]
    },
    "phRange": [
      5.8,
      6.2
    ]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.12,
        "phosphorus": 0.06,
        "potassium": 0.1
      },
      "flowering": {
        "nitrogen": 0.07,
        "phosphorus": 0.14,
        "potassium": 0.16
      }
    },
    "npkTolerance": 0.15,
    "npkStressIncrement": 0.04
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.15,
      "vegetation": 0.36,
      "flowering": 0.54
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.03,
    "infectionThreshold": 0.4,
    "recoveryRate": 0.01,
    "degenerationRate": 0.01,
    "regenerationRate": 0.005,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationDays": 36,
    "floweringDays": 70,
    "transitionTriggerHours": 12
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 300,
      "maxStressForStageChange": 0.3
    },
    "flowering": {
      "minLightHours": 600,
      "maxStressForStageChange": 0.2
    }
  },
  "harvestWindowInDays": [
    65,
    80
  ],
  "harvestProperties": {
    "ripeningTimeInHours": 48,
    "maxStorageTimeInHours": 120,
    "qualityDecayPerHour": 0.02
  },
  "meta": {
    "description": "Sour Diesel delivers pungent aromas and energizing effects, popular among sativa enthusiasts.",
    "advantages": [
      "High vigor",
      "Strong aroma",
      "Excellent for daytime use"
    ],
    "disadvantages": [
      "Long flowering period",
      "Requires ample light"
    ],
    "notes": "Originates from the U.S. East Coast underground scene."
  }
}
```


## blueprints/strains/white-widow.json

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "slug": "white_widow",
  "name": "White Widow",
  "lineage": {
    "parents": []
  },
  "genotype": {
    "sativa": 0.5,
    "indica": 0.5,
    "ruderalis": 0.0
  },
  "generalResilience": 0.75,
  "germinationRate": 0.97,
  "chemotype": {
    "thcContent": 0.18,
    "cbdContent": 0.02
  },
  "morphology": {
    "growthRate": 0.95,
    "yieldFactor": 1.1,
    "leafAreaIndex": 3.0
  },
  "growthModel": {
    "maxBiomassDry_g": 180.0,
    "baseLUE_gPerMol": 0.9,
    "maintenanceFracPerDay": 0.01,
    "dryMatterFraction": {
      "vegetation": 0.25,
      "flowering": 0.2
    },
    "harvestIndex": {
      "targetFlowering": 0.7
    },
    "phaseCapMultiplier": {
      "vegetation": 0.5,
      "flowering": 1.0
    },
    "temperature": {
      "Q10": 2.0,
      "T_ref_C": 25
    }
  },
  "noise": {
    "enabled": true,
    "pct": 0.02
  },
  "environmentalPreferences": {
    "lightSpectrum": {
      "vegetation": [
        400,
        700
      ],
      "flowering": [
        300,
        650
      ]
    },
    "lightIntensity": {
      "vegetation": [
        350,
        550
      ],
      "flowering": [
        550,
        950
      ]
    },
    "lightCycle": {
      "vegetation": [
        18,
        6
      ],
      "flowering": [
        12,
        12
      ]
    },
    "idealTemperature": {
      "vegetation": [
        21,
        27
      ],
      "flowering": [
        20,
        26
      ]
    },
    "idealHumidity": {
      "vegetation": [
        0.55,
        0.65
      ],
      "flowering": [
        0.45,
        0.55
      ]
    },
    "phRange": [
      5.8,
      6.2
    ]
  },
  "nutrientDemand": {
    "dailyNutrientDemand": {
      "seedling": {
        "nitrogen": 0.03,
        "phosphorus": 0.02,
        "potassium": 0.03
      },
      "vegetation": {
        "nitrogen": 0.11,
        "phosphorus": 0.07,
        "potassium": 0.11
      },
      "flowering": {
        "nitrogen": 0.06,
        "phosphorus": 0.15,
        "potassium": 0.15
      }
    },
    "npkTolerance": 0.2,
    "npkStressIncrement": 0.035
  },
  "waterDemand": {
    "dailyWaterUsagePerSquareMeter": {
      "seedling": 0.14,
      "vegetation": 0.34,
      "flowering": 0.51
    },
    "minimumFractionRequired": 0.15
  },
  "diseaseResistance": {
    "dailyInfectionIncrement": 0.025,
    "infectionThreshold": 0.45,
    "recoveryRate": 0.012,
    "degenerationRate": 0.01,
    "regenerationRate": 0.006,
    "fatalityThreshold": 0.95
  },
  "photoperiod": {
    "vegetationDays": 28,
    "floweringDays": 60,
    "transitionTriggerHours": 12
  },
  "stageChangeThresholds": {
    "vegetative": {
      "minLightHours": 320,
      "maxStressForStageChange": 0.35
    },
    "flowering": {
      "minLightHours": 620,
      "maxStressForStageChange": 0.25
    }
  },
  "harvestWindowInDays": [
    58,
    70
  ],
  "harvestProperties": {
    "ripeningTimeInHours": 48,
    "maxStorageTimeInHours": 120,
    "qualityDecayPerHour": 0.02
  },
  "meta": {
    "description": "White Widow is a balanced hybrid strain, a cross between a Brazilian sativa landrace and a resin-heavy South Indian indica. It is known for its resin production and relatively easy growth.",
    "advantages": [
      "High resin production",
      "Balanced effects",
      "Good for beginners"
    ],
    "disadvantages": [
      "Can be sensitive to nutrients",
      "Prefers stable temperatures"
    ],
    "notes": "A classic Dutch coffee-shop strain that remains popular worldwide."
  }
}
```


## blueprints/structures/medium_warehouse.json

```json
{
  "id": "59ec5597-42f5-4e52-acb9-cb65d68fd72d",
  "name": "Medium Warehouse",
  "footprint": {
    "length_m": 40,
    "width_m": 60,
    "height_m": 3
  },
  "rentalCostPerSqmPerMonth": 10,
  "upfrontFee": 1500
}
```


## blueprints/structures/shed.json

```json
{
  "id": "d96dd659-4678-4d5d-a97c-a590ab52c2f2",
  "name": "Shed",
  "footprint": {
    "length_m": 6,
    "width_m": 5,
    "height_m": 3
  },
  "rentalCostPerSqmPerMonth": 1,
  "upfrontFee": 50
}
```


## blueprints/structures/small_warehouse.json

```json
{
  "id": "43ee4095-627d-4a0c-860b-b10affbcf603",
  "name": "Small Warehouse",
  "footprint": {
    "length_m": 20,
    "width_m": 20,
    "height_m": 3
  },
  "rentalCostPerSqmPerMonth": 10,
  "upfrontFee": 500
}
```


## configs/difficulty.json

```json
{
  "easy": {
    "name": "Easy",
    "description": "A relaxed experience with more resilient plants, reliable equipment, and favorable economic conditions.",
    "modifiers": {
      "plantStress": {
        "optimalRangeMultiplier": 1.2,
        "stressAccumulationMultiplier": 0.8
      },
      "deviceFailure": {
        "mtbfMultiplier": 1.5
      },
      "economics": {
        "initialCapital": 2000000,
        "itemPriceMultiplier": 0.9,
        "harvestPriceMultiplier": 1.1,
        "rentPerSqmStructurePerTick": 0.1,
        "rentPerSqmRoomPerTick": 0.2
      }
    }
  },
  "normal": {
    "name": "Normal",
    "description": "A balanced simulation reflecting standard conditions.",
    "modifiers": {
      "plantStress": {
        "optimalRangeMultiplier": 1.0,
        "stressAccumulationMultiplier": 1.0
      },
      "deviceFailure": {
        "mtbfMultiplier": 1.0
      },
      "economics": {
        "initialCapital": 1500000,
        "itemPriceMultiplier": 1.0,
        "harvestPriceMultiplier": 1.0,
        "rentPerSqmStructurePerTick": 0.15,
        "rentPerSqmRoomPerTick": 0.3
      }
    }
  },
  "hard": {
    "name": "Hard",
    "description": "A challenging simulation with sensitive plants, less reliable equipment, and tighter economic constraints.",
    "modifiers": {
      "plantStress": {
        "optimalRangeMultiplier": 0.8,
        "stressAccumulationMultiplier": 1.2
      },
      "deviceFailure": {
        "mtbfMultiplier": 0.75
      },
      "economics": {
        "initialCapital": 1000000,
        "itemPriceMultiplier": 1.1,
        "harvestPriceMultiplier": 0.9,
        "rentPerSqmStructurePerTick": 0.2,
        "rentPerSqmRoomPerTick": 0.4
      }
    }
  }
}

```


## configs/disease_balancing.json

```json
{
  "kind": "DiseaseBalancing",
  "version": "1.0.0",
  "notes": "Phase- and environment-level multipliers for disease progression and recovery; values are normalized (0..1) or unitless multipliers.",
  "global": {
    "baseDailyInfectionMultiplier": 1.0,
    "baseRecoveryMultiplier": 1.0,
    "maxConcurrentDiseases": 2,
    "symptomDelayDays": {
      "min": 1,
      "max": 5
    },
    "eventWeights": {
      "emitOnThresholdCross": 1.0,
      "emitOnFatality": 1.0
    }
  },
  "phaseMultipliers": {
    "seedling": {
      "infection": 1.2,
      "degeneration": 1.1,
      "recovery": 0.85
    },
    "vegetation": {
      "infection": 1.0,
      "degeneration": 1.0,
      "recovery": 1.0
    },
    "earlyFlower": {
      "infection": 1.1,
      "degeneration": 1.2,
      "recovery": 0.95
    },
    "lateFlower": {
      "infection": 1.3,
      "degeneration": 1.4,
      "recovery": 0.8
    },
    "ripening": {
      "infection": 1.1,
      "degeneration": 1.5,
      "recovery": 0.75
    }
  },
  "environmentModifiers": {
    "relativeHumidity": {
      "sensitivity": 1.0,
      "optimalRange": [
        0.5,
        0.65
      ],
      "aboveOptimalInfectionMultPer+0.05": 1.1,
      "belowOptimalInfectionMultPer-0.05": 1.05
    },
    "temperature": {
      "sensitivity": 0.8,
      "optimalRange": [
        22,
        26
      ],
      "distanceToOptimalMultPer+2C": 1.05
    },
    "leafWetness": {
      "sensitivity": 1.2,
      "wetnessBonusInfectionMultiplier": 1.25
    },
    "airflow": {
      "lowAirflowRiskMultiplier": 1.15,
      "goodAirflowRecoveryMultiplier": 1.1
    }
  },
  "strainResistanceWeights": {
    "generalResilienceWeight": 0.7,
    "specificResistanceWeight": 0.3
  },
  "treatmentEfficacy": {
    "cultural": {
      "infectionMultiplier": 0.9,
      "degenerationMultiplier": 0.95,
      "recoveryMultiplier": 1.05
    },
    "biological": {
      "infectionMultiplier": 0.85,
      "degenerationMultiplier": 0.9,
      "recoveryMultiplier": 1.1
    },
    "mechanical": {
      "infectionMultiplier": 0.8,
      "degenerationMultiplier": 0.85,
      "recoveryMultiplier": 1.05
    },
    "chemical": {
      "infectionMultiplier": 0.7,
      "degenerationMultiplier": 0.8,
      "recoveryMultiplier": 1.15
    }
  },
  "caps": {
    "minDailyDegeneration": 0.0,
    "maxDailyDegeneration": 0.2,
    "minDailyRecovery": 0.0,
    "maxDailyRecovery": 0.2
  },
  "integrationHints": {
    "applyOrder": [
      "phaseMultipliers",
      "environmentModifiers",
      "strainResistanceWeights",
      "treatmentEfficacy",
      "caps"
    ],
    "mapToDiseaseModel": {
      "dailyInfectionIncrement": "× global.baseDailyInfectionMultiplier × phaseMultipliers.*.infection × environmentModifiers.* × (1 - resistance)",
      "degenerationRate": "× phaseMultipliers.*.degeneration × treatmentEfficacy.*.degenerationMultiplier → clamp caps",
      "recoveryRate": "× phaseMultipliers.*.recovery × treatmentEfficacy.*.recoveryMultiplier → clamp caps"
    }
  }
}
```


## configs/pest_balancing.json

```json
{
  "kind": "PestBalancing",
  "version": "1.0.0",
  "notes": "Population growth, damage and control multipliers for pests; normalized values and unitless multipliers.",
  "global": {
    "baseDailyReproductionMultiplier": 1.0,
    "baseDailyMortalityMultiplier": 1.0,
    "baseDamageMultiplier": 1.0,
    "maxConcurrentPests": 3,
    "economicThresholds": {
      "photosynthesisReductionAlert": 0.08,
      "rootUptakeReductionAlert": 0.12,
      "budLossAlert": 0.02
    },
    "eventWeights": {
      "emitOnOutbreak": 1.0,
      "emitOnControlSuccess": 1.0
    }
  },
  "phaseMultipliers": {
    "seedling": {
      "reproduction": 1.1,
      "damage": 1.15,
      "mortality": 0.95
    },
    "vegetation": {
      "reproduction": 1.0,
      "damage": 1.0,
      "mortality": 1.0
    },
    "earlyFlower": {
      "reproduction": 1.05,
      "damage": 1.15,
      "mortality": 0.95
    },
    "lateFlower": {
      "reproduction": 1.1,
      "damage": 1.3,
      "mortality": 0.9
    },
    "ripening": {
      "reproduction": 0.95,
      "damage": 1.4,
      "mortality": 0.95
    }
  },
  "environmentModifiers": {
    "relativeHumidity": {
      "hotDryBoostForMitesAtRH<0.45": 1.2,
      "wetMediaBoostForGnatsAtRH>0.70": 1.25
    },
    "temperature": {
      "warmBoostForMitesAtT>26": 1.15,
      "coolSlowdownForWhitefliesAtT<20": 0.85
    },
    "substrate": {
      "overwateringBoost": 1.3,
      "goodDrainageMortalityBoost": 1.1
    },
    "airflow": {
      "lowAirflowReproductionBoost": 1.1
    }
  },
  "naturalEnemies": {
    "backgroundPredationPerDay": 0.03,
    "enhancedPredationWithBiocontrol": 0.12
  },
  "controlEfficacy": {
    "biological": {
      "reproductionMultiplier": 0.8,
      "mortalityMultiplier": 1.2,
      "damageMultiplier": 0.9
    },
    "cultural": {
      "reproductionMultiplier": 0.9,
      "mortalityMultiplier": 1.05,
      "damageMultiplier": 0.95
    },
    "mechanical": {
      "reproductionMultiplier": 0.85,
      "mortalityMultiplier": 1.1,
      "damageMultiplier": 0.9
    },
    "chemical": {
      "reproductionMultiplier": 0.7,
      "mortalityMultiplier": 1.3,
      "damageMultiplier": 0.8
    }
  },
  "diseaseInteraction": {
    "vectorRiskToInfectionMultiplier": 1.15,
    "honeydewToMoldRiskMultiplier": 1.2
  },
  "caps": {
    "minDailyReproduction": 0.0,
    "maxDailyReproduction": 0.6,
    "minDailyMortality": 0.0,
    "maxDailyMortality": 0.6,
    "minDailyDamage": 0.0,
    "maxDailyDamage": 0.4
  },
  "integrationHints": {
    "applyOrder": [
      "phaseMultipliers",
      "environmentModifiers",
      "naturalEnemies",
      "controlEfficacy",
      "caps"
    ],
    "mapToPestModel": {
      "populationGrowth": "populationDynamics.dailyReproductionRate × global.baseDailyReproductionMultiplier × phaseMultipliers.*.reproduction × envMods → − mortality",
      "mortality": "populationDynamics.dailyMortalityRate × global.baseDailyMortalityMultiplier × phaseMultipliers.*.mortality × (1 + naturalEnemies.backgroundPredationPerDay)",
      "damage": "damageModel.* × global.baseDamageMultiplier × phaseMultipliers.*.damage × controlEfficacy.*.damageMultiplier → clamp caps"
    }
  }
}
```


## configs/task_definitions.json

```json

{
  "repair_device": {
    "costModel": { "basis": "perAction", "laborMinutes": 90 },
    "priority": 10,
    "requiredRole": "Technician",
    "requiredSkill": "Maintenance",
    "minSkillLevel": 2,
    "description": "Repair {deviceName} in {zoneName}"
  },
  "maintain_device": {
    "costModel": { "basis": "perAction", "laborMinutes": 30 },
    "priority": 3,
    "requiredRole": "Technician",
    "requiredSkill": "Maintenance",
    "minSkillLevel": 4,
    "description": "Maintain {deviceName} in {zoneName}"
  },
  "harvest_plants": {
    "costModel": { "basis": "perPlant", "laborMinutes": 5 },
    "priority": 9,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Harvest {plantCount} plants in {zoneName}"
  },
  "refill_supplies_water": {
    "costModel": { "basis": "perAction", "laborMinutes": 15 },
    "priority": 8,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Refill water in {zoneName}"
  },
  "refill_supplies_nutrients": {
    "costModel": { "basis": "perAction", "laborMinutes": 15 },
    "priority": 8,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Refill nutrients in {zoneName}"
  },
  "clean_zone": {
    "costModel": { "basis": "perSquareMeter", "laborMinutes": 1 },
    "priority": 6,
    "requiredRole": "Janitor",
    "requiredSkill": "Cleanliness",
    "minSkillLevel": 0,
    "description": "Clean {zoneName} ({area}m²)"
  },
  "overhaul_zone_substrate": {
    "costModel": { "basis": "perSquareMeter", "laborMinutes": 5 },
    "priority": 7,
    "requiredRole": "Janitor",
    "requiredSkill": "Cleanliness",
    "minSkillLevel": 2,
    "description": "Overhaul substrate in {zoneName} ({area}m²)"
  },
  "reset_light_cycle": {
    "costModel": { "basis": "perAction", "laborMinutes": 5 },
    "priority": 5,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Reset light cycle in {zoneName}"
  },
  "execute_planting_plan": {
    "costModel": { "basis": "perPlant", "laborMinutes": 2 },
    "priority": 4,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 0,
    "description": "Plant {plantCount} seedlings in {zoneName}"
  },
  "adjust_light_cycle": {
    "costModel": { "basis": "perAction", "laborMinutes": 5 },
    "priority": 8,
    "requiredRole": "Gardener",
    "requiredSkill": "Gardening",
    "minSkillLevel": 3,
    "description": "Adjust light cycle in {zoneName} for flowering"
  }
}

```


## configs/treatment_options.json

```json
{
  "kind": "TreatmentOptions",
  "version": "1.1.0",
  "notes": "Unified treatment catalogue for diseases and pests. All efficacy values are multipliers applied on top of blueprint/balancing values. Values <1 reduce infection/reproduction/damage; values >1 increase recovery/mortality. Costs: materialsCost uses a costBasis to scale to the actual application size.",
  "global": {
    "stackingRules": {
      "maxConcurrentTreatmentsPerZone": 3,
      "mechanicalAlwaysStacks": true,
      "chemicalAndBiologicalCantShareSameMoAWithin7Days": true,
      "cooldownDaysDefault": 3
    },
    "sideEffects": {
      "phytotoxicityRiskKeys": [
        "oilOnBloom",
        "uvcOnTenderLeaves"
      ],
      "beneficialsHarmRiskKeys": [
        "broadSpectrumInsecticide",
        "sulfurHighDose"
      ]
    },
    "costModel": {
      "costBasis": {
        "perZone": "materialsCost applies once per application for the entire zone (scaleFactor=1).",
        "perPlant": "materialsCost is multiplied by the number of plants in the treated zone.",
        "perSquareMeter": "materialsCost is multiplied by the zone area in square meters."
      },
      "totalCostFormula": "totalCost = (materialsCost × scaleFactor) + laborMinutes×wageRate + optionalEnergy + optionalEquipment"
    }
  },
  "options": [
    {
      "id": "defbc266-d4a8-4d1d-bb90-c603ea4574d6",
      "name": "Increase Airflow",
      "category": "cultural",
      "targets": [
        "disease",
        "pest"
      ],
      "applicability": [
        "seedling",
        "vegetation",
        "earlyFlower",
        "lateFlower",
        "ripening"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.92,
          "degenerationMultiplier": 0.95,
          "recoveryMultiplier": 1.05
        },
        "pest": {
          "reproductionMultiplier": 0.92,
          "damageMultiplier": 0.95,
          "mortalityMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 45,
        "materialsCost": 0.0
      },
      "cooldownDays": 0,
      "notes": "Pruning lower leaves, repositioning fans, cleaning filters.",
      "costBasis": "perZone"
    },
    {
      "id": "97187f66-817f-4e8a-b0cb-db237b663743",
      "name": "Dehumidify Night Cycle",
      "category": "cultural",
      "targets": [
        "disease"
      ],
      "applicability": [
        "earlyFlower",
        "lateFlower",
        "ripening"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.9,
          "recoveryMultiplier": 1.1
        }
      },
      "costs": {
        "laborMinutes": 10,
        "energyPerHourKWh": 1.2,
        "materialsCost": 2.0
      },
      "cooldownDays": 0,
      "notes": "Adjust setpoints to prevent condensation; pairs well with defoliation.",
      "costBasis": "perZone"
    },
    {
      "id": "0828046f-3986-456b-9abe-3f35f5a1f9c4",
      "name": "Dry-Down Irrigation Cycle",
      "category": "cultural",
      "targets": [
        "pest",
        "disease"
      ],
      "applicability": [
        "seedling",
        "vegetation",
        "earlyFlower"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.85,
          "mortalityMultiplier": 1.1,
          "damageMultiplier": 0.95
        },
        "disease": {
          "infectionMultiplier": 0.9,
          "recoveryMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 15,
        "materialsCost": 0.0
      },
      "cooldownDays": 2,
      "notes": "Especially effective against fungus gnats and root pathogens.",
      "costBasis": "perZone"
    },
    {
      "id": "fa328792-9539-4254-bd5d-cbe8233b6289",
      "name": "Predatory Mites (Phytoseiulus/Amblyseius)",
      "category": "biological",
      "targets": [
        "pest"
      ],
      "applicability": [
        "vegetation",
        "earlyFlower",
        "lateFlower"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.75,
          "mortalityMultiplier": 1.25,
          "damageMultiplier": 0.9
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 35.0
      },
      "cooldownDays": 7,
      "risks": {
        "beneficialsHarm": false
      },
      "notes": "Best for spider/broad mites; maintain moderate RH.",
      "costBasis": "perPlant"
    },
    {
      "id": "a0e34f90-c9de-4a95-a88d-9a1a615dd747",
      "name": "Bacillus subtilis (foliar)",
      "category": "biological",
      "targets": [
        "disease"
      ],
      "applicability": [
        "vegetation",
        "earlyFlower"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.8,
          "degenerationMultiplier": 0.9,
          "recoveryMultiplier": 1.1
        }
      },
      "costs": {
        "laborMinutes": 30,
        "materialsCost": 18.0
      },
      "cooldownDays": 7,
      "notes": "Preventive + early curative against powdery mildew.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "80edee83-4577-4063-877c-68f8d6ab35bc",
      "name": "Trichoderma (root drench)",
      "category": "biological",
      "targets": [
        "disease",
        "pest"
      ],
      "applicability": [
        "seedling",
        "vegetation",
        "earlyFlower"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.82,
          "degenerationMultiplier": 0.9,
          "recoveryMultiplier": 1.08
        },
        "pest": {
          "reproductionMultiplier": 0.9,
          "mortalityMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 22.0
      },
      "cooldownDays": 10,
      "notes": "Suppresses root pathogens; slight benefit vs root aphids.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "26eba5ec-66e0-41e9-98b5-cce64ebbc079",
      "name": "Bti (Bacillus thuringiensis israelensis)",
      "category": "biological",
      "targets": [
        "pest"
      ],
      "applicability": [
        "seedling",
        "vegetation",
        "earlyFlower"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.7,
          "mortalityMultiplier": 1.35,
          "damageMultiplier": 0.85
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 15.0
      },
      "cooldownDays": 7,
      "notes": "Highly effective on fungus gnat larvae; drench media.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "8241536e-1b0e-4f7b-8857-63bca0179c3e",
      "name": "Remove Infected Tissue",
      "category": "mechanical",
      "targets": [
        "disease"
      ],
      "applicability": [
        "vegetation",
        "earlyFlower",
        "lateFlower"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.8,
          "recoveryMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 25,
        "materialsCost": 1.5
      },
      "cooldownDays": 0,
      "notes": "Bag and discard; disinfect tools between cuts.",
      "costBasis": "perZone"
    },
    {
      "id": "40d709c5-5cc6-4bbf-92d0-7e172057170c",
      "name": "Sticky Cards (yellow/blue)",
      "category": "mechanical",
      "targets": [
        "pest"
      ],
      "applicability": [
        "seedling",
        "vegetation",
        "earlyFlower",
        "lateFlower",
        "ripening"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.95,
          "mortalityMultiplier": 1.08,
          "damageMultiplier": 0.97
        }
      },
      "costs": {
        "laborMinutes": 10,
        "materialsCost": 8.0
      },
      "cooldownDays": 0,
      "notes": "Monitoring plus partial mass trapping of flying adults.",
      "costBasis": "perZone"
    },
    {
      "id": "327a4266-caba-4129-8538-0f7f2c12fbd0",
      "name": "Rinse/Jet Wash",
      "category": "mechanical",
      "targets": [
        "pest"
      ],
      "applicability": [
        "vegetation"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.85,
          "mortalityMultiplier": 1.1,
          "damageMultiplier": 0.9
        }
      },
      "costs": {
        "laborMinutes": 30,
        "materialsCost": 0.5
      },
      "cooldownDays": 3,
      "notes": "Effective on aphids/mites early; avoid oversaturation of media.",
      "costBasis": "perZone"
    },
    {
      "id": "91d9ee39-32e5-4d83-9702-1365d171a5ea",
      "name": "Horticultural Oil (foliar)",
      "category": "chemical",
      "targets": [
        "pest",
        "disease"
      ],
      "applicability": [
        "vegetation",
        "earlyFlower"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.7,
          "mortalityMultiplier": 1.3,
          "damageMultiplier": 0.85
        },
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.9
        }
      },
      "costs": {
        "laborMinutes": 35,
        "materialsCost": 12.0
      },
      "cooldownDays": 7,
      "risks": {
        "phytotoxicity": "medium",
        "notes": "Avoid on open flowers; can harm beneficials."
      },
      "costBasis": "perSquareMeter"
    },
    {
      "id": "ba30fafa-3751-4c56-9315-c289c8780dd0",
      "name": "Potassium Bicarbonate (foliar)",
      "category": "chemical",
      "targets": [
        "disease"
      ],
      "applicability": [
        "vegetation",
        "earlyFlower"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.75,
          "degenerationMultiplier": 0.85,
          "recoveryMultiplier": 1.1
        }
      },
      "costs": {
        "laborMinutes": 25,
        "materialsCost": 6.0
      },
      "cooldownDays": 5,
      "notes": "Good knockdown for powdery mildew; pH shock on leaf surface.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "131fe37b-967b-4ff3-a9fd-d15cab018dc0",
      "name": "Sulfur (vapor/low-dose spray)",
      "category": "chemical",
      "targets": [
        "disease",
        "pest"
      ],
      "applicability": [
        "vegetation"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.7,
          "degenerationMultiplier": 0.85
        },
        "pest": {
          "reproductionMultiplier": 0.9,
          "mortalityMultiplier": 1.08
        }
      },
      "costs": {
        "laborMinutes": 30,
        "materialsCost": 10.0
      },
      "cooldownDays": 10,
      "risks": {
        "phytotoxicity": "medium",
        "beneficialsHarm": "medium"
      },
      "notes": "Do not combine with oils within 10–14 days.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "b5792994-eb74-4d89-8c50-246308b138a2",
      "name": "Spinosad (where permitted)",
      "category": "chemical",
      "targets": [
        "pest"
      ],
      "applicability": [
        "vegetation",
        "earlyFlower"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.6,
          "mortalityMultiplier": 1.4,
          "damageMultiplier": 0.8
        }
      },
      "costs": {
        "laborMinutes": 25,
        "materialsCost": 18.0
      },
      "cooldownDays": 10,
      "risks": {
        "beneficialsHarm": "high"
      },
      "notes": "Rotate modes of action to prevent resistance.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "dfac9a95-ea56-4606-9417-e5e1382892ed",
      "name": "Btk (Bacillus thuringiensis kurstaki)",
      "category": "chemical",
      "targets": [
        "pest"
      ],
      "applicability": [
        "vegetation",
        "earlyFlower",
        "lateFlower"
      ],
      "efficacy": {
        "pest": {
          "reproductionMultiplier": 0.7,
          "mortalityMultiplier": 1.35,
          "damageMultiplier": 0.85
        }
      },
      "costs": {
        "laborMinutes": 20,
        "materialsCost": 14.0
      },
      "cooldownDays": 7,
      "notes": "Selective for caterpillars; minimal impact on beneficials.",
      "costBasis": "perSquareMeter"
    },
    {
      "id": "5dc92d86-7f0f-4e7f-8577-69b50f71ee78",
      "name": "UV-C Pass (controlled exposure)",
      "category": "physical",
      "targets": [
        "disease",
        "pest"
      ],
      "applicability": [
        "vegetation"
      ],
      "efficacy": {
        "disease": {
          "infectionMultiplier": 0.85,
          "degenerationMultiplier": 0.92
        },
        "pest": {
          "reproductionMultiplier": 0.9,
          "mortalityMultiplier": 1.05
        }
      },
      "costs": {
        "laborMinutes": 20,
        "equipmentRentalEUR": 25.0,
        "materialsCost": 0.0
      },
      "cooldownDays": 14,
      "risks": {
        "phytotoxicity": "high"
      },
      "notes": "Short exposure; high risk for tender tissue. Safety protocols required.",
      "costBasis": "perZone"
    }
  ]
}
```


## personnel/firstNames.json

```json

[
  "Aaliyah", "Aaron", "Abigail", "Adam", "Aditya", "Ahmed", "Aisha", "Alex", "Alexander", "Alexandra", 
  "Ali", "Alice", "Amelia", "An", "Ana", "Andrea", "Andrei", "Anna", "Anthony", "Anton", 
  "Aria", "Arthur", "Ashley", "Astrid", "Atsuki", "Ava", "Ayako", "Benjamin", "Camila", "Carlos", 
  "Carmen", "Chen", "Chloe", "Cho", "Christian", "Christopher", "Clara", "Daniel", "David", "Dmitry", 
  "Elena", "Elijah", "Elizabeth", "Ella", "Emily", "Emma", "Enrique", "Eric", "Ethan", "Eva", 
  "Evelyn", "Fatima", "Felix", "Finn", "Fiona", "Francisco", "Freja", "Gabriel", "Gabriela", "George", 
  "Grace", "Guadalupe", "Gustav", "Hailey", "Hajun", "Han", "Hana", "Hannah", "Hans", "Haru", 
  "Harper", "Hassan", "He", "Heinrich", "Helena", "Henry", "Hiroki", "Hiroshi", "Hugo", "Ibrahim", 
  "Ida", "Igor", "Illya", "Imani", "Ingrid", "Irina", "Isabella", "Isabelle", "Isla", "Ivan", 
  "Jack", "Jacob", "Jakub", "James", "Jasmine", "Javier", "Jayden", "Jessica", "Ji-hoon", "Jin", 
  "Joao", "John", "Jose", "Joseph", "Joshua", "Juan", "Julia", "Julian", "Jung", "Kai", 
  "Kaito", "Katarina", "Kate", "Katsumi", "Kenji", "Khaled", "Kim", "Klaus", "Kristina", "Laura", 
  "Lea", "Leo", "Leon", "Li", "Liam", "Lila", "Lily", "Lin", "Linda", "Logan", 
  "Lotte", "Louis", "Lucas", "Ludwig", "Luka", "Luke", "Luna", "Madison", "Maja", "Manuel", 
  "Marco", "Maria", "Mariam", "Mario", "Mark", "Marta", "Martin", "Mary", "Mateo", "Matthew", 
  "Mei", "Mia", "Michael", "Miguel", "Mila", "Min-jun", "Mohammed", "Muhammad", "Naoki", "Natalia", 
  "Nathan", "Nikolai", "Nikola", "Noah", "Noe", "Nora", "Nur", "Olga", "Oliver", "Olivia", 
  "Omar", "Oscar", "Owen", "Pablo", "Park", "Patricia", "Patrick", "Paul", "Penelope", "Peter", 
  "Priya", "Rahul", "Raj", "Riku", "Robert", "Rodrigo", "Rohan", "Ronan", "Rosa", "Rose", 
  "Ruben", "Ryan", "Sakura", "Sam", "Samantha", "Samuel", "Sandra", "Santiago", "Sara", "Sasha", 
  "Sebastian", "Seo-yeon", "Sergei", "Shinji", "Sofia", "Sofie", "Sonya", "Sophia", "Sophie", "Stefan", 
  "Stella", "Sven", "Takashi", "Taro", "Tatiana", "Tatsuo", "Tatyana", "Thomas", "Tom", "Tomoya", 
  "Valentina", "Valeria", "Vera", "Victor", "Victoria", "Viktor", "Vincent", "Vladimir", "Wei", "William", 
  "Xin", "Yadav", "Yamada", "Yan", "Yara", "Ying", "Yua", "Yuki", "Yuri", "Yusuf", 
  "Zoe", "Zofia"
]

```


## personnel/lastNames.json

```json

[
  "Abbas", "Abbott", "Abe", "Abebe", "Abramson", "Ackerman", "Adams", "Adler", "Agarwal", "Aguilar", 
  "Ahmed", "Aitken", "Akhtar", "Al-Farsi", "Al-Ghassani", "Al-Hamad", "Al-Jamil", "Al-Rashid", "Al-Saeed", "Ali", 
  "Allen", "Almeida", "Alonso", "Alvarez", "Anand", "Andersen", "Anderson", "Andersson", "Ando", "Andrews", 
  "Antonelli", "Antonopoulos", "Aoki", "Araya", "Araújo", "Arnold", "Aronsson", "Arora", "Ashton", "Auer", 
  "Baba", "Bach", "Bae", "Baek", "Bailey", "Baker", "Bakker", "Balakrishnan", "Banerjee", "Bang", 
  "Baranov", "Barbieri", "Barnes", "Barros", "Bauer", "Becker", "Bell", "Ben-David", "Bennett", "Berendsen", 
  "Berg", "Berger", "Bergman", "Bernard", "Bernstein", "Bhatt", "Bianchi", "Bibi", "Bjork", "Black", 
  "Blanc", "Blanco", "Blau", "Blom", "Böhm", "Bondarenko", "Bos", "Botha", "Boucher", "Boyko", 
  "Braun", "Bravo", "Breuer", "Brooks", "Brown", "Browne", "Brun", "Bruno", "Bryant", "Burke", 
  "Burns", "Bustos", "Byrne", "Campbell", "Campos", "Cardoso", "Carlson", "Carlsson", "Carr", "Carroll", 
  "Carter", "Carvalho", "Castillo", "Castro", "Chae", "Chakrabarti", "Chan", "Chandran", "Chang", "Chapman", 
  "Chaudhari", "Chavez", "Chen", "Cheng", "Cheung", "Cho", "Choi", "Chopra", "Chow", "Christensen", 
  "Christiansen", "Chu", "Chung", "Ciobanu", "Clark", "Clarke", "Cohen", "Cole", "Coleman", "Collins", 
  "Conti", "Cook", "Cooper", "Correa", "Costa", "Cox", "Craig", "Crawford", "Cruz", "Cullen", 
  "Cunningham", "Da Silva", "Dahl", "Dalton", "Dam", "Das", "Dasgupta", "Davies", "Davis", "De Boer", 
  "De Haan", "De Jong", "De Lange", "De Luca", "De Vries", "Deng", "Desai", "Deshpande", "Devi", "Dias", 
  "Diaz", "Dijkstra", "Dimitrov", "Dixon", "Djordjevic", "Do", "Dominguez", "Doshi", "Doyle", "Dubois", 
  "Dunn", "Dutta", "Edwards", "Egorov", "Ek", "Eliassen", "Endo", "Eriksson", "Espinoza", "Estevez", 
  "Evans", "Fabre", "Falk", "Fan", "Farah", "Farrell", "Faulkner", "Fedorov", "Feng", "Ferguson", 
  "Fernandes", "Fernandez", "Ferreira", "Fiedler", "Fischer", "Fisher", "Fitzgerald", "Fleming", "Fletcher", "Flores", 
  "Flynn", "Fodor", "Foley", "Fonseca", "Fontaine", "Ford", "Forster", "Foster", "Fournier", "Fox", 
  "Frank", "Franke", "Fraser", "Freeman", "Friedman", "Friesen", "Fu", "Fujii", "Fujimoto", "Fujita", 
  "Fukuda", "Fung", "Gallagher", "Gallo", "Gao", "Garcia", "Garg", "Gauthier", "Geisler", "Gentile", 
  "Georgiev", "Gerber", "Ghosh", "Gibson", "Gillespie", "Gimenez", "Giri", "Gomes", "Gomez", "Gonçalves", 
  "Gonzalez", "Goodman", "Gorbachev", "Gordon", "Goto", "Gould", "Goyal", "Graf", "Graham", "Grant", 
  "Gray", "Green", "Greene", "Greer", "Griffin", "Griffiths", "Gruber", "Gu", "Guan", "Guerrero", 
  "Guo", "Gupta", "Gutierrez", "Ha", "Haas", "Hahn", "Hall", "Hamalainen", "Hamid", "Hamilton", 
  "Han", "Hansen", "Hansson", "Hara", "Harb", "Harris", "Harrison", "Hart", "Hartmann", "Hasan", 
  "Hasegawa", "Hashimoto", "Hassan", "Hayashi", "Hayes", "He", "Heikkila", "Heinonen", "Henderson", "Hendriks", 
  "Henry", "Hernandez", "Herrmann", "Hertz", "Hess", "Hill", "Hirano", "Ho", "Hoffman", "Hoffmann", 
  "Hofmann", "Holland", "Holm", "Holmgren", "Hong", "Horvath", "Hosseini", "Howard", "Howell", "Hsu", 
  "Hu", "Huang", "Huber", "Hughes", "Huh", "Hunt", "Hunter", "Husain", "Hussain", "Hwang", 
  "Ibrahim", "Ichikawa", "Iglesias", "Iida", "Ikeda", "Im", "Inoue", "Ishida", "Ishii", "Ishikawa", 
  "Ito", "Ivanov", "Ivanova", "Iversen", "Jackson", "Jacobs", "Jacobsen", "Jaeger", "Jain", "Jakobsson", 
  "Jansen", "Janssen", "Janssens", "Jarvinen", "Jensen", "Jeong", "Jimenez", "Jin", "Jo", "Johansen"
]

```


## personnel/traits.json

```json

[
  {
    "id": "trait_green_thumb",
    "name": "Green Thumb",
    "description": "Naturally gifted with plants, providing a slight bonus to all gardening tasks.",
    "type": "positive"
  },
  {
    "id": "trait_night_owl",
    "name": "Night Owl",
    "description": "More energetic and efficient during night shifts.",
    "type": "positive"
  },
  {
    "id": "trait_quick_learner",
    "name": "Quick Learner",
    "description": "Gains skill experience from working and training 15% faster.",
    "type": "positive"
  },
  {
    "id": "trait_optimist",
    "name": "Optimist",
    "description": "Slightly raises the morale of all other employees in the same structure.",
    "type": "positive"
  },
  {
    "id": "trait_gearhead",
    "name": "Gearhead",
    "description": "Has a knack for mechanics, causing devices they maintain to degrade slower.",
    "type": "positive"
  },
  {
    "id": "trait_frugal",
    "name": "Frugal",
    "description": "Accepts a slightly lower salary than their skills would normally demand.",
    "type": "positive"
  },
  {
    "id": "trait_meticulous",
    "name": "Meticulous",
    "description": "Excels at keeping things clean, reducing the chance of random pest or disease outbreaks.",
    "type": "positive"
  },
  {
    "id": "trait_clumsy",
    "name": "Clumsy",
    "description": "Slightly increases the chance of minor errors during maintenance tasks.",
    "type": "negative"
  },
  {
    "id": "trait_slacker",
    "name": "Slacker",
    "description": "Works 10% slower and loses energy more quickly.",
    "type": "negative"
  },
  {
    "id": "trait_pessimist",
    "name": "Pessimist",
    "description": "Slightly lowers the morale of all other employees in the same structure.",
    "type": "negative"
  },
  {
    "id": "trait_forgetful",
    "name": "Forgetful",
    "description": "Takes longer to complete complex tasks and is less efficient at planning.",
    "type": "negative"
  },
  {
    "id": "trait_demanding",
    "name": "Demanding",
    "description": "Expects a higher salary than their skills would normally demand.",
    "type": "negative"
  },
  {
    "id": "trait_slow_learner",
    "name": "Slow Learner",
    "description": "Gains skill experience from working and training 15% slower.",
    "type": "negative"
  }
]

```


## prices/devicePrices.json

```json

{
  "devicePrices": {
    "7d3d3f1a-8c6f-4e9c-926d-5a2a4a3b6f1b": { "capitalExpenditure": 1200, "baseMaintenanceCostPerTick": 0.004, "costIncreasePer1000Ticks": 0.001 },
    "3b5f6ad7-672e-47cd-9a24-f0cc45c4101e": { "capitalExpenditure": 600,  "baseMaintenanceCostPerTick": 0.002, "costIncreasePer1000Ticks": 0.0008 },
    "3d762260-88a5-4104-b03c-9860bbac34b6": { "capitalExpenditure": 250, "baseMaintenanceCostPerTick": 0.002, "costIncreasePer1000Ticks": 0.1 },
    "7a639d3d-4750-440a-a200-f90d11dc3c62": { "capitalExpenditure": 350,  "baseMaintenanceCostPerTick": 0.0015, "costIncreasePer1000Ticks": 0.0006 },
    "c701efa6-1e90-4f28-8934-ea9c584596e4": { "capitalExpenditure": 220,  "baseMaintenanceCostPerTick": 0.0008, "costIncreasePer1000Ticks": 0.0004 },
    "f5d5c5a0-1b2c-4d3e-8f9a-0b1c2d3e4f5a": { "capitalExpenditure": 75, "baseMaintenanceCostPerTick": 0.0005, "costIncreasePer1000Ticks": 0.0002 }
  }
}

```


## prices/strainPrices.json

```json
{
  "strainPrices": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "seedPrice": 0.5,
      "harvestPricePerGram": 4.2
    },
    "550e8400-e29b-41d4-a716-446655440001": {
      "seedPrice": 0.6,
      "harvestPricePerGram": 4.0
    },
    "3f0f15f4-1b75-4196-b3f3-5f6b6b7cf7a7": {
      "seedPrice": 0.7,
      "harvestPricePerGram": 4.5
    },
    "5a6e9e57-0b3a-4f9f-8f19-12f3f8ec3a0e": {
      "seedPrice": 0.55,
      "harvestPricePerGram": 4.3
    },
    "8b9a0b6c-2d6c-4f58-9c37-7a6c9d4aa5c2": {
      "seedPrice": 0.8,
      "harvestPricePerGram": 5.0
    }
  }
}
```


## prices/utilityPrices.json

```json
{
  "pricePerKwh": 0.15,
  "pricePerLiterWater": 0.02,
  "pricePerGramNutrients": 0.10
}
```

