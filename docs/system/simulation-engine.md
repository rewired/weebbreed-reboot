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

See [WB Physiology Reference](./wb-physio.md) for the concrete formulas and unit conventions used in the physio helpers.

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
   - **Humidifier/Dehumidifier**
     - Water mass flow (`humidifyRateKgPerTick`, `dehumidifyRateKgPerTick` or `latentRemovalKgPerTick`) converts to relative humidity deltas with `ΔRH = (mass_kg ÷ (volume_m3 × SATURATION_VAPOR_DENSITY_KG_PER_M3)) × efficiency × powerMod`.
     - `SATURATION_VAPOR_DENSITY_KG_PER_M3 ≈ 0.0173 kg·m⁻³` (20 °C reference) anchors the simple moisture balance; outputs are clamped to `[0,1]` after device hysteresis and controller modulation (`humidityHumidify` / `humidityDehumidify`).
   - **CO2Injector**: move `CO2` toward `targetCO2_ppm`, capped by `maxSafeCO2_ppm`.
3. **Plant deltas** (coarse canopy physiology)
   - **Transpiration**: convert the zone’s aggregated `transpirationLiters` into a humidity delta using
     `SATURATION_VAPOR_DENSITY_KG_PER_M3` and the zone volume. The same liter quantity is removed from the
     zone’s water/nutrient reservoirs, lowering `reservoirLevel` and weakening `nutrientStrength` before
     clamps are applied.
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

During the same `updatePlants` phase the engine now aggregates the returned
`transpirationLiters` per zone and immediately applies the irrigation feedback:
humidity is increased according to the zone volume while the corresponding water
and nutrient solution volumes are depleted (`reservoirLevel` and
`nutrientStrength` drop accordingly). This keeps the environment and resource
state in lockstep with plant transpiration before the tick commits.

---

## Health: Pests & Diseases (detect → progress → spread → treat)

Integrates **data-driven** pests/diseases with **operational** treatments.

### Tick Order (health phase)

1. **Detect**  
   Visibility rises with time/conditions; **scouting tasks** improve detection; traps add passive checks.  
   Emit `pest.detected` / `disease.confirmed` on threshold.
2. **Progress**  
   Advance **severity/infection** using blueprint daily increments (scaled to ticks) × environmental risk × phase multipliers.  
   Apply **damage** to plant processes (growth, transpiration, mortality risk) per blueprint. 3. **Spread**  
   Stochastic spread within zone and to neighbors; modulated by **airflow (mixing)**, **sanitation**, and **tool transmission**.  
   Quarantine/locks reduce adjacency graph edges.
3. **Treat**  
   Apply active **treatments** from `configs/treatment_options.json`: efficacy multipliers to infection/degeneration/recovery.  
   Enforce **cooldowns**, **reentryIntervalTicks**, **preHarvestIntervalTicks**; set **safety constraints** that block task claiming. 5. **Emit events**  
   `health.spread`, `treatment.applied`, `outbreak.contained`, `treatment.failed`.

---

## Tasks & Agentic Employees (utility-based; overtime-aware)

The hiring side of this system—including weekly candidate refresh mechanics—is
documented in [Job Market Population](./job_market_population.md).

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
  - **Maintenance**: `baseMaintenanceCostPerTick` (hourly base rate) × tickHours, with aging via `costIncreasePer1000Ticks`.
  - **Energy**: sum `(device.power_kW × tickHours × electricityCostPerKWh)` for active devices.
  - **Water/Nutrients**: from zone demand using **g/m²/day** curves → per-tick spend via `waterCostPerM3`, `nutrientsCostPerKg`.
- **Rent**: structure fixed costs or `area_m2 × rentalRate`, stored as hourly rates and multiplied by tickHours.

Recurring OpEx entries should always derive their per-tick charge from the current tick length
(`tickHours = tickLengthMinutes / 60`) so that changing the tick length at runtime does not drift
total rent or maintenance over real-time hours.

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
