/**
 * Describes the severity of a health alert emitted when a plant crosses a health threshold.
 */
export type PlantHealthAlertSeverity = 'warning' | 'critical';

/**
 * Defines a health alert trigger for plants when their health fraction falls below a threshold.
 */
export interface PlantHealthAlertThreshold {
  /** Health fraction (0..1) below which the alert should fire. */
  threshold: number;
  /** Severity level that downstream telemetry should emit. */
  severity: PlantHealthAlertSeverity;
}

/**
 * Default light half-saturation (µmol·m⁻²·s⁻¹) used when a strain does not specify stage-specific PPFD targets.
 */
export const PLANT_DEFAULT_LIGHT_HALF_SATURATION = 350;

/**
 * Lower bound (µmol·m⁻²·s⁻¹) applied when deriving a strain's light half-saturation from blueprint ranges.
 */
export const PLANT_LIGHT_HALF_SATURATION_MIN = 50;

/**
 * Upper bound (µmol·m⁻²·s⁻¹) applied when deriving a strain's light half-saturation from blueprint ranges.
 */
export const PLANT_LIGHT_HALF_SATURATION_MAX = 1200;

/**
 * Default CO₂ half-saturation point (ppm) for strains without morphology overrides.
 */
export const PLANT_DEFAULT_CO2_HALF_SATURATION = 600;

/**
 * Minimum allowable CO₂ half-saturation point (ppm) once growth-rate scaling is applied.
 */
export const PLANT_CO2_HALF_SATURATION_MIN = 350;

/**
 * Maximum allowable CO₂ half-saturation point (ppm) once growth-rate scaling is applied.
 */
export const PLANT_CO2_HALF_SATURATION_MAX = 900;

/**
 * Default Gaussian mean (°C) for temperature response curves when a strain lacks a preference window.
 */
export const PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_MEAN_C = 25;

/**
 * Default Gaussian sigma (°C) for temperature response curves when a strain lacks a preference window.
 */
export const PLANT_DEFAULT_TEMPERATURE_GAUSSIAN_SIGMA_C = 6;

/**
 * Minimum Gaussian sigma (°C) allowed when deriving temperature response curves from preference windows.
 */
export const PLANT_MIN_TEMPERATURE_GAUSSIAN_SIGMA_C = 3;

/**
 * Default Gaussian mean (kPa) for VPD response when humidity preferences are missing.
 */
export const PLANT_DEFAULT_VPD_GAUSSIAN_MEAN_KPA = 1.1;

/**
 * Default Gaussian sigma (kPa) for VPD response when humidity preferences are missing.
 */
export const PLANT_DEFAULT_VPD_GAUSSIAN_SIGMA_KPA = 0.6;

/**
 * Minimum relative humidity (0..1) allowed when converting strain humidity ranges into VPD targets.
 */
export const PLANT_VPD_RELATIVE_HUMIDITY_MIN = 0.2;

/**
 * Maximum relative humidity (0..1) permitted for the lower bound of a strain's humidity range.
 */
export const PLANT_VPD_RELATIVE_HUMIDITY_LOW_MAX = 0.95;

/**
 * Minimum span in relative humidity (0..1) enforced between the low and high entries of a strain's humidity range.
 */
export const PLANT_VPD_RELATIVE_HUMIDITY_MIN_SPAN = 0.05;

/**
 * Maximum relative humidity (0..1) permitted for the upper bound of a strain's humidity range.
 */
export const PLANT_VPD_RELATIVE_HUMIDITY_MAX = 0.98;

/**
 * Factor applied to the VPD tolerance window when translating humidity ranges into Gaussian sigma values.
 */
export const PLANT_VPD_TOLERANCE_FACTOR = 0.5;

/**
 * Default morphological growth rate multiplier applied when scaling CO₂ response.
 */
export const PLANT_DEFAULT_GROWTH_RATE = 1;

/**
 * Minimum growth rate multiplier used when scaling CO₂ response from morphology data.
 */
export const PLANT_MIN_GROWTH_RATE = 0.3;

/**
 * Maximum growth rate multiplier used when scaling CO₂ response from morphology data.
 */
export const PLANT_MAX_GROWTH_RATE = 2;

/**
 * Minimum leaf-area index used when estimating canopy interception.
 */
export const PLANT_LEAF_AREA_INDEX_MIN = 0.2;

/**
 * Maximum leaf-area index used when estimating canopy interception.
 */
export const PLANT_LEAF_AREA_INDEX_MAX = 6;

/**
 * Default leaf-area index applied when a strain does not provide morphology data.
 */
export const PLANT_DEFAULT_LEAF_AREA_INDEX = 2.5;

/**
 * Minimum canopy area (m²) enforced when estimating canopy interception.
 */
export const PLANT_CANOPY_AREA_MIN = 0.05;

/**
 * Default canopy cover (m²) used when both the plant state and overrides omit the value.
 */
export const PLANT_DEFAULT_CANOPY_COVER = 0.1;

/**
 * Beer-Lambert extinction coefficient applied to estimate canopy light interception.
 */
export const PLANT_CANOPY_LIGHT_EXTINCTION_COEFFICIENT = 0.7;

/**
 * Default resilience used when a strain omits the general resilience property.
 */
export const PLANT_DEFAULT_RESILIENCE = 0.5;

/**
 * Scaling factor translating resilience offsets into stress relief.
 */
export const PLANT_RESILIENCE_STRESS_RELIEF_FACTOR = 0.3;

/**
 * Multiplier translating stress into quality loss per evaluation step.
 */
export const PLANT_QUALITY_STRESS_FACTOR = 0.4;

/**
 * Base rate applied when nudging plant quality toward the health-implied target each tick.
 */
export const PLANT_QUALITY_BASE_ADJUSTMENT_RATE = 0.5;

/**
 * Base portion of the health recovery rate (0..1) used during health adjustments.
 */
export const PLANT_HEALTH_BASE_RECOVERY_RATE = 0.6;

/**
 * Additional health recovery contribution granted per point of resilience.
 */
export const PLANT_HEALTH_RESILIENCE_RECOVERY_BONUS = 0.4;

/**
 * Default harvest index (fraction of biomass becoming yield) for strains without overrides.
 */
export const PLANT_DEFAULT_HARVEST_INDEX = 0.65;

/**
 * Multiplier converting positive biomass gain (grams) into incremental height (meters).
 */
export const PLANT_HEIGHT_PER_GRAM_MULTIPLIER = 0.002;

/**
 * Ordered thresholds that emit health alerts when plant health crosses below them.
 */
export const PLANT_HEALTH_ALERT_THRESHOLDS: readonly PlantHealthAlertThreshold[] = [
  { threshold: 0.5, severity: 'warning' },
  { threshold: 0.3, severity: 'critical' },
];
