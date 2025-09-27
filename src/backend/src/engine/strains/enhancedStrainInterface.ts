import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';
import type { PlantStage } from '@/state/models.js';

// Environmental metric keys used in bands
export type EnvMetric = 'temp_C' | 'rh_frac' | 'co2_ppm' | 'ppfd_umol_m2s' | 'vpd_kPa';

// Growth phase keys for environmental band phase overrides
export type GrowthPhase = 'seedling' | 'veg' | 'flower' | 'ripening';

type EnvBandsFromSchema = NonNullable<StrainBlueprint['envBands']>;
type StressToleranceFromSchema = NonNullable<StrainBlueprint['stressTolerance']>;
type MethodAffinityFromSchema = NonNullable<StrainBlueprint['methodAffinity']>;
type PhaseDurationsFromSchema = NonNullable<StrainBlueprint['phaseDurations']>;
type YieldModelFromSchema = NonNullable<StrainBlueprint['yieldModel']>;

export type EnvBands = EnvBandsFromSchema;
export type PhaseEnvBands = EnvBands['default'];
export type EnvBand = NonNullable<PhaseEnvBands['temp_C']>;
export type StressTolerance = StressToleranceFromSchema;
export type MethodAffinity = MethodAffinityFromSchema;
export type PhaseDurations = PhaseDurationsFromSchema;
export type YieldModel = YieldModelFromSchema;

// Enhanced strain blueprint with new fields
export type EnhancedStrainBlueprint = StrainBlueprint;

const isEnvBand = (value: unknown): value is EnvBand => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<EnvBand>;
  return (
    Array.isArray(candidate.green) &&
    candidate.green.length === 2 &&
    candidate.green.every((entry) => typeof entry === 'number') &&
    typeof candidate.yellowLow === 'number' &&
    typeof candidate.yellowHigh === 'number'
  );
};

/**
 * Maps plant stage to growth phase for environmental band lookup
 */
export const mapStageToPhase = (stage: PlantStage): GrowthPhase => {
  switch (stage) {
    case 'seedling':
      return 'seedling';
    case 'vegetative':
      return 'veg';
    case 'flowering':
      return 'flower';
    case 'ripening':
    case 'harvestReady':
      return 'ripening';
    default:
      return 'veg';
  }
};

/**
 * Gets environmental band for a metric in a specific phase, with fallback to default
 */
export const getEnvBand = (
  strain: EnhancedStrainBlueprint,
  metric: EnvMetric,
  phase: GrowthPhase,
): EnvBand | undefined => {
  if (!strain.envBands) return undefined;

  // Try phase-specific override first
  const phaseOverride = strain.envBands[phase];
  if (phaseOverride) {
    const overrideBand = phaseOverride[metric];
    if (isEnvBand(overrideBand)) {
      return overrideBand;
    }
  }

  // Fall back to default
  const defaultBand = strain.envBands.default[metric];
  return isEnvBand(defaultBand) ? defaultBand : undefined;
};

/**
 * Applies stress tolerance widening to an environmental band
 */
export const applyStressTolerance = (
  band: EnvBand,
  metric: EnvMetric,
  tolerance?: StressTolerance,
): EnvBand => {
  const widening = tolerance?.[metric];
  if (typeof widening !== 'number') {
    return band;
  }

  return {
    green: band.green, // Keep optimal range unchanged
    yellowLow: band.yellowLow - widening,
    yellowHigh: band.yellowHigh + widening,
  };
};

/**
 * Evaluates current environment against strain's environmental bands
 */
export interface EnvEvaluation {
  status: 'optimal' | 'acceptable' | 'stress' | 'critical';
  inGreen: boolean;
  inYellow: boolean;
  deviation: number; // How far outside optimal (0 = in green zone)
}

export const evaluateEnvironment = (
  value: number,
  band: EnvBand,
  applyTolerance: boolean = false,
  tolerance?: StressTolerance,
  metric?: EnvMetric,
): EnvEvaluation => {
  const activeBand =
    applyTolerance && tolerance && metric ? applyStressTolerance(band, metric, tolerance) : band;

  const [greenLow, greenHigh] = activeBand.green;
  const { yellowLow, yellowHigh } = activeBand;

  const inGreen = value >= greenLow && value <= greenHigh;
  const inYellow = value >= yellowLow && value <= yellowHigh;

  let status: EnvEvaluation['status'];
  let deviation: number;

  if (inGreen) {
    status = 'optimal';
    deviation = 0;
  } else if (inYellow) {
    status = 'acceptable';
    if (value < greenLow) {
      deviation = greenLow - value;
    } else {
      deviation = value - greenHigh;
    }
  } else {
    // Outside yellow bands
    if (value < yellowLow) {
      status = value < yellowLow * 0.8 ? 'critical' : 'stress';
      deviation = yellowLow - value;
    } else {
      status = value > yellowHigh * 1.2 ? 'critical' : 'stress';
      deviation = value - yellowHigh;
    }
  }

  return {
    status,
    inGreen,
    inYellow,
    deviation,
  };
};

/**
 * Gets method affinity for a cultivation method
 */
export const getMethodAffinity = (strain: EnhancedStrainBlueprint, methodId: string): number => {
  const affinity = strain.methodAffinity?.[methodId];
  return typeof affinity === 'number' ? affinity : 1.0;
};

/**
 * Gets phase duration in days
 */
export const getPhaseDuration = (
  strain: EnhancedStrainBlueprint,
  phase: keyof PhaseDurations,
): number | undefined => {
  const duration = strain.phaseDurations?.[phase];
  return typeof duration === 'number' ? duration : undefined;
};
