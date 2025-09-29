# Backend Overview

## 1. Purpose & Non-Goals

**Purpose.** Deliver a deterministic cultivation and economy simulation core that exposes structured telemetry and accepts validated intents without leaking internal coupling.

**Non-Goals.**

- Ship user interface code or rendering assets.
- Introduce non-deterministic randomness; every stochastic source must be seeded.
- Bind the engine to a specific persistence layer; storage adapters remain optional.

## 2. Architecture Overview

```mermaid
flowchart LR
    subgraph Engine Core
        Scheduler[Tick Scheduler]
        StateStore[Runtime State Store]
        Physio[Simulation Subsystems]
    end
    BlueprintRegistry[Blueprint Registry]
    ScenarioLoader[Scenario Loader]
    IntentRouter[Intent Router]
    EventBus[Event & Telemetry Bus]
    PersistenceAdapter[[Persistence Adapter (optional)]]
    APIAdapter[[API Adapter (optional)]]

    BlueprintRegistry --> ScenarioLoader
    ScenarioLoader --> Scheduler
    IntentRouter --> Scheduler
    Scheduler --> StateStore
    Scheduler --> Physio
    Physio --> StateStore
    StateStore --> EventBus
    EventBus --> APIAdapter
    StateStore --> PersistenceAdapter
```

The engine core owns the tick scheduler, orchestrates subsystem execution, and keeps authoritative runtime state. Blueprints are stored in a read-only registry; a scenario loader materializes them into runtime instances. Intents are validated and sequenced before they reach the scheduler. Event telemetry is append-only; adapters consume snapshots without mutating state. Persistence and external API layers integrate through explicit ports.

## 3. Blueprints Provided & How to Use Them

### 3.1 Operating Principles

- **Validated blueprint set.** The repository ships canonical JSON blueprints covering structures, room purposes, cultivation methods, strains, devices, pests, diseases, personnel roles/skills, and price maps for seeds, devices, and utilities.【F:data/blueprints/structures/small_warehouse.json†L1-L11】【F:data/blueprints/roomPurposes/growroom.json†L1-L13】【F:data/blueprints/cultivationMethods/scrog.json†L1-L47】【F:data/blueprints/strains/ak-47.json†L1-L132】【F:data/blueprints/devices/veg_light_01.json†L1-L21】【F:data/blueprints/pests/spider_mites.json†L1-L44】【F:data/blueprints/diseases/powdery_mildew.json†L1-L44】【F:data/blueprints/personnel/roles/Gardener.json†L1-L32】【F:data/prices/devicePrices.json†L1-L11】
- **Template → instance.** Blueprints are immutable templates; they are never executed directly. A materializer copies values, applies defaults, and assigns runtime identifiers before the engine can use them.
- **Runtime reads from instances.** Environment, plant growth, device control, and economic subsystems must consume only the materialized runtime objects so that validation, overrides, and seed-controlled randomness are centralized.
- **Analyse before implementing.** Inspect the relevant blueprint fields (names, units, value ranges, and constraints) before writing a subsystem formula. Designs must match the delivered data, especially when translating arrays (e.g., phase ranges) or nested settings blocks.
- **Units & naming.** Values use SI units; keys are camelCase without unit suffixes. Convert at the edges if an external adapter requires alternative units.
- **Validation gate.** Every blueprint passes schema validation before the engine starts. Files that fail validation must be rejected or migrated explicitly; do not coerce data silently.
- **Change protocol.** When a formula needs a field that the current blueprints do not supply, document a “Proposed Blueprint Extension” in the docs with key name, type, SI unit, and rationale before implementation. Never introduce ad-hoc fields at runtime.

### 3.2 Blueprint–to–Subsystem Mapping

| Subsystem          | Required blueprint fields (name + SI units)                                                                                                                                                                                                        | Derived runtime parameters (per tick)                                  | Validation rules                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Lighting           | `devices.settings.ppfd` (µmol·m⁻²·s⁻¹)<br>`devices.settings.coverageArea` (m²)<br>`devices.settings.power` (kW)<br>`strains.environmentalPreferences.lightCycle` (h·day⁻¹)                                                                         | Zone PPFD<br>Daily light integral<br>Lamp heat load                    | `ppfd > 0` and coverageArea > 0<br>Power within rated range<br>Light-cycle arrays length 2                  |
| Climate / VPD      | `devices.settings.coolingCapacity` (kW)<br>`devices.settings.airflow` (m³·h⁻¹)<br>`devices.settings.targetTemperature` (°C)<br>`strains.environmentalPreferences.idealTemperature` (°C)<br>`strains.environmentalPreferences.idealHumidity` (0..1) | Temperature deltas<br>Air-mixing factor<br>VPD targets                 | Cooling capacity ≥ 0<br>Airflow ≥ 0<br>Target temperature within declared range<br>Humidity bounds in [0,1] |
| Plant Growth       | `strains.growthModel.baseLightUseEfficiency` (light-use coefficient)<br>`strains.growthModel.maxBiomassDry` (kg)<br>`strains.morphology.leafAreaIndex` (m²·m⁻²)<br>`strains.environmentalPreferences.lightIntensity` (µmol·m⁻²·s⁻¹)                | Biomass increment<br>Stress indices<br>Canopy scaling                  | Values ≥ 0<br>Phase dictionaries include vegetation & flowering keys<br>Arrays sorted ascending             |
| Water / NPK        | `strains.waterDemand.dailyWaterUsagePerSquareMeter` (L·m⁻²·day⁻¹)<br>`strains.nutrientDemand.dailyNutrientDemand` (g·plant⁻¹·day⁻¹)<br>`cultivationMethods.areaPerPlant` (m²·plant⁻¹)<br>`cultivationMethods.minimumSpacing` (m)                   | Irrigation volume<br>Nutrient delivery targets<br>Plant density checks | Non-negative volumes<br>Nutrient objects contain N/P/K keys<br>Spacing ≥ 0                                  |
| Devices / Energy   | `devices.settings.power` (kW)<br>`devices.lifespan` (s)<br>`devices.quality` (0..1)<br>`devicePrices.*.capitalExpenditure` (EUR)<br>`utilityPrices.pricePerKwh` (EUR·kWh⁻¹)                                                                        | Device runtime health<br>Replacement horizon<br>Energy cost per tick   | Power ≥ 0<br>Lifespan > 0<br>Quality within [0,1]<br>Price entries ≥ 0                                      |
| Economics / OPEX   | `roomPurposes.economy.baseRentPerTick` (EUR·tick⁻¹)<br>`roomPurposes.economy.areaCost` (EUR·m⁻²)<br>`devicePrices.*.baseMaintenanceCostPerTick` (EUR·tick⁻¹)<br>`strainPrices.*` (EUR)                                                             | Rent accrual<br>Maintenance charges<br>Revenue projections             | Monetary fields ≥ 0<br>Cross-map ids resolve                                                                |
| Employees / Skills | `personnel.roles.salary.basePerTick` (EUR·tick⁻¹)<br>`personnel.roles.maxMinutesPerTick` (min)<br>`personnel.roles.skillProfile` (levels)<br>`personnel.skills.*` definitions                                                                      | Wage budgets<br>Shift capacity<br>Skill distribution                   | Salary ranges ≥ 0<br>Minutes per tick ≤ 1440<br>Skill ids referenced exist                                  |

## 4. Blueprint Inventory

### 4.1 Structures & Room Purposes

- **Structures.** Each structure blueprint defines an `id`, `name`, and a `footprint` block with `length_m`, `width_m`, and `height_m` in metres, alongside `rentalCostPerSqmPerMonth` and `upfrontFee` in euros.【F:data/blueprints/structures/small_warehouse.json†L1-L11】
- **Room purposes.** Room purpose files provide `id`, `kind`, `name`, a human-readable `description`, boolean `flags` (e.g., `supportsCultivation`, `requiresControlledEnvironment`), and an `economy` block with `areaCost` (EUR·m⁻²) and `baseRentPerTick` (EUR·tick⁻¹).【F:data/blueprints/roomPurposes/growroom.json†L1-L13】
- There is no dedicated room or zone blueprint; zones are derived by combining structure geometry with selected room purposes during materialization.

### 4.2 Cultivation Methods

Cultivation method templates include `id`, `kind`, `name`, `laborIntensity` (0..1), `areaPerPlant` (m²·plant⁻¹), `minimumSpacing` (m), and optional `maxCycles`. Media options are declared via `compatibleSubstrateTypes` (category names such as `"soil"` and `"coco"`, resolved against the substrate library) and container options continue to use `compatibleContainerSlugs`. Compatibility rules appear under `strainTraitCompatibility`, and `idealConditions` specify `idealTemperature` (°C) and `idealHumidity` (0..1) ranges. Optional `meta` text documents trade-offs.【F:data/blueprints/cultivationMethods/scrog.json†L1-L47】
The baseline cultivation methods (`basic_soil_pot`, `scrog`, `sog`) each enumerate both substrate types so either soil mixes or coco coir consumables can be paired with their unchanged container lists.【F:data/blueprints/cultivationMethods/basic_soil_pot.json†L1-L29】【F:data/blueprints/cultivationMethods/scrog.json†L1-L47】【F:data/blueprints/cultivationMethods/sog.json†L1-L46】

Upfront economics are externalized: `data/prices/cultivationMethodPrices.json` maps method ids to `{ "setupCost" }`, while `data/prices/consumablePrices.json` exposes nested `substrates` and `containers` price tables keyed by slug. Substrate entries now declare `costPerLiter`, and containers track `costPerUnit`.【F:data/prices/cultivationMethodPrices.json†L1-L13】【F:data/prices/consumablePrices.json†L1-L21】 Designers select compatible consumables in the blueprint and tune the actual ledger entries centrally, keeping balancing data separate from structural definitions.

#### Substrate Blueprints

`/data/blueprints/substrates` holds reusable media definitions with stable `id`/`slug` pairs, media `type`, and optional `maxCycles`. Cultivation methods now reference these by type, while the loader builds a type index to validate compatibility lists and flag missing priced options. The catalog currently offers single-cycle soil, multi-cycle soil, and coco coir blueprints for reuse-friendly grow plans.【F:data/blueprints/substrates/soil_single_cycle.json†L1-L7】【F:data/blueprints/substrates/soil_multi_cycle.json†L1-L7】【F:data/blueprints/substrates/coco_coir.json†L1-L7】

#### Container Blueprints

`/data/blueprints/containers` captures reusable vessel geometries (`volumeInLiters`, `footprintArea`, `reusableCycles`, `packingDensity`) with slug identifiers, allowing consistent reuse while keeping per-method pricing separate.【F:data/blueprints/containers/pot_25l.json†L1-L9】

### 4.3 Strain Blueprints

Strain blueprints capture:

- Identity (`id`, `slug`, `name`) and lineage metadata.【F:data/blueprints/strains/ak-47.json†L1-L12】
- Composition: `genotype` fractions, `chemotype` THC/CBD ratios, `generalResilience`, and `germinationRate`. Values are unitless ratios within `[0,1]`.【F:data/blueprints/strains/ak-47.json†L5-L24】
- Morphology (`growthRate`, `yieldFactor`, `leafAreaIndex`) and a `growthModel` with `maxBiomassDry` (kg), `baseLightUseEfficiency` (kg·µmol⁻¹ scaled by seconds), `maintenanceFracPerDay`, `dryMatterFraction` by phase, `harvestIndex`, `phaseCapMultiplier`, and temperature response parameters (`Q10`, `T_ref_C`).【F:data/blueprints/strains/ak-47.json†L24-L54】
- Optional noise controls (`noise.enabled`, `noise.pct`) to modulate deterministic variance.【F:data/blueprints/strains/ak-47.json†L55-L58】
- Environmental preferences: spectrum ranges in nanometres, light intensity bands (µmol·m⁻²·s⁻¹), light cycles (hour pairs per phase), temperature ranges (°C), humidity ranges (0..1), and `phRange`.【F:data/blueprints/strains/ak-47.json†L59-L88】
- Nutrient demand: `dailyNutrientDemand` per phase with `nitrogen`, `phosphorus`, and `potassium` in grams per plant per day, plus `npkTolerance` and `npkStressIncrement`.【F:data/blueprints/strains/ak-47.json†L89-L110】
- Water demand: `dailyWaterUsagePerSquareMeter` per phase (litres per square metre per day) and `minimumFractionRequired`.【F:data/blueprints/strains/ak-47.json†L111-L118】
- Disease resistance: infection and recovery parameters, expressed as fractions per day.【F:data/blueprints/strains/ak-47.json†L119-L124】
- Phenology: `photoperiod` timings in seconds, `stageChangeThresholds`, `harvestWindow` (seconds), and `harvestProperties` with ripening and storage timings plus `qualityDecayRate`.【F:data/blueprints/strains/ak-47.json†L125-L140】
- Descriptive `meta` text for designers.【F:data/blueprints/strains/ak-47.json†L141-L150】

All numeric arrays are ordered `[min, max]`. Missing phases must be handled gracefully (e.g., if a strain omits flowering adjustments).

### 4.4 Device Blueprints

Device templates share `id`, `kind`, `name`, `quality` (0..1), `complexity` (0..1), `lifespan` (seconds of rated operation), `roomPurposes`, nested `settings`, and optional `meta` text.【F:data/blueprints/devices/veg_light_01.json†L1-L21】 Settings are device-class specific:

- **Lamp:** `power` (kW), `ppfd` (µmol·m⁻²·s⁻¹), `coverageArea` (m²), `spectralRange` (nm), `heatFraction` (0..1).【F:data/blueprints/devices/veg_light_01.json†L9-L17】
- **ClimateUnit:** `power` (kW), `coolingCapacity` (kW), `airflow` (m³·h⁻¹), `targetTemperature` (°C), `targetTemperatureRange` (°C), `cop`, `hysteresisK`, and `fullPowerAtDeltaK` (°C).【F:data/blueprints/devices/climate_unit_01.json†L9-L22】
- **Dehumidifier:** `latentRemovalKgPerTick` (kg·tick⁻¹) and `power` (kW).【F:data/blueprints/devices/dehumidifier-01.json†L9-L16】

Additional device kinds (e.g., CO₂ injectors, exhaust fans) follow the same pattern with their own setting keys. Engines must branch on `kind` and validate the expected settings block.

### 4.5 Pest & Disease Blueprints

Pest blueprints define `id`, `kind`, `name`, `category`, `targets`, `environmentalRisk` (temperature and humidity ranges plus qualitative risk factors), `populationDynamics`, `damageModel`, `detection` guidance, and `controlOptions`. Values are ratios per day or boolean flags as indicated.【F:data/blueprints/pests/spider_mites.json†L1-L44】

Disease blueprints mirror this structure with `pathogenType`, `environmentalRisk`, a `model` of infection parameters, `detection` hints, and `treatments` grouped by approach.【F:data/blueprints/diseases/powdery_mildew.json†L1-L44】

### 4.6 Personnel Roles & Skills

Personnel role files specify `id`, `name`, a `salary` block (`basePerTick` in EUR·tick⁻¹, `skillFactor` weights, optional `randomRange`), `maxMinutesPerTick`, `roleWeight`, and a structured `skillProfile` describing primary, secondary, and optional tertiary skills with level rolls. Values are deterministic ranges for procedural generation.【F:data/blueprints/personnel/roles/Gardener.json†L1-L32】

Skill definitions list `id`, `name`, `description`, and optional `tags` for classification.【F:data/blueprints/personnel/skills/Gardening.json†L1-L6】

### 4.7 Price & Cost Blueprints

- **Device prices.** Map device `id` to `capitalExpenditure`, `baseMaintenanceCostPerTick`, and `costIncreasePer1000Ticks`, all in euros.【F:data/prices/devicePrices.json†L1-L11】
- **Strain prices.** Map strain `id` to `seedPrice` and `harvestPricePerGram` in euros.【F:data/prices/strainPrices.json†L1-L13】
- **Utility prices.** Provide `pricePerKwh`, `pricePerLiterWater`, and `pricePerGramNutrients` in euros for operating cost calculations.【F:data/prices/utilityPrices.json†L1-L4】

## 5. Materialization & Runtime State

1. **Load & validate.** Parse blueprints, run schema validation, and reject or migrate files that fall outside required ranges.
2. **Materialize instances.** Copy template values into runtime records, apply scenario overrides, derive geometric aggregates (e.g., structure volume), and attach deterministic identifiers.
3. **Link cross-references.** Resolve ids across maps (e.g., device prices, strain prices) before the first tick. Missing references are fatal until documented and added to the blueprint set.
4. **Runtime usage.** Engine subsystems read only from materialized instances, ensuring tick execution cannot mutate shared template data. Derived telemetry must include source blueprint ids for auditability.

## 6. Identifier Strategy

Prefer hierarchical addresses for static assets (structure/room/device) built from blueprint slugs or ids to keep telemetry readable. Use UUIDs for mobile entities (plants, employees) where collisions or reassignment are likely. Record remapping events at tick boundaries if identifiers change so downstream consumers can reconcile history.

## 7. Quality Gates & Validation

- Enforce numeric bounds indicated by the blueprints (e.g., humidity `[0,1]`, probability weights `[0,1]`, non-negative costs). Violations block scenario load.
- Maintain schema definitions alongside blueprints to guard against drift. When extending a schema, version the document and migrate existing JSON explicitly.
- Unit tests should cover blueprint ingestion, ensuring every `kind` branch is exercised with fixture data taken from the shipped files.

---

Reviewed against current blueprint set on 2025-09-25; removed unsupported claims; added proposals where fields are missing.
