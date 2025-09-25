# Extracted Formulas

## F-0001 — Breeding

- Source: docs/addendum/ideas/breeding_module.md#1-real-→-game-mapping-time (L22)
- Heading: 1) Real → Game Mapping (Time)

> T_gen = veg + flower + tail + post

```math
T_gen = veg + flower + tail + post
```

## F-0002 — Breeding

- Source: docs/addendum/ideas/breeding_module.md#1-real-→-game-mapping-time (L23)
- Heading: 1) Real → Game Mapping (Time)

> veg = avg(vegetationDays[A], vegetationDays[B])

```math
veg   = avg(vegetationDays[A], vegetationDays[B])
```

## F-0003 — Breeding

- Source: docs/addendum/ideas/breeding_module.md#1-real-→-game-mapping-time (L24)
- Heading: 1) Real → Game Mapping (Time)

> flower= avg(floweringDays[A], floweringDays[B])

```math
flower= avg(floweringDays[A],  floweringDays[B])
```

## F-0004 — Breeding

- Source: docs/addendum/ideas/breeding_module.md#1-real-→-game-mapping-time (L25)
- Heading: 1) Real → Game Mapping (Time)

> tail = max(0, seedMaturationDays - (flower - pollinationDayInFlower))

```math
tail  = max(0, seedMaturationDays - (flower - pollinationDayInFlower))
```

## F-0005 — Breeding

- Source: docs/addendum/ideas/breeding_module.md#1-real-→-game-mapping-time (L26)
- Heading: 1) Real → Game Mapping (Time)

> post = postProcessingDays

```math
post  = postProcessingDays
```

## F-0006 — Breeding

- Source: docs/addendum/ideas/breeding_module.md#1-real-→-game-mapping-time (L31)
- Heading: 1) Real → Game Mapping (Time)

> Parallelization reduces **calendar time** after the first generation: `effectiveDays ≈ ceil(T_gen / parallelBatches)`.

```math
effectiveDays ≈ ceil(T_gen / parallelBatches)
```

## F-0007 — Terpenes

- Source: docs/addendum/ideas/terpenes.md#3-axis-derivation-from-terpene-profile-heuristic-concept (L57)
- Heading: 3) Axis Derivation from Terpene Profile (Heuristic, Concept)

> - **Input:** terpene shares `w_t = mg_g_t / total_mg_g`.

```math
w_t = mg_g_t / total_mg_g
```

## F-0008 — Terpenes

- Source: docs/addendum/ideas/terpenes.md#3-axis-derivation-from-terpene-profile-heuristic-concept (L59)
- Heading: 3) Axis Derivation from Terpene Profile (Heuristic, Concept)

> - **Computation:** axis = Σ (share_terpene × weight_terpene→axis) → clamp \[0..1]; optional gamma/rescaling.

```math
axis = Σ (share_terpene × weight_terpene→axis) → clamp \[0..1]
```

## F-0009 — Genetics

- Source: docs/DD.md#schema-fields-meaning (L30)
- Heading: Schema (fields & meaning)

> - `genotype?: { sativa?: number, indica?: number, ruderalis?: number }` — Fractions `0–1`; sum ≤ 1 (remainder = unspecified).

```math
sum ≤ 1
```

## F-0010 — Resilience

- Source: docs/DD.md#schema-fields-meaning (L36)
- Heading: Schema (fields & meaning)

> - `tolerances?: object` — Optional numeric tolerance multipliers by category (e.g., `temp`, `humidity`, `co2`, `underwatering`, `overnutrient`), `1.0` = neutral.

```math
1.0 = neutral
```

## F-0011 — Breeding

- Source: docs/DD.md#schema-fields-meaning (L69)
- Heading: Schema (fields & meaning)

> - `noise?: number (0–1)` — **Breeding variability**; max fractional deviation for sampled offspring traits (e.g., `±noise × base`).

```math
±noise × base
```

## F-0012 — Capacity

- Source: docs/DD.md#schema (L168)
- Heading: Schema

> - `areaPerPlant: number (m²)` — Max plant count = `floor(zoneArea / areaPerPlant)`.

```math
Max plant count = floor(zoneArea / areaPerPlant)
```

## F-0013 — Time Scaling

- Source: docs/DD.md#7-prices-—-datapricesjson (L260)
- Heading: 7) Prices — `/data/prices/*.json`

> - `capitalCost?: number` — Alias for legacy `capitalExpenditure`.- `baseMaintenanceCostPerTick?: number` — Hourly maintenance base rate (multiply by `tickLengthMinutes / 60`).- `costIncreasePer1000Ticks?: number` — Aging curve scalar. `}}`

```math
tickLengthMinutes / 60
```

## F-0014 — Tasks

- Source: docs/system/employees.md#2-work-as-discrete-tasks (L63)
- Heading: 2) Work as Discrete Tasks

> When an employee claims a task, their status becomes **Working**. Each tick spent on the task increases `progressTicks` by 1. When `progressTicks >= durationTicks`, the task completes and its **effects** are applied to the game state (device repaired, harvest added to inventory, cleanliness improved, etc.).

```math
progressTicks >= durationTicks
```

## F-0015 — Economics

- Source: docs/system/facade.md#48-finance-market (L121)
- Heading: 4.8 Finance & Market

> - `sellInventory(lotId, quantity_g)` — revenue = `harvestBasePricePerGram × modifiers`.

```math
revenue = harvestBasePricePerGram × modifiers
```

## F-0016 — Scheduler

- Source: docs/system/job_market_population.md#weekly-refresh-lifecycle (L16)
- Heading: Weekly Refresh Lifecycle

> `Math.floor(tick / 168)` (168 ticks ≈ 1 simulated week when 1 tick = 1 hour).

```math
Math.floor(tick / 168)
```

## F-0017 — Seeding

- Source: docs/system/job_market_population.md#deterministic-seeding-strategy (L87)
- Heading: Deterministic Seeding Strategy

> 1. **Weekly API seed.** `apiSeed = override ?? "<gameSeed>-<weekIndex>"` keeps

```math
apiSeed = override ?? "<gameSeed>-<weekIndex>"
```

## F-0018 — Probability

- Source: docs/system/job_market_population.md#candidate-synthesis-pipeline (L112)
- Heading: Candidate Synthesis Pipeline

> 4. **Gender draw.** Seeded RNG selects gender with `P(other) = pDiverse` and

```math
P(other) = pDiverse
```

## F-0019 — Probability

- Source: docs/system/job_market_population.md#candidate-synthesis-pipeline (L113)
- Heading: Candidate Synthesis Pipeline

> `P(male) = P(female) = (1 - pDiverse) / 2`, unless the profile forces a

```math
P(male) = P(female) = (1 - pDiverse) / 2
```

## F-0020 — Scheduler

- Source: docs/system/simulation-engine.md#process (L14)
- Heading: Process

> 1. **Wall-time accumulation**: keep `accumulatedMs += now - lastNow`.

```math
accumulatedMs += now - lastNow
```

## F-0021 — Scheduler

- Source: docs/system/simulation-engine.md#process (L15)
- Heading: Process

> 2. **Tick threshold**: while `accumulatedMs ≥ tickIntervalMs / gameSpeed`, do:

```math
accumulatedMs ≥ tickIntervalMs / gameSpeed
```

## F-0022 — Scheduler

- Source: docs/system/simulation-engine.md#process (L17)
- Heading: Process

> - `accumulatedMs -= tickIntervalMs / gameSpeed`.

```math
accumulatedMs -= tickIntervalMs / gameSpeed
```

## F-0023 — Humidity

- Source: docs/system/simulation-engine.md#tick-order-environment-phase (L48)
- Heading: Tick Order (environment phase)

> - Water mass flow (`humidifyRateKgPerTick`, `dehumidifyRateKgPerTick` or `latentRemovalKgPerTick`) converts to relative humidity deltas with `ΔRH = (mass_kg ÷ (volume_m3 × SATURATION_VAPOR_DENSITY_KG_PER_M3)) × efficiency × powerMod`.

```math
ΔRH = (mass_kg ÷ (volume_m3 × SATURATION_VAPOR_DENSITY_KG_PER_M3)) × efficiency × powerMod
```

## F-0024 — Environment

- Source: docs/system/simulation-engine.md#tick-order-environment-phase (L58)
- Heading: Tick Order (environment phase)

> - Exponential pull: `Δ = k_mix * (ambient − current)`.

```math
Δ = k_mix * (ambient − current)
```

## F-0025 — Nutrition

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L86)
- Heading: Tick Order (plant phase)

> `req_phase = curve[phase]          // g/m²/day`

```math
req_phase = curve[phase]
```

## F-0026 — Nutrition

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L87)
- Heading: Tick Order (plant phase)

> `req_tick_plant = req_phase * (zoneArea / plantCount) * (tickHours / 24)`

```math
req_tick_plant = req_phase * (zoneArea / plantCount) * (tickHours / 24)
```

## F-0027 — Stress

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L91)
- Heading: Tick Order (plant phase)

> Combine: `stress_raw = Σ w_D * penalty_D`.

```math
stress_raw = Σ w_D * penalty_D
```

## F-0028 — Stress

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L92)
- Heading: Tick Order (plant phase)

> Resilience mitigation: `stress = clamp01(stress_raw * (1 − generalResilience))`.

```math
stress = clamp01(stress_raw * (1 − generalResilience))
```

## F-0029 — Stress

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L94)
- Heading: Tick Order (plant phase)

> If `stress > θ_stress`: `health -= α * stress`; otherwise passive recovery `health += β_recovery`.

```math
stress > θ_stress
```

## F-0030 — Health

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L94)
- Heading: Tick Order (plant phase)

> If `stress > θ_stress`: `health -= α * stress`; otherwise passive recovery `health += β_recovery`.

```math
health -= α * stress
```

## F-0031 — Health

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L94)
- Heading: Tick Order (plant phase)

> If `stress > θ_stress`: `health -= α * stress`; otherwise passive recovery `health += β_recovery`.

```math
health += β_recovery
```

## F-0032 — Growth

- Source: docs/system/simulation-engine.md#tick-order-plant-phase (L99)
- Heading: Tick Order (plant phase)

> - Apply health & stress: `actualGrowth = potentialGrowth * health * (1 − γ * stress)`.

```math
actualGrowth = potentialGrowth * health * (1 − γ * stress)
```

## F-0033 — Energy

- Source: docs/system/simulation-engine.md#economics-currency-neutral (L180)
- Heading: Economics (currency-neutral)

> - **Energy**: sum `(device.power_kW × tickHours × electricityCostPerKWh)` for active devices.

```math
device.power_kW × tickHours × electricityCostPerKWh
```

## F-0034 — Time Scaling

- Source: docs/system/simulation-engine.md#economics-currency-neutral (L185)
- Heading: Economics (currency-neutral)

> (`tickHours = tickLengthMinutes / 60`) so that changing the tick length at runtime does not drift

```math
tickHours = tickLengthMinutes / 60
```

## F-0035 — Temperature

- Source: docs/system/wb-physio.md#temperature-mixing-tempts (L12)
- Heading: Temperature Mixing (`temp.ts`)

> - **Formula:** `Tₜ = Tₐ + (T₀ − Tₐ) · exp(−k · Δt)`

```math
Tₜ = Tₐ + (T₀ − Tₐ) · exp(−k · Δt)
```

## F-0036 — Transpiration

- Source: docs/system/wb-physio.md#transpiration-transpirationts (L50)
- Heading: Transpiration (`transpiration.ts`)

> - Effective canopy conductance: `g_c = g₀ · clamp(LAI / 3, 0.3, 2)` with `g₀ = 0.008 mol·m⁻²·s⁻¹·kPa⁻¹`.

```math
g_c = g₀ · clamp(LAI / 3, 0.3, 2)
```

## F-0037 — Transpiration

- Source: docs/system/wb-physio.md#transpiration-transpirationts (L51)
- Heading: Transpiration (`transpiration.ts`)

> - Flux: `E = g_c · VPD · f_stomatal` (mol·m⁻²·s⁻¹).

```math
E = g_c · VPD · f_stomatal
```

## F-0038 — Transpiration

- Source: docs/system/wb-physio.md#transpiration-transpirationts (L52)
- Heading: Transpiration (`transpiration.ts`)

> - Tick volume: `litres = E · area · Δt · 3600 · 0.018` (0.018 L per mol of water).

```math
litres = E · area · Δt · 3600 · 0.018
```

## F-0039 — Tasks

- Source: docs/TDD.md#6-personnel-as-agents (L85)
- Heading: 6) Personnel as Agents

> U = w1*priority + w2*skillMatch + w3*roleAffinity + w4*urgency

```math
U = w1*priority + w2*skillMatch + w3*roleAffinity + w4*urgency
```

## F-0040 — Tasks

- Source: docs/TDD.md#6-personnel-as-agents (L86)
- Heading: 6) Personnel as Agents

> w5*distance - w6*fatigue + w7*morale + w8*toolAvailability ± traitMods

```math
w5*distance - w6*fatigue + w7*morale + w8*toolAvailability ± traitMods
```
