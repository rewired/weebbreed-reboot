import { describe, expect, it } from 'vitest';
import type {
  EmployeeState,
  GameState,
  TaskAssignment,
  TaskState,
  ZoneState,
} from '@/state/types.js';
import { ShiftManager } from '../shifts/shiftManager.js';

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
    stressLevel: 0.1,
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

const createEmployee = (overrides: Partial<EmployeeState> = {}): EmployeeState => ({
  id: 'emp-1',
  name: 'Worker',
  role: 'Gardener',
  salaryPerTick: 10,
  status: 'assigned',
  morale: 0.8,
  energy: 1,
  maxMinutesPerTick: 120,
  skills: {},
  experience: {},
  traits: [],
  certifications: [],
  shift: {
    shiftId: 'shift-1',
    name: 'Shift',
    startHour: 8,
    durationHours: 8,
    overlapMinutes: 0,
  },
  hoursWorkedToday: 0,
  overtimeHours: 0,
  lastShiftResetTick: 0,
  assignedStructureId: 'structure-1',
  assignedRoomId: 'room-1',
  assignedZoneId: 'zone-1',
  currentTaskId: 'task-1',
  ...overrides,
});

const createState = (zone: ZoneState, employee: EmployeeState, task: TaskState): GameState => ({
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
    employees: [employee],
    applicants: [],
    trainingPrograms: [],
    overallMorale: 0.8,
  },
  tasks: {
    backlog: [],
    active: [task],
    completed: [],
    cancelled: [],
  },
  notes: [],
});

describe('ShiftManager', () => {
  it('requeues tasks when employees leave their shift', () => {
    const zone = createZone();
    const assignment: TaskAssignment = { employeeId: 'emp-1', startedAtTick: 0, progress: 0 };
    const task: TaskState = {
      id: 'task-1',
      definitionId: 'clean_zone',
      status: 'inProgress',
      priority: 60,
      createdAtTick: 0,
      location: { structureId: 'structure-1', roomId: 'room-1', zoneId: zone.id },
      metadata: { estimatedWorkHours: 1 },
      assignment,
    };
    zone.activeTaskIds.push(task.id);
    const employee = createEmployee();
    const state = createState(zone, employee, task);

    const manager = new ShiftManager({
      findZone: () => zone,
      isEmployeeOnDuty: () => false,
    });

    manager.handleShiftTransitions(state, 0);

    expect(state.tasks.active).toHaveLength(0);
    expect(state.tasks.backlog).toHaveLength(1);
    expect(state.tasks.backlog[0]?.status).toBe('pending');
    expect(employee.status).toBe('offShift');
    expect(employee.currentTaskId).toBeUndefined();
    expect(zone.activeTaskIds).toHaveLength(0);
  });

  it('updates employee statuses based on duty', () => {
    const zone = createZone();
    const employee = createEmployee({ status: 'idle', currentTaskId: undefined });
    const state = createState(zone, employee, {
      id: 'task-1',
      definitionId: 'clean_zone',
      status: 'pending',
      priority: 60,
      createdAtTick: 0,
      metadata: { estimatedWorkHours: 1 },
      location: { structureId: 'structure-1', roomId: 'room-1', zoneId: zone.id },
    });

    const manager = new ShiftManager({
      findZone: () => zone,
      isEmployeeOnDuty: (_, minute) => minute === 120,
    });

    manager.updateShiftStatuses(state.personnel.employees, 0);
    expect(state.personnel.employees[0]?.status).toBe('offShift');

    manager.updateShiftStatuses(state.personnel.employees, 120);
    expect(state.personnel.employees[0]?.status).toBe('idle');
  });
});
