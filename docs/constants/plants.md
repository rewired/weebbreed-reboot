# Plant Growth Defaults

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

## Light & CO₂ Response

`PLANT_DEFAULT_LIGHT_HALF_SATURATION = 350`
Fallback PPFD half-saturation (µmol·m⁻²·s⁻¹) for strains without stage targets.

`PLANT_LIGHT_HALF_SATURATION_MIN = 50`
Minimum PPFD half-saturation allowed when averaging blueprint ranges.

`PLANT_LIGHT_HALF_SATURATION_MAX = 1200`
Maximum PPFD half-saturation allowed when averaging blueprint ranges.

`PLANT_DEFAULT_CO2_HALF_SATURATION = 600`
Fallback CO₂ half-saturation (ppm) prior to growth-rate scaling.

`PLANT_CO2_HALF_SATURATION_MIN = 350`
Minimum CO₂ half-saturation after applying growth-rate scaling.

`PLANT_CO2_HALF_SATURATION_MAX = 900`
Maximum CO₂ half-saturation after applying growth-rate scaling.

`PLANT_DEFAULT_GROWTH_RATE = 1`
Morphology growth-rate multiplier assumed when a strain omits the field.

`PLANT_MIN_GROWTH_RATE = 0.3`
Lower clamp for morphology growth-rate multipliers.

`PLANT_MAX_GROWTH_RATE = 2`
Upper clamp for morphology growth-rate multipliers.

## Temperature & VPD Response

`PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_MEAN_C = 25`
Fallback Gaussian mean (°C) when a strain lacks ideal temperature bands.

`PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_SIGMA_C = 6`
Fallback Gaussian sigma (°C) for temperature response when no band is provided.

`PLANT_MIN_TEMPERATURE_GAUSSIAN_SIGMA_C = 3`
Minimum sigma (°C) used when computing Gaussians from blueprint ranges.

`PLANT_DEFAULT_VPD_GAUSSIAN_MEAN_KPA = 1.1`
Fallback VPD mean (kPa) when a strain omits humidity preferences.

`PLANT_DEFAULT_VPD_GAUSSIAN_SIGMA_KPA = 0.6`
Fallback VPD sigma (kPa) applied without humidity preferences.

`PLANT_VPD_RELATIVE_HUMIDITY_MIN = 0.2`
Minimum relative humidity accepted when interpreting strain humidity bands.

`PLANT_VPD_RELATIVE_HUMIDITY_LOW_MAX = 0.95`
Upper clamp for the low-end humidity bound before enforcing span.

`PLANT_VPD_RELATIVE_HUMIDITY_MIN_SPAN = 0.05`
Minimum relative humidity width enforced between low and high bounds.

`PLANT_VPD_RELATIVE_HUMIDITY_MAX = 0.98`
Upper clamp for the high-end humidity bound.

`PLANT_VPD_TOLERANCE_FACTOR = 0.5`
Fraction of the VPD deviation window used as Gaussian sigma.

## Canopy Geometry

`PLANT_LEAF_AREA_INDEX_MIN = 0.2`
Lowest leaf area index permitted when estimating canopy interception.

`PLANT_LEAF_AREA_INDEX_MAX = 6`
Highest leaf area index permitted when estimating canopy interception.

`PLANT_DEFAULT_LEAF_AREA_INDEX = 2.5`
Fallback leaf area index when morphology data is missing.

`PLANT_CANOPY_AREA_MIN = 0.05`
Minimum canopy area (m²) enforced when computing interception and transpiration.

`PLANT_DEFAULT_CANOPY_COVER = 0.1`
Fallback canopy cover (m²) applied when the plant state lacks the value.

`PLANT_CANOPY_LIGHT_EXTINCTION_COEFFICIENT = 0.7`
Beer-Lambert extinction coefficient for canopy light interception.

## Health & Quality Response

`PLANT_DEFAULT_RESILIENCE = 0.5`
Fallback resilience applied when a strain omits the trait.

`PLANT_RESILIENCE_STRESS_RELIEF_FACTOR = 0.3`
Stress relief factor multiplied by the resilience delta from the baseline.

`PLANT_HEALTH_BASE_RECOVERY_RATE = 0.6`
Base proportion of the health recovery rate applied per tick.

`PLANT_HEALTH_RESILIENCE_RECOVERY_BONUS = 0.4`
Additional health recovery per point of resilience.

`PLANT_QUALITY_STRESS_FACTOR = 0.4`
Stress-to-quality penalty multiplier.

`PLANT_QUALITY_BASE_ADJUSTMENT_RATE = 0.5`
Base rate nudging quality toward the health-implied target each tick.

`PLANT_HEALTH_ALERT_THRESHOLDS = [{ threshold: 0.5, severity: "warning" }, { threshold: 0.3, severity: "critical" }]`
Ordered health alert triggers emitted when a plant crosses the thresholds.

## Yield & Morphology

`PLANT_DEFAULT_HARVEST_INDEX = 0.65`
Fallback fraction of biomass routed to yield during flowering/ripening.

`PLANT_HEIGHT_PER_GRAM_MULTIPLIER = 0.002`
Meters of height gained per gram of positive biomass growth.
