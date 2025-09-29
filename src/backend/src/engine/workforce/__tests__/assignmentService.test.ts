import { describe, expect, it } from 'vitest';
import type {
  EmployeeState,
  GameState,
  TaskAssignment,
  TaskDefinitionMap,
  TaskState,
  ZoneState,
} from '@/state/types.js';
import type { EventCollector, SimulationEvent } from '@/lib/eventBus.js';
import { AssignmentService } from '../tasks/assignmentService.js';
import type { WorkforcePolicies } from '../types.js';

const basePolicies: WorkforcePolicies = {
  energy: {
    minEnergyToClaim: 0.2,
    energyCostPerHour: 0.1,
    idleRecoveryPerTick: 0.05,
    overtimeCostMultiplier: 1.5,
  },
  overtime: {
    standardHoursPerDay: 8,
    overtimeThresholdHours: 8,
    maxOvertimeHoursPerDay: 4,
  },
  utility: {
    weights: { priority: 0.4, skill: 0.3, energy: 0.2, morale: 0.1 },
    claimThreshold: 0.4,
    skillEfficiencyBonus: 0.05,
  },
  safety: {
    treatmentCertifications: {},
    defaultTreatmentCertification: undefined,
  },
  generation: {
    reservoirLevelThreshold: 0.5,
    nutrientStrengthThreshold: 0.5,
    cleanlinessThreshold: 0.5,
    harvestReadinessThreshold: 0.5,
    maintenanceConditionThreshold: 0.5,
    maintenanceGraceTicks: 4,
  },
};

const definitions: TaskDefinitionMap = {
  inspect_plants: {
    id: 'inspect_plants',
    costModel: { basis: 'perAction', laborMinutes: 60 },
    priority: 80,
    requiredRole: 'Gardener',
    requiredSkill: 'Gardening',
    minSkillLevel: 1,
    description: 'Inspect plants',
  },
} satisfies TaskDefinitionMap;

const createZone = (): ZoneState => ({
  id: 'zone-1',
  roomId: 'room-1',
  name: 'Zone',
  cultivationMethodId: 'method',
  strainId: 'strain',
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
    nutrientStrength: 0.8,
    substrateHealth: 0.9,
    reservoirLevel: 0.7,
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
});

const createEmployee = (overrides: Partial<EmployeeState>): EmployeeState => ({
  id: 'emp-1',
  name: 'Worker',
  role: 'Gardener',
  salaryPerTick: 10,
  status: 'idle',
  morale: 0.8,
  energy: 1,
  maxMinutesPerTick: 120,
  skills: { Gardening: 4 },
  experience: { Gardening: 4 },
  traits: [],
  certifications: [],
  shift: {
    shiftId: 'shift-1',
    name: 'Shift',
    startHour: 0,
    durationHours: 24,
    overlapMinutes: 0,
  },
  hoursWorkedToday: 0,
  overtimeHours: 0,
  lastShiftResetTick: 0,
  assignedStructureId: 'structure-1',
  assignedRoomId: 'room-1',
  assignedZoneId: 'zone-1',
  currentTaskId: undefined,
  ...overrides,
});

const createState = (
  zone: ZoneState,
  employees: EmployeeState[],
  tasks: TaskState[],
): GameState => ({
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
      name: 'Structure',
      status: 'active',
      footprint: { length: 10, width: 10, height: 4, area: 100, volume: 400 },
      rooms: [
        {
          id: 'room-1',
          structureId: 'structure-1',
          name: 'Room',
          purposeId: 'purpose-1',
          area: 100,
          height: 4,
          volume: 400,
          zones: [zone],
          cleanliness: 0.9,
          maintenanceLevel: 0.9,
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
    employees,
    applicants: [],
    trainingPrograms: [],
    overallMorale: 0.8,
  },
  tasks: {
    backlog: tasks,
    active: [],
    completed: [],
    cancelled: [],
  },
  notes: [],
});

describe('AssignmentService', () => {
  const service = new AssignmentService({
    definitions,
    policies: basePolicies,
    findZone: (state, location) => {
      const structure = state.structures.find((item) => item.id === location?.structureId);
      const room = structure?.rooms.find((item) => item.id === location?.roomId);
      return room?.zones.find((item) => item.id === location?.zoneId);
    },
    estimateWorkHours: (definition) =>
      Math.max((definition?.costModel.laborMinutes ?? 60) / 60, 0.25),
  });

  it('assigns tasks to the most suitable employee', () => {
    const zone = createZone();
    const skilled = createEmployee({ id: 'skilled', skills: { Gardening: 5 }, morale: 0.9 });
    const novice = createEmployee({ id: 'novice', skills: { Gardening: 2 }, morale: 0.7 });
    const task: TaskState = {
      id: 'task-1',
      definitionId: 'inspect_plants',
      status: 'pending',
      priority: 80,
      createdAtTick: 0,
      metadata: { estimatedWorkHours: 1 },
      location: { structureId: 'structure-1', roomId: 'room-1', zoneId: zone.id },
    };
    const state = createState(zone, [skilled, novice], [task]);

    service.assignTasks({
      state,
      tick: 1,
      tickLengthMinutes: 60,
      minuteOfDay: 0,
      priorityRotation: new Map(),
      isEmployeeOnDuty: () => true,
    });

    expect(state.tasks.active).toHaveLength(1);
    const [activeTask] = state.tasks.active;
    if (!activeTask) throw new Error('Expected active task to be assigned');
    expect(activeTask.assignment?.employeeId).toBe('skilled');
    expect(skilled.status).toBe('assigned');
    expect(novice.status).toBe('idle');
  });

  it('advances tasks and emits completion events', () => {
    const zone = createZone();
    const employee = createEmployee({ id: 'worker' });
    const assignment: TaskAssignment = { employeeId: 'worker', startedAtTick: 1, progress: 0 };
    const task: TaskState = {
      id: 'task-1',
      definitionId: 'inspect_plants',
      status: 'inProgress',
      priority: 80,
      createdAtTick: 0,
      metadata: { estimatedWorkHours: 1 },
      assignment,
      location: { structureId: 'structure-1', roomId: 'room-1', zoneId: zone.id },
    };
    zone.activeTaskIds.push(task.id);
    const state = createState(zone, [employee], []);
    state.tasks.active.push(task);

    const queued: SimulationEvent[] = [];
    const events: EventCollector = {
      size: 0,
      queue: (type, payload, tick, level) => {
        if (typeof type === 'string') {
          queued.push({ type, payload, tick, level });
        } else {
          queued.push(type);
        }
      },
      queueMany: (items) => {
        for (const event of items) {
          queued.push(event);
        }
      },
    };

    service.advanceActiveTasks({ state, tick: 2, tickLengthMinutes: 60, events });

    expect(queued.some((event) => event.type === 'task.completed')).toBe(true);
    expect(state.tasks.completed).toHaveLength(1);
    expect(employee.energy).toBeLessThan(1);
    expect(employee.status).toBe('idle');
  });
});
