import { promises as fs } from 'node:fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEventCollector } from '@/lib/eventBus.js';
import { RNG_STREAM_IDS, RngService, RngStream, createSeededStreamGenerator } from '@/lib/rng.js';
import type { CommandExecutionContext } from '@/facade/index.js';
import type {
  GameState,
  PersonnelNameDirectory,
  PersonnelRoleBlueprint,
  SimulationClockState,
  SimulationNote,
} from '@/state/models.js';
import {
  DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
  getEmployeeSkillNames,
  resetPersonnelSkillBlueprints,
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
  afterEach(() => {
    resetPersonnelSkillBlueprints();
  });
  const directory: PersonnelNameDirectory = {
    firstNamesMale: ['Liam', 'Noah', 'Ethan'],
    firstNamesFemale: ['Ava', 'Emma', 'Olivia'],
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
    randomSeeds: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'],
  };

  const hashSeed = (value: string): number => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash === 0 ? 1 : hash;
  };

  const deriveGender = (personalSeed: string, pDiverse: number): 'male' | 'female' | 'other' => {
    const hashed = hashSeed(personalSeed);
    const generator = createSeededStreamGenerator(String(hashed), RNG_STREAM_IDS.jobMarketGender);
    const stream = new RngStream(RNG_STREAM_IDS.jobMarketGender, generator);
    if (pDiverse >= 1) {
      return 'other';
    }
    if (pDiverse <= 0) {
      return stream.next() < 0.5 ? 'female' : 'male';
    }
    const roll = stream.next();
    if (roll < pDiverse) {
      return 'other';
    }
    const femaleThreshold = pDiverse + (1 - pDiverse) / 2;
    return roll < femaleThreshold ? 'female' : 'male';
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
      personnelRoleBlueprints: DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
      fetchImpl: fetchMock,
      batchSize: 2,
      pDiverse: 1,
    });

    const context = createCommandContext(state);
    const result = await service.refreshCandidates({}, context);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('seed=test-seed-0');
    expect(state.personnel.applicants).toHaveLength(2);
    const [firstApplicant, secondApplicant] = state.personnel.applicants;
    if (!firstApplicant || !secondApplicant) {
      throw new Error('Expected two applicants to be generated');
    }
    expect(firstApplicant.name).toBe('Jamie Hammond');
    expect(firstApplicant.personalSeed).toBe('alpha');
    expect(firstApplicant.gender).toBe('male');
    expect(secondApplicant.gender).toBe('female');
    expect(result.data?.source).toBe('remote');
    expect(context.events.size).toBe(1);
  });

  it('falls back to offline generation when remote fetch fails', async () => {
    const state = createGameState();
    const rng = new RngService('seed-offline-test');
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const offlineDirectory: PersonnelNameDirectory = {
      ...directory,
      randomSeeds: ['alpha', 'beta'],
    };
    const diversityProbability = 0.3;

    const service = new JobMarketService({
      state,
      rng,
      personnelDirectory: offlineDirectory,
      personnelRoleBlueprints: DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
      fetchImpl: fetchMock,
      batchSize: 3,
      pDiverse: diversityProbability,
    });

    const context = createCommandContext(state);
    const result = await service.refreshCandidates({}, context);

    expect(result.ok).toBe(true);
    expect(result.data?.source).toBe('local');
    expect(state.personnel.applicants).toHaveLength(3);
    const [firstOffline, secondOffline, thirdOffline] = state.personnel.applicants;
    if (!firstOffline || !secondOffline || !thirdOffline) {
      throw new Error('Expected three offline-generated applicants');
    }
    expect(firstOffline.personalSeed).toBe('alpha');
    expect(secondOffline.personalSeed).toBe('beta');
    expect(thirdOffline.personalSeed?.startsWith('offline-')).toBe(true);
    const expectedGenders = state.personnel.applicants.map((applicant) => {
      expect(applicant.personalSeed).toBeDefined();
      return deriveGender(applicant.personalSeed!, diversityProbability);
    });
    const actualGenders = state.personnel.applicants.map((applicant) => applicant.gender);
    expect(actualGenders).toEqual(expectedGenders);
    expect(context.events.size).toBe(1);
  });

  it('uses fallback skill names when no skill blueprints are present', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-job-market-skills-'));
    try {
      const blueprintDir = path.join(tempDir, 'blueprints');
      const rolesDir = path.join(blueprintDir, 'personnel', 'roles');
      await fs.mkdir(rolesDir, { recursive: true });
      await fs.writeFile(
        path.join(rolesDir, 'Operator.json'),
        JSON.stringify(
          {
            id: 'Operator',
            name: 'Operator',
            salary: { basePerTick: 22 },
            skillProfile: {
              primary: { skill: 'Logistics', startingLevel: 3 },
            },
          },
          null,
          2,
        ),
      );

      const state = createGameState();
      const rng = new RngService('job-market-fallback');
      const service = new JobMarketService({
        state,
        rng,
        personnelDirectory: directory,
        dataDirectory: tempDir,
        httpEnabled: false,
        batchSize: 1,
      });

      const context = createCommandContext(state);
      const result = await service.refreshCandidates({}, context);

      expect(result.ok).toBe(true);
      expect(state.personnel.applicants).not.toHaveLength(0);
      const [applicant] = state.personnel.applicants;
      if (!applicant) throw new Error('Expected at least one applicant from fallback generation');
      const skillNames = getEmployeeSkillNames();
      expect(skillNames).toEqual(
        expect.arrayContaining([
          'Gardening',
          'Maintenance',
          'Logistics',
          'Cleanliness',
          'Administration',
        ]),
      );
      expect(Object.keys(applicant.skills).every((skill) => skillNames.includes(skill))).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('generates blueprint-driven applicants deterministically (golden snapshot)', async () => {
    const state = createGameState();
    const rng = new RngService('seed-blueprint-golden');
    const directoryWithSeeds: PersonnelNameDirectory = {
      firstNamesMale: ['River', 'Phoenix', 'Sage'],
      firstNamesFemale: ['Willow', 'Nova', 'Aria'],
      lastNames: ['Fern', 'Vale', 'Quill'],
      traits: [
        { id: 'trait_frugal', name: 'Frugal', description: '', type: 'positive' },
        { id: 'trait_demanding', name: 'Demanding', description: '', type: 'negative' },
      ],
      randomSeeds: ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'],
    };

    const service = new JobMarketService({
      state,
      rng,
      personnelDirectory: directoryWithSeeds,
      personnelRoleBlueprints: DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
      httpEnabled: false,
      batchSize: 6,
      pDiverse: 0.2,
    });

    const context = createCommandContext(state);
    const result = await service.refreshCandidates({ force: true }, context);
    expect(result.ok).toBe(true);

    const snapshot = state.personnel.applicants.map((applicant) => ({
      name: applicant.name,
      role: applicant.desiredRole,
      expectedSalary: applicant.expectedSalary,
      skills: applicant.skills,
      traits: applicant.traits,
      personalSeed: applicant.personalSeed,
      gender: applicant.gender,
    }));

    expect(snapshot).toMatchInlineSnapshot(`
      [
        {
          "expectedSalary": 31,
          "gender": "male",
          "name": "Aria Quill",
          "personalSeed": "alpha",
          "role": "Gardener",
          "skills": {
            "Cleanliness": 3,
            "Gardening": 4,
          },
          "traits": [
            "trait_demanding",
          ],
        },
        {
          "expectedSalary": 23,
          "gender": "female",
          "name": "Sage Vale",
          "personalSeed": "beta",
          "role": "Operator",
          "skills": {
            "Administration": 4,
            "Logistics": 2,
          },
          "traits": [
            "trait_demanding",
            "trait_frugal",
          ],
        },
        {
          "expectedSalary": 28,
          "gender": "male",
          "name": "Nova Quill",
          "personalSeed": "gamma",
          "role": "Gardener",
          "skills": {
            "Cleanliness": 2,
            "Gardening": 4,
            "Logistics": 1,
          },
          "traits": [
            "trait_demanding",
          ],
        },
        {
          "expectedSalary": 24,
          "gender": "male",
          "name": "Sage Quill",
          "personalSeed": "delta",
          "role": "Operator",
          "skills": {
            "Administration": 3,
            "Logistics": 3,
          },
          "traits": [
            "trait_frugal",
            "trait_demanding",
          ],
        },
        {
          "expectedSalary": 31,
          "gender": "female",
          "name": "Phoenix Quill",
          "personalSeed": "epsilon",
          "role": "Technician",
          "skills": {
            "Logistics": 3,
            "Maintenance": 3,
          },
          "traits": [
            "trait_frugal",
          ],
        },
        {
          "expectedSalary": 28,
          "gender": "female",
          "name": "Nova Fern",
          "personalSeed": "zeta",
          "role": "Gardener",
          "skills": {
            "Cleanliness": 3,
            "Gardening": 5,
            "Maintenance": 1,
          },
          "traits": [
            "trait_frugal",
          ],
        },
      ]
    `);
  });

  it('loads personnel role blueprints from the data directory when available', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-job-market-roles-'));
    try {
      const blueprintDir = path.join(tempDir, 'blueprints', 'personnel', 'roles');
      await fs.mkdir(blueprintDir, { recursive: true });
      await fs.writeFile(
        path.join(blueprintDir, 'Specialist.json'),
        JSON.stringify(
          {
            id: 'Specialist',
            name: 'IPM Specialist',
            roleWeight: 5,
            salary: { basePerTick: 30 },
            skillProfile: {
              primary: { skill: 'Cleanliness', startingLevel: 4, roll: { min: 2, max: 4 } },
            },
          },
          null,
          2,
        ),
      );

      const state = createGameState();
      const rng = new RngService('seed-blueprint-directory');
      const service = new JobMarketService({
        state,
        rng,
        personnelDirectory: directory,
        dataDirectory: tempDir,
        httpEnabled: false,
        batchSize: 4,
        pDiverse: 0,
      });

      const context = createCommandContext(state);
      await service.refreshCandidates({ force: true }, context);

      expect(state.personnel.applicants).not.toHaveLength(0);
      expect(
        state.personnel.applicants.some((applicant) => applicant.desiredRole === 'Specialist'),
      ).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('respects diversity probability extremes for offline candidates', async () => {
    const state = createGameState();
    const rng = new RngService('seed-offline-extremes');
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));

    const alwaysDiverse = new JobMarketService({
      state,
      rng,
      personnelDirectory: directory,
      personnelRoleBlueprints: DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
      fetchImpl: fetchMock,
      batchSize: 2,
      pDiverse: 1,
    });

    const context = createCommandContext(state);
    await alwaysDiverse.refreshCandidates({}, context);
    expect(new Set(state.personnel.applicants.map((applicant) => applicant.gender))).toEqual(
      new Set(['other']),
    );

    const binaryOnly = new JobMarketService({
      state,
      rng,
      personnelDirectory: directory,
      personnelRoleBlueprints: DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
      fetchImpl: fetchMock,
      batchSize: 2,
      pDiverse: 0,
    });

    const secondContext = createCommandContext(state);
    await binaryOnly.refreshCandidates({}, secondContext);
    for (const applicant of state.personnel.applicants) {
      expect(applicant.gender === 'male' || applicant.gender === 'female').toBe(true);
    }
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
      personnelRoleBlueprints: DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
      fetchImpl: fetchMock,
      batchSize: 1,
    });

    const commitHook = service.createCommitHook();

    const firstBuffer: unknown[] = [];
    const firstContext = createPhaseContext(state, 1, firstBuffer);
    await commitHook(firstContext);
    state.clock.tick = 1;
    expect(state.personnel.applicants).toHaveLength(1);
    const [firstRefreshApplicant] = state.personnel.applicants;
    if (!firstRefreshApplicant) throw new Error('Expected applicant after first refresh');
    expect(firstRefreshApplicant.gender).toBe('other');
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

  it('consumes stored offline seeds sequentially across refreshes', async () => {
    const state = createGameState();
    const rng = new RngService('seed-offline-seq');
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const service = new JobMarketService({
      state,
      rng,
      personnelDirectory: directory,
      personnelRoleBlueprints: DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
      fetchImpl: fetchMock,
      batchSize: 2,
    });

    const firstContext = createCommandContext(state);
    const firstResult = await service.refreshCandidates({}, firstContext);
    expect(firstResult.ok).toBe(true);
    const [firstSeed, secondSeed] = state.personnel.applicants;
    if (!firstSeed || !secondSeed) {
      throw new Error('Expected two applicants after first offline refresh');
    }
    expect(firstSeed.personalSeed).toBe('alpha');
    expect(secondSeed.personalSeed).toBe('beta');

    const secondContext = createCommandContext(state);
    const secondResult = await service.refreshCandidates({}, secondContext);
    expect(secondResult.ok).toBe(true);
    const [thirdSeed, fourthSeed] = state.personnel.applicants;
    if (!thirdSeed || !fourthSeed) {
      throw new Error('Expected two applicants after second offline refresh');
    }
    expect(thirdSeed.personalSeed).toBe('gamma');
    expect(fourthSeed.personalSeed).toBe('delta');
  });

  it('respects blueprint salary and skill configuration when tertiary data is missing', async () => {
    const state = createGameState();
    const rng = new RngService('seed-blueprint-salary');
    const customRole: PersonnelRoleBlueprint = {
      id: 'Specialist',
      name: 'IPM Specialist',
      maxMinutesPerTick: 80,
      roleWeight: 1,
      salary: {
        basePerTick: 30,
        skillFactor: { base: 1, perPoint: 0.1, min: 1, max: 2 },
        randomRange: { min: 1, max: 1 },
        skillWeights: { primary: 2, secondary: 1 },
      },
      skillProfile: {
        primary: { skill: 'Gardening', startingLevel: 3, roll: { min: 3, max: 3 } },
        secondary: { skill: 'Maintenance', startingLevel: 2, roll: { min: 2, max: 2 } },
      },
    };

    const directoryNoTraits: PersonnelNameDirectory = {
      firstNamesMale: ['Robin'],
      firstNamesFemale: [],
      lastNames: ['Evergreen'],
      traits: [],
      randomSeeds: ['custom-seed'],
    };

    const service = new JobMarketService({
      state,
      rng,
      personnelDirectory: directoryNoTraits,
      personnelRoleBlueprints: [customRole],
      httpEnabled: false,
      batchSize: 1,
      pDiverse: 0,
    });

    const context = createCommandContext(state);
    await service.refreshCandidates({}, context);

    expect(state.personnel.applicants).toHaveLength(1);
    const [applicant] = state.personnel.applicants;
    if (!applicant) throw new Error('Expected applicant generated from custom role');
    expect(applicant.desiredRole).toBe('Specialist');
    expect(applicant.skills).toEqual({ Gardening: 3, Maintenance: 2 });
    expect(applicant.traits).toEqual([]);
    expect(applicant.expectedSalary).toBe(54);
  });
});
