import type { PlantStage } from '../../state/models.js';
import type { StrainBlueprint } from '../../../data/schemas/strainsSchema.js';

export const PHENOLOGY_STAGE_ORDER: PlantStage[] = [
  'seedling',
  'vegetative',
  'flowering',
  'ripening',
  'harvestReady',
];

export type GrowthPhaseKey = 'seedling' | 'vegetation' | 'flowering' | 'ripening';

const DEFAULT_SEEDLING_HOURS = 14 * 24;
const DEFAULT_RIPENING_HOURS = 72;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const normaliseResilience = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }
  return clamp(value, 0, 1);
};

export const mapStageToGrowthPhase = (stage: PlantStage): GrowthPhaseKey => {
  switch (stage) {
    case 'seedling':
      return 'seedling';
    case 'vegetative':
      return 'vegetation';
    case 'flowering':
    case 'ripening':
    case 'harvestReady':
      return 'flowering';
    default:
      return 'flowering';
  }
};

const mapGrowthPhaseToStage = (phase: string): PlantStage | undefined => {
  switch (phase) {
    case 'seedling':
      return 'seedling';
    case 'vegetation':
      return 'vegetative';
    case 'flowering':
      return 'flowering';
    case 'ripening':
      return 'ripening';
    default:
      return undefined;
  }
};

export interface PhenologyConfig {
  readonly stageOrder: PlantStage[];
  readonly stageDurations: Partial<Record<PlantStage, number>>;
  readonly stageLightRequirements: Partial<Record<PlantStage, number>>;
  readonly stageStressThresholds: Partial<Record<PlantStage, number>>;
  readonly stageCaps: Partial<Record<PlantStage, number>>;
  readonly resilience: number;
}

export interface PhenologyState {
  stage: PlantStage;
  stageHours: number;
  stageLightHours: number;
  totalLightHours: number;
  stressIntegral: number;
  stressDuration: number;
}

export interface PhenologyTickInput {
  tickHours: number;
  lightHours: number;
  stress: number;
}

export interface PhenologyUpdateResult {
  readonly state: PhenologyState;
  readonly stageChanged: boolean;
  readonly previousStage: PlantStage;
  readonly stageProgress: number;
  readonly stageCapFraction: number;
}

const resolveStageDuration = (stage: PlantStage, strain: StrainBlueprint): number | undefined => {
  switch (stage) {
    case 'seedling':
      return strain.stageChangeThresholds?.vegetative?.minLightHours ?? DEFAULT_SEEDLING_HOURS;
    case 'vegetative':
      return strain.photoperiod.vegetationDays * 24;
    case 'flowering':
      return strain.photoperiod.floweringDays * 24;
    case 'ripening':
      return strain.harvestProperties?.ripeningTimeInHours ?? DEFAULT_RIPENING_HOURS;
    default:
      return undefined;
  }
};

const resolveStageLightRequirement = (
  stage: PlantStage,
  strain: StrainBlueprint,
): number | undefined => {
  const nextStageKey = mapStageToGrowthPhase(stage);
  const thresholds = strain.stageChangeThresholds ?? {};
  switch (stage) {
    case 'seedling':
      return thresholds.vegetative?.minLightHours;
    case 'vegetative':
      return thresholds.flowering?.minLightHours;
    case 'flowering':
      return thresholds.ripening?.minLightHours;
    default:
      return thresholds[nextStageKey]?.minLightHours;
  }
};

const resolveStageStressThreshold = (
  stage: PlantStage,
  strain: StrainBlueprint,
): number | undefined => {
  const thresholds = strain.stageChangeThresholds ?? {};
  switch (stage) {
    case 'seedling':
      return thresholds.vegetative?.maxStressForStageChange;
    case 'vegetative':
      return thresholds.flowering?.maxStressForStageChange;
    case 'flowering':
      return thresholds.ripening?.maxStressForStageChange;
    default:
      return undefined;
  }
};

export const createPhenologyConfig = (strain: StrainBlueprint): PhenologyConfig => {
  const stageDurations: Partial<Record<PlantStage, number>> = {};
  const stageLightRequirements: Partial<Record<PlantStage, number>> = {};
  const stageStressThresholds: Partial<Record<PlantStage, number>> = {};

  for (const stage of PHENOLOGY_STAGE_ORDER) {
    const duration = resolveStageDuration(stage, strain);
    if (duration !== undefined) {
      stageDurations[stage] = duration;
    }
    const lightRequirement = resolveStageLightRequirement(stage, strain);
    if (lightRequirement !== undefined) {
      stageLightRequirements[stage] = lightRequirement;
    }
    const stressThreshold = resolveStageStressThreshold(stage, strain);
    if (stressThreshold !== undefined) {
      stageStressThresholds[stage] = stressThreshold;
    }
  }

  const stageCaps: Partial<Record<PlantStage, number>> = {};
  const phaseCaps = strain.growthModel?.phaseCapMultiplier ?? {};
  for (const [phase, cap] of Object.entries(phaseCaps)) {
    const stage = mapGrowthPhaseToStage(phase);
    if (!stage) {
      continue;
    }
    if (typeof cap === 'number' && Number.isFinite(cap)) {
      stageCaps[stage] = cap;
    }
  }

  return {
    stageOrder: [...PHENOLOGY_STAGE_ORDER],
    stageDurations,
    stageLightRequirements,
    stageStressThresholds,
    stageCaps,
    resilience: normaliseResilience(strain.generalResilience),
  };
};

export const createInitialPhenologyState = (stage: PlantStage): PhenologyState => ({
  stage,
  stageHours: 0,
  stageLightHours: 0,
  totalLightHours: 0,
  stressIntegral: 0,
  stressDuration: 0,
});

export const advancePhenology = (
  state: PhenologyState,
  input: PhenologyTickInput,
  config: PhenologyConfig,
): PhenologyUpdateResult => {
  const updatedHours = state.stageHours + input.tickHours;
  const updatedLight = state.stageLightHours + input.lightHours;
  const updatedTotalLight = state.totalLightHours + input.lightHours;
  const updatedStressIntegral = state.stressIntegral + input.stress * input.tickHours;
  const updatedStressDuration = state.stressDuration + input.tickHours;

  const currentStageIndex = config.stageOrder.indexOf(state.stage);
  const currentStageDuration = config.stageDurations[state.stage] ?? 0;
  const stageCapFraction = config.stageCaps[state.stage] ?? 1;

  if (currentStageIndex === -1 || currentStageIndex >= config.stageOrder.length - 1) {
    return {
      state: {
        ...state,
        stageHours: updatedHours,
        stageLightHours: updatedLight,
        totalLightHours: updatedTotalLight,
        stressIntegral: updatedStressIntegral,
        stressDuration: updatedStressDuration,
      },
      stageChanged: false,
      previousStage: state.stage,
      stageProgress:
        currentStageDuration > 0 ? clamp(updatedHours / currentStageDuration, 0, 1) : 1,
      stageCapFraction,
    };
  }

  const nextStage = config.stageOrder[currentStageIndex + 1];
  const requiredHours = config.stageDurations[state.stage] ?? 0;
  const requiredLight = config.stageLightRequirements[state.stage] ?? 0;
  const stressThreshold = config.stageStressThresholds[state.stage];

  const stressSamples = updatedStressDuration > 0 ? updatedStressDuration : input.tickHours;
  const averageStress =
    stressSamples > 0 ? updatedStressIntegral / stressSamples : clamp(input.stress, 0, 1);

  const resilienceBonus = 1 + (config.resilience - 0.5) * 0.5;
  const effectiveStressThreshold =
    stressThreshold === undefined ? undefined : clamp(stressThreshold * resilienceBonus, 0, 1);

  const meetsHours = requiredHours === 0 || updatedHours >= requiredHours;
  const meetsLight = requiredLight === 0 || updatedTotalLight >= requiredLight;
  const meetsStress =
    effectiveStressThreshold === undefined || averageStress <= effectiveStressThreshold;

  if (meetsHours && meetsLight && meetsStress) {
    const nextStageCap = config.stageCaps[nextStage] ?? 1;
    return {
      state: {
        stage: nextStage,
        stageHours: 0,
        stageLightHours: 0,
        totalLightHours: updatedTotalLight,
        stressIntegral: 0,
        stressDuration: 0,
      },
      stageChanged: true,
      previousStage: state.stage,
      stageProgress: 0,
      stageCapFraction: nextStageCap,
    };
  }

  return {
    state: {
      stage: state.stage,
      stageHours: updatedHours,
      stageLightHours: updatedLight,
      totalLightHours: updatedTotalLight,
      stressIntegral: updatedStressIntegral,
      stressDuration: updatedStressDuration,
    },
    stageChanged: false,
    previousStage: state.stage,
    stageProgress: currentStageDuration > 0 ? clamp(updatedHours / currentStageDuration, 0, 1) : 1,
    stageCapFraction,
  };
};
