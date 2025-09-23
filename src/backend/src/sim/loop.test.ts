import { beforeAll, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@/lib/eventBus.js';
import { resolveRoomPurposeId } from '@/engine/roomPurposes/index.js';
import { loadTestRoomPurposes } from '@/testing/loadTestRoomPurposes.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type {
  DeviceInstanceState,
  GameState,
  StructureState,
  ZoneEnvironmentState,
  ZoneHealthState,
  ZoneMetricState,
  ZoneResourceState,
  ZoneState,
} from '@/state/models.js';
import { SimulationLoop, TICK_PHASES, type SimulationPhaseContext } from './loop.js';

const createGameState = (): GameState => {
  const createdAt = new Date().toISOString();
  return {
    metadata: {
      gameId: 'game-1',
      createdAt,
      seed: 'seed',
      difficulty: 'easy',
      simulationVersion: '0.0.0',
      tickLengthMinutes: 60,
      economics: {
        initialCapital: 0,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0,
        rentPerSqmRoomPerTick: 0,
      },
    },
    clock: {
      tick: 0,
      isPaused: false,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [],
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
    },
    personnel: {
      employees: [],
      applicants: [],
      trainingPrograms: [],
      overallMorale: 0,
    },
    tasks: {
      backlog: [],
      active: [],
      completed: [],
      cancelled: [],
    },
    notes: [],
  };
};

const createGameStateWithZone = (): GameState => {
  const state = createGameState();
  state.metadata.tickLengthMinutes = 15;

  const environment: ZoneEnvironmentState = {
    temperature: 25,
    relativeHumidity: 0.65,
    co2: 800,
    ppfd: 0,
    vpd: 1,
  };

  const createDevice = (
    id: string,
    kind: string,
    settings: Record<string, unknown>,
    efficiency = 1,
  ): DeviceInstanceState => ({
    id,
    blueprintId: `${kind}-blueprint`,
    kind,
    name: `${kind} Device`,
    zoneId: 'zone-1',
    status: 'operational',
    efficiency,
    runtimeHours: 0,
    maintenance: {
      lastServiceTick: 0,
      nextDueTick: 1000,
      condition: 1,
      runtimeHoursAtLastService: 0,
      degradation: 0,
    },
    settings,
  });

  const zone: ZoneState = {
    id: 'zone-1',
    roomId: 'room-1',
    name: 'Zone 1',
    cultivationMethodId: 'method-1',
    strainId: 'strain-1',
    area: 40,
    ceilingHeight: 3,
    volume: 120,
    environment,
    resources: {
      waterLiters: 500,
      nutrientSolutionLiters: 250,
      nutrientStrength: 1,
      substrateHealth: 1,
      reservoirLevel: 0.6,
    } satisfies ZoneResourceState,
    plants: [],
    devices: [
      createDevice(
        'lamp-1',
        'Lamp',
        {
          power: 0.6,
          heatFraction: 0.3,
          coverageArea: 1.2,
          ppfd: 800,
        },
        0.9,
      ),
      createDevice(
        'hvac-1',
        'ClimateUnit',
        {
          coolingCapacity: 1.6,
          airflow: 350,
          targetTemperature: 24,
          targetTemperatureRange: [23, 25],
          fullPowerAtDeltaK: 2,
        },
        0.9,
      ),
      createDevice('co2-1', 'CO2Injector', {
        targetCO2: 1100,
        targetCO2Range: [400, 1500],
        hysteresis: 50,
        pulsePpmPerTick: 150,
      }),
    ],
    metrics: {
      averageTemperature: environment.temperature,
      averageHumidity: environment.relativeHumidity,
      averageCo2: environment.co2,
      averagePpfd: environment.ppfd,
      stressLevel: 0.2,
      lastUpdatedTick: 0,
    } satisfies ZoneMetricState,
    health: {
      plantHealth: {},
      pendingTreatments: [],
      appliedTreatments: [],
    } satisfies ZoneHealthState,
    activeTaskIds: [],
  } satisfies ZoneState;

  const room: StructureState['rooms'][number] = {
    id: 'room-1',
    structureId: 'structure-1',
    name: 'Grow Room',
    purposeId: growRoomPurposeId,
    area: 40,
    height: 3,
    volume: 120,
    zones: [zone],
    cleanliness: 0.9,
    maintenanceLevel: 0.9,
  };

  const structure: StructureState = {
    id: 'structure-1',
    blueprintId: 'structure-blueprint',
    name: 'Structure One',
    status: 'active',
    footprint: {
      length: 10,
      width: 4,
      height: 3,
      area: 40,
      volume: 120,
    },
    rooms: [room],
    rentPerTick: 0,
    upfrontCostPaid: 0,
  };

  state.structures = [structure];
  return state;
};

let growRoomPurposeId: string;
let repository: BlueprintRepository;

beforeAll(async () => {
  repository = await loadTestRoomPurposes();
  growRoomPurposeId = resolveRoomPurposeId(repository, 'Grow Room');
});

describe('SimulationLoop', () => {
  it('executes phases in order and emits events after commit', async () => {
    const state = createGameState();
    const bus = new EventBus();
    const executed: string[] = [];
    const loop = new SimulationLoop({
      state,
      eventBus: bus,
      phases: {
        applyDevices: (ctx) => {
          executed.push(ctx.phase);
          ctx.events.queue('device.applied', undefined, ctx.tick, 'info');
        },
        deriveEnvironment: (ctx) => executed.push(ctx.phase),
        irrigationAndNutrients: (ctx) => {
          executed.push(ctx.phase);
          ctx.events.queue('env.irrigated', { liters: 10 }, ctx.tick);
        },
        updatePlants: (ctx) => executed.push(ctx.phase),
        harvestAndInventory: (ctx) => executed.push(ctx.phase),
        accounting: (ctx) => executed.push(ctx.phase),
        commit: (ctx) => executed.push(ctx.phase),
      },
    });

    const received: string[] = [];
    const subscription = bus.events().subscribe((event) => received.push(event.type));

    const result = await loop.processTick();

    expect(executed).toEqual(TICK_PHASES);
    expect(state.clock.tick).toBe(1);
    expect(result.events.map((event) => event.type)).toEqual(['device.applied', 'env.irrigated']);
    expect(received).toEqual(['device.applied', 'env.irrigated', 'sim.tickCompleted']);

    subscription.unsubscribe();
  });

  it('increments tick numbers across multiple runs', async () => {
    const state = createGameState();
    const bus = new EventBus();
    const loop = new SimulationLoop({
      state,
      eventBus: bus,
      phases: {
        applyDevices: (ctx: SimulationPhaseContext) => {
          ctx.events.queue('phase.entered', { phase: ctx.phase, tick: ctx.tick }, ctx.tick);
        },
      },
    });

    const ticks: number[] = [];
    const subscription = bus.events({ type: 'phase.entered' }).subscribe((event) => {
      if (event.tick !== undefined) {
        ticks.push(event.tick);
      }
    });

    const first = await loop.processTick();
    const second = await loop.processTick();

    expect(first.tick).toBe(1);
    expect(second.tick).toBe(2);
    expect(state.clock.tick).toBe(2);
    expect(ticks).toEqual([1, 2]);

    subscription.unsubscribe();
  });

  it('normalizes environment when a custom applyDevices handler is provided', async () => {
    const state = createGameStateWithZone();
    const bus = new EventBus();
    const applyDevices = vi.fn((context: SimulationPhaseContext) => {
      // Intentionally empty to override only this phase while recording calls.
      void context;
    });
    const loop = new SimulationLoop({
      state,
      eventBus: bus,
      phases: {
        applyDevices,
      },
    });

    const initialTemperature =
      state.structures[0]?.rooms[0]?.zones[0]?.environment.temperature ?? 0;

    await loop.processTick();

    expect(applyDevices).toHaveBeenCalledTimes(1);

    const zone = state.structures[0]?.rooms[0]?.zones[0];
    expect(zone?.environment.temperature).toBeLessThan(initialTemperature);
    expect(zone?.environment.temperature).toBeCloseTo(24.83, 2);
  });

  it('applies default environment handling when not overridden', async () => {
    const state = createGameStateWithZone();
    const bus = new EventBus();
    const loop = new SimulationLoop({ state, eventBus: bus });

    await loop.processTick();

    const zone = state.structures[0]?.rooms[0]?.zones[0];
    expect(zone?.environment.temperature).toBeCloseTo(24.51, 2);
    expect(zone?.environment.relativeHumidity).toBeCloseTo(0.63, 2);
    expect(zone?.environment.co2).toBeCloseTo(900, 0);
    expect(zone?.environment.ppfd).toBeCloseTo(21.6, 4);
  });
});
