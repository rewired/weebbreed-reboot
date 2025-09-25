import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';
import type { PlantStage } from '@/state/models.js';

// Environmental metric keys used in bands
export type EnvMetric = 'temp_C' | 'rh_frac' | 'co2_ppm' | 'ppfd_umol_m2s' | 'vpd_kPa';

// Growth phase keys for environmental band phase overrides
export type GrowthPhase = 'seedling' | 'veg' | 'flower' | 'ripening';

// Environmental band definition with green zone and yellow limits
export interface EnvBand {
  green: [number, number]; // Optimal range [min, max]
  yellowLow: number; // Warning threshold below optimal
  yellowHigh: number; // Warning threshold above optimal
}

// Phase-specific environmental bands (can override default)
export interface PhaseEnvBands {
  temp_C?: EnvBand;
  rh_frac?: EnvBand;
  co2_ppm?: EnvBand;
  ppfd_umol_m2s?: EnvBand;
  vpd_kPa?: EnvBand;
}

// Complete environmental bands with default and phase overrides
export interface EnvBands {
  default: PhaseEnvBands;
  veg?: PhaseEnvBands;
  flower?: PhaseEnvBands;
  seedling?: PhaseEnvBands;
  ripening?: PhaseEnvBands;
}

// Stress tolerance multipliers (widening of bands when flagged)
export interface StressTolerance {
  vpd_kPa?: number;
  temp_C?: number;
  rh_frac?: number;
  co2_ppm?: number;
  ppfd_umol_m2s?: number;
}

// Method affinity mapping (cultivation method UUID -> affinity 0..1)
export type MethodAffinity = Record<string, number>;

// Phase duration specifications in days
export interface PhaseDurations {
  seedlingDays?: number;
  vegDays?: number;
  flowerDays?: number;
  ripeningDays?: number;
}

// Yield model with quality factor weights and CO2 response
export interface YieldModel {
  baseGmPerPlant: number;
  qualityFactors: {
    vpd?: number;
    ppfd?: number;
    temp?: number;
    rh?: number;
  };
  co2Response?: {
    saturation_ppm: number;
    halfMax_ppm: number;
  };
}

// Enhanced strain blueprint with new fields
export interface EnhancedStrainBlueprint extends StrainBlueprint {
  envBands?: EnvBands;
  stressTolerance?: StressTolerance;
  methodAffinity?: MethodAffinity;
  phaseDurations?: PhaseDurations;
  yieldModel?: YieldModel;
}

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
  if (phaseOverride && phaseOverride[metric]) {
    return phaseOverride[metric];
  }

  // Fall back to default
  return strain.envBands.default[metric];
};

/**
 * Applies stress tolerance widening to an environmental band
 */
export const applyStressTolerance = (
  band: EnvBand,
  metric: EnvMetric,
  tolerance?: StressTolerance,
): EnvBand => {
  if (!tolerance || !tolerance[metric]) return band;

  const widening = tolerance[metric]!;

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
  if (!strain.methodAffinity) return 1.0; // Default neutral affinity
  return strain.methodAffinity[methodId] ?? 1.0;
};

/**
 * Gets phase duration in days
 */
export const getPhaseDuration = (
  strain: EnhancedStrainBlueprint,
  phase: keyof PhaseDurations,
): number | undefined => {
  return strain.phaseDurations?.[phase];
};
