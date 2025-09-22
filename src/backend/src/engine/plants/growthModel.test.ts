import { describe, expect, it } from 'vitest';
import type { PlantState, ZoneEnvironmentState } from '@/state/models.js';
import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';
import { createInitialPhenologyState, createPhenologyConfig } from './phenology.js';
import type { PhenologyState } from './phenology.js';
import { computeVpd, updatePlantGrowth } from './growthModel.js';

const createTestStrain = (): StrainBlueprint => ({
  id: 'strain-test',
  slug: 'test-strain',
  name: 'Test Strain',
  lineage: { parents: [] },
  genotype: { sativa: 0.5, indica: 0.5, ruderalis: 0 },
  generalResilience: 0.8,
  germinationRate: 0.95,
  chemotype: { thcContent: 0.2, cbdContent: 0.02 },
  morphology: { growthRate: 1, yieldFactor: 1, leafAreaIndex: 3 },
  growthModel: {
    maxBiomassDry: 0.22,
    baseLightUseEfficiency: 0.0011,
    maintenanceFracPerDay: 0.012,
    dryMatterFraction: { vegetation: 0.25, flowering: 0.22 },
    harvestIndex: { targetFlowering: 0.7 },
    phaseCapMultiplier: { vegetation: 0.55, flowering: 1 },
    temperature: { Q10: 2, T_ref_C: 25 },
  },
  environmentalPreferences: {
    lightSpectrum: {},
    lightIntensity: {
      seedling: [200, 350],
      vegetation: [350, 600],
      flowering: [600, 900],
    },
    lightCycle: {
      vegetation: [18, 6],
      flowering: [12, 12],
    },
    idealTemperature: {
      seedling: [21, 26],
      vegetation: [23, 28],
      flowering: [20, 26],
    },
    idealHumidity: {
      seedling: [0.6, 0.7],
      vegetation: [0.55, 0.65],
      flowering: [0.45, 0.55],
    },
  },
  nutrientDemand: {
    dailyNutrientDemand: {
      seedling: { nitrogen: 0.02, phosphorus: 0.015, potassium: 0.02 },
      vegetation: { nitrogen: 0.1, phosphorus: 0.06, potassium: 0.11 },
      flowering: { nitrogen: 0.05, phosphorus: 0.12, potassium: 0.12 },
    },
    npkTolerance: 0.2,
    npkStressIncrement: 0.03,
  },
  waterDemand: {
    dailyWaterUsagePerSquareMeter: {
      seedling: 0.12,
      vegetation: 0.32,
      flowering: 0.5,
    },
    minimumFractionRequired: 0.2,
  },
  diseaseResistance: {
    dailyInfectionIncrement: 0.02,
    infectionThreshold: 0.5,
    recoveryRate: 0.01,
    degenerationRate: 0.01,
    regenerationRate: 0.005,
    fatalityThreshold: 0.95,
  },
  photoperiod: {
    vegetationTime: 2_419_200,
    floweringTime: 5_184_000,
    transitionTrigger: 43_200,
  },
  stageChangeThresholds: {
    vegetative: { minLightHours: 260, maxStressForStageChange: 0.4 },
    flowering: { minLightHours: 620, maxStressForStageChange: 0.35 },
    ripening: { minLightHours: 920, maxStressForStageChange: 0.3 },
  },
  harvestWindow: [5_184_000, 6_220_800],
  harvestProperties: {
    ripeningTime: 172_800,
    maxStorageTime: 432_000,
    qualityDecayRate: 5.555555555555556e-6,
  },
  meta: {},
});

const createPlant = (overrides: Partial<PlantState> = {}): PlantState => ({
  id: 'plant-test',
  strainId: 'strain-test',
  zoneId: 'zone-1',
  stage: 'seedling',
  plantedAtTick: 0,
  ageInHours: 0,
  health: 0.9,
  stress: 0.1,
  biomassDryGrams: 18,
  heightMeters: 0.35,
  canopyCover: 0.2,
  yieldDryGrams: 0,
  quality: 0.8,
  lastMeasurementTick: 0,
  ...overrides,
});

const createEnvironment = (
  overrides: Partial<ZoneEnvironmentState> = {},
): ZoneEnvironmentState => ({
  temperature: 25,
  relativeHumidity: 0.6,
  co2: 800,
  ppfd: 500,
  vpd: 1.1,
  ...overrides,
});

describe('updatePlantGrowth', () => {
  it('limits biomass gain when PPFD is zero and increases with light', () => {
    const strain = createTestStrain();
    const config = createPhenologyConfig(strain);
    const plant = createPlant({ stage: 'vegetative' });

    const darkResult = updatePlantGrowth({
      plant,
      strain,
      environment: createEnvironment({ ppfd: 0 }),
      tickHours: 1,
      phenology: createInitialPhenologyState('vegetative'),
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 1, nutrientSupplyFraction: 1 },
    });

    const brightResult = updatePlantGrowth({
      plant,
      strain,
      environment: createEnvironment({ ppfd: 650 }),
      tickHours: 1,
      phenology: createInitialPhenologyState('vegetative'),
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 1, nutrientSupplyFraction: 1 },
    });

    expect(darkResult.biomassDelta).toBeLessThan(brightResult.biomassDelta);
    expect(brightResult.biomassDelta).toBeGreaterThan(0);
    expect(darkResult.transpirationLiters).toBeLessThan(brightResult.transpirationLiters);
    expect(brightResult.transpirationLiters).toBeGreaterThan(0);
  });

  it('reduces growth when temperature deviates from the optimal band', () => {
    const strain = createTestStrain();
    const config = createPhenologyConfig(strain);
    const plant = createPlant({ stage: 'vegetative' });

    const optimal = updatePlantGrowth({
      plant,
      strain,
      environment: createEnvironment({ temperature: 25, ppfd: 650 }),
      tickHours: 1,
      phenology: createInitialPhenologyState('vegetative'),
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 1, nutrientSupplyFraction: 1 },
    });

    const cold = updatePlantGrowth({
      plant,
      strain,
      environment: createEnvironment({ temperature: 12, ppfd: 650 }),
      tickHours: 1,
      phenology: createInitialPhenologyState('vegetative'),
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 1, nutrientSupplyFraction: 1 },
    });

    expect(cold.metrics.temperature.response).toBeLessThan(optimal.metrics.temperature.response);
    expect(cold.biomassDelta).toBeLessThan(optimal.biomassDelta);
  });

  it('increases stress and emits alerts under high VPD conditions', () => {
    const strain = createTestStrain();
    const config = createPhenologyConfig(strain);
    const plant = createPlant({ stage: 'vegetative', health: 0.62 });

    const result = updatePlantGrowth({
      plant,
      strain,
      environment: createEnvironment({ temperature: 31, relativeHumidity: 0.28, ppfd: 550 }),
      tickHours: 6,
      phenology: createInitialPhenologyState('vegetative'),
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 1, nutrientSupplyFraction: 1 },
      tick: 42,
    });

    expect(result.metrics.vpd.stress).toBeGreaterThan(0.4);
    expect(result.plant.health).toBeLessThan(0.5);
    expect(result.events.some((event) => event.type === 'plant.healthAlert')).toBe(true);
  });

  it('emits a stage change event when phenology requirements are met', () => {
    const strain = createTestStrain();
    const config = createPhenologyConfig(strain);
    const requirement = config.stageLightRequirements.seedling ?? 0;

    const phenology = {
      ...createInitialPhenologyState('seedling'),
      stageHours: (config.stageDurations.seedling ?? 200) - 2,
      stageLightHours: Math.max(requirement - 2, 0),
      totalLightHours: Math.max(requirement - 2, 0),
    } satisfies PhenologyState;

    const plant = createPlant({ stage: 'seedling', biomassDryGrams: 12 });

    const result = updatePlantGrowth({
      plant,
      strain,
      environment: createEnvironment({ ppfd: 600, temperature: 24, relativeHumidity: 0.6 }),
      tickHours: 4,
      phenology,
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 1, nutrientSupplyFraction: 1 },
      tick: 100,
    });

    expect(result.plant.stage).toBe('vegetative');
    expect(result.events.some((event) => event.type === 'plant.stageChanged')).toBe(true);
  });

  it('reduces biomass and health when water supply is constrained', () => {
    const strain = createTestStrain();
    const config = createPhenologyConfig(strain);
    const plant = createPlant({ stage: 'vegetative', biomassDryGrams: 32, health: 0.85 });

    const environment = createEnvironment({ ppfd: 620, temperature: 25, relativeHumidity: 0.6 });

    const ample = updatePlantGrowth({
      plant,
      strain,
      environment,
      tickHours: 2,
      phenology: createInitialPhenologyState('vegetative'),
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 1, nutrientSupplyFraction: 1 },
    });

    const limited = updatePlantGrowth({
      plant,
      strain,
      environment,
      tickHours: 2,
      phenology: createInitialPhenologyState('vegetative'),
      phenologyConfig: config,
      resourceSupply: { waterSupplyFraction: 0.35, nutrientSupplyFraction: 1 },
    });

    expect(limited.metrics.water.stress).toBeGreaterThan(ample.metrics.water.stress);
    expect(limited.biomassDelta).toBeLessThan(ample.biomassDelta);
    expect(limited.plant.health).toBeLessThan(ample.plant.health);
    expect(limited.transpirationLiters).toBeLessThan(ample.transpirationLiters);
  });
});

describe('computeVpd', () => {
  it('returns zero at saturation humidity', () => {
    expect(computeVpd(26, 1)).toBe(0);
  });

  it('increases when relative humidity decreases at constant temperature', () => {
    const warmHumid = computeVpd(27, 0.68);
    const warmDry = computeVpd(27, 0.45);
    expect(warmDry).toBeGreaterThan(warmHumid);
  });
});
