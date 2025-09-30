import { beforeEach, describe, expect, it } from 'vitest';
import { createEventCollector } from '@/lib/eventBus.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import { RngService } from '@/lib/rng.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import { createZoneService, type ZoneService, type FailureFactory } from './zoneService.js';
import { generateId } from '@/state/initialization/common.js';
import {
  createBlueprintRepositoryStub,
  createContainerBlueprint,
  createCultivationMethodBlueprint,
  createSubstrateBlueprint,
} from '@/testing/fixtures.js';
import { createError } from '@/facade/index.js';
import type { CommandExecutionContext } from '@/facade/index.js';
import type { GameState } from '@/state/types.js';

const STRUCTURE_ID = 'structure-test';
const ROOM_ID = 'room-test';
const ZONE_ID = 'zone-test';

const METHOD_ALPHA_ID = 'method-alpha';
const METHOD_BETA_ID = 'method-beta';
const METHOD_GAMMA_ID = 'method-gamma';
const METHOD_DELTA_ID = 'method-delta';

const CONTAINER_ALPHA_ID = 'container-alpha';
const CONTAINER_BETA_ID = 'container-beta';
const CONTAINER_GAMMA_ID = 'container-gamma';
const CONTAINER_DELTA_ID = 'container-delta';

const SUBSTRATE_ALPHA_ID = 'substrate-alpha';
const SUBSTRATE_BETA_ID = 'substrate-beta';
const SUBSTRATE_GAMMA_ID = 'substrate-gamma';

const createBaseState = (): GameState => {
  const createdAt = new Date(0).toISOString();
  return {
    metadata: {
      gameId: 'game-test',
      createdAt,
      seed: 'seed-test',
      difficulty: 'normal',
      simulationVersion: '1.0.0-test',
      tickLengthMinutes: 30,
      economics: {
        initialCapital: 1_000_000,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.1,
        rentPerSqmRoomPerTick: 0.2,
      },
    },
    clock: {
      tick: 0,
      isPaused: true,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [
      {
        id: STRUCTURE_ID,
        blueprintId: 'structure-blueprint-test',
        name: 'Test Structure',
        status: 'active',
        footprint: { length: 12, width: 8, height: 3, area: 96, volume: 288 },
        rooms: [
          {
            id: ROOM_ID,
            structureId: STRUCTURE_ID,
            name: 'Room Test',
            purposeId: 'room-purpose-test',
            area: 60,
            height: 3,
            volume: 180,
            cleanliness: 1,
            maintenanceLevel: 1,
            zones: [
              {
                id: ZONE_ID,
                roomId: ROOM_ID,
                name: 'Zone Test',
                cultivationMethodId: METHOD_ALPHA_ID,
                strainId: 'strain-test',
                area: 24,
                ceilingHeight: 3,
                volume: 72,
                environment: {
                  temperature: 22,
                  relativeHumidity: 0.55,
                  co2: 800,
                  ppfd: 0,
                  vpd: 1.1,
                },
                resources: {
                  waterLiters: 100,
                  nutrientSolutionLiters: 50,
                  nutrientStrength: 1,
                  substrateHealth: 1,
                  reservoirLevel: 0.5,
                  lastTranspirationLiters: 0,
                },
                plants: [],
                devices: [],
                metrics: {
                  averageTemperature: 22,
                  averageHumidity: 0.55,
                  averageCo2: 800,
                  averagePpfd: 0,
                  stressLevel: 0,
                  lastUpdatedTick: 0,
                },
                control: { setpoints: {} },
                health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
                activeTaskIds: [],
                cultivation: {
                  container: {
                    blueprintId: CONTAINER_ALPHA_ID,
                    slug: 'pot-10l',
                    type: 'pot',
                    count: 12,
                    name: '10 L Pot',
                  },
                  substrate: {
                    blueprintId: SUBSTRATE_ALPHA_ID,
                    slug: 'soil-single-cycle',
                    type: 'soil',
                    totalVolumeLiters: 120,
                    name: 'Single-Cycle Soil Mix',
                  },
                },
              },
            ],
          },
        ],
        rentPerTick: 0,
        upfrontCostPaid: 0,
      },
    ],
    inventory: {
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
    },
    finances: {
      cashOnHand: 0,
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
        pricePerKwh: 0.1,
        pricePerLiterWater: 0.01,
        pricePerGramNutrients: 0.05,
      },
    },
    personnel: { employees: [], applicants: [], trainingPrograms: [], overallMorale: 1 },
    tasks: { backlog: [], active: [], completed: [], cancelled: [] },
    notes: [],
  } satisfies GameState;
};

const createRepository = () => {
  const methodAlpha = createCultivationMethodBlueprint({
    id: METHOD_ALPHA_ID,
    name: 'Method Alpha',
    compatibleContainerTypes: ['pot'],
    compatibleSubstrateTypes: ['soil'],
    meta: {
      defaults: {
        containerSlug: 'pot-10l',
        substrateSlug: 'soil-single-cycle',
      },
    },
  });
  const methodBeta = createCultivationMethodBlueprint({
    id: METHOD_BETA_ID,
    name: 'Method Beta',
    compatibleContainerTypes: ['pot'],
    compatibleSubstrateTypes: ['soil'],
    meta: {
      defaults: {
        containerSlug: 'pot-10l',
        substrateSlug: 'soil-single-cycle',
      },
    },
  });
  const methodGamma = createCultivationMethodBlueprint({
    id: METHOD_GAMMA_ID,
    name: 'Method Gamma',
    compatibleContainerTypes: ['trough'],
    compatibleSubstrateTypes: ['coco'],
  });
  const methodDelta = createCultivationMethodBlueprint({
    id: METHOD_DELTA_ID,
    name: 'Method Delta',
    compatibleContainerTypes: ['pot'],
    compatibleSubstrateTypes: ['soil'],
    meta: {
      defaults: {
        containerSlug: 'pot-25l',
        substrateSlug: 'soil-multi-cycle',
      },
    },
  });

  const containerAlpha = createContainerBlueprint({
    id: CONTAINER_ALPHA_ID,
    slug: 'pot-10l',
    name: '10 L Pot',
    volumeInLiters: 10,
    footprintArea: 0.25,
    type: 'pot',
  });
  const containerBeta = createContainerBlueprint({
    id: CONTAINER_BETA_ID,
    slug: 'pot-11l',
    name: '11 L Pot',
    volumeInLiters: 11,
    footprintArea: 0.2,
    type: 'pot',
  });
  const containerGamma = createContainerBlueprint({
    id: CONTAINER_GAMMA_ID,
    slug: 'pot-25l',
    name: '25 L Pot',
    volumeInLiters: 25,
    footprintArea: 0.3,
    type: 'pot',
  });
  const containerDelta = createContainerBlueprint({
    id: CONTAINER_DELTA_ID,
    slug: 'ebb-flow-table',
    name: 'Ebb Flow Table',
    volumeInLiters: 40,
    footprintArea: 2,
    type: 'ebbFlowTable',
    packingDensity: 1,
  });

  const substrateAlpha = createSubstrateBlueprint({
    id: SUBSTRATE_ALPHA_ID,
    slug: 'soil-single-cycle',
    name: 'Single-Cycle Soil Mix',
    type: 'soil',
  });
  const substrateBeta = createSubstrateBlueprint({
    id: SUBSTRATE_BETA_ID,
    slug: 'soil-multi-cycle',
    name: 'Multi-Cycle Soil Mix',
    type: 'soil',
  });
  const substrateGamma = createSubstrateBlueprint({
    id: SUBSTRATE_GAMMA_ID,
    slug: 'coco-coir',
    name: 'Coco Coir',
    type: 'coco',
  });

  return createBlueprintRepositoryStub({
    cultivationMethods: [methodAlpha, methodBeta, methodGamma, methodDelta],
    containers: [containerAlpha, containerBeta, containerGamma, containerDelta],
    substrates: [substrateAlpha, substrateBeta, substrateGamma],
  });
};

const createCostAccounting = () =>
  new CostAccountingService({
    devicePrices: new Map(),
    strainPrices: new Map(),
    utilityPrices: { pricePerKwh: 0.1, pricePerLiterWater: 0.01, pricePerGramNutrients: 0.05 },
  });

const createContext = (state: GameState): CommandExecutionContext => {
  const buffer: SimulationEvent[] = [];
  const collector = createEventCollector(buffer, state.clock.tick);
  return {
    command: 'world.updateZone',
    state,
    clock: state.clock,
    tick: state.clock.tick,
    events: Object.assign(collector, {
      flush: () => {
        const events = [...buffer];
        buffer.length = 0;
        return events;
      },
    }),
  } satisfies CommandExecutionContext;
};

describe('ZoneService.updateZone', () => {
  let state: GameState;
  let zoneService: ZoneService;

  beforeEach(() => {
    state = createBaseState();
    const repository = createRepository();
    const rng = new RngService('world-update-zone-tests');
    const costAccounting = createCostAccounting();
    const idStream = rng.getStream('world.structures');
    const createId = (prefix: string) => generateId(idStream, prefix);
    const applyAccumulator = (
      accumulator: ReturnType<CostAccountingService['createAccumulator']>,
    ) => {
      const summary = state.finances.summary;
      summary.totalRevenue += accumulator.revenue;
      summary.totalExpenses += accumulator.expenses;
      summary.totalMaintenance += accumulator.maintenance;
      summary.totalPayroll += accumulator.payroll;
      summary.lastTickRevenue = accumulator.revenue;
      summary.lastTickExpenses = accumulator.expenses;
      summary.netIncome = summary.totalRevenue - summary.totalExpenses;
    };
    const failure: FailureFactory = (code, message, path) => ({
      ok: false as const,
      errors: [createError(code, message, path)],
    });

    zoneService = createZoneService({
      state,
      repository,
      costAccounting,
      createId,
      applyAccumulator,
      failure,
    });
  });

  it('updates the cultivation method and emits an event when compatible', () => {
    const context = createContext(state);
    const result = zoneService.updateZone(
      { zoneId: ZONE_ID, patch: { methodId: METHOD_BETA_ID } },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.warnings).toBeUndefined();

    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.cultivationMethodId).toBe(METHOD_BETA_ID);
    expect(zone.cultivation?.container?.slug).toBe('pot-10l');
    expect(zone.cultivation?.container?.name).toBe('10 L Pot');
    expect(zone.cultivation?.substrate?.slug).toBe('soil-single-cycle');

    const events = context.events.flush();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'world.zoneUpdated',
      payload: expect.objectContaining({
        zoneId: ZONE_ID,
        methodId: METHOD_BETA_ID,
      }),
      level: 'info',
    });
  });

  it('rejects method updates that conflict with existing container type', () => {
    const context = createContext(state);
    const result = zoneService.updateZone(
      { zoneId: ZONE_ID, patch: { methodId: METHOD_GAMMA_ID } },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.cultivationMethodId).toBe(METHOD_ALPHA_ID);
  });

  it('returns storage warnings when defaults swap container and substrate blueprints', () => {
    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    if (zone.cultivation?.container) {
      zone.cultivation.container.count = 8;
    }

    const context = createContext(state);
    const result = zoneService.updateZone(
      { zoneId: ZONE_ID, patch: { methodId: METHOD_DELTA_ID } },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('containers were moved to storage'),
        expect.stringContaining('substrate was routed to storage'),
      ]),
    );

    const updated = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(updated.cultivation?.container?.slug).toBe('pot-25l');
    expect(updated.cultivation?.substrate?.slug).toBe('soil-multi-cycle');
    const totalVolume = updated.cultivation?.substrate?.totalVolumeLiters ?? 0;
    expect(totalVolume).toBeCloseTo(200, 5);
  });

  it('updates container and substrate consumables while clamping count to capacity', () => {
    const context = createContext(state);
    const result = zoneService.updateZone(
      {
        zoneId: ZONE_ID,
        patch: {
          container: { blueprintId: CONTAINER_BETA_ID, type: 'pot', count: 150 },
          substrate: { blueprintId: SUBSTRATE_BETA_ID, type: 'soil' },
        },
      },
      context,
    );

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'Container count has been clamped to 108 to fit the zone capacity (108).',
      ]),
    );

    const zone = state.structures[0]!.rooms[0]!.zones[0]!;
    expect(zone.cultivation?.container?.blueprintId).toBe(CONTAINER_BETA_ID);
    expect(zone.cultivation?.container?.count).toBe(108);
    expect(zone.cultivation?.substrate?.blueprintId).toBe(SUBSTRATE_BETA_ID);
    expect(zone.cultivation?.substrate?.totalVolumeLiters).toBeCloseTo(1188, 5);

    const events = context.events.flush();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'world.zoneUpdated',
      payload: expect.objectContaining({
        container: { slug: 'pot-11l', count: 108 },
        substrate: { slug: 'soil-multi-cycle', totalVolumeLiters: 1188 },
      }),
    });
  });

  it('rejects container updates when the zone cannot support the footprint', () => {
    const context = createContext(state);
    const result = zoneService.updateZone(
      {
        zoneId: ZONE_ID,
        patch: {
          area: 0.1,
          container: { blueprintId: CONTAINER_GAMMA_ID, type: 'pot', count: 1 },
          substrate: { blueprintId: SUBSTRATE_BETA_ID, type: 'soil' },
        },
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
    expect(result.errors?.[0]?.path).toEqual(['world.updateZone', 'patch.container.count']);
  });

  it('rejects container updates that are incompatible with the cultivation method', () => {
    const context = createContext(state);
    const result = zoneService.updateZone(
      {
        zoneId: ZONE_ID,
        patch: {
          container: { blueprintId: CONTAINER_DELTA_ID, type: 'ebbFlowTable', count: 2 },
        },
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
    expect(result.errors?.[0]?.path).toEqual(['world.updateZone', 'patch.container.type']);
  });

  it('rejects substrate updates that conflict with the cultivation method', () => {
    const context = createContext(state);
    const result = zoneService.updateZone(
      {
        zoneId: ZONE_ID,
        patch: {
          substrate: { blueprintId: SUBSTRATE_GAMMA_ID, type: 'coco' },
        },
      },
      context,
    );

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]?.code).toBe('ERR_INVALID_STATE');
    expect(result.errors?.[0]?.path).toEqual(['world.updateZone', 'patch.substrate.type']);
  });
});
