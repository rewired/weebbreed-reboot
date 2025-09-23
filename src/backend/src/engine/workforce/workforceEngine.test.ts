import { beforeAll, describe, expect, it } from 'vitest';
import { createEventCollector } from '@/lib/eventBus.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import type {
  EmployeeState,
  GameState,
  PendingTreatmentApplication,
  TaskDefinitionMap,
  TaskState,
  TreatmentCategory,
  ZoneState,
} from '@/state/models.js';
import { addDeviceToZone } from '@/state/devices.js';
import { WorkforceEngine } from './workforceEngine.js';
import { resolveRoomPurposeId } from '../roomPurposes/index.js';
import { loadTestRoomPurposes } from '@/testing/loadTestRoomPurposes.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';

let growRoomPurposeId: string;
let repository: BlueprintRepository;

beforeAll(async () => {
  repository = await loadTestRoomPurposes();
  growRoomPurposeId = resolveRoomPurposeId(repository, 'Grow Room');
});

const createBaseState = (): GameState => {
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
      nutrientSolutionLiters: 400,
      nutrientStrength: 1,
      substrateHealth: 0.9,
      reservoirLevel: 0.8,
    },
    plants: [
      {
        id: 'plant-1',
        strainId: 'strain-1',
        zoneId: 'zone-1',
        stage: 'vegetative',
        plantedAtTick: 0,
        ageInHours: 24,
        health: 1,
        stress: 0,
        biomassDryGrams: 12,
        heightMeters: 0.25,
        canopyCover: 0.2,
        yieldDryGrams: 0,
        quality: 1,
        lastMeasurementTick: 0,
      },
    ],
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
            cleanliness: 0.92,
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

const createEmployee = (overrides: Partial<EmployeeState>): EmployeeState => ({
  id: 'employee-1',
  name: 'Test Worker',
  role: 'Gardener',
  salaryPerTick: 20,
  status: 'idle',
  morale: 0.8,
  energy: 1,
  maxMinutesPerTick: 120,
  skills: { Gardening: 4 },
  experience: { Gardening: 4 },
  traits: [],
  certifications: [],
  shift: {
    shiftId: 'shift.test',
    name: 'Test Shift',
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

describe('WorkforceEngine', () => {
  it('assigns treatment tasks only to certified employees', () => {
    const state = createBaseState();
    const treatment: PendingTreatmentApplication = {
      optionId: 'treatment-chem',
      target: 'disease',
      plantIds: ['plant-1'],
      scheduledTick: 1,
      category: 'chemical' as TreatmentCategory,
    };
    state.structures[0].rooms[0].zones[0].health.pendingTreatments.push(treatment);

    const certified = createEmployee({
      id: 'employee-certified',
      certifications: ['cert.treatment.chemical'],
    });
    const nonCertified = createEmployee({
      id: 'employee-uncertified',
      name: 'Helper',
      certifications: [],
    });

    state.personnel.employees.push(certified, nonCertified);

    const definitions: TaskDefinitionMap = {
      apply_treatment: {
        id: 'apply_treatment',
        costModel: { basis: 'perPlant', laborMinutes: 4 },
        priority: 90,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 2,
        description: 'Apply treatment',
      },
    };

    const engine = new WorkforceEngine(definitions);
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);

    engine.processTick(state, 1, state.metadata.tickLengthMinutes, collector);

    const createdEvent = events.find((event) => event.type === 'task.created');
    expect(createdEvent).toBeDefined();

    const completedTask = state.tasks.completed[0];
    const activeTask = state.tasks.active[0];
    const task = completedTask ?? activeTask;
    expect(task).toBeDefined();
    expect(task?.definitionId).toBe('apply_treatment');
    expect(task?.assignment?.employeeId).toBe('employee-certified');

    const updatedCertified = state.personnel.employees.find(
      (emp) => emp.id === 'employee-certified',
    );
    const updatedOther = state.personnel.employees.find((emp) => emp.id === 'employee-uncertified');
    expect(updatedCertified).toBeDefined();
    expect(updatedOther).toBeDefined();
    expect(updatedOther?.currentTaskId).toBeUndefined();
  });

  it('accrues overtime and emits hr events when limits are exceeded', () => {
    const state = createBaseState();
    const zone = state.structures[0].rooms[0].zones[0];
    addDeviceToZone(zone, {
      id: 'device-1',
      blueprintId: 'device-blueprint',
      kind: 'ClimateUnit',
      name: 'Climate Controller',
      zoneId: zone.id,
      status: 'operational',
      efficiency: 1,
      runtimeHours: 100,
      maintenance: {
        lastServiceTick: 0,
        nextDueTick: 1,
        condition: 0.4,
        runtimeHoursAtLastService: 0,
        degradation: 0.6,
      },
      settings: {},
    });

    const technician: EmployeeState = {
      ...createEmployee({
        id: 'employee-tech',
        role: 'Technician',
        skills: { Maintenance: 5 },
        experience: { Maintenance: 5 },
      }),
      energy: 1,
    };

    state.personnel.employees = [technician];

    const definitions: TaskDefinitionMap = {
      maintain_device: {
        id: 'maintain_device',
        costModel: { basis: 'perAction', laborMinutes: 180 },
        priority: 60,
        requiredRole: 'Technician',
        requiredSkill: 'Maintenance',
        minSkillLevel: 3,
        description: 'Maintain device',
      },
    };

    const engine = new WorkforceEngine(definitions, {
      policies: {
        overtime: {
          overtimeThresholdHours: 0.5,
          standardHoursPerDay: 1,
          maxOvertimeHoursPerDay: 4,
        },
      },
    });

    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);

    engine.processTick(state, 1, 120, collector);

    const overtimeEvent = events.find((event) => event.type === 'hr.overtimeAccrued');
    expect(overtimeEvent).toBeDefined();
    expect(overtimeEvent.payload.employeeId).toBe('employee-tech');
    expect(overtimeEvent.payload.hours).toBeCloseTo(1.5, 5);

    const updatedTech = state.personnel.employees[0];
    expect(updatedTech.overtimeHours).toBeCloseTo(1.5, 5);
    expect(updatedTech.hoursWorkedToday).toBeCloseTo(2, 5);
    expect(updatedTech.energy).toBeCloseTo(0.725, 3);
  });

  it('caps allocated hours and allows backlog to grow when maxMinutesPerTick is low', () => {
    const limitedState = createBaseState();
    const normalState = createBaseState();

    const definitions: TaskDefinitionMap = {
      long_task: {
        id: 'long_task',
        costModel: { basis: 'perAction', laborMinutes: 120 },
        priority: 80,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 4,
        description: 'Perform intensive maintenance',
      },
    };

    const limitedEmployee = createEmployee({
      id: 'employee-limited',
      maxMinutesPerTick: 30,
      morale: 1,
      energy: 1,
    });
    const normalEmployee = createEmployee({
      id: 'employee-normal',
      maxMinutesPerTick: 240,
      morale: 1,
      energy: 1,
    });

    limitedState.personnel.employees.push(limitedEmployee);
    normalState.personnel.employees.push(normalEmployee);

    const makeTask = (id: string): TaskState => ({
      id,
      definitionId: 'long_task',
      status: 'pending',
      priority: 80,
      createdAtTick: 0,
      metadata: { estimatedWorkHours: 2 },
    });

    const overtimePolicy = {
      standardHoursPerDay: 12,
      overtimeThresholdHours: 12,
      maxOvertimeHoursPerDay: 12,
    };

    const limitedEngine = new WorkforceEngine(definitions, {
      policies: { overtime: overtimePolicy },
    });
    const normalEngine = new WorkforceEngine(definitions, {
      policies: { overtime: overtimePolicy },
    });

    const limitedEvents: SimulationEvent[] = [];
    const normalEvents: SimulationEvent[] = [];
    const limitedCollector = createEventCollector(limitedEvents, 1);
    const normalCollector = createEventCollector(normalEvents, 1);

    limitedState.tasks.backlog.push(makeTask('limited-1'));
    normalState.tasks.backlog.push(makeTask('normal-1'));
    limitedEngine.processTick(limitedState, 1, 240, limitedCollector);
    normalEngine.processTick(normalState, 1, 240, normalCollector);

    const limitedFirstAssignment = limitedState.tasks.active[0];
    expect(limitedFirstAssignment).toBeDefined();
    expect(limitedFirstAssignment?.assignment?.etaTick).toBeGreaterThan(2);
    expect(normalState.tasks.completed).toHaveLength(1);

    for (let tick = 2; tick <= 5; tick += 1) {
      limitedState.tasks.backlog.push(makeTask(`limited-${tick}`));
      normalState.tasks.backlog.push(makeTask(`normal-${tick}`));
      limitedEngine.processTick(limitedState, tick, 240, limitedCollector);
      normalEngine.processTick(normalState, tick, 240, normalCollector);
    }

    const limitedEmployeeAfter = limitedState.personnel.employees[0];
    const normalEmployeeAfter = normalState.personnel.employees[0];

    expect(limitedEmployeeAfter.hoursWorkedToday).toBeCloseTo(2.5, 5);
    expect(normalEmployeeAfter.hoursWorkedToday).toBeCloseTo(16, 5);

    expect(limitedState.tasks.backlog.length).toBeGreaterThan(0);
    expect(limitedState.tasks.completed).toHaveLength(1);
    expect(normalState.tasks.completed).toHaveLength(4);
    expect(normalState.tasks.backlog).toHaveLength(1);
  });

  it('applies dynamic priority boosts in 10-point increments', () => {
    const state = createBaseState();
    const room = state.structures[0].rooms[0];
    const zone = room.zones[0];
    zone.resources.reservoirLevel = 0.2;
    room.cleanliness = 0.55;

    const definitions: TaskDefinitionMap = {
      refill_supplies_water: {
        id: 'refill_supplies_water',
        costModel: { basis: 'perAction', laborMinutes: 15 },
        priority: 80,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 0,
        description: 'Refill water',
      },
      clean_zone: {
        id: 'clean_zone',
        costModel: { basis: 'perSquareMeter', laborMinutes: 1 },
        priority: 60,
        requiredRole: 'Janitor',
        requiredSkill: 'Cleanliness',
        minSkillLevel: 0,
        description: 'Clean zone',
      },
    };

    const engine = new WorkforceEngine(definitions);
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);

    engine.processTick(state, 1, state.metadata.tickLengthMinutes, collector);

    const backlog = state.tasks.backlog.filter((task) => task.status === 'pending');
    const waterTask = backlog.find((task) => task.definitionId === 'refill_supplies_water');
    const cleanTask = backlog.find((task) => task.definitionId === 'clean_zone');

    expect(waterTask?.priority).toBe(100);
    expect(cleanTask?.priority).toBe(80);
  });

  it('rotates equal-priority tasks in a round-robin order', () => {
    const state = createBaseState();
    const structure = state.structures[0];
    const room = structure.rooms[0];
    const zone = room.zones[0];

    const createTask = (id: string, createdAt: number): TaskState => ({
      id,
      definitionId: 'clean_zone',
      status: 'pending',
      priority: 60,
      createdAtTick: createdAt,
      dueTick: createdAt + 5,
      location: { structureId: structure.id, roomId: room.id, zoneId: zone.id },
      metadata: { estimatedWorkHours: 0.25, taskKey: id },
    });

    state.tasks.backlog.push(
      createTask('task-a', 1),
      createTask('task-b', 2),
      createTask('task-c', 3),
    );

    const definitions: TaskDefinitionMap = {
      clean_zone: {
        id: 'clean_zone',
        costModel: { basis: 'perSquareMeter', laborMinutes: 1 },
        priority: 60,
        requiredRole: 'Janitor',
        requiredSkill: 'Cleanliness',
        minSkillLevel: 1,
        description: 'Clean zone',
      },
    };

    const engine = new WorkforceEngine(definitions);
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);
    let processedEvents = 0;

    engine.processTick(state, 1, 60, collector);
    const tick1Events = events.slice(processedEvents);
    processedEvents = events.length;
    expect(tick1Events.some((event) => event.type === 'task.completed')).toBe(false);

    const janitor = createEmployee({
      id: 'janitor-1',
      role: 'Janitor',
      skills: { Cleanliness: 4 },
      experience: { Cleanliness: 4 },
    });
    state.personnel.employees.push(janitor);

    engine.processTick(state, 2, 60, collector);
    const tick2Events = events.slice(processedEvents);
    processedEvents = events.length;
    const completedTick2 = tick2Events.filter((event) => event.type === 'task.completed');
    expect(completedTick2).toHaveLength(1);
    expect(completedTick2[0]?.payload.taskId).toBe('task-b');

    janitor.energy = 1;
    janitor.status = 'idle';

    engine.processTick(state, 3, 60, collector);
    const tick3Events = events.slice(processedEvents);
    processedEvents = events.length;
    const completedTick3 = tick3Events.filter((event) => event.type === 'task.completed');
    expect(completedTick3).toHaveLength(1);
    expect(completedTick3[0]?.payload.taskId).toBe('task-c');

    const remainingPending = state.tasks.backlog.filter((task) => task.status === 'pending');
    expect(remainingPending).toHaveLength(1);
    expect(remainingPending[0]?.id).toBe('task-a');
  });
});
