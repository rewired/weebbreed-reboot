import { describe, expect, it } from 'vitest';
import { createEventCollector } from '../../lib/eventBus.js';
import type { SimulationEvent } from '../../lib/eventBus.js';
import type {
  EmployeeState,
  GameState,
  PendingTreatmentApplication,
  TaskDefinitionMap,
  TreatmentCategory,
  ZoneState,
} from '../../state/models.js';
import { WorkforceEngine } from './workforceEngine.js';

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
            purposeId: 'grow',
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
  skills: { Gardening: 4 },
  experience: { Gardening: 4 },
  traits: [],
  certifications: [],
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
        priority: 9,
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
    zone.devices.push({
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
        priority: 6,
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
    expect(updatedTech.energy).toBeCloseTo(0.78, 2);
  });
});
