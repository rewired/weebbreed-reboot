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

export type ModifierRanges = {
  [T in keyof DifficultyModifiers]: {
    [K in keyof DifficultyModifiers[T]]: readonly [number, number];
  };
};

export const MODIFIER_RANGES = {
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
} as const satisfies ModifierRanges;

export const getModifierRange = <T extends keyof ModifierRanges, K extends keyof ModifierRanges[T]>(
  category: T,
  key: K,
): ModifierRanges[T][K] => MODIFIER_RANGES[category][key];
