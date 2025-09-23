# Weedbreed.AI — Data Dictionary (DD)

## Conventions (apply to all files)

- **Primary key**: `id` (string, **UUID v4**). No `uuid` attribute is used anywhere.
- **Human identifiers**: `name` (display), `slug` (URL-friendly), optional; never authoritative.
- **Units** (SI, no unit suffixes in keys): RH `0–1`; temperature `°C`; power `kW`; airflow `m³/h`; PPFD `µmol·m⁻²·s⁻¹`; CO₂ `ppm`; area `m²`; volume `L`; costs/prices are currency-neutral numbers.
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
- `temperature: { optMin_C: number, optMax_C: number }` — Optimal canopy temperature.- `humidity: { optMin: number, optMax: number }` — RH `0–1`.- `co2?: { opt_ppm?: number }` — Target CO₂ concentration.- `light?: { ppfdTarget?: number }` — Target PPFD at canopy. `}` _Engine clamps deviations and converts distance to stress._

**Nutrition & water**

- `nutrients: {`
- `npkCurve: {`- `vegetative: { N: number|null, P: number|null, K: number|null },`- `flowering: { N: number|null, P: number|null, K: number|null }`- `} // Units for N/P/K: g/m²/day` `}`
- `water?: { dailyUsePerM2_L: number }` — Liters per m² per day at baseline conditions.

**Growth & morphology** _(project-specific keys allowed; examples below)_

- `morphology?: { leafAreaIndex?: number, yieldFactor?: number }`
- `growthModel?: {`
- `maxBiomassDry_g?: number` — Per plant.- `baseLUE_gPerMol?: number` — Light-use efficiency (g dry per mol photons).- `maintenanceFracPerDay?: number (0–1)` — Respiration cost.- `dryMatterFraction?: { vegetation?: number, flowering?: number }`- `harvestIndex?: { targetFlowering?: number }`- `phaseCapMultiplier?: { vegetation?: number, flowering?: number }`- `stressPenaltyCap?: number (0–1)` `}`

**Phenology & photoperiod**

- `phenology: { seedlingDays: number, vegetativeDays: number, floweringDays: number }`
- `photoperiod?: { vegHoursLight?: number, flowerHoursLight?: number }` _Defaults: if missing, engine policy may assume `18/6` veg, `12/12` flower._

**Harvest & post-harvest**

- `harvest?: { windowDays: number }` — Window around ideal ripeness.
- `postHarvest?: { storageHalfLifeDays: number }` — Quality half-life.

**Heuristics for UI/AI**

- `environmentalPreferences?: string[]` — Qualitative hints (e.g., `"highAirflow"`, `"lowNutrient"`). No direct physics effect unless mapped in rules.
- `noise?: number (0–1)` — **Breeding variability**; max fractional deviation for sampled offspring traits (e.g., `±noise × base`).

**Lineage**

- `lineage?: { parents: string[] }` — **List of parent `id` (UUID)**. If `parents` is empty or missing ⇒ **ur-plant** (foundational strain).

### Example (minimal)

```json
{
  "id": "3d6c5c0b-5b68-4c6a-8a2a-1c17f3f2a5a7",
  "slug": "ak-47",
  "name": "AK-47",
  "environment": {
    "temperature": { "optMin_C": 22, "optMax_C": 28 },
    "humidity": { "optMin": 0.45, "optMax": 0.65 },
    "light": { "ppfdTarget": 700 }
  },
  "nutrients": {
    "npkCurve": {
      "vegetative": { "N": 2.5, "P": 0.8, "K": 2.0 },
      "flowering": { "N": 1.3, "P": 1.2, "K": 2.5 }
    }
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
- `allowedRoomPurposes: string[]` — **Placement rule**. Defaults:
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
  "settings": { "power": 0.6, "ppf_umol_s": 1500, "ppe_umol_J": 2.5, "coverage_m2": 1.2 }
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
- `temperatureRange?: [number, number] (°C)`- `idealHumidityRange?: [number, number] (0–1)`- `leafWetnessRequired?: boolean`- `lowAirflowRisk?: number (0–1)`- `overwateringRisk?: number (0–1)`- `overfertilizationRisk?: number (0–1)` `}`
- `transmission?: { airborne?: boolean, contact?: boolean, tools?: boolean }`
- `model?: {`
- `dailyInfectionIncrement?: number` — Baseline infection growth/day (will be modulated by env/balancing).- `infectionThreshold?: number (0–1)` — Established infection point.- `degenerationRate?: number` — Symptom severity growth/day.- `recoveryRate?: number` — Passive recovery/day under good conditions.- `regenerationRate?: number` — Tissue repair/day if modeled separately.- `fatalityThreshold?: number (0–1)` `}`
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
- `photosynthesisReductionPerDay?: number (0–1)`- `rootUptakeReductionPerDay?: number (0–1)`- `budLossFractionPerDay?: number (0–1)`- `diseaseVectorRisk?: number (0–1)`- `honeydew?: boolean` `}`
- `detection?: { symptoms?: string[], monitoring?: string[] }`
- `controlOptions?: { cultural?: string[], biological?: string[], mechanical?: string[], chemical?: string[] }` _(descriptive; operational details are in treatment options)_

---

## 6) Treatment Options — `/data/configs/treatment_options.json`

### Purpose

Catalog of actionable treatments; global stacking/safety/cost rules; tick-based timing fields (engine converts from human-readable inputs if present).

### Schema

- `kind: "TreatmentOptions"`
- `version?: string`
- `notes?: string`
- `global?: {`
- `stackingRules?: {` - `maxConcurrentTreatmentsPerZone?: number` - `mechanicalAlwaysStacks?: boolean` - `chemicalAndBiologicalCantShareSameMoAWithin7Days?: boolean` - `cooldownDaysDefault?: number` `}` - `sideEffects?: { phytotoxicityRiskKeys?: string[], beneficialsHarmRiskKeys?: string[] }`- `costModel?: {` - `costBasis?: "perZone" | "perPlant" | "perSquareMeter"` — Default scaling base. - `totalCostFormula?: string` — Human description; engine computes actuals. `}` `}`
- `options: Array<{`
- `id: string (UUID v4)`- `name: string`- `category: "cultural" | "biological" | "chemical" | "mechanical" | "UV"`- `targets: Array<"disease" | "pest">`- `applicability?: string[]` — Growth phases where it’s allowed.- `materialsCost?: number` — Neutral cost per application; scaled by `costBasis`.- `laborMinutes?: number`- `energyPerHourKWh?: number`- `cooldownDays?: number`- `reentryIntervalTicks?: number` — Access restriction; engine can derive this from hours/days if present elsewhere.- `preHarvestIntervalTicks?: number` — PHI; same conversion rule.- `effects?: {` - `pest?: { reproductionMultiplier?: number, mortalityMultiplier?: number, damageMultiplier?: number }` - `disease?: { infectionMultiplier?: number, degenerationMultiplier?: number, recoveryMultiplier?: number }` `}` - `costBasis?: "perZone" | "perPlant" | "perSquareMeter"` — Overrides global default.- `notes?: string` `}>`

---

## 7) Prices — `/data/prices/*.json`

**Utilities** — `utilityPrices.json`

- `electricityCostPerKWh: number` — Default `0.30`.
- `waterCostPerM3: number` — Default `3.00`.
- `nutrientsCostPerKg: number` — Default `2.00`.

**Strains** — `strainPrices.json`

- `strainPrices: { [strainIdOrSlug: string]: {`
- `seedCost?: number` — Currency-neutral (alias for legacy `seedPrice`).- `harvestBasePricePerGram?: number` — Base sales price (alias for legacy `harvestPricePerGram`); runtime quality/market adjusters apply. `}}` _Keys MAY be UUID `id` or legacy slugs—engine should try UUID first, then slug fallback._

**Devices** — `devicePrices.json`

- `devicePrices: { [deviceIdOrSlug: string]: {`
- `capitalCost?: number` — Alias for legacy `capitalExpenditure`.- `baseMaintenanceCostPerTick?: number` — Hourly maintenance base rate (multiply by `tickLengthMinutes / 60`).- `costIncreasePer1000Ticks?: number` — Aging curve scalar. `}}`

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
- `traits.json: Array<{ id: string, name: string, description: string, type: "positive"|"negative"|string }>` _(HR roles/skills/wages can be separate or engine defaults.)_
