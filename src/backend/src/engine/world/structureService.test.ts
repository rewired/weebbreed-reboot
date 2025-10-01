import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandExecutionContext, CommandResult } from '@/facade/index.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { CostAccountingService, TickAccumulator } from '@/engine/economy/costAccounting.js';
import { createEventCollector, type EventCollector, type SimulationEvent } from '@/lib/eventBus.js';
import type {
  FinanceState,
  GameMetadata,
  GameState,
  GlobalInventoryState,
  PersonnelRoster,
  RoomState,
  StructureBlueprint,
  StructureState,
  TaskState,
  TaskSystemState,
  ZoneState,
} from '@/state/types.js';
import {
  createStructureService,
  type FailureFactory,
  type StructureService,
  type StructureServiceDependencies,
} from './structureService.js';
import type { DevicePurchaseMap } from './zoneService.js';
import * as geometry from '@/state/geometry.js';

const validateStructureGeometrySpy = vi
  .spyOn(geometry, 'validateStructureGeometry')
  .mockImplementation(() => undefined);

const createBaseMetadata = (): GameMetadata => ({
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

const createFinanceState = (): FinanceState => ({
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

const createStructure = (overrides: Partial<StructureState> = {}): StructureState => ({
  id: 'structure-1',
  blueprintId: 'blueprint-1',
  name: 'Structure Alpha',
  status: 'active',
  footprint: { length: 10, width: 5, height: 3, area: 50, volume: 150 },
  rooms: [],
  rentPerTick: 1,
  upfrontCostPaid: 0,
  notes: undefined,
  ...overrides,
});

const createBaseState = (structureOverrides?: Partial<StructureState>): GameState => {
  const structure = createStructure(structureOverrides);
  return {
    metadata: createBaseMetadata(),
    clock: {
      tick: 5,
      isPaused: false,
      startedAt: new Date(0).toISOString(),
      lastUpdatedAt: new Date(0).toISOString(),
      targetTickRate: 1,
    },
    structures: [structure],
    inventory: createInventory(),
    finances: createFinanceState(),
    personnel: createPersonnel(),
    tasks: createTasks(),
  } satisfies GameState;
};

const createZone = (overrides: Partial<ZoneState> = {}): ZoneState => ({
  id: 'zone-1',
  roomId: 'room-1',
  name: 'Zone Alpha',
  cultivationMethodId: 'method-1',
  strainId: 'strain-1',
  area: 12,
  ceilingHeight: 3,
  volume: 36,
  environment: { temperature: 22, relativeHumidity: 0.5, co2: 800, ppfd: 0, vpd: 1 },
  resources: {
    waterLiters: 0,
    nutrientSolutionLiters: 0,
    nutrientStrength: 0,
    substrateHealth: 0,
    reservoirLevel: 0,
    lastTranspirationLiters: 0,
  },
  plants: [],
  devices: [],
  metrics: {
    averageTemperature: 22,
    averageHumidity: 0.5,
    averageCo2: 800,
    averagePpfd: 0,
    stressLevel: 0,
    lastUpdatedTick: 0,
  },
  control: { setpoints: {} },
  health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
  activeTaskIds: [],
  cultivation: {},
  ...overrides,
});

const createRoom = (overrides: Partial<RoomState> = {}): RoomState => ({
  id: 'room-1',
  structureId: 'structure-1',
  name: 'Room Alpha',
  purposeId: 'purpose-1',
  area: 48,
  height: 3,
  volume: 144,
  zones: [createZone()],
  cleanliness: 1,
  maintenanceLevel: 1,
  ...overrides,
});

const createTask = (overrides: Partial<TaskState> = {}): TaskState => ({
  id: 'task-1',
  definitionId: 'definition-1',
  status: 'pending',
  priority: 1,
  createdAtTick: 0,
  metadata: {},
  ...overrides,
});

interface HarnessOptions {
  state?: GameState;
  structureBlueprints?: StructureBlueprint[];
  createId?: (prefix: string) => string;
  roomService?: StructureServiceDependencies['roomService'];
}

interface Harness {
  service: StructureService;
  state: GameState;
  failure: ReturnType<typeof createFailureMock>;
  costAccounting: {
    createAccumulator: ReturnType<typeof vi.fn>;
    recordDevicePurchase: ReturnType<typeof vi.fn>;
  };
  dependencies: StructureServiceDependencies;
}

const createAccumulatorStub = (): TickAccumulator => ({
  revenue: 0,
  expenses: 0,
  capex: 0,
  opex: 0,
  maintenance: 0,
  payroll: 0,
  utilities: {
    energy: { quantity: 0, baseUnitCost: 0, unitCost: 0, totalCost: 0 },
    water: { quantity: 0, baseUnitCost: 0, unitCost: 0, totalCost: 0 },
    nutrients: { quantity: 0, baseUnitCost: 0, unitCost: 0, totalCost: 0 },
    totalCost: 0,
  },
  maintenanceDetails: [],
});

const createFailureMock = () =>
  vi.fn<Parameters<FailureFactory>, CommandResult<never>>((code, message, path) => {
    void code;
    void message;
    void path;
    return { ok: false } satisfies CommandResult<never>;
  });

const createHarness = (options: HarnessOptions = {}): Harness => {
  const state = options.state ?? createBaseState();
  const failure = createFailureMock();

  const createAccumulator = vi.fn<TickAccumulator, []>(() => createAccumulatorStub());
  const recordDevicePurchase = vi.fn<
    [
      GameState,
      string,
      number,
      number,
      string,
      TickAccumulator,
      EventCollector,
      string | undefined,
    ],
    number
  >((stateArg, blueprintId, quantity, tick, timestamp, accumulator) => {
    void stateArg;
    void blueprintId;
    void tick;
    void timestamp;
    accumulator.expenses += quantity * 100;
    accumulator.maintenance += 10;
    return accumulator.expenses;
  });

  const dependencies: StructureServiceDependencies = {
    state,
    costAccounting: {
      createAccumulator,
      recordDevicePurchase,
    } as unknown as CostAccountingService,
    repository: { listDevices: vi.fn() } as unknown as BlueprintRepository,
    createId: options.createId ?? ((prefix) => `${prefix}-generated`),
    structureBlueprints: options.structureBlueprints,
    roomService: options.roomService ?? { cloneRoom: vi.fn() },
    failure,
  } satisfies StructureServiceDependencies;

  const service = createStructureService(dependencies);

  return {
    service,
    state,
    failure,
    costAccounting: { createAccumulator, recordDevicePurchase },
    dependencies,
  } satisfies Harness;
};

const createContext = (
  state: GameState,
  events: SimulationEvent[],
  tick = state.clock.tick,
): CommandExecutionContext => ({
  command: 'test.command',
  state,
  clock: state.clock,
  tick,
  events: createEventCollector(events, tick),
});

beforeEach(() => {
  validateStructureGeometrySpy.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createStructureService', () => {
  describe('renameStructure', () => {
    it('renames an existing structure and emits an event', () => {
      const harness = createHarness();
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 12);

      const result = harness.service.renameStructure('structure-1', '  Structure Beta  ', context);

      expect(result).toEqual({ ok: true });
      expect(harness.state.structures[0].name).toBe('Structure Beta');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'world.structureRenamed',
        payload: { structureId: 'structure-1', name: 'Structure Beta' },
        tick: 12,
        level: 'info',
      });
      expect(harness.failure).not.toHaveBeenCalled();
    });

    it('fails when the structure identifier is missing', () => {
      const harness = createHarness();
      const failureResult = { ok: false } satisfies CommandResult;
      harness.failure.mockReturnValue(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 3);

      const result = harness.service.renameStructure('missing-structure', 'Name', context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        expect.stringContaining('missing-structure'),
        ['world.renameStructure', 'structureId'],
      );
      expect(harness.state.structures[0].name).toBe('Structure Alpha');
      expect(events).toHaveLength(0);
    });
  });

  describe('rentStructure', () => {
    it('creates a new structure, charges upfront rent, and emits events', () => {
      const blueprint: StructureBlueprint = {
        id: 'blueprint-1',
        name: 'Downtown Lab',
        footprint: { length: 12, width: 8 },
        rentalCostPerSqmPerMonth: 10,
        upfrontFee: 500,
      } satisfies StructureBlueprint;

      const state = createBaseState();
      state.finances.cashOnHand = 2_000;
      const harness = createHarness({
        state,
        structureBlueprints: [blueprint],
        createId: () => 'structure-new',
      });
      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 42);

      const result = harness.service.rentStructure('blueprint-1', context);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ structureId: 'structure-new' });

      expect(state.structures).toHaveLength(2);
      const created = state.structures[1];
      const expectedArea = blueprint.footprint.length * blueprint.footprint.width;
      const expectedHeight = blueprint.footprint.height ?? 2.5;
      const expectedVolume = expectedArea * expectedHeight;
      const expectedRentPerTick =
        ((blueprint.rentalCostPerSqmPerMonth * expectedArea) / (30 * 24)) *
        (state.metadata.tickLengthMinutes / 60);

      expect(created).toMatchObject({
        id: 'structure-new',
        blueprintId: blueprint.id,
        name: blueprint.name,
        rentPerTick: expectedRentPerTick,
        upfrontCostPaid: blueprint.upfrontFee,
      });
      expect(created.footprint).toMatchObject({
        length: blueprint.footprint.length,
        width: blueprint.footprint.width,
        height: expectedHeight,
        area: expectedArea,
        volume: expectedVolume,
      });

      expect(state.finances.cashOnHand).toBe(1_500);
      expect(state.finances.ledger).toHaveLength(1);
      expect(state.finances.ledger[0]).toMatchObject({
        amount: -blueprint.upfrontFee,
        category: 'rent',
        type: 'expense',
        tick: 42,
        description: expect.stringContaining(blueprint.name),
      });

      expect(state.finances.summary.totalExpenses).toBe(500);
      expect(state.finances.summary.lastTickExpenses).toBe(500);
      expect(state.finances.summary.netIncome).toBe(-500);

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        type: 'finance.capex',
        payload: {
          tick: 42,
          amount: blueprint.upfrontFee,
          category: 'rent',
          structureId: 'structure-new',
        },
        level: 'info',
      });
      expect(events[1]).toMatchObject({
        type: 'world.structureRented',
        payload: { structureId: 'structure-new', name: blueprint.name },
        tick: 42,
        level: 'info',
      });
      expect(harness.failure).not.toHaveBeenCalled();
    });

    it('fails when structure blueprints are unavailable', () => {
      const harness = createHarness();
      const failureResult = { ok: false } satisfies CommandResult<never>;
      harness.failure.mockReturnValue(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 7);

      const result = harness.service.rentStructure('blueprint-missing', context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_INVALID_STATE',
        'Structure blueprints are not available.',
        ['world.rentStructure'],
      );
      expect(events).toHaveLength(0);
      expect(harness.state.structures).toHaveLength(1);
    });

    it('fails when the blueprint cannot be found', () => {
      const harness = createHarness({ structureBlueprints: [] });
      const failureResult = { ok: false } satisfies CommandResult<never>;
      harness.failure.mockReturnValue(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 11);

      const result = harness.service.rentStructure('unknown-blueprint', context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        expect.stringContaining('unknown-blueprint'),
        ['world.rentStructure', 'structureId'],
      );
      expect(events).toHaveLength(0);
      expect(harness.state.structures).toHaveLength(1);
    });

    it('fails when there is not enough cash to pay the upfront fee', () => {
      const blueprint: StructureBlueprint = {
        id: 'blueprint-2',
        name: 'Budget Lab',
        footprint: { length: 6, width: 6, height: 4 },
        rentalCostPerSqmPerMonth: 5,
        upfrontFee: 750,
      } satisfies StructureBlueprint;

      const state = createBaseState();
      state.finances.cashOnHand = 100;
      const harness = createHarness({ state, structureBlueprints: [blueprint] });
      const failureResult = { ok: false } satisfies CommandResult<never>;
      harness.failure.mockReturnValue(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 15);

      const result = harness.service.rentStructure('blueprint-2', context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_INSUFFICIENT_FUNDS',
        expect.stringContaining('Required: 750'),
        ['world.rentStructure', 'upfrontFee'],
      );
      expect(events).toHaveLength(0);
      expect(state.structures).toHaveLength(1);
      expect(state.finances.ledger).toHaveLength(0);
      expect(state.finances.cashOnHand).toBe(100);
    });
  });

  describe('deleteStructure', () => {
    it('removes the structure, clears zone tasks, and prunes task queues', () => {
      const structure = createStructure({
        rooms: [
          createRoom({
            zones: [createZone({ id: 'zone-1', activeTaskIds: ['task-remove'] })],
          }),
        ],
      });
      const state = createBaseState(structure);
      state.structures.push(
        createStructure({ id: 'structure-keep', name: 'Structure Gamma', rooms: [] }),
      );

      const zoneReference = state.structures[0].rooms[0].zones[0];
      state.tasks.backlog = [
        createTask({ id: 'task-keep', location: { structureId: 'structure-keep' } }),
        createTask({ id: 'task-remove', location: { structureId: 'structure-1' } }),
      ];
      state.tasks.active = [
        createTask({
          id: 'active-keep',
          status: 'inProgress',
          location: { structureId: 'structure-keep' },
        }),
        createTask({
          id: 'active-remove',
          status: 'inProgress',
          location: { structureId: 'structure-1' },
        }),
      ];
      state.tasks.completed = [
        createTask({
          id: 'completed-remove',
          status: 'completed',
          location: { structureId: 'structure-1' },
        }),
      ];
      state.tasks.cancelled = [
        createTask({
          id: 'cancelled-remove',
          status: 'cancelled',
          location: { structureId: 'structure-1' },
        }),
      ];

      const harness = createHarness({ state });
      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 25);

      const result = harness.service.deleteStructure('structure-1', context);

      expect(result).toEqual({ ok: true });
      expect(zoneReference.activeTaskIds).toEqual([]);
      expect(state.structures).toHaveLength(1);
      expect(state.structures[0].id).toBe('structure-keep');
      expect(state.tasks.backlog.map((task) => task.id)).toEqual(['task-keep']);
      expect(state.tasks.active.map((task) => task.id)).toEqual(['active-keep']);
      expect(state.tasks.completed).toHaveLength(0);
      expect(state.tasks.cancelled).toHaveLength(0);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'world.structureDeleted',
        payload: { structureId: 'structure-1' },
        tick: 25,
        level: 'info',
      });
      expect(harness.failure).not.toHaveBeenCalled();
    });

    it('fails when attempting to delete a missing structure', () => {
      const harness = createHarness();
      const failureResult = { ok: false } satisfies CommandResult<never>;
      harness.failure.mockReturnValue(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 4);

      const result = harness.service.deleteStructure('missing-structure', context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        expect.stringContaining('missing-structure'),
        ['world.deleteStructure', 'structureId'],
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('duplicateStructure', () => {
    it('duplicates the structure, clones rooms, records purchases, and emits events', () => {
      const state = createBaseState({
        rooms: [
          createRoom({ id: 'room-1', zones: [createZone({ id: 'zone-1' })] }),
          createRoom({ id: 'room-2', zones: [createZone({ id: 'zone-2' })] }),
        ],
      });

      const purchaseMapA: DevicePurchaseMap = new Map([
        ['device-alpha', 1],
        ['device-beta', 2],
      ]);
      const purchaseMapB: DevicePurchaseMap = new Map([['device-alpha', 3]]);

      const cloneRoom = vi.fn(
        (
          room: RoomState,
          structureId: string,
          ctx: CommandExecutionContext,
          options?: { recordPurchases?: boolean },
        ) => {
          expect(structureId).toBe('structure-dup');
          expect(ctx.tick).toBe(30);
          expect(options).toEqual({ recordPurchases: false });
          const purchases = room.id === 'room-1' ? purchaseMapA : purchaseMapB;
          return {
            room: {
              ...room,
              id: `${room.id}-copy`,
              structureId,
              zones: room.zones.map((zone) => ({
                ...zone,
                id: `${zone.id}-copy`,
                roomId: `${room.id}-copy`,
                activeTaskIds: [],
              })),
            },
            purchases,
          };
        },
      );

      const harness = createHarness({
        state,
        roomService: { cloneRoom } as StructureServiceDependencies['roomService'],
        createId: () => 'structure-dup',
      });
      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 30);

      const result = harness.service.duplicateStructure('structure-1', '  Custom Copy  ', context);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ structureId: 'structure-dup' });

      expect(state.structures).toHaveLength(2);
      const duplicated = state.structures[1];
      expect(duplicated).toMatchObject({
        id: 'structure-dup',
        blueprintId: state.structures[0].blueprintId,
        name: 'Custom Copy',
        rentPerTick: state.structures[0].rentPerTick,
        upfrontCostPaid: 0,
      });
      expect(duplicated.rooms.map((room) => room.id)).toEqual(['room-1-copy', 'room-2-copy']);
      expect(cloneRoom).toHaveBeenCalledTimes(2);
      expect(validateStructureGeometrySpy).toHaveBeenCalledWith(duplicated);

      expect(harness.costAccounting.createAccumulator).toHaveBeenCalledTimes(1);
      expect(harness.costAccounting.recordDevicePurchase).toHaveBeenCalledTimes(2);
      expect(harness.costAccounting.recordDevicePurchase).toHaveBeenNthCalledWith(
        1,
        state,
        'device-alpha',
        4,
        30,
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        'Structure duplication from structure-1',
      );
      expect(harness.costAccounting.recordDevicePurchase).toHaveBeenNthCalledWith(
        2,
        state,
        'device-beta',
        2,
        30,
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        'Structure duplication from structure-1',
      );

      expect(state.finances.summary.totalExpenses).toBe(600);
      expect(state.finances.summary.lastTickExpenses).toBe(600);
      expect(state.finances.summary.totalMaintenance).toBe(20);
      expect(state.finances.summary.netIncome).toBe(-600);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'world.structureDuplicated',
        payload: {
          structureId: 'structure-dup',
          sourceStructureId: 'structure-1',
          name: 'Custom Copy',
        },
        tick: 30,
        level: 'info',
      });
      expect(harness.failure).not.toHaveBeenCalled();
    });

    it('fails when attempting to duplicate an unknown structure', () => {
      const harness = createHarness();
      const failureResult = { ok: false } satisfies CommandResult<never>;
      harness.failure.mockReturnValue(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 18);

      const result = harness.service.duplicateStructure('missing-structure', undefined, context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        expect.stringContaining('missing-structure'),
        ['world.duplicateStructure', 'structureId'],
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('recordDevicePurchases', () => {
    it('records device purchases, applies accounting, and updates finance summaries', () => {
      const harness = createHarness();
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 55);
      const purchases: DevicePurchaseMap = new Map([
        ['device-1', 2],
        ['device-2', 1],
      ]);

      harness.service.recordDevicePurchases(purchases, context, 'Manual purchase');

      expect(harness.costAccounting.createAccumulator).toHaveBeenCalledTimes(1);
      expect(harness.costAccounting.recordDevicePurchase).toHaveBeenCalledTimes(2);
      expect(harness.costAccounting.recordDevicePurchase).toHaveBeenCalledWith(
        harness.state,
        'device-1',
        2,
        55,
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        'Manual purchase',
      );
      expect(harness.costAccounting.recordDevicePurchase).toHaveBeenCalledWith(
        harness.state,
        'device-2',
        1,
        55,
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        'Manual purchase',
      );

      expect(harness.state.finances.summary.totalExpenses).toBe(300);
      expect(harness.state.finances.summary.lastTickExpenses).toBe(300);
      expect(harness.state.finances.summary.totalMaintenance).toBe(20);
      expect(harness.state.finances.summary.netIncome).toBe(-300);
    });

    it('does nothing when no purchases are provided', () => {
      const harness = createHarness();
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 60);

      harness.service.recordDevicePurchases(new Map(), context, 'No-op');

      expect(harness.costAccounting.createAccumulator).not.toHaveBeenCalled();
      expect(harness.costAccounting.recordDevicePurchase).not.toHaveBeenCalled();
      expect(harness.state.finances.summary.totalExpenses).toBe(0);
      expect(events).toHaveLength(0);
    });
  });
});
