import { describe, expect, it } from 'vitest';
import { createEventCollector } from '@/lib/eventBus.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import type { GameState, TaskDefinitionMap, ZoneState } from '@/state/types.js';
import { TaskGenerator } from '../tasks/taskGenerator.js';

const basePolicies = {
  generation: {
    reservoirLevelThreshold: 0.5,
    nutrientStrengthThreshold: 0.6,
    cleanlinessThreshold: 0.8,
    harvestReadinessThreshold: 0.5,
    maintenanceConditionThreshold: 0.7,
    maintenanceGraceTicks: 4,
  },
  safety: {
    treatmentCertifications: {},
    defaultTreatmentCertification: undefined,
  },
} as const;

const createState = (): GameState => {
  const zone: ZoneState = {
    id: 'zone-1',
    roomId: 'room-1',
    name: 'Propagation',
    cultivationMethodId: 'method-1',
    strainId: 'strain-1',
    area: 100,
    ceilingHeight: 4,
    volume: 400,
    environment: {
      temperature: 24,
      relativeHumidity: 0.6,
      co2: 900,
      ppfd: 500,
      vpd: 1.2,
    },
    resources: {
      waterLiters: 800,
      nutrientSolutionLiters: 200,
      nutrientStrength: 0.4,
      substrateHealth: 0.9,
      reservoirLevel: 0.3,
      lastTranspirationLiters: 0,
    },
    plants: [],
    devices: [],
    metrics: {
      averageTemperature: 24,
      averageHumidity: 0.6,
      averageCo2: 900,
      averagePpfd: 500,
      stressLevel: 0.2,
      lastUpdatedTick: 0,
    },
    control: { setpoints: {} },
    health: {
      plantHealth: {},
      pendingTreatments: [],
      appliedTreatments: [],
    },
    activeTaskIds: [],
  };

  return {
    metadata: {
      gameId: 'game-1',
      createdAt: new Date(0).toISOString(),
      seed: 'seed',
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
    clock: {
      tick: 0,
      isPaused: false,
      startedAt: new Date(0).toISOString(),
      lastUpdatedAt: new Date(0).toISOString(),
      targetTickRate: 1,
    },
    structures: [
      {
        id: 'structure-1',
        blueprintId: 'blueprint-1',
        name: 'Alpha',
        status: 'active',
        footprint: { length: 10, width: 10, height: 4, area: 100, volume: 400 },
        rooms: [
          {
            id: 'room-1',
            structureId: 'structure-1',
            name: 'Grow',
            purposeId: 'purpose-1',
            area: 100,
            height: 4,
            volume: 400,
            zones: [zone],
            cleanliness: 0.6,
            maintenanceLevel: 0.6,
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
    personnel: {
      employees: [],
      applicants: [],
      trainingPrograms: [],
      overallMorale: 0.8,
    },
    tasks: {
      backlog: [],
      active: [],
      completed: [],
      cancelled: [],
    },
    notes: [],
  } satisfies GameState;
};

describe('TaskGenerator', () => {
  it('creates resource refill tasks with boosted priority', () => {
    const state = createState();
    const definitions: TaskDefinitionMap = {
      refill_supplies_water: {
        id: 'refill_supplies_water',
        costModel: { basis: 'perAction', laborMinutes: 15 },
        priority: 80,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 1,
        description: 'Refill water',
      },
      refill_supplies_nutrients: {
        id: 'refill_supplies_nutrients',
        costModel: { basis: 'perAction', laborMinutes: 15 },
        priority: 80,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 1,
        description: 'Refill nutrients',
      },
    } satisfies TaskDefinitionMap;

    const generator = new TaskGenerator({
      definitions,
      policies: basePolicies,
      estimateWorkHours: (definition) =>
        Math.max((definition?.costModel.laborMinutes ?? 60) / 60, 0.25),
      generateTaskId: (tick) => `task-${tick}`,
      computeDueTick: (priority, tick) => tick + (priority > 80 ? 2 : 4),
    });

    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);

    generator.generateTasks(state, 1, collector);

    const backlog = state.tasks.backlog.filter((task) => task.status === 'pending');
    const waterTask = backlog.find((task) => task.definitionId === 'refill_supplies_water');
    const nutrientTask = backlog.find((task) => task.definitionId === 'refill_supplies_nutrients');

    expect(waterTask?.priority).toBeGreaterThan(definitions.refill_supplies_water.priority);
    expect(nutrientTask?.priority).toBeGreaterThan(definitions.refill_supplies_nutrients.priority);
    expect(waterTask?.metadata?.taskKey).toBe('refill_supplies_water');
  });
});
