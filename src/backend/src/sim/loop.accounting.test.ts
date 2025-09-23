import { describe, expect, it } from 'vitest';
import { EventBus } from '@/lib/eventBus.js';
import { SimulationLoop } from './loop.js';
import type {
  DeviceInstanceState,
  EmployeeState,
  GameState,
  StructureState,
  ZoneEnvironmentState,
  ZoneHealthState,
  ZoneMetricState,
  ZoneResourceState,
  ZoneState,
} from '@/state/models.js';
import { CostAccountingService } from '@/engine/economy/costAccounting.js';
import type { PriceCatalog } from '@/engine/economy/pricing.js';

const createAccountingTestState = (): GameState => {
  const createdAt = new Date().toISOString();
  const environment: ZoneEnvironmentState = {
    temperature: 24,
    relativeHumidity: 0.6,
    co2: 800,
    ppfd: 0,
    vpd: 1,
  };

  const createDevice = (id: string, blueprintId: string): DeviceInstanceState => ({
    id,
    blueprintId,
    kind: blueprintId.replace('-blueprint', ''),
    name: id,
    zoneId: 'zone-1',
    status: 'operational',
    efficiency: 1,
    runtimeHours: 0,
    maintenance: {
      lastServiceTick: 0,
      nextDueTick: 1000,
      condition: 1,
      runtimeHoursAtLastService: 0,
      degradation: 0,
    },
    settings: {},
  });

  const zone: ZoneState = {
    id: 'zone-1',
    roomId: 'room-1',
    name: 'Accounting Zone',
    cultivationMethodId: 'method-1',
    strainId: 'strain-1',
    area: 40,
    ceilingHeight: 3,
    volume: 120,
    environment,
    resources: {
      waterLiters: 0,
      nutrientSolutionLiters: 0,
      nutrientStrength: 0,
      substrateHealth: 1,
      reservoirLevel: 0.5,
    } satisfies ZoneResourceState,
    plants: [],
    devices: [
      createDevice('lamp-1', 'Lamp-blueprint'),
      createDevice('hvac-1', 'ClimateUnit-blueprint'),
      createDevice('co2-1', 'CO2Injector-blueprint'),
    ],
    metrics: {
      averageTemperature: environment.temperature,
      averageHumidity: environment.relativeHumidity,
      averageCo2: environment.co2,
      averagePpfd: environment.ppfd,
      stressLevel: 0,
      lastUpdatedTick: 0,
    } satisfies ZoneMetricState,
    control: { setpoints: {} },
    health: {
      plantHealth: {},
      pendingTreatments: [],
      appliedTreatments: [],
    } satisfies ZoneHealthState,
    activeTaskIds: [],
  };

  const room: StructureState['rooms'][number] = {
    id: 'room-1',
    structureId: 'structure-1',
    name: 'Grow Room',
    purposeId: 'purpose-1',
    area: 40,
    height: 3,
    volume: 120,
    zones: [zone],
    cleanliness: 1,
    maintenanceLevel: 1,
  };

  const structure: StructureState = {
    id: 'structure-1',
    blueprintId: 'structure-blueprint',
    name: 'Structure',
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

  return {
    metadata: {
      gameId: 'game-1',
      createdAt,
      seed: 'seed',
      difficulty: 'normal',
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
    structures: [structure],
    inventory: {
      resources: {
        waterLiters: 1_000,
        nutrientsGrams: 500,
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

const createEmployee = (id: string, salaryPerTick: number): EmployeeState => ({
  id,
  name: `Employee ${id}`,
  role: 'Gardener',
  salaryPerTick,
  status: 'idle',
  morale: 0.75,
  energy: 0.9,
  maxMinutesPerTick: 60,
  skills: {},
  experience: {},
  traits: [],
  certifications: [],
  shift: {
    shiftId: 'shift-day',
    name: 'Day Shift',
    startHour: 8,
    durationHours: 8,
    overlapMinutes: 0,
  },
  hoursWorkedToday: 0,
  overtimeHours: 0,
});

describe('SimulationLoop accounting integration', () => {
  it('applies utility, maintenance, and capex costs with finance events', async () => {
    const state = createAccountingTestState();
    state.finances.cashOnHand = 2000;
    const priceCatalog: PriceCatalog = {
      devicePrices: new Map([
        [
          'Lamp-blueprint',
          {
            capitalExpenditure: 1200,
            baseMaintenanceCostPerTick: 0.3,
            costIncreasePer1000Ticks: 0.05,
          },
        ],
        [
          'ClimateUnit-blueprint',
          {
            capitalExpenditure: 800,
            baseMaintenanceCostPerTick: 0.25,
            costIncreasePer1000Ticks: 0.05,
          },
        ],
        [
          'CO2Injector-blueprint',
          {
            capitalExpenditure: 400,
            baseMaintenanceCostPerTick: 0.1,
            costIncreasePer1000Ticks: 0.02,
          },
        ],
      ]),
      strainPrices: new Map(),
      utilityPrices: {
        pricePerKwh: 0.5,
        pricePerLiterWater: 0.1,
        pricePerGramNutrients: 0.2,
      },
    };

    const costService = new CostAccountingService(priceCatalog);
    const bus = new EventBus();
    const loop = new SimulationLoop({
      state,
      eventBus: bus,
      accounting: { service: costService },
      phases: {
        applyDevices: (context) => {
          context.accounting.recordUtility({ energyKwh: 5 });
        },
        irrigationAndNutrients: (context) => {
          context.accounting.recordUtility({ waterLiters: 10, nutrientsGrams: 2 });
        },
        accounting: (context) => {
          context.accounting.recordDevicePurchase('Lamp-blueprint', 1, 'Purchased lamp');
        },
      },
    });

    const emittedTypes: string[] = [];
    const subscription = bus.events().subscribe((event) => emittedTypes.push(event.type));
    const result = await loop.processTick();
    subscription.unsubscribe();

    const opexEvents = result.events.filter((event) => event.type === 'finance.opex');
    const capexEvents = result.events.filter((event) => event.type === 'finance.capex');
    const tickEvents = result.events.filter((event) => event.type === 'finance.tick');

    expect(capexEvents).toHaveLength(1);
    expect(tickEvents).toHaveLength(1);

    const utilityEvent = opexEvents.find(
      (event) =>
        typeof event.payload === 'object' &&
        event.payload !== null &&
        'utilities' in (event.payload as object),
    );
    expect(utilityEvent).toBeDefined();

    const maintenanceEvents = opexEvents.filter(
      (event) =>
        typeof event.payload === 'object' &&
        event.payload !== null &&
        'deviceId' in (event.payload as object),
    );
    expect(maintenanceEvents).toHaveLength(3);

    const readAmount = (event: (typeof result.events)[number] | undefined): number => {
      if (!event || typeof event.payload !== 'object' || event.payload === null) {
        return 0;
      }
      const payload = event.payload as { amount?: number };
      return typeof payload.amount === 'number' ? payload.amount : 0;
    };

    const utilityAmount = readAmount(utilityEvent);
    const maintenanceTotal = maintenanceEvents.reduce((sum, event) => sum + readAmount(event), 0);
    const capexAmount = readAmount(capexEvents[0]);

    expect(utilityAmount).toBeCloseTo(3.9, 6);
    expect(capexAmount).toBeCloseTo(1200, 6);
    expect(maintenanceTotal).toBeGreaterThan(0);

    const expectedTotalExpenses = utilityAmount + maintenanceTotal + capexAmount;
    expect(state.finances.summary.totalExpenses).toBeCloseTo(expectedTotalExpenses, 6);
    expect(state.finances.summary.totalMaintenance).toBeCloseTo(maintenanceTotal, 6);
    expect(state.finances.cashOnHand).toBeCloseTo(2000 - expectedTotalExpenses, 6);
    expect(state.finances.ledger).toHaveLength(5);

    const tickPayload = tickEvents[0]?.payload as
      | { capex?: number; opex?: number; maintenance?: unknown; netIncome?: number }
      | undefined;
    expect(tickPayload?.capex).toBeCloseTo(capexAmount, 6);
    expect(tickPayload?.opex).toBeCloseTo(utilityAmount + maintenanceTotal, 6);
    expect(tickPayload?.netIncome).toBeCloseTo(
      -(utilityAmount + maintenanceTotal + capexAmount),
      6,
    );

    expect(emittedTypes).toContain('finance.capex');
    expect(emittedTypes).toContain('finance.tick');
  });

  it('deducts payroll during the accounting phase and emits payroll events', async () => {
    const state = createAccountingTestState();
    state.structures = [];
    state.finances.cashOnHand = 500;
    state.personnel.employees = [createEmployee('emp-1', 15), createEmployee('emp-2', 10.5)];

    const priceCatalog: PriceCatalog = {
      devicePrices: new Map(),
      strainPrices: new Map(),
      utilityPrices: {
        pricePerKwh: 0.5,
        pricePerLiterWater: 0.1,
        pricePerGramNutrients: 0.2,
      },
    };

    const costService = new CostAccountingService(priceCatalog);
    const loop = new SimulationLoop({
      state,
      accounting: { service: costService },
      phases: {
        accounting: () => undefined,
      },
    });

    const result = await loop.processTick();

    const payrollTotal = 25.5;
    expect(state.finances.cashOnHand).toBeCloseTo(500 - payrollTotal, 6);
    expect(state.finances.ledger).toHaveLength(1);
    expect(state.finances.ledger[0]).toMatchObject({ category: 'payroll', amount: -payrollTotal });
    expect(state.finances.summary.totalExpenses).toBeCloseTo(payrollTotal, 6);
    expect(state.finances.summary.totalPayroll).toBeCloseTo(payrollTotal, 6);
    expect(state.finances.summary.lastTickExpenses).toBeCloseTo(payrollTotal, 6);

    const payrollEvent = result.events.find((event) => event.type === 'finance.opex');
    expect(payrollEvent).toBeDefined();
    expect(payrollEvent?.payload).toMatchObject({ category: 'payroll', amount: payrollTotal });

    const tickEvent = result.events.find((event) => event.type === 'finance.tick');
    expect(tickEvent).toBeDefined();
    expect(tickEvent?.payload).toMatchObject({ payroll: payrollTotal, expenses: payrollTotal });
  });

  it('keeps rent and maintenance costs consistent when tick length changes mid-run', async () => {
    const createScenarioState = (tickLengthMinutes: number, rentPerHour: number): GameState => {
      const base = createAccountingTestState();
      base.metadata.tickLengthMinutes = tickLengthMinutes;
      base.finances.cashOnHand = 1_000_000;
      const structure = base.structures[0];
      const zone = structure.rooms[0].zones[0];
      zone.devices = [zone.devices[0]];
      structure.rentPerTick = rentPerHour;
      return base;
    };

    const rentPerHour = 175;
    const maintenancePerHour = 42;

    const priceCatalog: PriceCatalog = {
      devicePrices: new Map([
        [
          'Lamp-blueprint',
          {
            capitalExpenditure: 0,
            baseMaintenanceCostPerTick: maintenancePerHour,
            costIncreasePer1000Ticks: 0,
          },
        ],
      ]),
      strainPrices: new Map(),
      utilityPrices: { pricePerKwh: 0, pricePerLiterWater: 0, pricePerGramNutrients: 0 },
    };

    const createLoopWithState = (
      tickLengthMinutes: number,
    ): { state: GameState; loop: SimulationLoop } => {
      const state = createScenarioState(tickLengthMinutes, rentPerHour);
      const costService = new CostAccountingService(priceCatalog);
      const loop = new SimulationLoop({ state, accounting: { service: costService } });
      return { state, loop };
    };

    const runTicks = async (loop: SimulationLoop, count: number) => {
      for (let index = 0; index < count; index += 1) {
        await loop.processTick();
      }
    };

    const baseline = createLoopWithState(60);
    await runTicks(baseline.loop, 2);

    const variable = createLoopWithState(60);
    await runTicks(variable.loop, 1);
    variable.state.metadata.tickLengthMinutes = 15;
    await runTicks(variable.loop, 4);

    const sumRent = (state: GameState): number =>
      state.finances.ledger
        .filter((entry) => entry.category === 'rent')
        .reduce((sum, entry) => sum - entry.amount, 0);

    expect(sumRent(variable.state)).toBeCloseTo(sumRent(baseline.state), 3);
    expect(variable.state.finances.summary.totalMaintenance).toBeCloseTo(
      baseline.state.finances.summary.totalMaintenance,
      3,
    );
  });
});
