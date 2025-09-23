import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type {
  CultivationMethodBlueprint,
  DeviceBlueprint,
  StrainBlueprint,
} from '@/data/schemas/index.js';
import { DEFAULT_SAVEGAME_VERSION } from './persistence/saveGame.js';
import type {
  DeviceInstanceState,
  DifficultyLevel,
  EconomicsSettings,
  EmployeeRole,
  FootprintDimensions,
  GameMetadata,
  GameState,
  GlobalInventoryState,
  HarvestBatch,
  PersonnelNameDirectory,
  PlantHealthState,
  PlantState,
  ResourceInventory,
  SeedStockEntry,
  SimulationNote,
  StructureBlueprint,
  StructureState,
  TaskDefinitionMap,
  ZoneEnvironmentState,
  ZoneControlState,
  ZoneHealthState,
  ZoneMetricState,
  ZoneResourceState,
} from './state/models.js';
import { RngService, RngStream, RNG_STREAM_IDS } from './lib/rng.js';
import { generateId } from './state/initialization/common.js';
import {
  chooseDeviceBlueprints,
  isDeviceCompatibleWithRoomPurpose,
  loadStructureBlueprints,
  DEFAULT_STRUCTURE_HEIGHT_METERS,
  selectBlueprint,
} from './state/initialization/blueprints.js';
import { createFinanceState } from './state/initialization/finance.js';
import { createPersonnel, loadPersonnelDirectory } from './state/initialization/personnel.js';
import { createTasks, loadTaskDefinitions } from './state/initialization/tasks.js';
import { resolveRoomPurposeId, requireRoomPurposeByName } from './engine/roomPurposes/index.js';
import type { RoomPurpose, RoomPurposeSlug } from './engine/roomPurposes/index.js';
import { validateStructureGeometry } from './state/geometry.js';
import { addDeviceToZone } from './state/devices.js';

export { loadStructureBlueprints } from './state/initialization/blueprints.js';
export { loadPersonnelDirectory } from './state/initialization/personnel.js';
export { loadTaskDefinitions } from './state/initialization/tasks.js';

const DEFAULT_TICK_LENGTH_MINUTES = 60;
const DEFAULT_TARGET_TICK_RATE = 1;
const DEFAULT_ZONE_RESERVOIR_LEVEL = 0.75;
const DEFAULT_ZONE_WATER_LITERS = 800;
const DEFAULT_ZONE_NUTRIENT_LITERS = 400;
const DEFAULT_EMPLOYEE_COUNTS: Record<EmployeeRole, number> = {
  Gardener: 4,
  Technician: 2,
  Janitor: 1,
  Operator: 1,
  Manager: 0,
};

const DIFFICULTY_ECONOMICS: Record<DifficultyLevel, EconomicsSettings> = {
  easy: {
    initialCapital: 2_000_000,
    itemPriceMultiplier: 0.9,
    harvestPriceMultiplier: 1.1,
    rentPerSqmStructurePerTick: 0.1,
    rentPerSqmRoomPerTick: 0.2,
  },
  normal: {
    initialCapital: 1_500_000,
    itemPriceMultiplier: 1.0,
    harvestPriceMultiplier: 1.0,
    rentPerSqmStructurePerTick: 0.15,
    rentPerSqmRoomPerTick: 0.3,
  },
  hard: {
    initialCapital: 1_000_000,
    itemPriceMultiplier: 1.1,
    harvestPriceMultiplier: 0.9,
    rentPerSqmStructurePerTick: 0.2,
    rentPerSqmRoomPerTick: 0.4,
  },
};

interface StructureCreationResult {
  structure: StructureState;
  growRoom: StructureState['rooms'][number];
  growZone: StructureState['rooms'][number]['zones'][number];
  installedDeviceBlueprints: DeviceBlueprint[];
  plantCount: number;
  installationNotes: SimulationNote[];
}

const resolveStructureHeight = (height: number | undefined, defaultHeight: number): number => {
  if (typeof height === 'number' && Number.isFinite(height)) {
    return height;
  }
  return defaultHeight;
};

const computeFootprint = (
  blueprint: StructureBlueprint,
  defaultStructureHeight: number,
): FootprintDimensions => {
  const height = resolveStructureHeight(blueprint.footprint.height, defaultStructureHeight);
  const area = blueprint.footprint.length * blueprint.footprint.width;
  const volume = area * height;
  return {
    ...blueprint.footprint,
    height,
    area,
    volume,
  };
};

export interface StateFactoryContext {
  repository: BlueprintRepository;
  rng: RngService;
  dataDirectory?: string;
  structureBlueprints?: StructureBlueprint[];
  personnelDirectory?: PersonnelNameDirectory;
  taskDefinitions?: TaskDefinitionMap;
  defaultStructureHeightMeters?: number;
}

export interface StateFactoryOptions {
  difficulty?: DifficultyLevel;
  tickLengthMinutes?: number;
  structureId?: string;
  preferredStrainId?: string;
  preferredCultivationMethodId?: string;
  employeeCountByRole?: Partial<Record<EmployeeRole, number>>;
  zonePlantCount?: number;
  defaultStructureHeightMeters?: number;
}

const cloneSettings = (settings: DeviceBlueprint['settings'] | undefined) => {
  if (!settings) {
    return {};
  }
  return JSON.parse(JSON.stringify(settings)) as Record<string, unknown>;
};

const createDeviceInstance = (
  blueprint: DeviceBlueprint,
  zoneId: string,
  idStream: RngStream,
  roomPurpose: RoomPurposeSlug,
): DeviceInstanceState => {
  if (!isDeviceCompatibleWithRoomPurpose(blueprint, roomPurpose)) {
    throw new Error(
      `Device blueprint ${blueprint.id} (${blueprint.kind}) is not compatible with room purpose "${roomPurpose}".`,
    );
  }

  return {
    id: generateId(idStream, 'device'),
    blueprintId: blueprint.id,
    kind: blueprint.kind,
    name: blueprint.name,
    zoneId,
    status: 'operational',
    efficiency: blueprint.quality ?? 1,
    runtimeHours: 0,
    maintenance: {
      lastServiceTick: 0,
      nextDueTick: 24 * 30,
      condition: Math.min(1, Math.max(0, blueprint.quality ?? 1)),
      runtimeHoursAtLastService: 0,
      degradation: 0,
    },
    settings: cloneSettings(blueprint.settings),
  } satisfies DeviceInstanceState;
};

const createZoneEnvironment = (): ZoneEnvironmentState => ({
  temperature: 24,
  relativeHumidity: 0.62,
  co2: 900,
  ppfd: 550,
  vpd: 1.2,
});

const createZoneControl = (): ZoneControlState => ({
  setpoints: {},
});

const createZoneResources = (): ZoneResourceState => ({
  waterLiters: DEFAULT_ZONE_WATER_LITERS,
  nutrientSolutionLiters: DEFAULT_ZONE_NUTRIENT_LITERS,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: DEFAULT_ZONE_RESERVOIR_LEVEL,
  lastTranspirationLiters: 0,
});

const createZoneMetrics = (environment: ZoneEnvironmentState): ZoneMetricState => ({
  averageTemperature: environment.temperature,
  averageHumidity: environment.relativeHumidity,
  averageCo2: environment.co2,
  averagePpfd: environment.ppfd,
  stressLevel: 0,
  lastUpdatedTick: 0,
});

const createZoneHealth = (plants: PlantState[]): ZoneHealthState => {
  const plantEntries = plants.map((plant) => [
    plant.id,
    {
      diseases: [],
      pests: [],
    } satisfies PlantHealthState,
  ]);

  return {
    plantHealth: Object.fromEntries(plantEntries),
    pendingTreatments: [],
    appliedTreatments: [],
  } satisfies ZoneHealthState;
};

const createPlants = (
  count: number,
  zoneId: string,
  strain: StrainBlueprint,
  idStream: RngStream,
  plantStream: RngStream,
): PlantState[] => {
  const plants: PlantState[] = [];
  for (let index = 0; index < count; index += 1) {
    plants.push({
      id: generateId(idStream, 'plant'),
      strainId: strain.id,
      zoneId,
      stage: 'seedling',
      plantedAtTick: 0,
      ageInHours: 0,
      health: 0.95,
      stress: 0.05,
      biomassDryGrams: 0,
      heightMeters: 0.1 + plantStream.nextRange(0, 0.05),
      canopyCover: 0.12,
      yieldDryGrams: 0,
      quality: 0.8,
      lastMeasurementTick: 0,
    });
  }
  return plants;
};

const buildStructureState = (
  context: StateFactoryContext,
  blueprint: StructureBlueprint,
  structureId: string,
  strain: StrainBlueprint,
  method: CultivationMethodBlueprint,
  deviceBlueprints: DeviceBlueprint[],
  idStream: RngStream,
  rng: RngService,
  growRoomPurpose: RoomPurpose,
  defaultStructureHeight: number,
  plantCountOverride?: number,
): StructureCreationResult => {
  const footprint = computeFootprint(blueprint, defaultStructureHeight);
  const totalArea = footprint.area;
  const growRoomArea = totalArea * 0.65;
  const supportRoomArea = Math.max(0, totalArea - growRoomArea);
  const plantStream = rng.getStream(RNG_STREAM_IDS.plants);
  const zoneId = generateId(idStream, 'zone');
  const capacity = Math.max(1, Math.floor(growRoomArea / Math.max(0.1, method.areaPerPlant)));
  const plantCount = Math.min(capacity, plantCountOverride ?? Math.min(12, capacity));
  const plants = createPlants(plantCount, zoneId, strain, idStream, plantStream);
  const environment = createZoneEnvironment();
  const growRoomPurposeId = growRoomPurpose.id;
  const zoneArea = growRoomArea;
  const zoneCeilingHeight = footprint.height;
  const zoneVolume = zoneArea * zoneCeilingHeight;
  const zone: StructureCreationResult['growZone'] = {
    id: zoneId,
    roomId: '',
    name: 'Zone A',
    cultivationMethodId: method.id,
    strainId: strain.id,
    area: zoneArea,
    ceilingHeight: zoneCeilingHeight,
    volume: zoneVolume,
    environment,
    resources: createZoneResources(),
    plants,
    devices: [],
    metrics: createZoneMetrics(environment),
    control: createZoneControl(),
    health: createZoneHealth(plants),
    activeTaskIds: [],
  };

  const growRoomId = generateId(idStream, 'room');
  zone.roomId = growRoomId;

  const growRoom = {
    id: growRoomId,
    structureId,
    name: 'Grow Room Alpha',
    purposeId: growRoomPurposeId,
    area: growRoomArea,
    height: footprint.height,
    volume: growRoomArea * footprint.height,
    zones: [zone],
    cleanliness: 0.85,
    maintenanceLevel: 0.9,
  } satisfies StructureState['rooms'][number];

  const breakRoomPurposeId = resolveRoomPurposeId(context.repository, 'Break Room');
  const supportRoom = {
    id: generateId(idStream, 'room'),
    structureId,
    name: 'Support Room',
    purposeId: breakRoomPurposeId,
    area: supportRoomArea,
    height: footprint.height,
    volume: supportRoomArea * footprint.height,
    zones: [],
    cleanliness: 0.9,
    maintenanceLevel: 0.95,
  } satisfies StructureState['rooms'][number];

  const installationNotes: SimulationNote[] = [];
  const installedDeviceBlueprints: DeviceBlueprint[] = [];

  for (const deviceBlueprint of deviceBlueprints) {
    const instance = createDeviceInstance(deviceBlueprint, zoneId, idStream, growRoomPurpose.kind);
    const result = addDeviceToZone(zone, instance);

    for (const warning of result.warnings) {
      installationNotes.push({
        id: generateId(idStream, 'note'),
        tick: 0,
        message: warning.message,
        level: warning.level,
      });
    }

    if (result.added) {
      installedDeviceBlueprints.push(deviceBlueprint);
    }
  }

  const hoursPerMonth = 30 * 24;
  const rentPerHour = (blueprint.rentalCostPerSqmPerMonth * footprint.area) / hoursPerMonth;

  const structure: StructureState = {
    id: structureId,
    blueprintId: blueprint.id,
    name: blueprint.name,
    status: 'active',
    footprint,
    rooms: [growRoom, supportRoom],
    rentPerTick: rentPerHour,
    upfrontCostPaid: blueprint.upfrontFee,
  };

  validateStructureGeometry(structure);

  return {
    structure,
    growRoom,
    growZone: zone,
    installedDeviceBlueprints,
    plantCount,
    installationNotes,
  };
};

const createInventory = (
  strain: StrainBlueprint,
  plantCount: number,
  idStream: RngStream,
): GlobalInventoryState => {
  const seedQuantity = Math.max(plantCount * 3, 30);
  const seeds: SeedStockEntry = {
    id: generateId(idStream, 'seed'),
    strainId: strain.id,
    quantity: seedQuantity,
    viability: strain.germinationRate,
    storedAtTick: 0,
  };

  const resources: ResourceInventory = {
    waterLiters: 12_000,
    nutrientsGrams: 8_000,
    co2Kg: 40,
    substrateKg: 2_000,
    packagingUnits: 400,
    sparePartsValue: 1_500,
  };

  return {
    resources,
    seeds: [seeds],
    devices: [],
    harvest: [] as HarvestBatch[],
    consumables: {
      trimBins: 6,
      gloves: 200,
      filters: 12,
      labels: 500,
    },
  };
};

export const createInitialState = async (
  context: StateFactoryContext,
  options: StateFactoryOptions = {},
): Promise<GameState> => {
  const difficulty = options.difficulty ?? 'normal';
  const economics = DIFFICULTY_ECONOMICS[difficulty];
  const tickLengthMinutes = options.tickLengthMinutes ?? DEFAULT_TICK_LENGTH_MINUTES;
  const createdAt = new Date().toISOString();
  const idStream = context.rng.getStream(RNG_STREAM_IDS.ids);
  const defaultStructureHeight =
    options.defaultStructureHeightMeters ??
    context.defaultStructureHeightMeters ??
    DEFAULT_STRUCTURE_HEIGHT_METERS;

  const structureBlueprints =
    context.structureBlueprints ??
    (context.dataDirectory
      ? await loadStructureBlueprints(context.dataDirectory, {
          defaultHeightMeters: defaultStructureHeight,
        })
      : []);
  if (structureBlueprints.length === 0) {
    throw new Error('No structure blueprints available to create initial state.');
  }

  const structureSelectionStream = context.rng.getStream(RNG_STREAM_IDS.structures);
  const structureBlueprint = selectBlueprint(
    structureBlueprints,
    structureSelectionStream,
    options.structureId,
  );

  const strains = context.repository.listStrains();
  if (strains.length === 0) {
    throw new Error('Blueprint repository has no strain blueprints.');
  }
  const strain = selectBlueprint(
    strains,
    context.rng.getStream(RNG_STREAM_IDS.strains),
    options.preferredStrainId,
  );

  const cultivationMethods = context.repository.listCultivationMethods();
  if (cultivationMethods.length === 0) {
    throw new Error('Blueprint repository has no cultivation method blueprints.');
  }
  const method = selectBlueprint(
    cultivationMethods,
    context.rng.getStream(RNG_STREAM_IDS.methods),
    options.preferredCultivationMethodId,
  );

  const growRoomPurpose = requireRoomPurposeByName(context.repository, 'Grow Room');
  const devices = context.repository.listDevices();
  if (devices.length === 0) {
    throw new Error('Blueprint repository has no device blueprints.');
  }
  const deviceBlueprints = chooseDeviceBlueprints(
    devices,
    context.rng.getStream(RNG_STREAM_IDS.devices),
    growRoomPurpose.kind,
  );

  const structureId = generateId(idStream, 'structure');
  const structureResult = buildStructureState(
    context,
    structureBlueprint,
    structureId,
    strain,
    method,
    deviceBlueprints,
    idStream,
    context.rng,
    growRoomPurpose,
    defaultStructureHeight,
    options.zonePlantCount,
  );

  const personnelDirectory =
    context.personnelDirectory ??
    (context.dataDirectory ? await loadPersonnelDirectory(context.dataDirectory) : undefined);

  const employeeCounts: Record<EmployeeRole, number> = {
    ...DEFAULT_EMPLOYEE_COUNTS,
    ...options.employeeCountByRole,
  } as Record<EmployeeRole, number>;

  const personnel = createPersonnel(
    structureId,
    employeeCounts,
    personnelDirectory,
    context.rng,
    idStream,
  );

  const inventory = createInventory(strain, structureResult.plantCount, idStream);

  const finance = createFinanceState(
    createdAt,
    economics,
    structureBlueprint,
    structureResult.installedDeviceBlueprints,
    context.repository,
    idStream,
  );

  const taskDefinitions =
    context.taskDefinitions ??
    (context.dataDirectory ? await loadTaskDefinitions(context.dataDirectory) : undefined);

  const tasks = createTasks(
    structureResult.structure,
    structureResult.growRoom,
    structureResult.growZone,
    structureResult.plantCount,
    taskDefinitions,
    idStream,
  );

  const metadata: GameMetadata = {
    gameId: generateId(idStream, 'game'),
    createdAt,
    seed: context.rng.getSeed(),
    difficulty,
    simulationVersion: DEFAULT_SAVEGAME_VERSION,
    tickLengthMinutes,
    economics,
  };

  const clock = {
    tick: 0,
    isPaused: true,
    startedAt: createdAt,
    lastUpdatedAt: createdAt,
    targetTickRate: DEFAULT_TARGET_TICK_RATE,
  };

  const notes = [
    {
      id: generateId(idStream, 'note'),
      tick: 0,
      message: 'Simulation initialized.',
      level: 'info' as const,
    },
    ...structureResult.installationNotes,
  ];

  return {
    metadata,
    clock,
    structures: [structureResult.structure],
    inventory,
    finances: finance,
    personnel,
    tasks,
    notes,
  };
};
