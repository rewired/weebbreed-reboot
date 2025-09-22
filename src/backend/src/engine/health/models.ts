import type { PlantStage, TreatmentCategory, HealthTarget } from '@/state/models.js';

export type DiseasePhaseKey = 'seedling' | 'vegetation' | 'earlyFlower' | 'lateFlower' | 'ripening';

export interface DiseasePhaseMultipliers {
  infection: number;
  degeneration: number;
  recovery: number;
}

export interface DiseaseTreatmentMultipliers {
  infectionMultiplier?: number;
  degenerationMultiplier?: number;
  recoveryMultiplier?: number;
}

export interface DiseaseBalancingCaps {
  minDailyDegeneration: number;
  maxDailyDegeneration: number;
  minDailyRecovery: number;
  maxDailyRecovery: number;
}

export interface DiseaseBalancingConfig {
  global: {
    baseDailyInfectionMultiplier: number;
    baseRecoveryMultiplier: number;
    maxConcurrentDiseases: number;
    symptomDelayDays: {
      min: number;
      max: number;
    };
  };
  phaseMultipliers: Partial<Record<DiseasePhaseKey, DiseasePhaseMultipliers>>;
  treatmentEfficacy: Partial<Record<TreatmentCategory, DiseaseTreatmentMultipliers>>;
  caps: DiseaseBalancingCaps;
}

export type PestPhaseKey = DiseasePhaseKey;

export interface PestPhaseMultipliers {
  reproduction: number;
  mortality: number;
  damage: number;
}

export interface PestTreatmentMultipliers {
  reproductionMultiplier?: number;
  mortalityMultiplier?: number;
  damageMultiplier?: number;
}

export interface PestBalancingCaps {
  minDailyReproduction: number;
  maxDailyReproduction: number;
  minDailyMortality: number;
  maxDailyMortality: number;
  minDailyDamage: number;
  maxDailyDamage: number;
}

export interface PestBalancingConfig {
  global: {
    baseDailyReproductionMultiplier: number;
    baseDailyMortalityMultiplier: number;
    baseDamageMultiplier: number;
    maxConcurrentPests: number;
  };
  phaseMultipliers: Partial<Record<PestPhaseKey, PestPhaseMultipliers>>;
  controlEfficacy: Partial<Record<TreatmentCategory, PestTreatmentMultipliers>>;
  caps: PestBalancingCaps;
}

export interface TreatmentOptionDiseaseEffect {
  infectionMultiplier?: number;
  degenerationMultiplier?: number;
  recoveryMultiplier?: number;
}

export interface TreatmentOptionPestEffect {
  reproductionMultiplier?: number;
  mortalityMultiplier?: number;
  damageMultiplier?: number;
}

export interface TreatmentOption {
  id: string;
  name: string;
  category: TreatmentCategory;
  targets: HealthTarget[];
  applicability?: string[];
  efficacy?: {
    disease?: TreatmentOptionDiseaseEffect;
    pest?: TreatmentOptionPestEffect;
  };
  cooldownDays?: number;
  effectDurationDays?: number;
  reentryIntervalTicks?: number;
  preHarvestIntervalTicks?: number;
}

export type TreatmentOptionIndex = Map<string, TreatmentOption>;

export const mapStageToHealthPhase = (stage: PlantStage): DiseasePhaseKey => {
  switch (stage) {
    case 'seedling':
      return 'seedling';
    case 'vegetative':
      return 'vegetation';
    case 'flowering':
      return 'earlyFlower';
    case 'ripening':
    case 'harvestReady':
      return 'ripening';
    default:
      return 'lateFlower';
  }
};

export const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};
