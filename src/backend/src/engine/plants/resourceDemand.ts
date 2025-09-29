import type { PlantStage } from '@/state/types.js';
import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';
import { mapStageToGrowthPhase } from './phenology.js';

export interface NutrientDemand {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

export interface ResourceSupply {
  availableWaterLiters?: number;
  waterSupplyFraction?: number;
  availableNutrients?: Partial<NutrientDemand>;
  nutrientSupplyFraction?: number;
  nutrientSolutionRatio?: number;
}

export interface ResourceDemandInput {
  strain: StrainBlueprint;
  stage: PlantStage;
  canopyArea: number;
  tickHours: number;
  supply?: ResourceSupply;
}

export interface ResourceDemandResult {
  waterDemandLiters: number;
  availableWaterLiters: number;
  waterSupplyFraction: number;
  waterStress: number;
  nutrientDemand: NutrientDemand;
  availableNutrients: NutrientDemand;
  nutrientSupplyFraction: number;
  nutrientStress: number;
  resourceResponse: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const demandKeyForStage = (
  stage: PlantStage,
): keyof StrainBlueprint['waterDemand']['dailyWaterUsagePerSquareMeter'] => {
  const phase = mapStageToGrowthPhase(stage);
  switch (phase) {
    case 'seedling':
      return 'seedling';
    case 'vegetation':
      return 'vegetation';
    case 'flowering':
    case 'ripening':
    default:
      return 'flowering';
  }
};

const createZeroDemand = (): NutrientDemand => ({
  nitrogen: 0,
  phosphorus: 0,
  potassium: 0,
});

const multiplyDemand = (demand: NutrientDemand, factor: number): NutrientDemand => ({
  nitrogen: demand.nitrogen * factor,
  phosphorus: demand.phosphorus * factor,
  potassium: demand.potassium * factor,
});

const minDemand = (a: NutrientDemand, b: NutrientDemand): NutrientDemand => ({
  nitrogen: Math.min(a.nitrogen, b.nitrogen),
  phosphorus: Math.min(a.phosphorus, b.phosphorus),
  potassium: Math.min(a.potassium, b.potassium),
});

const resolveWaterDemand = (
  strain: StrainBlueprint,
  stage: PlantStage,
  canopyArea: number,
  tickHours: number,
): number => {
  const key = demandKeyForStage(stage);
  const dailyPerSqm = strain.waterDemand.dailyWaterUsagePerSquareMeter[key] ?? 0;
  const area = Math.max(canopyArea, 0);
  const hours = Math.max(tickHours, 0);
  return (dailyPerSqm * area * hours) / 24;
};

const resolveNutrientDemand = (
  strain: StrainBlueprint,
  stage: PlantStage,
  tickHours: number,
): NutrientDemand => {
  const key = demandKeyForStage(stage);
  const dailyDemand = strain.nutrientDemand.dailyNutrientDemand[key];
  if (!dailyDemand) {
    return createZeroDemand();
  }
  const factor = Math.max(tickHours, 0) / 24;
  return {
    nitrogen: dailyDemand.nitrogen * factor,
    phosphorus: dailyDemand.phosphorus * factor,
    potassium: dailyDemand.potassium * factor,
  };
};

const computeWaterStress = (
  demand: number,
  supplyFraction: number,
  minimumFraction: number,
): number => {
  if (demand <= 0) {
    return 0;
  }
  const minFraction = clamp(minimumFraction, 0, 1);
  if (supplyFraction >= 1) {
    return 0;
  }
  if (supplyFraction <= minFraction) {
    return 1;
  }
  const usableRange = 1 - minFraction;
  if (usableRange <= 0) {
    return clamp(1 - supplyFraction, 0, 1);
  }
  const scaled = (supplyFraction - minFraction) / usableRange;
  return clamp(1 - scaled, 0, 1);
};

const computeNutrientSupplyFraction = (
  demand: NutrientDemand,
  supply: ResourceSupply | undefined,
): { fraction: number; available: NutrientDemand } => {
  if (!supply) {
    return {
      fraction: 1,
      available: { ...demand },
    };
  }

  const desired = demand;
  const baseRatio = supply.nutrientSupplyFraction ?? 1;
  const concentration = supply.nutrientSolutionRatio ?? 1;

  let fraction = Math.min(baseRatio, concentration);
  let available: NutrientDemand = demand;

  if (supply.availableNutrients) {
    const supplied: NutrientDemand = {
      nitrogen:
        supply.availableNutrients.nitrogen ?? desired.nitrogen * fraction ?? desired.nitrogen,
      phosphorus:
        supply.availableNutrients.phosphorus ?? desired.phosphorus * fraction ?? desired.phosphorus,
      potassium:
        supply.availableNutrients.potassium ?? desired.potassium * fraction ?? desired.potassium,
    };

    const ratios = [
      desired.nitrogen > 0 ? supplied.nitrogen / desired.nitrogen : Number.POSITIVE_INFINITY,
      desired.phosphorus > 0 ? supplied.phosphorus / desired.phosphorus : Number.POSITIVE_INFINITY,
      desired.potassium > 0 ? supplied.potassium / desired.potassium : Number.POSITIVE_INFINITY,
    ].filter((value) => Number.isFinite(value));

    if (ratios.length > 0) {
      fraction = Math.min(fraction, ...ratios);
    }

    available = minDemand(desired, supplied);
  } else {
    available = multiplyDemand(desired, clamp(fraction, 0, 1));
  }

  if (!Number.isFinite(fraction)) {
    fraction = 1;
  }

  const boundedFraction = clamp(fraction, 0, 1);
  return {
    fraction: boundedFraction,
    available: {
      nitrogen: available.nitrogen,
      phosphorus: available.phosphorus,
      potassium: available.potassium,
    },
  };
};

const computeNutrientStress = (supplyFraction: number, tolerance: number): number => {
  if (supplyFraction >= 1) {
    return 0;
  }
  const effective = clamp(supplyFraction + tolerance, 0, 1);
  return clamp(1 - effective, 0, 1);
};

export const calculateResourceDemand = (input: ResourceDemandInput): ResourceDemandResult => {
  const { strain, stage, canopyArea, tickHours, supply } = input;
  const waterDemand = resolveWaterDemand(strain, stage, canopyArea, tickHours);
  const nutrientDemand = resolveNutrientDemand(strain, stage, tickHours);

  const suppliedWaterLiters = supply?.availableWaterLiters;
  const supplyFractionFromLiters =
    suppliedWaterLiters !== undefined && waterDemand > 0 ? suppliedWaterLiters / waterDemand : 1;
  const waterSupplyFraction = clamp(
    supply?.waterSupplyFraction ?? supplyFractionFromLiters ?? 1,
    0,
    Number.POSITIVE_INFINITY,
  );
  const boundedWaterFraction = waterDemand > 0 ? clamp(waterSupplyFraction, 0, 1) : 1;
  const minimumFraction = strain.waterDemand.minimumFractionRequired ?? 0;
  const waterStress = computeWaterStress(waterDemand, boundedWaterFraction, minimumFraction);
  const availableWaterLiters = waterDemand * boundedWaterFraction;

  const nutrientSupply = computeNutrientSupplyFraction(nutrientDemand, supply);
  const nutrientStress = computeNutrientStress(
    nutrientSupply.fraction,
    strain.nutrientDemand.npkTolerance ?? 0,
  );

  const resourceResponse = 1 - (waterStress + nutrientStress) / 2;

  return {
    waterDemandLiters: waterDemand,
    availableWaterLiters,
    waterSupplyFraction: boundedWaterFraction,
    waterStress,
    nutrientDemand,
    availableNutrients: nutrientSupply.available,
    nutrientSupplyFraction: nutrientSupply.fraction,
    nutrientStress,
    resourceResponse: clamp(resourceResponse, 0, 1),
  };
};
