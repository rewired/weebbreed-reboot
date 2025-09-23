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
