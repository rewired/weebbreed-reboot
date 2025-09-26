export const TICK_PHASES = [
  'applyDevices',
  'deriveEnvironment',
  'irrigationAndNutrients',
  'updatePlants',
  'harvestAndInventory',
  'accounting',
  'commit',
] as const;

export type TickPhase = (typeof TICK_PHASES)[number];
