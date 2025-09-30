import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type {
  // CultivationMethodBlueprint,
  // DeviceBlueprint,
  StrainBlueprint,
} from '@/data/schemas/index.js';
import {
  DEFAULT_MAINTENANCE_INTERVAL_TICKS,
  DEFAULT_ZONE_NUTRIENT_LITERS,
  DEFAULT_ZONE_RESERVOIR_LEVEL,
  DEFAULT_ZONE_WATER_LITERS,
} from '@/constants/world.js';
import { DEFAULT_TICK_LENGTH_MINUTES } from '@/constants/time.js';
import { DEFAULT_SAVEGAME_VERSION } from './persistence/saveGame.js';
import type {
  CultivationMethodBlueprint,
  DeviceBlueprint,
  DeviceInstanceState,
  DeviceFailureModifiers,
  DifficultyLevel,
  EconomicsSettings,
  EmployeeRole,
  FootprintDimensions,
  GameMetadata,
  GameState,
  GlobalInventoryState,
  HarvestBatch,
  PersonnelNameDirectory,
  PersonnelRoleBlueprint,
  PlantState,
  PlantStressModifiers,
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
import { loadPersonnelRoleBlueprints } from './state/personnel/roleBlueprints.js';
import { createTasks, loadTaskDefinitions } from './state/initialization/tasks.js';
import { resolveRoomPurposeId, requireRoomPurposeByName } from './engine/roomPurposes/index.js';
import type { RoomPurpose, RoomPurposeSlug } from './engine/roomPurposes/index.js';
import { validateStructureGeometry } from './state/geometry.js';
import { addDeviceToZone } from './state/devices.js';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';

export type StateFactoryEventLevel = 'info' | 'warning' | 'error';

export interface StateFactoryEvent {
  code: string;
  type: string;
  level: StateFactoryEventLevel;
  message: string;
  details?: Record<string, unknown>;
}

export interface CreateInitialStateResult {
  state: GameState;
  events: StateFactoryEvent[];
}

interface StateFactoryEventInput {
  level: StateFactoryEventLevel;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  noteLevel?: SimulationNote['level'] | null;
}

export { loadStructureBlueprints } from './state/initialization/blueprints.js';
export { loadPersonnelDirectory } from './state/initialization/personnel.js';
export { loadTaskDefinitions } from './state/initialization/tasks.js';

const DEFAULT_TARGET_TICK_RATE = 1;
const DEFAULT_EMPLOYEE_COUNTS: Record<EmployeeRole, number> = {
  Gardener: 4,
  Technician: 2,
  Janitor: 1,
  Operator: 1,
  Manager: 0,
};

const DEFAULT_ECONOMICS: EconomicsSettings = {
  initialCapital: 1_500_000,
  itemPriceMultiplier: 1.0,
  harvestPriceMultiplier: 1.0,
  rentPerSqmStructurePerTick: 0.15,
  rentPerSqmRoomPerTick: 0.3,
};

const DEFAULT_PLANT_STRESS_MODIFIERS: PlantStressModifiers = {
  optimalRangeMultiplier: 1,
  stressAccumulationMultiplier: 1,
};

const DEFAULT_DEVICE_FAILURE_MODIFIERS: DeviceFailureModifiers = {
  mtbfMultiplier: 1,
};

const deriveDifficultyModifiers = (
  config: DifficultyConfig | undefined,
  level: DifficultyLevel,
): {
  economics: EconomicsSettings;
  plantStress: PlantStressModifiers;
  deviceFailure: DeviceFailureModifiers;
} => {
  const preset = config?.[level]?.modifiers;
  const economicsSource = preset?.economics ?? DEFAULT_ECONOMICS;
  const plantStressSource = preset?.plantStress ?? DEFAULT_PLANT_STRESS_MODIFIERS;
  const deviceFailureSource = preset?.deviceFailure ?? DEFAULT_DEVICE_FAILURE_MODIFIERS;

  return {
    economics: { ...economicsSource },
    plantStress: {
      optimalRangeMultiplier: plantStressSource.optimalRangeMultiplier,
      stressAccumulationMultiplier: plantStressSource.stressAccumulationMultiplier,
    },
    deviceFailure: { mtbfMultiplier: deviceFailureSource.mtbfMultiplier },
  };
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
  personnelRoleBlueprints?: PersonnelRoleBlueprint[];
  taskDefinitions?: TaskDefinitionMap;
  defaultStructureHeightMeters?: number;
  difficultyConfig?: DifficultyConfig;
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
      nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
      condition: Math.min(1, Math.max(0, blueprint.quality ?? 1)),
      runtimeHoursAtLastService: 0,
      degradation: 0,
    },
    settings: cloneSettings(blueprint.settings),
  };
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
    },
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
  recordEvent: (input: StateFactoryEventInput) => StateFactoryEvent,
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

  let breakRoomPurposeId: string | undefined;
  try {
    breakRoomPurposeId = resolveRoomPurposeId(context.repository, 'Break Room');
  } catch (error) {
    const message = 'Room purpose "Break Room" is unavailable; the support room will be omitted.';
    recordEvent({
      level: 'warning',
      code: 'roomPurpose.breakRoomMissing',
      message,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
      noteLevel: 'warning',
    });
  }

  const supportRoom: StructureState['rooms'][number] | undefined = breakRoomPurposeId
    ? {
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
      }
    : undefined;

  const installationNotes: SimulationNote[] = [];
  const installedDeviceBlueprints: DeviceBlueprint[] = [];

  for (const deviceBlueprint of deviceBlueprints) {
    try {
      const instance = createDeviceInstance(
        deviceBlueprint,
        zoneId,
        idStream,
        growRoomPurpose.kind,
      );
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
    } catch (error) {
      const message = `Device blueprint ${deviceBlueprint.name} (${deviceBlueprint.kind}) is not compatible with room purpose "${growRoomPurpose.kind}" and will be skipped.`;
      recordEvent({
        level: 'warning',
        code: 'device.incompatible',
        message,
        details: {
          deviceId: deviceBlueprint.id,
          deviceKind: deviceBlueprint.kind,
          roomPurpose: growRoomPurpose.kind,
          error: error instanceof Error ? error.message : String(error),
        },
        noteLevel: 'warning',
      });
      installationNotes.push({
        id: generateId(idStream, 'note'),
        tick: 0,
        message,
        level: 'warning',
      });
    }
  }

  const hoursPerMonth = 30 * 24;
  const rentPerHour = (blueprint.rentalCostPerSqmPerMonth * footprint.area) / hoursPerMonth;

  const rooms: StructureState['rooms'] = [growRoom];
  if (supportRoom) {
    rooms.push(supportRoom);
  }

  const structure: StructureState = {
    id: structureId,
    blueprintId: blueprint.id,
    name: blueprint.name,
    status: 'active',
    footprint,
    rooms,
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
  strain: StrainBlueprint | undefined,
  plantCount: number,
  idStream: RngStream,
): GlobalInventoryState => {
  const resources: ResourceInventory = {
    waterLiters: 12_000,
    nutrientsGrams: 8_000,
    co2Kg: 40,
    substrateKg: 2_000,
    packagingUnits: 400,
    sparePartsValue: 1_500,
  };

  const seeds: SeedStockEntry[] = [];
  if (strain) {
    const seedQuantity = Math.max(plantCount * 3, 30);
    seeds.push({
      id: generateId(idStream, 'seed'),
      strainId: strain.id,
      quantity: seedQuantity,
      viability: strain.germinationRate,
      storedAtTick: 0,
    });
  }

  return {
    resources,
    seeds,
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
): Promise<CreateInitialStateResult> => {
  const difficulty = options.difficulty ?? 'normal';
  const difficultyModifiers = deriveDifficultyModifiers(context.difficultyConfig, difficulty);
  const economics: EconomicsSettings = difficultyModifiers.economics;
  const plantStressModifiers = difficultyModifiers.plantStress;
  const deviceFailureModifiers = difficultyModifiers.deviceFailure;
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
  const events: StateFactoryEvent[] = [];
  const notes: SimulationNote[] = [];

  const recordEvent = (input: StateFactoryEventInput): StateFactoryEvent => {
    const event: StateFactoryEvent = {
      code: input.code,
      type: `stateFactory.${input.code}`,
      level: input.level,
      message: input.message,
      details: input.details ? { ...input.details } : undefined,
    };
    events.push(event);

    const inferredNoteLevel: SimulationNote['level'] | null =
      input.noteLevel === undefined
        ? input.level === 'warning' || input.level === 'error'
          ? input.level
          : null
        : input.noteLevel;

    if (inferredNoteLevel) {
      notes.push({
        id: generateId(idStream, 'note'),
        tick: 0,
        message: input.message,
        level: inferredNoteLevel,
      });
    }

    return event;
  };

  const pushInfoNote = (message: string) => {
    notes.push({
      id: generateId(idStream, 'note'),
      tick: 0,
      message,
      level: 'info',
    });
  };

  pushInfoNote('Simulation initialized.');

  if (structureBlueprints.length === 0) {
    recordEvent({
      level: 'warning',
      code: 'structures.missingBlueprints',
      message:
        'No structure blueprints are available; the simulation will start without any rented buildings.',
      details: context.dataDirectory ? { dataDirectory: context.dataDirectory } : undefined,
    });
  }

  const strains = context.repository.listStrains();
  let strain: StrainBlueprint | undefined;
  if (strains.length === 0) {
    recordEvent({
      level: 'warning',
      code: 'strains.missingBlueprints',
      message:
        'No strain blueprints are available; grow zones will be created without plants until data is restored.',
      details: { available: 0 },
    });
  } else {
    strain = selectBlueprint(
      strains,
      context.rng.getStream(RNG_STREAM_IDS.strains),
      options.preferredStrainId,
    );
  }

  const cultivationMethods = context.repository.listCultivationMethods();
  let method: CultivationMethodBlueprint | undefined;
  if (cultivationMethods.length === 0) {
    recordEvent({
      level: 'warning',
      code: 'methods.missingBlueprints',
      message:
        'No cultivation method blueprints are available; starter zones cannot be configured for planting.',
      details: { available: 0 },
    });
  } else {
    method = selectBlueprint(
      cultivationMethods,
      context.rng.getStream(RNG_STREAM_IDS.methods),
      options.preferredCultivationMethodId,
    );
  }

  const devices = context.repository.listDevices();
  if (devices.length === 0) {
    recordEvent({
      level: 'warning',
      code: 'devices.missingBlueprints',
      message:
        'No device blueprints are available; starter zones will have no environmental hardware installed.',
      details: { available: 0 },
    });
  }

  let growRoomPurpose: RoomPurpose | undefined;
  try {
    growRoomPurpose = requireRoomPurposeByName(context.repository, 'Grow Room');
  } catch (error) {
    recordEvent({
      level: 'warning',
      code: 'roomPurpose.growRoomMissing',
      message: 'Room purpose "Grow Room" is unavailable; starter structures cannot be initialised.',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  let structureBlueprint: StructureBlueprint | undefined;
  if (structureBlueprints.length > 0) {
    const structureSelectionStream = context.rng.getStream(RNG_STREAM_IDS.structures);
    structureBlueprint = selectBlueprint(
      structureBlueprints,
      structureSelectionStream,
      options.structureId,
    );
  }

  let deviceBlueprints: DeviceBlueprint[] = [];
  if (devices.length > 0 && growRoomPurpose) {
    deviceBlueprints = chooseDeviceBlueprints(
      devices,
      context.rng.getStream(RNG_STREAM_IDS.devices),
      growRoomPurpose.kind,
    );
    if (deviceBlueprints.length === 0) {
      recordEvent({
        level: 'warning',
        code: 'devices.noCompatibleBlueprints',
        message:
          'No compatible devices could be selected for the starter grow room; it will launch without hardware.',
        details: { roomPurpose: growRoomPurpose.kind, availableDevices: devices.length },
      });
    }
  }

  let structureResult: StructureCreationResult | undefined;
  if (structureBlueprint && strain && method && growRoomPurpose) {
    const structureId = generateId(idStream, 'structure');
    structureResult = buildStructureState(
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
      recordEvent,
      options.zonePlantCount,
    );
    if (structureResult.installationNotes.length > 0) {
      notes.push(...structureResult.installationNotes);
    }
  } else {
    recordEvent({
      level: 'warning',
      code: 'structure.initializationSkipped',
      message:
        'Initial structure creation skipped due to missing prerequisites; the world will start empty.',
      details: {
        hasStructureBlueprint: Boolean(structureBlueprint),
        hasStrain: Boolean(strain),
        hasCultivationMethod: Boolean(method),
        hasGrowRoomPurpose: Boolean(growRoomPurpose),
      },
    });
  }

  const structures = structureResult ? [structureResult.structure] : [];

  const personnelDirectory =
    context.personnelDirectory ??
    (context.dataDirectory ? await loadPersonnelDirectory(context.dataDirectory) : undefined);

  const personnelRoleBlueprints =
    context.personnelRoleBlueprints ??
    (context.dataDirectory ? await loadPersonnelRoleBlueprints(context.dataDirectory) : undefined);

  const employeeCounts: Record<EmployeeRole, number> = {
    ...DEFAULT_EMPLOYEE_COUNTS,
    ...options.employeeCountByRole,
  } as Record<EmployeeRole, number>;

  const personnel = createPersonnel(
    undefined,
    employeeCounts,
    personnelDirectory,
    context.rng,
    idStream,
    { roleBlueprints: personnelRoleBlueprints },
  );

  const plantCount = structureResult?.plantCount ?? 0;
  const inventory = createInventory(strain, plantCount, idStream);

  const finance = createFinanceState(
    createdAt,
    economics,
    structureResult ? structureBlueprint : undefined,
    structureResult?.installedDeviceBlueprints ?? [],
    context.repository,
    idStream,
  );

  const taskDefinitions =
    context.taskDefinitions ??
    (context.dataDirectory ? await loadTaskDefinitions(context.dataDirectory) : undefined);

  const tasks = createTasks(
    structureResult?.structure,
    structureResult?.growRoom,
    structureResult?.growZone,
    plantCount,
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
    plantStress: plantStressModifiers,
    deviceFailure: deviceFailureModifiers,
  };

  const clock = {
    tick: 0,
    isPaused: true,
    startedAt: createdAt,
    lastUpdatedAt: createdAt,
    targetTickRate: DEFAULT_TARGET_TICK_RATE,
  };

  const state: GameState = {
    metadata,
    clock,
    structures,
    inventory,
    finances: finance,
    personnel,
    tasks,
    notes,
  };

  return { state, events };
};
