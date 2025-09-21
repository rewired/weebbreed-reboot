import { beforeAll, describe, expect, it } from 'vitest';
import { createEventCollector } from '../../lib/eventBus.js';
import type { SimulationEvent } from '../../lib/eventBus.js';
import type {
  EmployeeState,
  GameState,
  TaskDefinitionMap,
  TaskState,
  ZoneState,
} from '../../state/models.js';
import { WorkforceEngine } from './workforceEngine.js';
import { resolvePurposeIdByName } from '../roomPurposeRegistry.js';
import { loadTestRoomPurposes } from '../../testing/loadTestRoomPurposes.js';

let growRoomPurposeId: string;

beforeAll(async () => {
  await loadTestRoomPurposes();
  growRoomPurposeId = resolvePurposeIdByName('Grow Room');
});

const createBaseState = (): GameState => {
  const zone: ZoneState = {
    id: 'zone-1',
    roomId: 'room-1',
    name: 'Propagation',
    cultivationMethodId: 'method-1',
    strainId: 'strain-1',
    environment: {
      temperature: 24,
      relativeHumidity: 0.6,
      co2: 900,
      ppfd: 500,
      vpd: 1.2,
    },
    resources: {
      waterLiters: 800,
      nutrientSolutionLiters: 400,
      nutrientStrength: 1,
      substrateHealth: 0.9,
      reservoirLevel: 0.8,
    },
    plants: [],
    devices: [],
    metrics: {
      averageTemperature: 24,
      averageHumidity: 0.6,
      averageCo2: 900,
      averagePpfd: 500,
      stressLevel: 0.1,
      lastUpdatedTick: 0,
    },
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
            name: 'Grow Room',
            purposeId: growRoomPurposeId,
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
    },
    personnel: {
      employees: [],
      applicants: [],
      trainingPrograms: [],
      overallMorale: 0.85,
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

const createShift = (shiftId: string, name: string, startHour: number) => ({
  shiftId,
  name,
  startHour,
  durationHours: 12,
  overlapMinutes: 60,
});

const createEmployee = (overrides: Partial<EmployeeState>): EmployeeState => ({
  id: 'employee-default',
  name: 'Worker',
  role: 'Gardener',
  salaryPerTick: 20,
  status: 'offShift',
  morale: 0.82,
  energy: 1,
  skills: { Gardening: 4 },
  experience: { Gardening: 4 },
  traits: [],
  certifications: [],
  shift: createShift('shift.day', 'Day Shift', 6),
  hoursWorkedToday: 0,
  overtimeHours: 0,
  assignedStructureId: 'structure-1',
  assignedRoomId: 'room-1',
  assignedZoneId: 'zone-1',
  currentTaskId: undefined,
  ...overrides,
});

const createTask = (definitionId: string, overrides: Partial<TaskState> = {}): TaskState => ({
  id: `task-${definitionId}`,
  definitionId,
  status: 'pending',
  priority: 80,
  createdAtTick: 0,
  metadata: { estimatedWorkHours: 16 },
  location: { structureId: 'structure-1', roomId: 'room-1', zoneId: 'zone-1' },
  ...overrides,
});

const advanceTicks = (
  engine: WorkforceEngine,
  state: GameState,
  ticks: number[],
  collector: (event: SimulationEvent) => void,
) => {
  for (const tick of ticks) {
    engine.processTick(state, tick, 60, collector);
  }
};

describe('workforce integration', () => {
  it('reassigns non-harvest tasks during shift handover', () => {
    const state = createBaseState();
    const dayShift = createShift('shift.day', 'Day Shift', 6);
    const nightShift = createShift('shift.night', 'Night Shift', 18);
    const dayTech = createEmployee({
      id: 'emp-day',
      role: 'Technician',
      skills: { Maintenance: 5 },
      experience: { Maintenance: 5 },
      shift: dayShift,
    });
    const nightTech = createEmployee({
      id: 'emp-night',
      role: 'Technician',
      skills: { Maintenance: 5 },
      experience: { Maintenance: 5 },
      shift: nightShift,
    });
    state.personnel.employees = [dayTech, nightTech];

    const definitions: TaskDefinitionMap = {
      maintain_device: {
        id: 'maintain_device',
        costModel: { basis: 'perAction', laborMinutes: 1800 },
        priority: 80,
        requiredRole: 'Technician',
        requiredSkill: 'Maintenance',
        minSkillLevel: 3,
        description: 'Maintain device',
      },
    };

    const task = createTask('maintain_device', { metadata: { estimatedWorkHours: 24 } });
    state.tasks.backlog.push(task);

    const engine = new WorkforceEngine(definitions);
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);

    advanceTicks(engine, state, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], collector);
    expect(state.tasks.active).toHaveLength(1);
    expect(state.tasks.active[0]?.assignment?.employeeId).toBe('emp-day');

    engine.processTick(state, 18, 60, collector);

    expect(state.tasks.active).toHaveLength(1);
    const activeTask = state.tasks.active[0];
    expect(activeTask?.assignment?.employeeId).toBe('emp-night');
    expect(state.personnel.employees.find((emp) => emp.id === 'emp-day')?.status).toBe('offShift');
    expect(state.personnel.employees.find((emp) => emp.id === 'emp-night')?.currentTaskId).toBe(
      activeTask?.id,
    );
    expect(state.tasks.backlog).toHaveLength(0);
  });

  it('accumulates energy drain and overtime while tasks span multiple ticks', () => {
    const state = createBaseState();
    const dayShift = createShift('shift.day', 'Day Shift', 6);
    const technician = createEmployee({
      id: 'emp-tech',
      role: 'Technician',
      skills: { Maintenance: 5 },
      experience: { Maintenance: 5 },
      shift: dayShift,
    });
    state.personnel.employees = [technician];

    const definitions: TaskDefinitionMap = {
      maintain_device: {
        id: 'maintain_device',
        costModel: { basis: 'perAction', laborMinutes: 1200 },
        priority: 80,
        requiredRole: 'Technician',
        requiredSkill: 'Maintenance',
        minSkillLevel: 3,
        description: 'Maintain device',
      },
    };

    state.tasks.backlog.push(createTask('maintain_device'));

    const engine = new WorkforceEngine(definitions);
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);

    advanceTicks(engine, state, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15], collector);

    const updatedTech = state.personnel.employees[0];
    expect(updatedTech.currentTaskId).toBe('task-maintain_device');
    expect(updatedTech.hoursWorkedToday).toBeCloseTo(10, 5);
    expect(updatedTech.overtimeHours).toBeCloseTo(2, 5);
    expect(updatedTech.energy).toBeLessThan(1);
  });

  it('keeps harvest tasks assigned across shift boundaries', () => {
    const state = createBaseState();
    const dayShift = createShift('shift.day', 'Day Shift', 6);
    const harvester = createEmployee({
      id: 'emp-harvest',
      role: 'Gardener',
      skills: { Gardening: 5 },
      experience: { Gardening: 5 },
      shift: dayShift,
    });
    state.personnel.employees = [harvester];

    const definitions: TaskDefinitionMap = {
      harvest_plants: {
        id: 'harvest_plants',
        costModel: { basis: 'perPlant', laborMinutes: 45 },
        priority: 90,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 3,
        description: 'Harvest plants',
      },
    };

    state.tasks.backlog.push(
      createTask('harvest_plants', {
        metadata: { estimatedWorkHours: 12, plantCount: 20 },
      }),
    );

    const engine = new WorkforceEngine(definitions);
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);

    advanceTicks(engine, state, [16, 17], collector);
    engine.processTick(state, 18, 60, collector);
    engine.processTick(state, 19, 60, collector);

    expect(state.tasks.active).toHaveLength(1);
    const harvestTask = state.tasks.active[0];
    expect(harvestTask.assignment?.employeeId).toBe('emp-harvest');
    expect(state.personnel.employees[0].status).toBe('assigned');
    expect(state.personnel.employees[0].currentTaskId).toBe(harvestTask.id);
    expect(state.tasks.backlog).toHaveLength(0);
  });
});
