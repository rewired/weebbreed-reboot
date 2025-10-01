import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventCollector, type SimulationEvent } from '@/lib/eventBus.js';
import type { CommandExecutionContext, CommandResult, ErrorCode } from '@/facade/index.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { CostAccountingService } from '@/engine/economy/costAccounting.js';
import type {
  GameMetadata,
  GameState,
  GlobalInventoryState,
  PersonnelRoster,
  FinanceState,
  TaskSystemState,
  RoomState,
  StructureState,
  ZoneState,
} from '@/state/types.js';
import type { RoomPurpose, RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import {
  createRoomService,
  type FailureFactory,
  type RoomService,
  type RoomServiceDependencies,
} from './roomService.js';
import type { DevicePurchaseMap } from './zoneService.js';
import * as geometry from '@/state/geometry.js';

const validateStructureGeometrySpy = vi
  .spyOn(geometry, 'validateStructureGeometry')
  .mockImplementation(() => undefined);

const createMetadata = (): GameMetadata => ({
  gameId: 'game-test',
  createdAt: new Date(0).toISOString(),
  seed: 'seed-test',
  difficulty: 'normal',
  simulationVersion: '1.0.0-test',
  tickLengthMinutes: 30,
  economics: {
    initialCapital: 100_000,
    itemPriceMultiplier: 1,
    harvestPriceMultiplier: 1,
    rentPerSqmStructurePerTick: 0.2,
    rentPerSqmRoomPerTick: 0.1,
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
    pricePerKwh: 0.15,
    pricePerLiterWater: 0.01,
    pricePerGramNutrients: 0.02,
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
  id: overrides.id ?? 'zone-alpha',
  roomId: overrides.roomId ?? 'room-alpha',
  name: overrides.name ?? 'Zone Alpha',
  cultivationMethodId: overrides.cultivationMethodId ?? 'method-1',
  strainId: overrides.strainId ?? 'strain-1',
  area: overrides.area ?? 12,
  ceilingHeight: overrides.ceilingHeight ?? 3,
  volume: overrides.volume ?? (overrides.area ?? 12) * (overrides.ceilingHeight ?? 3),
  environment:
    overrides.environment ??
    ({
      temperature: 22,
      relativeHumidity: 0.55,
      co2: 820,
      ppfd: 0,
      vpd: 1.1,
    } satisfies ZoneState['environment']),
  resources:
    overrides.resources ??
    ({
      waterLiters: 0,
      nutrientSolutionLiters: 0,
      nutrientStrength: 0,
      substrateHealth: 1,
      reservoirLevel: 0,
      lastTranspirationLiters: 0,
    } satisfies ZoneState['resources']),
  plants: overrides.plants ?? [],
  devices: overrides.devices ?? [],
  metrics:
    overrides.metrics ??
    ({
      averageTemperature: 22,
      averageHumidity: 0.55,
      averageCo2: 820,
      averagePpfd: 0,
      stressLevel: 0,
      lastUpdatedTick: 0,
    } satisfies ZoneState['metrics']),
  control: overrides.control ?? ({ setpoints: {} } satisfies ZoneState['control']),
  health:
    overrides.health ??
    ({
      plantHealth: {},
      pendingTreatments: [],
      appliedTreatments: [],
    } satisfies ZoneState['health']),
  activeTaskIds: overrides.activeTaskIds ?? [],
  cultivation: overrides.cultivation,
});

const createRoom = (overrides: Partial<RoomState> = {}): RoomState => {
  const id = overrides.id ?? 'room-alpha';
  const structureId = overrides.structureId ?? 'structure-alpha';
  const area = overrides.area ?? 36;
  const height = overrides.height ?? 3;
  return {
    id,
    structureId,
    name: overrides.name ?? 'Room Alpha',
    purposeId: overrides.purposeId ?? 'purpose-grow',
    area,
    height,
    volume: overrides.volume ?? area * height,
    zones: overrides.zones ?? [
      createZone({ id: `${id}-zone`, roomId: id, name: `${id}-Zone`, area: area / 3 }),
    ],
    cleanliness: overrides.cleanliness ?? 1,
    maintenanceLevel: overrides.maintenanceLevel ?? 1,
  } satisfies RoomState;
};

const createStructure = (overrides: Partial<StructureState> = {}): StructureState => ({
  id: overrides.id ?? 'structure-alpha',
  blueprintId: overrides.blueprintId ?? 'blueprint-structure',
  name: overrides.name ?? 'Structure Alpha',
  status: overrides.status ?? 'active',
  footprint:
    overrides.footprint ??
    ({
      length: 12,
      width: 8,
      height: 3,
      area: 96,
      volume: 288,
    } satisfies StructureState['footprint']),
  rooms: overrides.rooms ?? [],
  rentPerTick: overrides.rentPerTick ?? 1,
  upfrontCostPaid: overrides.upfrontCostPaid ?? 0,
  notes: overrides.notes,
});

const createBaseState = (): GameState => {
  const structureAlpha = createStructure({
    id: 'structure-alpha',
    rooms: [
      createRoom({ id: 'room-alpha', name: 'Propagation Bay', area: 36 }),
      createRoom({ id: 'room-beta', name: 'Mother Room', area: 18 }),
    ],
  });
  const structureBeta = createStructure({
    id: 'structure-beta',
    name: 'Structure Beta',
    footprint: { length: 10, width: 6, height: 3, area: 60, volume: 180 },
    rooms: [
      createRoom({ id: 'room-gamma', structureId: 'structure-beta', name: 'Dry Room', area: 24 }),
    ],
  });
  return {
    metadata: createMetadata(),
    clock: {
      tick: 12,
      isPaused: false,
      startedAt: new Date(0).toISOString(),
      lastUpdatedAt: new Date(0).toISOString(),
      targetTickRate: 1,
    },
    structures: [structureAlpha, structureBeta],
    inventory: createInventory(),
    finances: createFinanceState(),
    personnel: createPersonnel(),
    tasks: createTasks(),
  } satisfies GameState;
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

const createFailureHarness = () => {
  const spy = vi.fn<[ErrorCode, string, string[]], CommandResult<never>>(
    (code, message, path) =>
      ({ ok: false, errors: [{ code, message, path }] }) as CommandResult<never>,
  );
  const failure: FailureFactory = <T>(code: ErrorCode, message: string, path: string[]) => {
    const result = spy(code, message, path);
    return result as unknown as CommandResult<T>;
  };
  return { failure, spy };
};

const createRoomPurposeSource = (purposes: RoomPurpose[]): RoomPurposeSource => ({
  listRoomPurposes: () => purposes,
  getRoomPurpose: (id: string) => purposes.find((purpose) => purpose.id === id),
});

const createHarness = (overrides: Partial<RoomServiceDependencies> = {}) => {
  const state = overrides.state ?? createBaseState();
  const failureHarness = createFailureHarness();
  const dependencies: RoomServiceDependencies = {
    state,
    costAccounting: overrides.costAccounting ?? ({} as CostAccountingService),
    repository: overrides.repository ?? ({} as BlueprintRepository),
    createId: overrides.createId ?? ((prefix) => `${prefix}-generated`),
    roomPurposeSource: overrides.roomPurposeSource,
    zoneService:
      overrides.zoneService ??
      ({
        cloneZone: vi.fn(),
      } satisfies Pick<RoomServiceDependencies['zoneService'], 'cloneZone'>),
    failure: overrides.failure ?? failureHarness.failure,
  } satisfies RoomServiceDependencies;

  const service = createRoomService(dependencies);

  return {
    service,
    state,
    dependencies,
    failureSpy: overrides.failure ? undefined : failureHarness.spy,
  } satisfies {
    service: RoomService;
    state: GameState;
    dependencies: RoomServiceDependencies;
    failureSpy?: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  validateStructureGeometrySpy.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('roomService', () => {
  describe('createRoom', () => {
    it('creates a room, resolves the purpose, validates geometry, and emits an event', () => {
      const purposes: RoomPurpose[] = [
        { id: 'purpose-grow', kind: 'growroom', name: 'Grow Room' },
        { id: 'purpose-dry', kind: 'dryroom', name: 'Dry Room' },
      ];
      const harness = createHarness({
        roomPurposeSource: createRoomPurposeSource(purposes),
      });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 21);

      const result = harness.service.createRoom(
        {
          structureId: 'structure-alpha',
          room: { name: '  Flower Bay  ', purpose: 'Grow Room', area: 24 },
        },
        context,
      );

      expect(result).toEqual({ ok: true, data: { roomId: 'room-generated' } });

      const structure = harness.state.structures[0];
      expect(structure.rooms).toHaveLength(3);
      const created = structure.rooms.at(-1);
      expect(created).toBeDefined();
      expect(created).toMatchObject({
        id: 'room-generated',
        name: 'Flower Bay',
        purposeId: 'purpose-grow',
        area: 24,
        height: 2.5,
        volume: 60,
      });
      expect(validateStructureGeometrySpy).toHaveBeenCalledWith(structure);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'world.roomCreated',
        payload: { roomId: 'room-generated', structureId: 'structure-alpha', name: 'Flower Bay' },
        tick: 21,
        level: 'info',
      });
    });

    it('fails when the structure is unknown', () => {
      const purposes: RoomPurpose[] = [{ id: 'purpose-grow', kind: 'growroom', name: 'Grow Room' }];
      const harness = createHarness({
        roomPurposeSource: createRoomPurposeSource(purposes),
      });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events);

      const result = harness.service.createRoom(
        {
          structureId: 'structure-missing',
          room: { name: 'Propagation 2', purpose: 'Grow Room', area: 16 },
        },
        context,
      );

      expect(result).toEqual({
        ok: false,
        errors: [
          {
            code: 'ERR_NOT_FOUND',
            message: expect.stringContaining('Structure'),
            path: ['world.createRoom', 'structureId'],
          },
        ],
      });
      expect(harness.failureSpy).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        'Structure structure-missing was not found.',
        ['world.createRoom', 'structureId'],
      );
      expect(events).toHaveLength(0);
    });

    it('fails when the room purpose cannot be resolved', () => {
      const harness = createHarness({
        roomPurposeSource: createRoomPurposeSource([
          { id: 'purpose-grow', kind: 'growroom', name: 'Grow Room' },
        ]),
      });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events);

      const result = harness.service.createRoom(
        {
          structureId: 'structure-alpha',
          room: { name: 'Propagation 2', purpose: 'Unknown Purpose', area: 12 },
        },
        context,
      );

      expect(result).toEqual({
        ok: false,
        errors: [
          {
            code: 'ERR_NOT_FOUND',
            message: 'Unknown room purpose: Unknown Purpose',
            path: ['world.createRoom', 'room.purpose'],
          },
        ],
      });
      expect(harness.failureSpy).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        'Unknown room purpose: Unknown Purpose',
        ['world.createRoom', 'room.purpose'],
      );
      expect(harness.state.structures[0].rooms).toHaveLength(2);
    });

    it('fails when adding the room would exceed the structure footprint area', () => {
      const harness = createHarness({
        roomPurposeSource: createRoomPurposeSource([
          { id: 'purpose-grow', kind: 'growroom', name: 'Grow Room' },
        ]),
        state: createBaseState(),
      });
      harness.state.structures[0].footprint.area = 40;
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events);

      const result = harness.service.createRoom(
        {
          structureId: 'structure-alpha',
          room: { name: 'Overflow', purpose: 'Grow Room', area: 12 },
        },
        context,
      );

      expect(result).toEqual({
        ok: false,
        errors: [
          {
            code: 'ERR_CONFLICT',
            message: 'Adding the room would exceed the structure footprint area.',
            path: ['world.createRoom', 'room.area'],
          },
        ],
      });
      expect(harness.failureSpy).toHaveBeenCalledWith(
        'ERR_CONFLICT',
        'Adding the room would exceed the structure footprint area.',
        ['world.createRoom', 'room.area'],
      );
      expect(harness.state.structures[0].rooms).toHaveLength(2);
      expect(events).toHaveLength(0);
    });
  });

  describe('cloneRoom', () => {
    it('clones room zones, aggregates device purchases, and applies forced names', () => {
      const cloneZone = vi
        .fn<
          Parameters<RoomServiceDependencies['zoneService']['cloneZone']>,
          ReturnType<RoomServiceDependencies['zoneService']['cloneZone']>
        >()
        .mockImplementation((zone, structureId, roomId, _context, options) => {
          const purchases: DevicePurchaseMap = new Map();
          if (zone.id === 'zone-a') {
            purchases.set('device-lamp', 2);
            purchases.set('device-hvac', 1);
          } else {
            purchases.set('device-hvac', 3);
            purchases.set('device-sensor', 4);
          }
          return {
            zone: {
              ...zone,
              id: `${zone.id}-clone`,
              roomId,
              name: options?.forcedName ?? `${zone.name} Copy`,
            },
            purchases,
          };
        });

      const room: RoomState = {
        id: 'room-source',
        structureId: 'structure-alpha',
        name: 'Source Room',
        purposeId: 'purpose-grow',
        area: 24,
        height: 3,
        volume: 72,
        cleanliness: 0.9,
        maintenanceLevel: 0.95,
        zones: [
          createZone({ id: 'zone-a', roomId: 'room-source', name: 'Zone A', area: 12 }),
          createZone({ id: 'zone-b', roomId: 'room-source', name: 'Zone B', area: 12 }),
        ],
      } satisfies RoomState;

      const harness = createHarness({
        zoneService: { cloneZone },
      });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 33);

      const result = harness.service.cloneRoom(room, 'structure-beta', context, {
        forcedName: 'Mirror Room',
        recordPurchases: true,
      });

      expect(cloneZone).toHaveBeenCalledTimes(2);
      expect(cloneZone).toHaveBeenNthCalledWith(
        1,
        room.zones[0],
        'structure-beta',
        'room-generated',
        context,
        { forcedName: 'Zone A', recordPurchases: true },
      );
      expect(cloneZone).toHaveBeenNthCalledWith(
        2,
        room.zones[1],
        'structure-beta',
        'room-generated',
        context,
        { forcedName: 'Zone B', recordPurchases: true },
      );

      expect(result.room).toMatchObject({
        id: 'room-generated',
        structureId: 'structure-beta',
        name: 'Mirror Room',
        purposeId: 'purpose-grow',
        area: 24,
        height: 3,
        volume: 72,
        cleanliness: 0.9,
        maintenanceLevel: 0.95,
      });
      expect(result.room.zones).toHaveLength(2);
      expect(Array.from(result.purchases.entries())).toEqual([
        ['device-lamp', 2],
        ['device-hvac', 4],
        ['device-sensor', 4],
      ]);
    });
  });

  describe('duplicateRoom', () => {
    it('duplicates an existing room, derives a copy name, emits an event, and tracks purchases', () => {
      const aggregated = new Map<string, number>();
      const cloneZone = vi
        .fn<
          Parameters<RoomServiceDependencies['zoneService']['cloneZone']>,
          ReturnType<RoomServiceDependencies['zoneService']['cloneZone']>
        >()
        .mockImplementation((zone, structureId, roomId, context, options) => {
          void context;
          const purchases: DevicePurchaseMap = new Map([
            ['device-lamp', zone.id === 'room-alpha-zone' ? 1 : 0],
            ['device-hvac', 2],
          ]);
          for (const [blueprintId, quantity] of purchases.entries()) {
            aggregated.set(blueprintId, (aggregated.get(blueprintId) ?? 0) + quantity);
          }
          return {
            zone: {
              ...zone,
              id: `${zone.id}-duplicate`,
              roomId,
              name: options?.forcedName ?? `${zone.name} Copy`,
            },
            purchases,
          };
        });

      const harness = createHarness({ zoneService: { cloneZone } });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 50);
      const result = harness.service.duplicateRoom('room-alpha', undefined, context);

      expect(result).toEqual({ ok: true, data: { roomId: 'room-generated' } });

      const structure = harness.state.structures[0];
      expect(structure.rooms).toHaveLength(3);
      const duplicated = structure.rooms.at(-1);
      expect(duplicated).toBeDefined();
      expect(duplicated).toMatchObject({
        id: 'room-generated',
        name: 'Propagation Bay Copy',
        purposeId: 'purpose-grow',
        area: 36,
      });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'world.roomDuplicated',
        payload: {
          roomId: 'room-generated',
          sourceRoomId: 'room-alpha',
          structureId: 'structure-alpha',
        },
        tick: 50,
        level: 'info',
      });
      expect(validateStructureGeometrySpy).toHaveBeenCalledWith(structure);
      expect(cloneZone).toHaveBeenCalledTimes(1);
      expect(cloneZone).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'room-alpha-zone' }),
        'structure-alpha',
        'room-generated',
        context,
        { forcedName: undefined, recordPurchases: true },
      );
      expect(Array.from(aggregated.entries())).toEqual([
        ['device-lamp', 1],
        ['device-hvac', 2],
      ]);
    });

    it('uses a trimmed desired name when provided', () => {
      const cloneZone = vi
        .fn<
          Parameters<RoomServiceDependencies['zoneService']['cloneZone']>,
          ReturnType<RoomServiceDependencies['zoneService']['cloneZone']>
        >()
        .mockImplementation((zone, structureId, roomId, context, options) => ({
          zone: {
            ...zone,
            id: `${zone.id}-duplicate`,
            roomId,
            name: options?.forcedName ?? zone.name,
          },
          purchases: new Map(),
        }));

      const harness = createHarness({ zoneService: { cloneZone } });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events);

      const result = harness.service.duplicateRoom('room-beta', '   Custom Copy Name   ', context);

      expect(result).toEqual({ ok: true, data: { roomId: 'room-generated' } });
      const structure = harness.state.structures[0];
      const duplicated = structure.rooms.at(-1);
      expect(duplicated).toBeDefined();
      expect(duplicated?.name).toBe('Custom Copy Name');
    });

    it('fails when duplicating would exceed the structure footprint area', () => {
      const cloneZone = vi.fn();
      const state = createBaseState();
      state.structures[0].footprint.area = 54; // existing rooms total 54 m²
      const harness = createHarness({ zoneService: { cloneZone }, state });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events);

      const result = harness.service.duplicateRoom('room-alpha', undefined, context);

      expect(result).toEqual({
        ok: false,
        errors: [
          {
            code: 'ERR_CONFLICT',
            message: 'Duplicating the room would exceed the structure footprint.',
            path: ['world.duplicateRoom', 'roomId'],
          },
        ],
      });
      expect(harness.dependencies.zoneService.cloneZone).not.toHaveBeenCalled();
      expect(events).toHaveLength(0);
    });

    it('fails when the room cannot be found', () => {
      const cloneZone = vi.fn();
      const harness = createHarness({ zoneService: { cloneZone } });
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events);

      const result = harness.service.duplicateRoom('room-missing', undefined, context);

      expect(result).toEqual({
        ok: false,
        errors: [
          {
            code: 'ERR_NOT_FOUND',
            message: 'Room room-missing was not found.',
            path: ['world.duplicateRoom', 'roomId'],
          },
        ],
      });
      expect(harness.dependencies.zoneService.cloneZone).not.toHaveBeenCalled();
    });
  });
});
