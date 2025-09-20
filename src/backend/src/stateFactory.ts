import { promises as fs } from 'fs';
import path from 'path';
import type { BlueprintRepository } from '../data/blueprintRepository.js';
import type {
  CultivationMethodBlueprint,
  DeviceBlueprint,
  StrainBlueprint,
  DevicePriceEntry,
} from '../data/schemas/index.js';
import { DEFAULT_SAVEGAME_VERSION } from './state/serialization.js';
import {
  DeviceInstanceState,
  DifficultyLevel,
  EconomicsSettings,
  EmployeeRole,
  EmployeeState,
  EmployeeSkills,
  FinanceState,
  FinancialSummary,
  FootprintDimensions,
  GameMetadata,
  GameState,
  GlobalInventoryState,
  HarvestBatch,
  LedgerEntry,
  PersonnelNameDirectory,
  PersonnelRoster,
  PlantState,
  ResourceInventory,
  SeedStockEntry,
  SkillName,
  StructureBlueprint,
  StructureState,
  TaskDefinition,
  TaskDefinitionMap,
  TaskState,
  TaskSystemState,
  ZoneEnvironmentState,
  ZoneMetricState,
  ZoneHealthState,
  ZoneResourceState,
  PlantHealthState,
} from './state/models.js';
import { RngService, RngStream } from './lib/rng.js';

const DEFAULT_TICK_LENGTH_MINUTES = 60;
const DEFAULT_TARGET_TICK_RATE = 1;
const DEFAULT_ZONE_RESERVOIR_LEVEL = 0.75;
const DEFAULT_ZONE_WATER_LITERS = 800;
const DEFAULT_ZONE_NUTRIENT_LITERS = 400;
const DEFAULT_SALARY_BY_ROLE: Record<EmployeeRole, number> = {
  Gardener: 24,
  Technician: 28,
  Janitor: 18,
  Operator: 22,
  Manager: 35,
};
const DEFAULT_EMPLOYEE_COUNTS: Record<EmployeeRole, number> = {
  Gardener: 3,
  Technician: 1,
  Janitor: 1,
  Operator: 0,
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
}

const generateId = (stream: RngStream, prefix: string, length = 10) =>
  `${prefix}_${stream.nextString(length)}`;

const computeFootprint = (blueprint: StructureBlueprint): FootprintDimensions => {
  const area = blueprint.footprint.length * blueprint.footprint.width;
  const volume = area * blueprint.footprint.height;
  return {
    ...blueprint.footprint,
    area,
    volume,
  };
};

const readJsonFile = async <T>(filePath: string): Promise<T | undefined> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === 'ENOENT') {
      return undefined;
    }
    throw new Error(`Failed to read JSON file at ${filePath}: ${cause.message}`);
  }
};

interface RawStructureBlueprint {
  id: string;
  name: string;
  footprint: {
    length_m: number;
    width_m: number;
    height_m: number;
  };
  rentalCostPerSqmPerMonth: number;
  upfrontFee: number;
}

const normaliseStructureBlueprint = (blueprint: RawStructureBlueprint): StructureBlueprint => ({
  id: blueprint.id,
  name: blueprint.name,
  footprint: {
    length: blueprint.footprint.length_m,
    width: blueprint.footprint.width_m,
    height: blueprint.footprint.height_m,
  },
  rentalCostPerSqmPerMonth: blueprint.rentalCostPerSqmPerMonth,
  upfrontFee: blueprint.upfrontFee,
});

export interface StateFactoryContext {
  repository: BlueprintRepository;
  rng: RngService;
  dataDirectory?: string;
  structureBlueprints?: StructureBlueprint[];
  personnelDirectory?: PersonnelNameDirectory;
  taskDefinitions?: TaskDefinitionMap;
}

export interface StateFactoryOptions {
  difficulty?: DifficultyLevel;
  tickLengthMinutes?: number;
  structureId?: string;
  preferredStrainId?: string;
  preferredCultivationMethodId?: string;
  employeeCountByRole?: Partial<Record<EmployeeRole, number>>;
  zonePlantCount?: number;
}

export const loadStructureBlueprints = async (
  dataDirectory: string,
): Promise<StructureBlueprint[]> => {
  const directory = path.join(dataDirectory, 'blueprints', 'structures');
  let entries: string[] = [];
  try {
    entries = await fs.readdir(directory);
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to read structure blueprints directory: ${cause.message}`);
  }

  const blueprints: StructureBlueprint[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) {
      continue;
    }
    const filePath = path.join(directory, entry);
    const raw = await readJsonFile<RawStructureBlueprint>(filePath);
    if (!raw) {
      continue;
    }
    blueprints.push(normaliseStructureBlueprint(raw));
  }
  return blueprints;
};

export const loadPersonnelDirectory = async (
  dataDirectory: string,
): Promise<PersonnelNameDirectory> => {
  const personnelDir = path.join(dataDirectory, 'personnel');
  const [firstNames, lastNames, traits] = await Promise.all([
    readJsonFile<string[]>(path.join(personnelDir, 'firstNames.json')),
    readJsonFile<string[]>(path.join(personnelDir, 'lastNames.json')),
    readJsonFile<PersonnelNameDirectory['traits']>(path.join(personnelDir, 'traits.json')),
  ]);

  return {
    firstNames: firstNames ?? [],
    lastNames: lastNames ?? [],
    traits: traits ?? [],
  };
};

interface RawTaskDefinition {
  costModel: {
    basis: string;
    laborMinutes: number;
  };
  priority: number;
  requiredRole: string;
  requiredSkill: string;
  minSkillLevel: number;
  description: string;
}

export const loadTaskDefinitions = async (dataDirectory: string): Promise<TaskDefinitionMap> => {
  const configFile = path.join(dataDirectory, 'configs', 'task_definitions.json');
  const raw = await readJsonFile<Record<string, RawTaskDefinition>>(configFile);

  if (!raw) {
    return {};
  }

  const definitions: TaskDefinitionMap = {};
  for (const [id, value] of Object.entries(raw)) {
    const basis = value.costModel?.basis as TaskDefinition['costModel']['basis'] | undefined;
    definitions[id] = {
      id,
      costModel: {
        basis: basis ?? 'perAction',
        laborMinutes: value.costModel?.laborMinutes ?? 0,
      },
      priority: value.priority,
      requiredRole: value.requiredRole as EmployeeRole,
      requiredSkill: value.requiredSkill as SkillName,
      minSkillLevel: value.minSkillLevel,
      description: value.description,
    } satisfies TaskDefinition;
  }

  return definitions;
};

const sortBlueprints = <T extends { id: string; name?: string }>(items: readonly T[]): T[] => {
  return [...items].sort((a, b) => {
    const left = a.name ?? a.id;
    const right = b.name ?? b.id;
    return left.localeCompare(right);
  });
};

const selectBlueprint = <T extends { id: string; name?: string }>(
  items: readonly T[],
  stream: RngStream,
  preferredId?: string,
): T => {
  if (items.length === 0) {
    throw new Error('No blueprints available for selection.');
  }
  if (preferredId) {
    const match = items.find((item) => item.id === preferredId);
    if (match) {
      return match;
    }
  }
  if (items.length === 1) {
    return items[0];
  }
  const sorted = sortBlueprints(items);
  const index = stream.nextInt(sorted.length);
  return sorted[index];
};

const chooseDeviceBlueprints = (
  devices: DeviceBlueprint[],
  stream: RngStream,
): DeviceBlueprint[] => {
  const byKind = new Map<string, DeviceBlueprint[]>();
  for (const device of devices) {
    const kindEntries = byKind.get(device.kind) ?? [];
    kindEntries.push(device);
    byKind.set(device.kind, kindEntries);
  }

  const selected: DeviceBlueprint[] = [];
  const desiredKinds = ['Lamp', 'ClimateUnit', 'Dehumidifier'];
  for (const kind of desiredKinds) {
    const options = byKind.get(kind);
    if (options && options.length > 0) {
      selected.push(selectBlueprint(options, stream));
    }
  }

  if (selected.length === 0 && devices.length > 0) {
    selected.push(selectBlueprint(devices, stream));
  }

  return selected;
};

const cloneSettings = (settings: DeviceBlueprint['settings'] | undefined) => {
  if (!settings) {
    return {};
  }
  return JSON.parse(JSON.stringify(settings)) as Record<string, unknown>;
};

const createDeviceInstances = (
  blueprints: DeviceBlueprint[],
  zoneId: string,
  idStream: RngStream,
): DeviceInstanceState[] => {
  return blueprints.map((device) => ({
    id: generateId(idStream, 'device'),
    blueprintId: device.id,
    kind: device.kind,
    name: device.name,
    zoneId,
    status: 'operational',
    efficiency: device.quality ?? 1,
    runtimeHours: 0,
    maintenance: {
      lastServiceTick: 0,
      nextDueTick: 24 * 30,
      condition: Math.min(1, Math.max(0, device.quality ?? 1)),
      degradation: 0,
    },
    settings: cloneSettings(device.settings),
  }));
};

const createZoneEnvironment = (): ZoneEnvironmentState => ({
  temperature: 24,
  relativeHumidity: 0.62,
  co2: 900,
  ppfd: 550,
  vpd: 1.2,
});

const createZoneResources = (): ZoneResourceState => ({
  waterLiters: DEFAULT_ZONE_WATER_LITERS,
  nutrientSolutionLiters: DEFAULT_ZONE_NUTRIENT_LITERS,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: DEFAULT_ZONE_RESERVOIR_LEVEL,
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

const drawUnique = <T>(items: readonly T[], count: number, stream: RngStream): T[] => {
  if (items.length === 0 || count <= 0) {
    return [];
  }
  const pool = [...items];
  const picks = Math.min(count, pool.length);
  const result: T[] = [];
  for (let index = 0; index < picks; index += 1) {
    const chosenIndex = stream.nextInt(pool.length);
    result.push(pool.splice(chosenIndex, 1)[0]);
  }
  return result;
};

const createEmployeeSkills = (role: EmployeeRole): EmployeeSkills => {
  switch (role) {
    case 'Gardener':
      return { Gardening: 4, Cleanliness: 2 };
    case 'Technician':
      return { Maintenance: 4, Logistics: 2 };
    case 'Janitor':
      return { Cleanliness: 4, Logistics: 1 };
    case 'Operator':
      return { Logistics: 3, Administration: 2 };
    case 'Manager':
      return { Administration: 4, Logistics: 2 };
    default:
      return {};
  }
};

const createExperienceStub = (skills: EmployeeSkills): EmployeeSkills => {
  return Object.fromEntries(Object.keys(skills).map((skill) => [skill, 0])) as EmployeeSkills;
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
  blueprint: StructureBlueprint,
  structureId: string,
  strain: StrainBlueprint,
  method: CultivationMethodBlueprint,
  deviceBlueprints: DeviceBlueprint[],
  idStream: RngStream,
  rng: RngService,
  plantCountOverride?: number,
): StructureCreationResult => {
  const footprint = computeFootprint(blueprint);
  const totalArea = footprint.area;
  const growRoomArea = totalArea * 0.65;
  const supportRoomArea = Math.max(0, totalArea - growRoomArea);
  const plantStream = rng.getStream('plants');
  const zoneId = generateId(idStream, 'zone');
  const deviceInstances = createDeviceInstances(deviceBlueprints, zoneId, idStream);
  const capacity = Math.max(1, Math.floor(growRoomArea / Math.max(0.1, method.areaPerPlant)));
  const plantCount = Math.min(capacity, plantCountOverride ?? Math.min(12, capacity));
  const plants = createPlants(plantCount, zoneId, strain, idStream, plantStream);
  const environment = createZoneEnvironment();
  const zone: StructureCreationResult['growZone'] = {
    id: zoneId,
    roomId: '',
    name: 'Zone A',
    cultivationMethodId: method.id,
    strainId: strain.id,
    environment,
    resources: createZoneResources(),
    plants,
    devices: deviceInstances,
    metrics: createZoneMetrics(environment),
    health: createZoneHealth(plants),
    activeTaskIds: [],
  };

  const growRoomId = generateId(idStream, 'room');
  zone.roomId = growRoomId;

  const growRoom = {
    id: growRoomId,
    structureId,
    name: 'Grow Room Alpha',
    purposeId: 'growroom',
    area: growRoomArea,
    height: footprint.height,
    volume: growRoomArea * footprint.height,
    zones: [zone],
    cleanliness: 0.85,
    maintenanceLevel: 0.9,
  } satisfies StructureState['rooms'][number];

  const supportRoom = {
    id: generateId(idStream, 'room'),
    structureId,
    name: 'Support Room',
    purposeId: 'breakroom',
    area: supportRoomArea,
    height: footprint.height,
    volume: supportRoomArea * footprint.height,
    zones: [],
    cleanliness: 0.9,
    maintenanceLevel: 0.95,
  } satisfies StructureState['rooms'][number];

  const structure: StructureState = {
    id: structureId,
    blueprintId: blueprint.id,
    name: blueprint.name,
    status: 'active',
    footprint,
    rooms: [growRoom, supportRoom],
    rentPerTick: (blueprint.rentalCostPerSqmPerMonth * footprint.area) / (30 * 24),
    upfrontCostPaid: blueprint.upfrontFee,
  };

  return {
    structure,
    growRoom,
    growZone: zone,
    installedDeviceBlueprints: deviceBlueprints,
    plantCount,
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

const createPersonnel = (
  structureId: string,
  counts: Record<EmployeeRole, number>,
  directory: PersonnelNameDirectory | undefined,
  rng: RngService,
  idStream: RngStream,
): PersonnelRoster => {
  const firstNames = directory?.firstNames ?? [];
  const lastNames = directory?.lastNames ?? [];
  const traits = directory?.traits ?? [];
  const nameStream = rng.getStream('personnel-names');
  const traitStream = rng.getStream('personnel-traits');
  const moraleStream = rng.getStream('personnel-morale');
  const employees: EmployeeState[] = [];

  for (const role of Object.keys(counts) as EmployeeRole[]) {
    const count = counts[role] ?? 0;
    for (let index = 0; index < count; index += 1) {
      const firstName = firstNames.length > 0 ? nameStream.pick(firstNames) : `Crew${index + 1}`;
      const lastName = lastNames.length > 0 ? nameStream.pick(lastNames) : role;
      const fullName = `${firstName} ${lastName}`;
      const skills = createEmployeeSkills(role);
      const employeeTraits = drawUnique(
        traits,
        traits.length > 0 ? 1 + Number(traitStream.nextBoolean(0.35)) : 0,
        traitStream,
      ).map((trait) => trait.id);
      employees.push({
        id: generateId(idStream, 'emp'),
        name: fullName,
        role,
        salaryPerTick: DEFAULT_SALARY_BY_ROLE[role] ?? 20,
        status: 'idle',
        morale: 0.82 + moraleStream.nextRange(0, 0.08),
        energy: 1,
        skills,
        experience: createExperienceStub(skills),
        traits: employeeTraits,
        assignedStructureId: structureId,
      });
    }
  }

  const morale =
    employees.length > 0
      ? employees.reduce((sum, employee) => sum + employee.morale, 0) / employees.length
      : 1;

  return {
    employees,
    applicants: [],
    trainingPrograms: [],
    overallMorale: morale,
  };
};

const sumDeviceCapitalCosts = (
  devices: DeviceBlueprint[],
  priceLookup: (id: string) => DevicePriceEntry | undefined,
): number => {
  return devices.reduce((sum, device) => {
    const price = priceLookup(device.id);
    return sum + (price?.capitalExpenditure ?? 0);
  }, 0);
};

const createFinanceState = (
  createdAt: string,
  economics: EconomicsSettings,
  blueprint: StructureBlueprint,
  installedDevices: DeviceBlueprint[],
  repository: BlueprintRepository,
  idStream: RngStream,
): FinanceState => {
  const ledgerEntries: LedgerEntry[] = [];
  const addEntry = (
    entry: Omit<LedgerEntry, 'id' | 'tick' | 'timestamp'> & { tick?: number; timestamp?: string },
  ) => {
    ledgerEntries.push({
      id: generateId(idStream, 'ledger'),
      tick: entry.tick ?? 0,
      timestamp: entry.timestamp ?? createdAt,
      amount: entry.amount,
      type: entry.type,
      category: entry.category,
      description: entry.description,
    });
  };

  addEntry({
    amount: economics.initialCapital,
    type: 'income',
    category: 'capital',
    description: 'Initial capital injection',
  });

  if (blueprint.upfrontFee > 0) {
    addEntry({
      amount: -blueprint.upfrontFee,
      type: 'expense',
      category: 'structure',
      description: `Lease upfront payment for ${blueprint.name}`,
    });
  }

  const deviceCosts = sumDeviceCapitalCosts(installedDevices, (id) =>
    repository.getDevicePrice(id),
  );
  if (deviceCosts > 0) {
    addEntry({
      amount: -deviceCosts,
      type: 'expense',
      category: 'device',
      description: 'Initial device purchases',
    });
  }

  const cashOnHand = economics.initialCapital - blueprint.upfrontFee - deviceCosts;
  const totalExpenses = blueprint.upfrontFee + deviceCosts;

  const summary: FinancialSummary = {
    totalRevenue: economics.initialCapital,
    totalExpenses,
    totalPayroll: 0,
    totalMaintenance: 0,
    netIncome: economics.initialCapital - totalExpenses,
    lastTickRevenue: economics.initialCapital,
    lastTickExpenses: totalExpenses,
  };

  return {
    cashOnHand,
    reservedCash: 0,
    outstandingLoans: [],
    ledger: ledgerEntries,
    summary,
  };
};

const createTasks = (
  structure: StructureState,
  room: StructureState['rooms'][number],
  zone: StructureState['rooms'][number]['zones'][number],
  plantCount: number,
  definitions: TaskDefinitionMap | undefined,
  idStream: RngStream,
): TaskSystemState => {
  const backlog: TaskState[] = [];
  const createTask = (
    definitionId: string,
    fallbackPriority: number,
    metadata: Record<string, unknown>,
  ) => {
    const definition = definitions?.[definitionId];
    backlog.push({
      id: generateId(idStream, 'task'),
      definitionId,
      status: 'pending',
      priority: definition?.priority ?? fallbackPriority,
      createdAtTick: 0,
      dueTick: definition ? Math.round(definition.priority * 4) : undefined,
      location: {
        structureId: structure.id,
        roomId: room.id,
        zoneId: zone.id,
      },
      metadata: {
        zoneName: zone.name,
        structureName: structure.name,
        ...(definition ? { description: definition.description } : {}),
        ...metadata,
      },
    });
  };

  createTask('execute_planting_plan', 5, { plantCount });
  createTask('refill_supplies_water', 4, {});
  createTask('maintain_device', 3, { deviceCount: zone.devices.length });

  return {
    backlog,
    active: [],
    completed: [],
    cancelled: [],
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
  const idStream = context.rng.getStream('ids');

  const structureBlueprints =
    context.structureBlueprints ??
    (context.dataDirectory ? await loadStructureBlueprints(context.dataDirectory) : []);
  if (structureBlueprints.length === 0) {
    throw new Error('No structure blueprints available to create initial state.');
  }

  const structureSelectionStream = context.rng.getStream('structures');
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
    context.rng.getStream('strains'),
    options.preferredStrainId,
  );

  const cultivationMethods = context.repository.listCultivationMethods();
  if (cultivationMethods.length === 0) {
    throw new Error('Blueprint repository has no cultivation method blueprints.');
  }
  const method = selectBlueprint(
    cultivationMethods,
    context.rng.getStream('methods'),
    options.preferredCultivationMethodId,
  );

  const devices = context.repository.listDevices();
  if (devices.length === 0) {
    throw new Error('Blueprint repository has no device blueprints.');
  }
  const deviceBlueprints = chooseDeviceBlueprints(devices, context.rng.getStream('devices'));

  const structureId = generateId(idStream, 'structure');
  const structureResult = buildStructureState(
    structureBlueprint,
    structureId,
    strain,
    method,
    deviceBlueprints,
    idStream,
    context.rng,
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
