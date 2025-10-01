# Simulation Loop

## User-provided custom instructions (docs/contradictions.md)

Source: [`docs/contradictions.md`](../docs/contradictions.md)

# User-provided custom instructions

_No additional custom instructions were supplied beyond the repository documentation._

# Product Requirements Document (PRD)

## Detected contradictions across `/docs/**/*.md`

1. **Tick duration is described as both fixed and variable.** The simulation philosophy states that each tick is a fixed hour of game time, while the simulation engine guidance expects systems to recalculate costs when the tick length changes at runtime, implying the duration is adjustable.【F:docs/system/simulation_philosophy.md†L5-L8】【F:docs/system/simulation-engine.md†L175-L186】
2. **Client control over tick length conflicts.** The UI building guide insists the backend keeps tick length immutable to clients, yet the socket protocol documents a `config.update` command that lets clients change `tickLength`, and the component guide still maps a tick-length slider to `time.setTickLength` intents.【F:docs/ui-building_guide.md†L366-L394】【F:docs/system/socket_protocol.md†L423-L455】【F:docs/ui/ui-components-desciption.md†L31-L34】
3. **State management responsibilities diverge.** The UI guide prescribes a snapshot-driven Zustand store that leaves simulation state immutable in the client, but the component documentation still portrays `App.tsx` as owning mutable game data and recomputing state locally for every interaction.【F:docs/ui-building_guide.md†L364-L371】【F:docs/ui/ui-components-desciption.md†L74-L82】
4. **Finance interactions are simultaneously required and absent.** The UI guide claims the dashboard must expose finance intents such as selling inventory and adjusting utility prices, yet the component catalogue declares the finance view read-only with no wired finance intents.【F:docs/ui-building_guide.md†L414-L417】【F:docs/ui/ui-components-desciption.md†L66-L68】

## Documentation Changelog (docs/CHANGELOG.md)

Source: [`docs/CHANGELOG.md`](../docs/CHANGELOG.md)

# Documentation Changelog

## [Unreleased]

### Added

- Documented the adopted frontend stack (Tailwind, Zustand, Socket.IO bridge) in
  [ADR 0002](system/adr/0002-frontend-realtime-stack.md) and updated the frontend
  README to guide contributors.
- Recorded the accepted zone setpoint routing contract in
  [ADR 0004](system/adr/0004-zone-setpoint-routing.md) and aligned the socket
  protocol/AGENTS docs with the implemented metrics and response semantics.
- Captured the canonical zone setpoint ranges (temperature, humidity, VPD, CO₂,
  PPFD) in the constants and UI tuning guides so operators know the supported
  corridors.

### Changed

- Clarified that `baseMaintenanceCostPerTick`, `rentPerTick`, and room purpose
  base rent values are stored as hourly rates that must be multiplied by the
  active tick length when booking recurring costs.
- Simulation facade now clamps all zone setpoint writes to the documented ranges
  and emits warning messages when adjustments are forced into bounds.

## Weed Breed Physiology Reference (docs/system/wb-physio.md)

Source: [`docs/system/wb-physio.md`](../docs/system/wb-physio.md)

# Weed Breed Physiology Reference

This note documents the simplified canopy physiology formulas implemented in
`src/backend/src/engine/physio`. All
functions are deterministic, pure utilities that operate on **SI units** (unless noted) and are used by
the simulation engine to derive environment deltas and plant growth responses.

## Temperature Mixing (`temp.ts`)

- **Function:** `approachTemperature(currentC, targetC, ratePerHour, hours)`
- **Units:** °C, h⁻¹, hours
- **Formula:** `Tₜ = Tₐ + (T₀ − Tₐ) · exp(−k · Δt)`
- **Use:** Zone normalization toward ambient temperature based on passive leakage and airflow.
- **Also provides:** `gaussianResponse(value, mean, sigma)` (unitless) for thermal stress curves.

## Relative Humidity Mixing (`rh.ts`)

- **Function:** `approachRelativeHumidity(current, target, ratePerHour, hours)`
- **Units:** fraction (0–1), h⁻¹, hours
- **Formula:** Same exponential approach as temperature, clamped to `[0, 1]`.
- **Use:** Pulls zone humidity toward ambient after device and plant deltas.

## CO₂ Dynamics (`co2.ts`)

- **Functions:**
  - `approachCo2(currentPpm, targetPpm, ratePerHour, hours)` — exponential approach in ppm.
  - `co2HalfSaturationResponse(concentrationPpm, halfSaturationPpm)` — rectangular hyperbola response.
- **Use:** Normalization toward ambient and photosynthetic CO₂ response in the growth model.

## Photosynthetic Photons (`ppfd.ts`)

- **Functions:**
  - `ppfdToMoles(ppfd, durationHours)` — converts PPFD (µmol·m⁻²·s⁻¹) over a tick to mol·m⁻².
  - `lightSaturationResponse(ppfd, halfSaturation, maxResponse?)` — light saturation curve.
- **Use:** Converting canopy PPFD into absorbed photon dose and the corresponding light response factor.

## Vapour Pressure Deficit (`vpd.ts`)

- **Functions:**
  - `saturationVaporPressure(temperatureC)` — Magnus approximation (kPa).
  - `actualVaporPressure(temperatureC, relativeHumidity)` — saturation × RH (kPa).
  - `vaporPressureDeficit(temperatureC, relativeHumidity)` — difference in kPa.
- **Use:** Zone VPD telemetry and VPD-driven stress in the growth model.

## Transpiration (`transpiration.ts`)

- **Function:** `estimateTranspirationLiters({ vpdKPa, canopyAreaM2, leafAreaIndex, durationHours, stomatalFactor })`
- **Units:** kPa, m², dimensionless LAI, hours; returns litres per tick.
- **Formula:**
  - Effective canopy conductance: `g_c = g₀ · clamp(LAI / 3, 0.3, 2)` with `g₀ = 0.008 mol·m⁻²·s⁻¹·kPa⁻¹`.
  - Flux: `E = g_c · VPD · f_stomatal` (mol·m⁻²·s⁻¹).
  - Tick volume: `litres = E · area · Δt · 3600 · 0.018` (0.018 L per mol of water).
- **Use:** Provides a coarse transpiration estimate per plant for telemetry and future water budget coupling.

## Integration Points

- `ZoneEnvironmentService.normalize` uses the mixing helpers to pull temperature, humidity and CO₂
  toward ambient conditions every tick and recomputes VPD via `vaporPressureDeficit`.
- `updatePlantGrowth` consumes the PPFD, temperature, CO₂, VPD and transpiration helpers to derive
  growth responses, stress metrics, photon absorption and transpiration outputs.

Refer to the accompanying unit tests in `src/backend/src/engine/physio/__tests__/formulas.test.ts`
for golden master values that validate these calculations.

## Plant Physiology Constants (docs/constants/physiology.md)

Source: [`docs/constants/physiology.md`](../docs/constants/physiology.md)

# Plant Physiology Constants

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation. Define
> each constant in `src/backend/src/constants/` with concise JSDoc that mirrors
> this catalogue when editing.

## Vapor Pressure & VPD

`MAGNUS_COEFFICIENT_A = 17.27`
Coefficient `a` in the Magnus saturation vapour pressure approximation used by `vaporPressureDeficit`.

`MAGNUS_COEFFICIENT_B = 237.3`
Coefficient `b` (°C) in the Magnus formulation defining the temperature offset for saturation vapour pressure.

`MAGNUS_PRESSURE_COEFFICIENT = 0.6108`
Coefficient `c` (kPa) that scales the Magnus exponential term to produce saturation vapour pressure in kilopascals.

## Temperature Response Curves

`GAUSSIAN_MIN_SIGMA = 0.05`
Lower bound on Gaussian response spread to prevent zero-width stress curves in thermal and VPD drivers.

## Transpiration & Canopy Conductance

`BASE_CANOPY_CONDUCTANCE = 0.008`
Baseline canopy conductance in mol·m⁻²·s⁻¹·kPa⁻¹ used before scaling transpiration by leaf area index.

`WATER_MOLAR_VOLUME_LITERS = 0.018`
Litres per mole of water used when converting molar fluxes from canopy conductance into litres transpired.

`SECONDS_PER_HOUR = 3600`
Seconds in a simulation hour used to accumulate molar fluxes over timestep durations.

## Photobiology Conversion Factors

`MICROMOL_TO_MOL = 1e-6`
Conversion factor from micromoles to moles applied when integrating PPFD into daily light integrals.

## Plant Health Constants (docs/constants/health.md)

Source: [`docs/constants/health.md`](../docs/constants/health.md)

# Plant Health Constants

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

## Detection Thresholds

`DISEASE_DETECTION_THRESHOLD = 0.18`
Disease severity fraction that guarantees an infection is flagged once symptoms appear, ensuring consistent detection timing.
`PEST_DETECTION_THRESHOLD = 0.22`
Pest population fraction that triggers detection after observation delays, marking when infestations become noticeable.

## Spread Gates

`DISEASE_SPREAD_THRESHOLD = 0.60`
Minimum infection intensity required before a disease can jump to neighbouring plants, suppressing low-grade spread.
`PEST_SPREAD_THRESHOLD = 0.60`
Population level pests must exceed before propagating to other plants, aligning pest spread with disease logic.

## Treatment Defaults

`DEFAULT_TREATMENT_DURATION_DAYS = 1`
Fallback treatment duration applied when an option omits explicit effect or cooldown lengths.

## Treatment Efficacy Bounds

`MIN_EFFECTIVE_RATE = 0`
Lower multiplier clamp to prevent negative infection or degeneration rates when combining treatments.
`MAX_EFFECTIVE_RATE = 10`
Upper multiplier clamp to cap stacked treatment boosts and keep simulation values stable.

## Game Balance Constants (docs/constants/balance.md)

Source: [`docs/constants/balance.md`](../docs/constants/balance.md)

# Game Balance Constants

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

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

`TICKS_BETWEEN_RAISE_REQUESTS = 8760` (calculated from 365 \* 24)
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

## World Defaults (docs/constants/world.md)

Source: [`docs/constants/world.md`](../docs/constants/world.md)

# World Defaults

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

The world module exposes shared defaults for the resources stocked into a new
zone and the recurring maintenance cadence. These values align engine behaviours
(`stateFactory`, `WorldService`) and prevent drift between initialization and
runtime management flows.

| Constant                             | Default                                 | Rationale                                                                                                                                                                    |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_ZONE_RESERVOIR_LEVEL`       | `0.75`                                  | New reservoirs launch three-quarters full so irrigation controllers have working volume while still leaving headroom for rapid top-offs or rain events triggered by devices. |
| `DEFAULT_ZONE_WATER_LITERS`          | `800` litres                            | Provides roughly a week of transpiration supply for a mid-vegetative canopy before automated refills need to trigger.                                                        |
| `DEFAULT_ZONE_NUTRIENT_LITERS`       | `400` litres                            | Mirrors the water allocation while assuming a 50 % nutrient dilution plan, allowing alternating water/feed cycles without immediate mixing.                                  |
| `DEFAULT_MAINTENANCE_INTERVAL_TICKS` | `DEFAULT_TICKS_PER_MONTH` (8 640 ticks) | Schedules routine device servicing every in-game month (30 days). Uses the default 5-minute tick length (288 ticks/day) to keep maintenance aligned with finance accruals.   |

Referencing these constants ensures all world management flows respect the same
default resource budgets and maintenance timeline.

## Timekeeping Defaults (docs/constants/time.md)

Source: [`docs/constants/time.md`](../docs/constants/time.md)

# Timekeeping Defaults

> These values anchor the simulation's default cadence and provide shared
> conversions for systems that scale behaviour with tick length.

| Constant                      | Default       | Rationale                                                                                                                      |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `MINUTES_PER_HOUR`            | `60` minutes  | Canonical minutes-per-hour conversion used across scheduling maths.                                                            |
| `HOURS_PER_DAY`               | `24` hours    | Standard day length for aggregating tick metrics.                                                                              |
| `DAYS_PER_MONTH`              | `30` days     | Baseline month length for maintenance and finance rollups.                                                                     |
| `DEFAULT_TICK_LENGTH_MINUTES` | `5` minutes   | Default simulated minutes advanced per tick, keeping within the documented 1–10 minute guidance for responsive gameplay loops. |
| `DEFAULT_TICK_INTERVAL_MS`    | `300 000` ms  | Millisecond interval corresponding to the default tick cadence at 1×.                                                          |
| `DEFAULT_TICKS_PER_HOUR`      | `12` ticks    | Number of ticks executed during one simulated hour at the default cadence.                                                     |
| `DEFAULT_TICKS_PER_DAY`       | `288` ticks   | One simulated day (24 hours) represented at the default tick length.                                                           |
| `DEFAULT_TICKS_PER_MONTH`     | `8 640` ticks | Thirty simulated days worth of ticks at the default cadence; reused by maintenance scheduling.                                 |

All time-sensitive subsystems (scheduler, accounting, maintenance) should source
these constants to avoid desynchronised assumptions when the default cadence
changes.

## Environmental Simulation Constants (docs/constants/environment.md)

Source: [`docs/constants/environment.md`](../docs/constants/environment.md)

# Environmental Simulation Constants

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

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

## Zone Setpoint Bounds

`MIN_ZONE_TEMPERATURE_SETPOINT_C = 10`
Lowest canopy temperature (°C) operators can program through zone setpoints.
`MAX_ZONE_TEMPERATURE_SETPOINT_C = 35`
Highest canopy temperature (°C) accepted before clamping occurs.
`MIN_ZONE_HUMIDITY_SETPOINT = 0`
Lower bound (0–1) for humidity targets applied to humidifiers/dehumidifiers.
`MAX_ZONE_HUMIDITY_SETPOINT = 1`
Upper bound (0–1) for humidity targets applied to humidifiers/dehumidifiers.
`MIN_ZONE_CO2_SETPOINT_PPM = 0`
Minimum CO₂ concentration (ppm) accepted when programming enrichment devices.
`MAX_ZONE_CO2_SETPOINT_PPM = 1800`
Maximum CO₂ concentration (ppm) enforced for safety across enrichment devices.
`MIN_ZONE_PPFD_SETPOINT = 0`
Lower limit (µmol·m⁻²·s⁻¹) for controllable lighting targets.
`MAX_ZONE_PPFD_SETPOINT = 1500`
Upper limit (µmol·m⁻²·s⁻¹) for controllable lighting targets.
`MIN_ZONE_VPD_SETPOINT_KPA = 0`
Minimum vapour pressure deficit (kPa) accepted when driving humidity via VPD.
`MAX_ZONE_VPD_SETPOINT_KPA = 2.5`
Maximum vapour pressure deficit (kPa) accepted when driving humidity via VPD.

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

## Device Effect Coefficients & Hysteresis Defaults

`SPECIFIC_HEAT_AIR_KWH_PER_M3K = 0.000336`
Specific heat capacity proxy for air, converting device energy draw into zone temperature deltas.
`MIN_HEAT_CAPACITY_KWH_PER_K = 0.0001`
Minimum fallback heat capacity applied when a zone volume would otherwise underflow.
`DEFAULT_LIGHT_HEAT_FRACTION = 0.4`
Assumed share of a light's electrical input that becomes heat within the zone.
`DEFAULT_LIGHT_COVERAGE_M2 = 1`
Fallback coverage area for lights that omit an explicit `coverageArea` setting.
`DEFAULT_FULL_POWER_DELTA_K = 1`
Temperature error (°C) that maps to full HVAC power when modulation is unavailable.
`DEFAULT_HYSTERESIS_K = 0.5`
Default temperature hysteresis band (°C) for HVAC controllers without overrides.
`DEFAULT_HUMIDITY_HYSTERESIS = 0.05`
Relative humidity hysteresis width used when humidity devices omit a custom range.
`DEFAULT_FULL_POWER_DELTA_RH = 0.1`
Relative humidity error that corresponds to full humidifier or dehumidifier output.
`DEFAULT_CO2_PULSE_MINUTES = 1`
Baseline CO₂ injection pulse length (minutes) for scaling per-tick dosing.
`DEFAULT_MAX_CO2_PPM = 1800`
Upper CO₂ safety clamp applied when devices do not define their own ceiling.

## Transpiration & Nutrient Feedback

`MIN_ZONE_VOLUME_M3 = 0.001`
Minimum effective zone volume used when mapping transpiration mass to humidity deltas.
`DEFAULT_NUTRIENT_GRAMS_PER_LITER_AT_STRENGTH_1 = 0.8`
Estimated grams of nutrient salts consumed per litre of solution at full strength during transpiration feedback.

## Durability & Disease

`BASE_DURABILITY_DECAY_PER_TICK = 0.00002`
The base amount of durability that every active device loses each hour from wear and tear.
`BASE_DISEASE_CHANCE_PER_TICK = 0.0001`
The underlying random probability that any given plant might contract a disease each hour.

## Climate Controller Defaults

`CLIMATE_CONTROLLER_DEFAULT_TEMPERATURE_CONFIG = { kp: 20, ki: 1, min: -100, max: 100 }`
PI gains and bounds for translating temperature error into heating/cooling demand.
`CLIMATE_CONTROLLER_DEFAULT_HUMIDITY_CONFIG = { kp: 400, ki: 40, min: -100, max: 100 }`
PI gains and bounds for humidity corrections, allowing humidify/dehumidify responses.
`CLIMATE_CONTROLLER_DEFAULT_CO2_CONFIG = { kp: 0.1, ki: 0.02, min: 0, max: 100 }`
PI gains and bounds driving CO₂ injection percentage commands.
`CLIMATE_CONTROLLER_DEFAULT_OUTPUT_STEP = 1`
Smallest discrete output step (% power) applied when quantising PI controller outputs.

## Weedbreed.AI — UI Elements (docs/ui/ui_elements.md)

Source: [`docs/ui/ui_elements.md`](../docs/ui/ui_elements.md)

# Weedbreed.AI — UI Elements

If Icons are used the Google Material Icon name is shown in brackets like `... icon (search) ...`

## Design-System-Primitiven

- **Buttons & IconButtons** leben unter `src/frontend/src/components/inputs` und ersetzen alle ad-hoc CSS-Buttons aus dem Klickdummy. Varianten (`variant`, `tone`, `size`, `isActive`) decken primäre/sekundäre, Gefahr- und Link-Stile ab.
- **Formularfelder** (`TextInput`, `Select`, `RangeInput`) kapseln Tailwind-Styling für Text-, Auswahl- und Slider-Steuerelemente und werden von `FormField`, `NumberInputField` sowie den Modalen verwendet.
- **InlineEdit** kombiniert Anzeige- und Bearbeitungsmodus inklusive Bestätigen/Abbrechen-Tasten.
- Konsumenten verwenden ausschließlich diese Komponenten; individuelle Klassen aus der Klickdummy-Migration wurden entfernt, sodass Theme- und Fokus-Styles zentral gepflegt werden.

## 1. Start Screen

This is the first screen a new user sees. It is a simple, centered layout.
**Title**: A large, prominent title reading "Weedbreed.AI - Reboot".
**Subtitle**: A smaller line of text below the title: "Your AI-powered cannabis cultivation simulator."
**Action Buttons**: A row of three distinct buttons:

- A primary "New Game" button.
- A secondary "Load Game" button.
- A tertiary "Import Game" button.

## 2. Main Game Interface

Once a game is started or loaded, the main interface appears. It consists of a persistent header (the Dashboard) and a main content area that changes based on user navigation.

### 2.1. The Dashboard (Persistent Header)

This bar is always visible at the top of the screen during gameplay.

_Left Side - Key Metrics:_
**Capital**: Displays the player's current money in a standard currency format (e.g., "$1,000,000.00").
**Cumulative Yield**: Shows the total weight of all harvested product in grams (e.g., "542.10g").
**Game Time**: A dynamic display showing the in-game date and time (e.g., "Y1, D32, 14:00"). It is accompanied by a progress circle that fills up over one in-game hour, providing a visual cue for the passage of time.

_Right Side - Controls & Navigation:_
**Simulation Control:**

- A circular Play/Pause button. It shows a "play" icon (play_circle) when the game is paused and a "pause" icon (pause_circle) when it's running.
- A Game Speed control panel with buttons for "0.5x", "1x", "10x", "25x", "50x", "100x", and "250x" speeds. The currently selected speed is highlighted.
- **View Navigation**:
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

**Header**: A title reading "Your Structures" and a button to "+ Rent Structure".
**Content**: A grid of cards, where each card represents a building the player has rented. Each card displays:

- The structure's name.
- Its total area in square meters.
- The number of rooms inside.
- A summary of plants (e.g., "Plants: 50/100 (Flowering - 75%)").
  The total expected yield from all plants inside.

### 3.2. Structure Detail View

**Header**: The name of the structure, followed by icons to Rename (edit) and Delete (delete). It also shows the used vs. available area and a button to "+ Add Room".
**Content**: A grid of cards, where each card represents a room within the structure. Each card displays:

- The room's name, with icons to Rename (edit), Duplicate (content_copy), and Delete (delete).
- Its area, purpose (e.g., "Grow Room"), and number of zones.
- A plant and yield summary if applicable.

### 3.3. Room Detail View

**Header**: The room's name and its purpose shown as a badge (e.g., [LABORATORY]), with icons to Rename (edit) and Delete (delete). It also shows the used vs. available area.
**Content**:

- For Grow Rooms: A "Zones" sub-header and a button to "+ Add Zone". Below is a grid of cards, one for each cultivation zone. Each card shows the zone's name, area, cultivation method, and a plant/yield summary.
- For Laboratories: A "Breeding Station" sub-header and a button to "+ Breed New Strain". Below is a grid of cards, each representing a custom-bred strain with its key genetic traits.

### 3.4. Zone Detail View

This is the most detailed management screen, laid out in two columns.
**Header**: The zone's name, flanked by left and right arrow icons (arrow_back_ios, arrow_forward_ios) to cycle through other zones in the same room. It has icons to Rename (edit) and Delete (delete).

_Left Column (Information Panels):_
**General Info**: A card showing the zone's area, cultivation method, and plant count vs. capacity.
**Supplies**: A card showing current Water and Nutrients levels, daily consumption rates, and buttons to add more of each.
**Lighting**: A card displaying the light cycle (e.g., "18h / 6h"), lighting coverage, average light intensity (PPFD), and total daily light (DLI).
Environment & Climate: A card showing the current Temperature, Relative Humidity, and CO₂ levels, along with sufficiency ratings for Airflow, Dehumidification, and CO₂ injection.

_Right Column (Management Panels):_
**Plantings**: A list of all plant groups in the zone. Each group is expandable to show individual plants with their health and progress. It has a button to "+ Plant Strain" and another to "Harvest All" (content_cut).
**Planting Plan**: A panel to configure automation. It shows the planned strain and quantity for auto-replanting, an "Auto-Replant" toggle switch, and buttons to Edit (edit) or Delete (delete) the plan.
**Devices**: A list of all installed device groups. Each group has a status light (on/off/broken), its name, and a count. Groups are expandable to show individual devices. It has buttons to adjust group settings (tune), edit the light cycle (schedule), and a main button to "+ Device".

### 3.5. Finances View

**Header**: "Financial Summary".
**Content**: A series of panels with tables and summary cards:
**Summary Cards**: Large displays for Net Profit/Loss, Total Revenue, Harvest Revenue, Cumulative Yield, and Total Expenses.
**Breakdown Tables**: Detailed tables for Revenue and Expenses, showing the total and average-per-day amount for each category (e.g., Rent, Salaries, Harvests).

### 3.6. Personnel View

The view is split into two primary panels: **Team roster** and **Job market**.

- **Team roster** renders employee cards with salary, assignment, and morale/energy bars. Each card exposes a "Fire" action that opens the global confirmation modal and dispatches `workforce.fire` on approval.
- **Job market** lists applicants as cards with skill progress bars, trait badges, and a "Hire" button. Hiring opens the dedicated modal (global modal slice) and sends `workforce.hire` with the configured wage. A refresh button triggers `workforce.refreshCandidates`.
- HR telemetry is summarised in the adjacent **HR events** panel, showing the latest `hr.*` events from the telemetry stream.

All HR modals are driven by `ModalHost`, which pauses the simulation while the dialog is active and resumes it if the loop was running beforehand.

## 4. Modals (Pop-ups)

_Important rule for modals:_ If a modal is shown the simulation must be paused. After the modal is closed the simulation must be resumed (if the simulation ran before modal activation).

Modals appear as overlays on top of the main interface for specific actions.
Creation Modals (Rent, Add Room/Zone, Install Device, etc.): These present forms with input fields, dropdowns, and sliders to configure the new item, often showing a cost and a confirmation button.

Management Modals (Rename, Delete, Edit Settings): These are simpler forms for changing a name, confirming a deletion, or adjusting settings like target temperature with a slider.

Game Lifecycle Modals (Save, Load, Reset): These provide an input to name a save file, a list of existing saves to load or delete, or a final confirmation to reset the game.

HR Modals (Hire, Negotiate Salary): The hire modal asks where to assign the employee. The salary negotiation modal presents the employee's request and gives the player options to accept, decline, or offer a one-time bonus.

## 2025-09-25 — Randomuser-backed job market refresh (docs/tasks/20250925-job-market-refresh.md)

Source: [`docs/tasks/20250925-job-market-refresh.md`](../docs/tasks/20250925-job-market-refresh.md)

# 2025-09-25 — Randomuser-backed job market refresh

- Task WB-JM-201 (Priority: High) — Implementation: Harden the job market refresh pipeline so RandomUser-backed candidate pulls stay deterministic per seed and gracefully fall back to the offline generator when HTTP is disabled or failures exhaust retries.
  - Files/Modules: `src/backend/src/engine/workforce/jobMarketService.ts` (engine), `src/backend/src/facade/index.ts` (facade), `src/backend/src/server/startServer.ts`.
  - Acceptance: Given a fixed simulation seed the candidate roster, IDs, and ordering remain identical across refreshes, and `refreshCandidates` completes via offline synthesis when randomuser.me is unreachable.

- Task WB-JM-202 (Priority: High) — Testing: Extend workforce refresh tests to cover remote success, deterministic reseeding, and forced fallback scenarios, including façade command wiring.
  - Files/Modules: `src/backend/src/engine/workforce/__tests__/jobMarketService.test.ts` (engine), `src/backend/src/facade/__tests__/workforce.test.ts` (facade test surface).
  - Acceptance: Automated tests assert byte-stable outputs for identical seeds, confirm `refreshCandidates` emits deterministic telemetry, and validate fallback activation when `fetch` rejects.

- Task WB-JM-203 (Priority: Medium) — Documentation: Update the job market population docs and façade command reference to spell out deterministic seeding, RandomUser usage, offline fallback policy, and operator toggles.
  - Files/Modules: `docs/system/job_market_population.md`, `docs/system/ui_archictecture.md`, `docs/system/facade.md` (docs).
  - Acceptance: Documentation explicitly covers deterministic output guarantees and the fallback behaviour for RandomUser outages, and references the façade command surface for manual refreshes.
