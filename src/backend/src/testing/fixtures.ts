import type {
  CultivationMethodBlueprint,
  DeviceBlueprint,
  DevicePriceEntry,
  StrainBlueprint,
  StrainPriceEntry,
  UtilityPrices,
  SubstrateBlueprint,
  ContainerBlueprint,
} from '@/data/schemas/index.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { StructureBlueprint } from '@/state/models.js';
import { RngService } from '@/lib/rng.js';
import type { StateFactoryContext } from '../stateFactory.js';
import type { RoomPurpose } from '@/engine/roomPurposes/index.js';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const createStrainBlueprint = (
  overrides: Partial<StrainBlueprint> = {},
): StrainBlueprint => ({
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'test-strain',
  name: 'Test Strain',
  lineage: { parents: [] },
  genotype: { sativa: 0.5, indica: 0.5, ruderalis: 0 },
  generalResilience: 0.8,
  germinationRate: 0.95,
  chemotype: { thcContent: 0.2, cbdContent: 0.02 },
  morphology: { growthRate: 1, yieldFactor: 1, leafAreaIndex: 3 },
  growthModel: {
    maxBiomassDry: 0.24,
    baseLightUseEfficiency: 0.001,
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
  ...overrides,
});

export const createSubstrateBlueprint = (
  overrides: Partial<SubstrateBlueprint> = {},
): SubstrateBlueprint => ({
  id: '55555555-5555-4555-8555-555555555555',
  slug: 'test-substrate',
  kind: 'Substrate',
  name: 'Test Substrate',
  type: 'soil',
  maxCycles: 2,
  ...overrides,
});

export const createContainerBlueprint = (
  overrides: Partial<ContainerBlueprint> = {},
): ContainerBlueprint => ({
  id: '66666666-6666-4666-8666-666666666666',
  slug: 'test-container',
  kind: 'Container',
  name: 'Test Container',
  type: 'pot',
  volumeInLiters: 12,
  footprintArea: 0.3,
  reusableCycles: 5,
  packingDensity: 0.9,
  ...overrides,
});

export const createCultivationMethodBlueprint = (
  overrides: Partial<CultivationMethodBlueprint> = {},
): CultivationMethodBlueprint => ({
  id: '22222222-2222-4222-8222-222222222222',
  kind: 'CultivationMethod',
  name: 'Method Alpha',
  setupCost: 1200,
  laborIntensity: 0.6,
  areaPerPlant: 1.6,
  minimumSpacing: 0.4,
  compatibleSubstrateSlugs: ['test-substrate'],
  compatibleContainerSlugs: ['test-container'],
  substrateCostPerSquareMeter: 2.5,
  containerCostPerUnit: 8.5,
  meta: {},
  ...overrides,
});

const defaultDeviceIds: Record<string, string> = {
  Lamp: '33333333-3333-4333-8333-333333333331',
  ClimateUnit: '33333333-3333-4333-8333-333333333332',
  Dehumidifier: '33333333-3333-4333-8333-333333333333',
};

export const createDeviceBlueprint = (
  overrides: Partial<DeviceBlueprint> & Pick<DeviceBlueprint, 'kind'>,
): DeviceBlueprint => ({
  id: overrides.id ?? defaultDeviceIds[overrides.kind] ?? '33333333-3333-4333-8333-333333333339',
  kind: overrides.kind,
  name: overrides.name ?? `${overrides.kind} Unit`,
  quality: overrides.quality ?? 0.95,
  complexity: overrides.complexity ?? 0.5,
  lifespan: overrides.lifespan ?? 72_000_000,
  roomPurposes: overrides.roomPurposes ?? ['growroom'],
  settings: clone({
    power: 0.8,
    coverageArea: 12,
    ppfd: 900,
    heatFraction: 0.35,
    airflow: overrides.kind === 'ClimateUnit' ? 380 : undefined,
    coolingCapacity: overrides.kind === 'ClimateUnit' ? 2.4 : undefined,
    targetTemperature: overrides.kind === 'ClimateUnit' ? 24 : undefined,
    targetTemperatureRange: overrides.kind === 'ClimateUnit' ? [23, 25] : undefined,
    fullPowerAtDeltaK: overrides.kind === 'ClimateUnit' ? 2 : undefined,
    moistureRemoval: overrides.kind === 'Dehumidifier' ? 3.5 : undefined,
    ...overrides.settings,
  }),
  meta: overrides.meta ?? {},
});

export const createStructureBlueprint = (
  overrides: Partial<StructureBlueprint> = {},
): StructureBlueprint => ({
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Reference Warehouse',
  footprint: {
    length: 12,
    width: 6,
    height: 4,
    ...(overrides.footprint ?? {}),
  },
  rentalCostPerSqmPerMonth: overrides.rentalCostPerSqmPerMonth ?? 24,
  // Upfront fee calibrated so blueprint + device capex aligns with golden baseline totals
  upfrontFee: overrides.upfrontFee ?? 8900,
});

export const createRoomPurpose = (overrides: Partial<RoomPurpose> = {}): RoomPurpose => ({
  id: overrides.id ?? '2630459c-fc40-4e91-a69f-b47665b5a917',
  kind: overrides.kind ?? 'growroom',
  name: overrides.name ?? 'Grow Room',
  description:
    overrides.description ?? 'A room designed for cultivating plants under controlled conditions.',
  flags: overrides.flags ?? {},
  economy: overrides.economy ?? { areaCost: 500, baseRentPerTick: 2 },
  ...overrides,
});

interface RepositoryStubOptions {
  strains?: StrainBlueprint[];
  cultivationMethods?: CultivationMethodBlueprint[];
  devices?: DeviceBlueprint[];
  substrates?: SubstrateBlueprint[];
  containers?: ContainerBlueprint[];
  devicePrices?: Map<string, DevicePriceEntry>;
  strainPrices?: Map<string, StrainPriceEntry>;
  utilityPrices?: UtilityPrices;
  roomPurposes?: RoomPurpose[];
}

export const DEFAULT_UTILITY_PRICES: UtilityPrices = {
  pricePerKwh: 0.15,
  pricePerLiterWater: 0.02,
  pricePerGramNutrients: 0.1,
};

export const createBlueprintRepositoryStub = (
  options: RepositoryStubOptions = {},
): BlueprintRepository => {
  const strains = options.strains ?? [createStrainBlueprint()];
  const methods = options.cultivationMethods ?? [createCultivationMethodBlueprint()];
  const substrates = options.substrates ?? [createSubstrateBlueprint()];
  const containers = options.containers ?? [createContainerBlueprint()];
  const devices = options.devices ?? [
    createDeviceBlueprint({ kind: 'Lamp' }),
    createDeviceBlueprint({ kind: 'ClimateUnit', settings: { coverageArea: 12 } }),
    createDeviceBlueprint({ kind: 'Dehumidifier' }),
  ];
  const roomPurposes = options.roomPurposes ?? [
    createRoomPurpose({
      id: '2630459c-fc40-4e91-a69f-b47665b5a917',
      kind: 'growroom',
      name: 'Grow Room',
      flags: { supportsCultivation: true },
      economy: { areaCost: 900, baseRentPerTick: 4.5 },
    }),
    createRoomPurpose({
      id: '5ab7d9ac-f14a-45d9-b5f9-908182ca4a02',
      kind: 'breakroom',
      name: 'Break Room',
      flags: { supportsRest: true },
      economy: { areaCost: 250, baseRentPerTick: 1.2 },
    }),
  ];

  const devicePrices =
    options.devicePrices ??
    new Map<string, DevicePriceEntry>(
      devices.map((device, index) => [
        device.id,
        {
          capitalExpenditure: 500 + index * 150,
          baseMaintenanceCostPerTick: 0.001 + index * 0.0005,
          costIncreasePer1000Ticks: 0.0004 + index * 0.0002,
        },
      ]),
    );

  const strainPrices =
    options.strainPrices ??
    new Map<string, StrainPriceEntry>([
      [strains[0].id, { seedPrice: 0.6, harvestPricePerGram: 4.2 }],
    ]);

  const utilityPrices = options.utilityPrices ?? DEFAULT_UTILITY_PRICES;

  const repo = {
    getStrain: (id: string) => strains.find((strain) => strain.id === id),
    getDevice: (id: string) => devices.find((device) => device.id === id),
    getCultivationMethod: (id: string) => methods.find((method) => method.id === id),
    getSubstrate: (id: string) => substrates.find((substrate) => substrate.id === id),
    getSubstrateBySlug: (slug: string) => substrates.find((substrate) => substrate.slug === slug),
    getContainer: (id: string) => containers.find((container) => container.id === id),
    getContainerBySlug: (slug: string) => containers.find((container) => container.slug === slug),
    getRoomPurpose: (id: string) => roomPurposes.find((purpose) => purpose.id === id),
    listStrains: () => strains.map((strain) => clone(strain)),
    listDevices: () => devices.map((device) => clone(device)),
    listCultivationMethods: () => methods.map((method) => clone(method)),
    listSubstrates: () => substrates.map((substrate) => clone(substrate)),
    listContainers: () => containers.map((container) => clone(container)),
    listRoomPurposes: () => roomPurposes.map((purpose) => clone(purpose)),
    getDevicePrice: (id: string) => devicePrices.get(id),
    getStrainPrice: (id: string) => strainPrices.get(id),
    getUtilityPrices: () => ({ ...utilityPrices }),
    listDevicePrices: () => Array.from(devicePrices.entries()),
    listStrainPrices: () => Array.from(strainPrices.entries()),
  } satisfies Partial<BlueprintRepository>;

  return repo as unknown as BlueprintRepository;
};

interface ContextOptions extends Partial<Omit<StateFactoryContext, 'repository' | 'rng'>> {
  repository?: BlueprintRepository;
  rng?: RngService;
  structureBlueprints?: StructureBlueprint[];
}

export const createStateFactoryContext = (
  seed: string,
  options: ContextOptions = {},
): StateFactoryContext => ({
  repository: options.repository ?? createBlueprintRepositoryStub(),
  rng: options.rng ?? new RngService(seed),
  structureBlueprints: options.structureBlueprints ?? [createStructureBlueprint()],
  dataDirectory: options.dataDirectory,
  personnelDirectory: options.personnelDirectory,
  taskDefinitions: options.taskDefinitions,
  defaultStructureHeightMeters: options.defaultStructureHeightMeters,
  difficultyConfig: options.difficultyConfig,
});

export const createDevicePriceMap = (
  entries: Array<[string, DevicePriceEntry]>,
): Map<string, DevicePriceEntry> => new Map(entries.map(([id, entry]) => [id, clone(entry)]));

export const createStrainPriceMap = (
  entries: Array<[string, StrainPriceEntry]>,
): Map<string, StrainPriceEntry> => new Map(entries.map(([id, entry]) => [id, clone(entry)]));
