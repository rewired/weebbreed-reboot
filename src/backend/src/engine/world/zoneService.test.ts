import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { CommandExecutionContext, CommandResult, CreateZoneIntent } from '@/facade/index.js';
import {
  createZoneService,
  type FailureFactory,
  type ZoneService,
  type ZoneServiceDependencies,
} from './zoneService.js';
import { createEventCollector, type SimulationEvent } from '@/lib/eventBus.js';
import type {
  DeviceInstanceState,
  FinanceState,
  GameMetadata,
  GameState,
  GlobalInventoryState,
  PersonnelRoster,
  RoomState,
  StructureState,
  TaskSystemState,
  ZoneState,
} from '@/state/types.js';
import {
  createBlueprintRepositoryStub,
  createContainerBlueprint,
  createCultivationMethodBlueprint,
  createSubstrateBlueprint,
} from '@/testing/fixtures.js';
import type { CostAccountingService, TickAccumulator } from '@/engine/economy/costAccounting.js';
import * as geometry from '@/state/geometry.js';
import { createDefaultResources, defaultMaintenanceIntervalTicks } from './worldDefaults.js';

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
    pricePerKwh: 0.15,
    pricePerLiterWater: 0.02,
    pricePerGramNutrients: 0.08,
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
  id: overrides.id ?? 'structure-1',
  blueprintId: overrides.blueprintId ?? 'structure-blueprint-1',
  name: overrides.name ?? 'Structure Alpha',
  status: overrides.status ?? 'active',
  footprint: {
    length: overrides.footprint?.length ?? 12,
    width: overrides.footprint?.width ?? 8,
    height: overrides.footprint?.height ?? 3,
    area: overrides.footprint?.area ?? 96,
    volume: overrides.footprint?.volume ?? 288,
  },
  rooms: overrides.rooms ?? [],
  rentPerTick: overrides.rentPerTick ?? 0,
  upfrontCostPaid: overrides.upfrontCostPaid ?? 0,
  notes: overrides.notes,
});

const createRoom = (overrides: Partial<RoomState> = {}): RoomState => ({
  id: overrides.id ?? 'room-1',
  structureId: overrides.structureId ?? 'structure-1',
  name: overrides.name ?? 'Room Alpha',
  purposeId: overrides.purposeId ?? 'purpose-grow',
  area: overrides.area ?? 60,
  height: overrides.height ?? 3,
  volume: overrides.volume ?? (overrides.area ?? 60) * (overrides.height ?? 3),
  cleanliness: overrides.cleanliness ?? 1,
  maintenanceLevel: overrides.maintenanceLevel ?? 1,
  zones: overrides.zones ?? [],
});

const createDevice = (overrides: Partial<DeviceInstanceState> = {}): DeviceInstanceState => ({
  id: overrides.id ?? 'device-1',
  blueprintId: overrides.blueprintId ?? 'device-blueprint-1',
  kind: overrides.kind ?? 'Lamp',
  name: overrides.name ?? 'Lamp Alpha',
  zoneId: overrides.zoneId ?? 'zone-source',
  status: overrides.status ?? 'operational',
  efficiency: overrides.efficiency ?? 0.95,
  runtimeHours: overrides.runtimeHours ?? 120,
  maintenance: overrides.maintenance ?? {
    lastServiceTick: 0,
    nextDueTick: 1_000,
    condition: 1,
    runtimeHoursAtLastService: 0,
    degradation: 0,
  },
  settings: overrides.settings ?? { power: 0.85, coverageArea: 12 },
});

const createZone = (overrides: Partial<ZoneState> = {}): ZoneState => ({
  id: overrides.id ?? 'zone-1',
  roomId: overrides.roomId ?? 'room-1',
  name: overrides.name ?? 'Zone Alpha',
  cultivationMethodId: overrides.cultivationMethodId ?? 'method-1',
  strainId: overrides.strainId,
  area: overrides.area ?? 24,
  ceilingHeight: overrides.ceilingHeight ?? 3,
  volume: overrides.volume ?? (overrides.area ?? 24) * (overrides.ceilingHeight ?? 3),
  environment:
    overrides.environment ??
    ({
      temperature: 22,
      relativeHumidity: 0.55,
      co2: 800,
      ppfd: 0,
      vpd: 1.1,
    } satisfies ZoneState['environment']),
  resources:
    overrides.resources ??
    ({
      waterLiters: 0,
      nutrientSolutionLiters: 0,
      nutrientStrength: 0,
      substrateHealth: 0,
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
      averageCo2: 800,
      averagePpfd: 0,
      stressLevel: 0,
      lastUpdatedTick: 0,
    } satisfies ZoneState['metrics']),
  control: overrides.control ?? { setpoints: {} },
  lighting: overrides.lighting,
  health:
    overrides.health ??
    ({
      plantHealth: {},
      pendingTreatments: [],
      appliedTreatments: [],
    } satisfies ZoneState['health']),
  activeTaskIds: overrides.activeTaskIds ?? [],
  plantingPlan: overrides.plantingPlan,
  cultivation: overrides.cultivation,
});

const createBaseState = (): GameState => {
  const room = createRoom({ zones: [] });
  const structure = createStructure({ rooms: [room] });
  return {
    metadata: createMetadata(),
    clock: {
      tick: 0,
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
    notes: [],
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

const createIdGenerator = () => {
  const counters = new Map<string, number>();
  return vi.fn((prefix: string) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}-${next}`;
  });
};

interface HarnessOptions {
  state?: GameState;
  repository?: BlueprintRepository;
  createId?: (prefix: string) => string;
  applyAccumulator?: (accumulator: TickAccumulator) => void;
}

interface Harness {
  service: ZoneService;
  state: GameState;
  failure: ReturnType<typeof vi.fn> & FailureFactory;
  repository: BlueprintRepository;
  costAccounting: {
    createAccumulator: ReturnType<typeof vi.fn>;
    recordDevicePurchase: ReturnType<typeof vi.fn>;
  };
  applyAccumulator: ReturnType<typeof vi.fn>;
}

const createHarness = (options: HarnessOptions = {}): Harness => {
  const state = options.state ?? createBaseState();
  const repository = options.repository ?? createBlueprintRepositoryStub();
  const failure = vi.fn(((code, message, path) => ({
    ok: false,
    errors: [
      {
        code,
        message,
        path,
        category: code === 'ERR_INTERNAL' ? 'internal' : 'user',
      },
    ],
  })) as FailureFactory);

  const createAccumulator = vi.fn<[], TickAccumulator>(() => ({
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
  }));
  const recordDevicePurchase = vi.fn();
  const applyAccumulator = (options.applyAccumulator ?? vi.fn()) as ReturnType<typeof vi.fn>;

  const dependencies: ZoneServiceDependencies = {
    state,
    repository,
    costAccounting: { createAccumulator, recordDevicePurchase } as unknown as CostAccountingService,
    createId: options.createId ?? ((prefix) => `${prefix}-generated`),
    applyAccumulator,
    failure,
  };

  const service = createZoneService(dependencies);

  return {
    service,
    state,
    failure,
    repository,
    costAccounting: { createAccumulator, recordDevicePurchase },
    applyAccumulator,
  } satisfies Harness;
};

beforeEach(() => {
  validateStructureGeometrySpy.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  validateStructureGeometrySpy.mockRestore();
});

describe('zoneService', () => {
  describe('createZone', () => {
    it('creates a zone, applies defaults, and reports aggregated costs', () => {
      const method = createCultivationMethodBlueprint({
        id: 'method-hybrid',
        name: 'Hybrid Method',
        compatibleContainerTypes: ['pot'],
        compatibleSubstrateTypes: ['coco'],
      });
      const container = createContainerBlueprint({
        id: 'container-pro',
        slug: 'smart-pot-15l',
        type: 'pot',
        volumeInLiters: 18,
        footprintArea: 0.8,
        packingDensity: 1.1,
      });
      const substrate = createSubstrateBlueprint({
        id: 'substrate-coco',
        slug: 'coco-supreme',
        type: 'coco',
      });

      const repository = createBlueprintRepositoryStub({
        cultivationMethods: [method],
        containers: [container],
        substrates: [substrate],
        cultivationMethodPrices: new Map([[method.id, { setupCost: 720 }]]),
        containerPrices: new Map([[container.slug, { costPerUnit: 9.5 }]]),
        substratePrices: new Map([[substrate.slug, { costPerLiter: 0.35 }]]),
      });

      const state = createBaseState();
      const roomId = state.structures[0].rooms[0].id;
      state.metadata.economics.itemPriceMultiplier = 1.5;
      const createId = createIdGenerator();
      const harness = createHarness({ state, repository, createId });

      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 12);

      const intent: CreateZoneIntent = {
        roomId,
        zone: {
          name: '  Propagation Wing  ',
          area: 24,
          methodId: method.id,
          container: {
            blueprintId: container.id,
            type: container.type,
            count: 12,
          },
          substrate: {
            blueprintId: substrate.id,
            type: substrate.type,
            volumeLiters: undefined,
          },
        },
      };

      const result = harness.service.createZone(intent, context);

      expect(result.ok).toBe(true);
      const expectedMethodCost = 720 * 1.5;
      const expectedContainerCost = 9.5 * 12 * 1.5;
      const requiredVolume = 18 * 12;
      const expectedSubstrateCost = 0.35 * requiredVolume * 1.5;
      expect(result.data).toMatchObject({
        zoneId: 'zone-1',
        method: { blueprintId: method.id, setupCost: expectedMethodCost },
        container: {
          blueprintId: container.id,
          slug: container.slug,
          type: container.type,
          count: 12,
          maxSupported: expect.any(Number),
          unitCost: 9.5,
          totalCost: expectedContainerCost,
        },
        substrate: {
          blueprintId: substrate.id,
          slug: substrate.slug,
          type: substrate.type,
          totalVolumeLiters: requiredVolume,
          unitCost: 0.35,
          totalCost: expectedSubstrateCost,
        },
        totalCost: expectedMethodCost + expectedContainerCost + expectedSubstrateCost,
      });

      const structure = state.structures[0];
      const room = structure.rooms[0];
      expect(room.zones).toHaveLength(1);
      const createdZone = room.zones[0];
      expect(createdZone.id).toBe('zone-1');
      expect(createdZone.name).toBe('Propagation Wing');
      expect(createdZone.environment).toEqual({
        temperature: 22,
        relativeHumidity: 0.6,
        co2: 400,
        ppfd: 0,
        vpd: 1.2,
      });
      expect(createdZone.metrics.lastUpdatedTick).toBe(12);
      expect(createdZone.resources).toEqual(createDefaultResources());
      expect(createdZone.cultivation?.container).toMatchObject({
        blueprintId: container.id,
        slug: container.slug,
        count: 12,
      });
      expect(createdZone.cultivation?.substrate).toMatchObject({
        blueprintId: substrate.id,
        slug: substrate.slug,
        totalVolumeLiters: requiredVolume,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'world.zoneCreated',
        payload: {
          zoneId: 'zone-1',
          roomId,
          container: { slug: container.slug, count: 12 },
          substrate: { slug: substrate.slug, totalVolumeLiters: requiredVolume },
        },
        tick: 12,
      });
      expect(validateStructureGeometrySpy).toHaveBeenCalledWith(structure);
      expect(harness.failure).not.toHaveBeenCalled();
    });

    it('fails when the target room is missing', () => {
      const harness = createHarness();
      const failureResult = { ok: false } as CommandResult;
      harness.failure.mockReturnValueOnce(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 4);

      const intent: CreateZoneIntent = {
        roomId: 'missing-room',
        zone: {
          name: 'Missing Room Zone',
          area: 10,
          methodId: 'method-1',
          container: { blueprintId: 'container-1', type: 'pot', count: 4 },
          substrate: { blueprintId: 'substrate-1', type: 'soil' },
        },
      };

      const result = harness.service.createZone(intent, context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        expect.stringContaining('missing-room'),
        ['world.createZone', 'roomId'],
      );
      expect(events).toHaveLength(0);
      expect(validateStructureGeometrySpy).not.toHaveBeenCalled();
    });

    it('rejects mismatched container blueprints', () => {
      const method = createCultivationMethodBlueprint({
        id: 'method-soil',
        compatibleContainerTypes: ['pot'],
        compatibleSubstrateTypes: ['soil'],
      });
      const container = createContainerBlueprint({ id: 'container-soil', type: 'pot' });
      const substrate = createSubstrateBlueprint({ id: 'substrate-soil', type: 'soil' });
      const repository = createBlueprintRepositoryStub({
        cultivationMethods: [method],
        containers: [container],
        substrates: [substrate],
      });
      const harness = createHarness({ repository });
      const failureResult = { ok: false } as CommandResult;
      harness.failure.mockReturnValueOnce(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 5);

      const intent: CreateZoneIntent = {
        roomId: harness.state.structures[0].rooms[0].id,
        zone: {
          name: 'Bad Container Zone',
          area: 10,
          methodId: method.id,
          container: { blueprintId: container.id, type: 'bag', count: 2 },
          substrate: { blueprintId: substrate.id, type: substrate.type },
        },
      };

      const result = harness.service.createZone(intent, context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_VALIDATION',
        expect.stringContaining('Container type'),
        ['world.createZone', 'zone.container.type'],
      );
      expect(events).toHaveLength(0);
      expect(validateStructureGeometrySpy).not.toHaveBeenCalled();
    });

    it('rejects zones that exceed the available room area', () => {
      const state = createBaseState();
      const room = state.structures[0].rooms[0];
      room.zones.push(
        createZone({
          id: 'zone-existing',
          roomId: room.id,
          area: 40,
          ceilingHeight: room.height,
          volume: 40 * room.height,
        }),
      );
      room.volume = room.area * room.height;
      const harness = createHarness({ state });
      const failureResult = { ok: false } as CommandResult;
      harness.failure.mockReturnValueOnce(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 6);

      const intent: CreateZoneIntent = {
        roomId: room.id,
        zone: {
          name: 'Overflow Zone',
          area: 25,
          methodId: 'method-1',
          container: { blueprintId: 'container-1', type: 'pot', count: 2 },
          substrate: { blueprintId: 'substrate-1', type: 'soil' },
        },
      };

      const result = harness.service.createZone(intent, context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_CONFLICT',
        expect.stringContaining('exceed the room area'),
        ['world.createZone', 'zone.area'],
      );
      expect(events).toHaveLength(0);
      expect(room.zones).toHaveLength(1);
      expect(validateStructureGeometrySpy).not.toHaveBeenCalled();
    });
  });

  describe('cloneZone', () => {
    it('clones devices, resets maintenance, and aggregates purchases', () => {
      const createId = createIdGenerator();
      const harness = createHarness({ createId });
      const state = harness.state;
      const room = state.structures[0].rooms[0];
      const originalZone = createZone({
        id: 'zone-source',
        roomId: room.id,
        name: 'Propagation',
        devices: [
          createDevice({
            id: 'device-a',
            blueprintId: 'lamp-blueprint',
            zoneId: 'zone-source',
            settings: { power: 0.8 },
          }),
          createDevice({
            id: 'device-b',
            blueprintId: 'climate-blueprint',
            kind: 'ClimateUnit',
            zoneId: 'zone-source',
            settings: { airflow: 420 },
          }),
          createDevice({
            id: 'device-c',
            blueprintId: 'lamp-blueprint',
            zoneId: 'zone-source',
            settings: { power: 0.75 },
          }),
        ],
        metrics: {
          averageTemperature: 23,
          averageHumidity: 0.58,
          averageCo2: 820,
          averagePpfd: 500,
          stressLevel: 0.1,
          lastUpdatedTick: 8,
        },
        cultivation: {
          container: {
            blueprintId: 'container-pro',
            slug: 'smart-pot-15l',
            type: 'pot',
            count: 12,
            name: '15L Smart Pot',
          },
          substrate: {
            blueprintId: 'substrate-coco',
            slug: 'coco-supreme',
            type: 'coco',
            totalVolumeLiters: 180,
            name: 'Coco Supreme',
          },
        },
      });
      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 42);

      const { zone: clonedZone, purchases } = harness.service.cloneZone(
        originalZone,
        state.structures[0].id,
        room.id,
        context,
      );

      expect(clonedZone.id).toBe('zone-1');
      expect(clonedZone.roomId).toBe(room.id);
      expect(clonedZone.name).toBe('Propagation Copy');
      expect(clonedZone.devices).toHaveLength(3);
      const [firstDevice, secondDevice] = clonedZone.devices;
      expect(firstDevice.id).toBe('device-1');
      expect(firstDevice.blueprintId).toBe('lamp-blueprint');
      expect(firstDevice.runtimeHours).toBe(0);
      expect(firstDevice.maintenance).toMatchObject({
        lastServiceTick: 42,
        nextDueTick: 42 + defaultMaintenanceIntervalTicks,
        condition: 1,
        runtimeHoursAtLastService: 0,
        degradation: 0,
      });
      expect(firstDevice.settings).toEqual({ power: 0.8 });
      expect(firstDevice.settings).not.toBe(originalZone.devices[0].settings);
      expect(secondDevice.blueprintId).toBe('climate-blueprint');
      expect(secondDevice.id).toBe('device-2');
      expect(clonedZone.metrics).toMatchObject({
        averageTemperature: 23,
        averageHumidity: 0.58,
        averageCo2: 820,
        averagePpfd: 500,
        stressLevel: 0.1,
        lastUpdatedTick: 42,
      });
      expect(clonedZone.resources).toEqual(createDefaultResources());
      expect(clonedZone.health).toEqual({
        plantHealth: {},
        pendingTreatments: [],
        appliedTreatments: [],
      });
      expect(clonedZone.plants).toEqual([]);
      expect(purchases.get('lamp-blueprint')).toBe(2);
      expect(purchases.get('climate-blueprint')).toBe(1);
      expect(harness.costAccounting.recordDevicePurchase).not.toHaveBeenCalled();
    });
  });

  describe('duplicateZone', () => {
    it('duplicates a zone, records purchases, and emits telemetry', () => {
      const createId = createIdGenerator();
      const state = createBaseState();
      const room = state.structures[0].rooms[0];
      const originalZone = createZone({
        id: 'zone-source',
        roomId: room.id,
        name: 'Mother Room',
        area: 24,
        ceilingHeight: room.height,
        volume: 24 * room.height,
        devices: [
          createDevice({ id: 'device-a', blueprintId: 'lamp-blueprint', zoneId: 'zone-source' }),
          createDevice({
            id: 'device-b',
            blueprintId: 'hvac-blueprint',
            kind: 'ClimateUnit',
            zoneId: 'zone-source',
          }),
          createDevice({ id: 'device-c', blueprintId: 'lamp-blueprint', zoneId: 'zone-source' }),
        ],
      });
      room.zones.push(originalZone);

      const harness = createHarness({ state, createId });
      const accumulator = { marker: 'acc' } as unknown as TickAccumulator;
      harness.costAccounting.createAccumulator.mockReturnValue(accumulator);

      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 20);

      const result = harness.service.duplicateZone('zone-source', '  Mother Room Clone  ', context);

      expect(result.ok).toBe(true);
      const structure = state.structures[0];
      expect(validateStructureGeometrySpy).toHaveBeenCalledWith(structure);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'world.zoneDuplicated',
        payload: {
          zoneId: 'zone-1',
          sourceZoneId: 'zone-source',
          roomId: room.id,
          structureId: structure.id,
        },
        tick: 20,
      });

      expect(room.zones).toHaveLength(2);
      const duplicatedZone = room.zones.find((zone) => zone.id === result.data?.zoneId);
      expect(duplicatedZone).toBeDefined();
      expect(duplicatedZone?.name).toBe('Mother Room Clone');
      expect(duplicatedZone?.devices.map((device) => device.id)).toEqual([
        'device-1',
        'device-2',
        'device-3',
      ]);

      expect(harness.costAccounting.createAccumulator).toHaveBeenCalledTimes(1);
      expect(harness.costAccounting.recordDevicePurchase).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = harness.costAccounting.recordDevicePurchase.mock.calls;
      expect(firstCall).toMatchObject([
        state,
        'lamp-blueprint',
        2,
        20,
        expect.any(String),
        accumulator,
        context.events,
        expect.stringContaining('Zone duplication'),
      ]);
      expect(secondCall).toMatchObject([
        state,
        'hvac-blueprint',
        1,
        20,
        expect.any(String),
        accumulator,
        context.events,
        expect.stringContaining('Zone duplication'),
      ]);
      expect(harness.applyAccumulator).toHaveBeenCalledTimes(1);
      expect(harness.applyAccumulator).toHaveBeenCalledWith(accumulator);
      expect(harness.failure).not.toHaveBeenCalled();
    });

    it('fails when the source zone is not found', () => {
      const harness = createHarness();
      const failureResult = { ok: false } as CommandResult;
      harness.failure.mockReturnValueOnce(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(harness.state, events, 15);

      const result = harness.service.duplicateZone('missing-zone', undefined, context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_NOT_FOUND',
        expect.stringContaining('missing-zone'),
        ['world.duplicateZone', 'zoneId'],
      );
      expect(events).toHaveLength(0);
      expect(validateStructureGeometrySpy).not.toHaveBeenCalled();
    });

    it('fails when duplicating the zone would exceed room area', () => {
      const state = createBaseState();
      const room = state.structures[0].rooms[0];
      const originalZone = createZone({
        id: 'zone-source',
        roomId: room.id,
        name: 'Dense Zone',
        area: room.area,
        ceilingHeight: room.height,
        volume: room.area * room.height,
      });
      room.zones.push(originalZone);

      const harness = createHarness({ state });
      const failureResult = { ok: false } as CommandResult;
      harness.failure.mockReturnValueOnce(failureResult);
      const events: SimulationEvent[] = [];
      const context = createContext(state, events, 30);

      const result = harness.service.duplicateZone('zone-source', undefined, context);

      expect(result).toBe(failureResult);
      expect(harness.failure).toHaveBeenCalledWith(
        'ERR_CONFLICT',
        expect.stringContaining('exceed the room area'),
        ['world.duplicateZone', 'zoneId'],
      );
      expect(events).toHaveLength(0);
      expect(room.zones).toHaveLength(1);
      expect(validateStructureGeometrySpy).not.toHaveBeenCalled();
    });
  });
});
