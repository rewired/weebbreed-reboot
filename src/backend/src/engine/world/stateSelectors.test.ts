import { describe, expect, it } from 'vitest';
import type {
  FinanceState,
  GameMetadata,
  GameState,
  GlobalInventoryState,
  PersonnelRoster,
  RoomState,
  SimulationClockState,
  StructureState,
  TaskSystemState,
  ZoneState,
} from '@/state/types.js';
import { findRoom, findStructure, findZone } from './stateSelectors.js';

const createMetadata = (): GameMetadata => ({
  gameId: 'game-test',
  createdAt: new Date(0).toISOString(),
  seed: 'seed-test',
  difficulty: 'normal',
  simulationVersion: '1.0.0-test',
  tickLengthMinutes: 60,
  economics: {
    initialCapital: 100_000,
    itemPriceMultiplier: 1,
    harvestPriceMultiplier: 1,
    rentPerSqmStructurePerTick: 0,
    rentPerSqmRoomPerTick: 0,
  },
});

const createClock = (): SimulationClockState => ({
  tick: 0,
  isPaused: false,
  startedAt: new Date(0).toISOString(),
  lastUpdatedAt: new Date(0).toISOString(),
  targetTickRate: 1,
});

const createInventory = (): GlobalInventoryState => ({
  resources: {
    waterLiters: 0,
    nutrientsGrams: 0,
    co2Kg: 0,
    substrateKg: 0,
    packagingUnits: 0,
    sparePartsValue: 0,
  },
  seeds: [],
  devices: [],
  harvest: [],
  consumables: {},
});

const createFinances = (): FinanceState => ({
  cashOnHand: 10_000,
  reservedCash: 0,
  outstandingLoans: [],
  ledger: [],
  summary: {
    totalRevenue: 0,
    totalExpenses: 0,
    totalPayroll: 0,
    totalMaintenance: 0,
    netIncome: 0,
    lastTickRevenue: 0,
    lastTickExpenses: 0,
  },
  utilityPrices: {
    version: 'test',
    pricePerKwh: 0.2,
    pricePerLiterWater: 0.01,
    pricePerGramNutrients: 0.05,
  },
});

const createPersonnel = (): PersonnelRoster => ({
  employees: [],
  applicants: [],
  trainingPrograms: [],
  overallMorale: 1,
});

const createTasks = (): TaskSystemState => ({
  backlog: [],
  active: [],
  completed: [],
  cancelled: [],
});

const createZone = (overrides: Partial<ZoneState> = {}): ZoneState => ({
  id: 'zone-default',
  roomId: 'room-default',
  name: 'Default Zone',
  cultivationMethodId: 'method-default',
  strainId: 'strain-default',
  area: 10,
  ceilingHeight: 3,
  volume: 30,
  environment: {
    temperature: 22,
    relativeHumidity: 0.55,
    co2: 900,
    ppfd: 400,
    vpd: 1.1,
  },
  resources: {
    waterLiters: 0,
    nutrientSolutionLiters: 0,
    nutrientStrength: 1,
    substrateHealth: 1,
    reservoirLevel: 0,
    lastTranspirationLiters: 0,
  },
  plants: [],
  devices: [],
  metrics: {
    averageTemperature: 22,
    averageHumidity: 0.55,
    averageCo2: 900,
    averagePpfd: 400,
    stressLevel: 0,
    lastUpdatedTick: 0,
  },
  control: { setpoints: {} },
  health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
  activeTaskIds: [],
  ...overrides,
});

const createRoom = (overrides: Partial<RoomState> = {}): RoomState => ({
  id: 'room-default',
  structureId: 'structure-default',
  name: 'Default Room',
  purposeId: 'purpose-default',
  area: 100,
  height: 3,
  volume: 300,
  zones: [],
  cleanliness: 1,
  maintenanceLevel: 1,
  ...overrides,
});

const createStructure = (overrides: Partial<StructureState> = {}): StructureState => ({
  id: 'structure-default',
  blueprintId: 'blueprint-default',
  name: 'Default Structure',
  status: 'active',
  footprint: { length: 10, width: 10, height: 3, area: 100, volume: 300 },
  rooms: [],
  rentPerTick: 0,
  upfrontCostPaid: 0,
  ...overrides,
});

const createGameState = (structures: StructureState[]): GameState => ({
  metadata: createMetadata(),
  clock: createClock(),
  structures,
  inventory: createInventory(),
  finances: createFinances(),
  personnel: createPersonnel(),
  tasks: createTasks(),
});

const createMultiStructureState = (): GameState => {
  const zoneA1 = createZone({ id: 'zone-a-1', roomId: 'room-a-1', name: 'Zone A1' });
  const zoneA10 = createZone({ id: 'zone-a-10', roomId: 'room-a-1', name: 'Zone A10' });
  const zoneB1 = createZone({ id: 'zone-b-1', roomId: 'room-b-1', name: 'Zone B1' });
  const zoneB10 = createZone({ id: 'zone-b-10', roomId: 'room-b-10', name: 'Zone B10' });
  const zoneC1 = createZone({ id: 'zone-c-1', roomId: 'room-c-1', name: 'Zone C1' });

  const structureOne = createStructure({
    id: 'structure-1',
    name: 'North Facility',
    rooms: [
      createRoom({
        id: 'room-a-1',
        structureId: 'structure-1',
        name: 'Propagation Wing',
        zones: [zoneA1, zoneA10],
      }),
      createRoom({
        id: 'room-a-10',
        structureId: 'structure-1',
        name: 'Spare Room',
        zones: [],
      }),
    ],
  });

  const structureTwo = createStructure({
    id: 'structure-10',
    name: 'South Facility',
    rooms: [
      createRoom({
        id: 'room-b-1',
        structureId: 'structure-10',
        name: 'Flower Room',
        zones: [zoneB1],
      }),
      createRoom({
        id: 'room-b-10',
        structureId: 'structure-10',
        name: 'Flower Annex',
        zones: [zoneB10],
      }),
    ],
  });

  const structureThree = createStructure({
    id: 'structure-extra',
    name: 'Research Facility',
    rooms: [
      createRoom({
        id: 'room-c-1',
        structureId: 'structure-extra',
        name: 'Lab Room',
        zones: [zoneC1],
      }),
    ],
  });

  return createGameState([structureOne, structureTwo, structureThree]);
};

describe('findStructure', () => {
  it('returns the structure and index when an exact id match exists among similar ids', () => {
    const state = createMultiStructureState();

    const result = findStructure(state, 'structure-1');

    expect(result).toBeDefined();
    expect(result?.structure.id).toBe('structure-1');
    expect(result?.index).toBe(0);
  });

  it('returns undefined when no structure matches the requested id', () => {
    const state = createMultiStructureState();

    expect(findStructure(state, 'structure-missing')).toBeUndefined();
  });

  it('returns undefined when the state has no structures', () => {
    const emptyState = createGameState([]);

    expect(findStructure(emptyState, 'structure-1')).toBeUndefined();
  });
});

describe('findRoom', () => {
  it('returns the room with structure metadata and indices', () => {
    const state = createMultiStructureState();

    const result = findRoom(state, 'room-b-1');

    expect(result).toBeDefined();
    expect(result?.structure.id).toBe('structure-10');
    expect(result?.room.id).toBe('room-b-1');
    expect(result?.index).toBe(1);
    expect(result?.roomIndex).toBe(0);
  });

  it('prefers an exact id match over similar ids', () => {
    const state = createMultiStructureState();

    const result = findRoom(state, 'room-a-1');

    expect(result).toBeDefined();
    expect(result?.room.id).toBe('room-a-1');
    expect(result?.room.id).not.toBe('room-a-10');
  });

  it('returns undefined when no room matches', () => {
    const state = createMultiStructureState();

    expect(findRoom(state, 'room-missing')).toBeUndefined();
  });

  it('returns undefined when structures have no rooms', () => {
    const state = createGameState([createStructure({ id: 'structure-empty', rooms: [] })]);

    expect(findRoom(state, 'room-b-1')).toBeUndefined();
  });
});

describe('findZone', () => {
  it('returns the zone with full hierarchy metadata and indices', () => {
    const state = createMultiStructureState();

    const result = findZone(state, 'zone-b-10');

    expect(result).toBeDefined();
    expect(result?.structure.id).toBe('structure-10');
    expect(result?.room.id).toBe('room-b-10');
    expect(result?.zone.id).toBe('zone-b-10');
    expect(result?.index).toBe(1);
    expect(result?.roomIndex).toBe(1);
    expect(result?.zoneIndex).toBe(0);
  });

  it('does not match zones with similar ids in other rooms or structures', () => {
    const state = createMultiStructureState();

    const result = findZone(state, 'zone-a-1');

    expect(result).toBeDefined();
    expect(result?.zone.id).toBe('zone-a-1');
    expect(result?.zone.id).not.toBe('zone-a-10');
    expect(result?.structure.id).toBe('structure-1');
    expect(result?.room.id).toBe('room-a-1');
  });

  it('returns undefined when the zone id is unknown', () => {
    const state = createMultiStructureState();

    expect(findZone(state, 'zone-missing')).toBeUndefined();
  });

  it('returns undefined when rooms contain no zones', () => {
    const state = createGameState([
      createStructure({
        id: 'structure-empty',
        rooms: [createRoom({ id: 'room-empty', structureId: 'structure-empty', zones: [] })],
      }),
    ]);

    expect(findZone(state, 'zone-any')).toBeUndefined();
  });
});
