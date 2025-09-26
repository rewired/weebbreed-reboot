export interface DifficultyModifiers {
  plantStress: {
    optimalRangeMultiplier: number;
    stressAccumulationMultiplier: number;
  };
  deviceFailure: {
    mtbfMultiplier: number;
  };
  economics: {
    initialCapital: number;
    itemPriceMultiplier: number;
    harvestPriceMultiplier: number;
    rentPerSqmStructurePerTick: number;
    rentPerSqmRoomPerTick: number;
  };
}

export interface DifficultyPreset {
  name: string;
  description: string;
  modifiers: DifficultyModifiers;
}

export interface DifficultyConfig {
  [key: string]: DifficultyPreset;
}

export interface ModifierRanges {
  plantStress: {
    optimalRangeMultiplier: [number, number];
    stressAccumulationMultiplier: [number, number];
  };
  deviceFailure: {
    mtbfMultiplier: [number, number];
  };
  economics: {
    initialCapital: [number, number];
    itemPriceMultiplier: [number, number];
    harvestPriceMultiplier: [number, number];
    rentPerSqmStructurePerTick: [number, number];
    rentPerSqmRoomPerTick: [number, number];
  };
}

export const MODIFIER_RANGES: ModifierRanges = {
  plantStress: {
    optimalRangeMultiplier: [0.5, 1.5],
    stressAccumulationMultiplier: [0.5, 1.5],
  },
  deviceFailure: {
    mtbfMultiplier: [0.5, 1.5],
  },
  economics: {
    initialCapital: [50000, 1000000000],
    itemPriceMultiplier: [0.5, 1.5],
    harvestPriceMultiplier: [0.5, 1.5],
    rentPerSqmStructurePerTick: [0.1, 1.5],
    rentPerSqmRoomPerTick: [0.1, 1.5],
  },
};
