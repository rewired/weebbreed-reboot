import { describe, expect, it, vi } from 'vitest';
import { createEventCollector } from '@/lib/eventBus.js';
import { RngService } from '@/lib/rng.js';
import type { CommandExecutionContext } from '@/facade/index.js';
import type {
  GameState,
  PersonnelNameDirectory,
  SimulationClockState,
  SimulationNote,
} from '@/state/models.js';
import { JobMarketService } from '../jobMarketService.js';
import type { SimulationPhaseContext } from '@/sim/loop.js';

const createClock = (): SimulationClockState => ({
  tick: 0,
  isPaused: false,
  startedAt: new Date(0).toISOString(),
  lastUpdatedAt: new Date(0).toISOString(),
  targetTickRate: 1,
});

const createGameState = (): GameState => ({
  metadata: {
    gameId: 'game-1',
    createdAt: new Date(0).toISOString(),
    seed: 'test-seed',
    difficulty: 'normal',
    simulationVersion: '1.0.0',
    tickLengthMinutes: 60,
    economics: {
      initialCapital: 0,
      itemPriceMultiplier: 1,
      harvestPriceMultiplier: 1,
      rentPerSqmStructurePerTick: 0,
      rentPerSqmRoomPerTick: 0,
    },
  },
  clock: createClock(),
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
    overallMorale: 1,
  },
  tasks: {
    backlog: [],
    active: [],
    completed: [],
    cancelled: [],
  },
  notes: [] as SimulationNote[],
});

const createCommandContext = (state: GameState): CommandExecutionContext => {
  const events: ReturnType<typeof createEventCollector> = createEventCollector(
    [],
    state.clock.tick,
  );
  return {
    command: 'workforce.refreshCandidates',
    state,
    clock: state.clock,
    tick: state.clock.tick,
    events,
  } satisfies CommandExecutionContext;
};

const createPhaseContext = (
  state: GameState,
  tick: number,
  buffer: unknown[],
): SimulationPhaseContext & { __events: unknown[] } => {
  const collector = createEventCollector(buffer, tick);
  return {
    state,
    tick,
    tickLengthMinutes: state.metadata.tickLengthMinutes,
    phase: 'commit',
    events: collector,
    accounting: {
      recordUtility: () => undefined,
      recordDevicePurchase: () => undefined,
    },
    __events: buffer,
  } satisfies SimulationPhaseContext & { __events: unknown[] };
};

describe('JobMarketService', () => {
  const directory: PersonnelNameDirectory = {
    firstNames: ['Alice', 'Bob', 'Charlie'],
    lastNames: ['Farmer', 'Grower', 'Harvester'],
    traits: [
      {
        id: 'trait_frugal',
        name: 'Frugal',
        description: 'Lower salary expectations.',
        type: 'positive',
      },
      {
        id: 'trait_demanding',
        name: 'Demanding',
        description: 'Higher salary expectations.',
        type: 'negative',
      },
    ],
  };

  it('refreshes candidates from remote provider with deterministic seed', async () => {
    const state = createGameState();
    const rng = new RngService('seed-remote-test');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { name: { first: 'Jamie', last: 'Hammond' }, gender: 'male', login: { salt: 'alpha' } },
          { name: { first: 'Taylor', last: 'Nguyen' }, gender: 'female', login: { salt: 'beta' } },
        ],
      }),
    });
    const service = new JobMarketService({
      state,
      rng,
      personnelDirectory: directory,
      fetchImpl: fetchMock,
      batchSize: 2,
    });

    const context = createCommandContext(state);
    const result = await service.refreshCandidates({}, context);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('seed=test-seed-0');
    expect(state.personnel.applicants).toHaveLength(2);
    expect(state.personnel.applicants[0].name).toBe('Jamie Hammond');
    expect(state.personnel.applicants[0].personalSeed).toBe('alpha');
    expect(result.data?.source).toBe('remote');
    expect(context.events.size).toBe(1);
  });

  it('falls back to offline generation when remote fetch fails', async () => {
    const state = createGameState();
    const rng = new RngService('seed-offline-test');
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const service = new JobMarketService({
      state,
      rng,
      personnelDirectory: directory,
      fetchImpl: fetchMock,
      batchSize: 2,
    });

    const context = createCommandContext(state);
    const result = await service.refreshCandidates({}, context);

    expect(result.ok).toBe(true);
    expect(result.data?.source).toBe('local');
    expect(state.personnel.applicants).toHaveLength(2);
    expect(state.personnel.applicants[0].personalSeed.startsWith('offline-')).toBe(true);
    expect(context.events.size).toBe(1);
  });

  it('refreshes automatically once per simulated week via commit hook', async () => {
    const state = createGameState();
    const rng = new RngService('seed-commit-test');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { name: { first: 'Jordan', last: 'Lee' }, gender: 'other', login: { salt: 'gamma' } },
        ],
      }),
    });
    const service = new JobMarketService({
      state,
      rng,
      personnelDirectory: directory,
      fetchImpl: fetchMock,
      batchSize: 1,
    });

    const commitHook = service.createCommitHook();

    const firstBuffer: unknown[] = [];
    const firstContext = createPhaseContext(state, 1, firstBuffer);
    await commitHook(firstContext);
    state.clock.tick = 1;
    expect(state.personnel.applicants).toHaveLength(1);
    expect(firstBuffer).toHaveLength(1);

    const secondBuffer: unknown[] = [];
    const secondContext = createPhaseContext(state, 2, secondBuffer);
    await commitHook(secondContext);
    state.clock.tick = 2;
    expect(secondBuffer).toHaveLength(0);

    const thirdBuffer: unknown[] = [];
    const thirdContext = createPhaseContext(state, 168, thirdBuffer);
    await commitHook(thirdContext);
    state.clock.tick = 168;
    expect(thirdBuffer).toHaveLength(1);
  });
});
