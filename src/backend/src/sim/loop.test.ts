import { describe, expect, it } from 'vitest';
import { EventBus } from '../lib/eventBus.js';
import type { GameState } from '../state/models.js';
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
          ctx.events.queue({ type: 'device.applied', level: 'info' });
        },
        deriveEnvironment: (ctx) => executed.push(ctx.phase),
        irrigationAndNutrients: (ctx) => {
          executed.push(ctx.phase);
          ctx.events.queue({ type: 'env.irrigated', payload: { liters: 10 } });
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
          ctx.events.queue({
            type: 'phase.entered',
            payload: { phase: ctx.phase, tick: ctx.tick },
          });
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
});
