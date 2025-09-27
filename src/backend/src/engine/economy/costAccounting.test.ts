import { describe, expect, it } from 'vitest';
import { createEventCollector } from '@/lib/eventBus.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import type { DeviceInstanceState, EmployeeState, GameState, LedgerEntry } from '@/state/models.js';
import { DeviceDegradationService } from '@/engine/environment/deviceDegradation.js';
import { CostAccountingService } from './costAccounting.js';
import { MissingDevicePriceError } from './devicePriceRegistry.js';
import type { PriceCatalog } from './pricing.js';

const DEVICE_BLUEPRINT_ID = '3b5f6ad7-672e-47cd-9a24-f0cc45c4101e';

const createEmployee = (id: string, salaryPerTick: number): EmployeeState => ({
  id,
  name: `Employee ${id}`,
  role: 'Gardener',
  salaryPerTick,
  status: 'idle',
  morale: 0.8,
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

const createPriceCatalog = (): PriceCatalog => ({
  devicePrices: new Map([
    [
      DEVICE_BLUEPRINT_ID,
      {
        capitalExpenditure: 600,
        baseMaintenanceCostPerTick: 0.002,
        costIncreasePer1000Ticks: 0.0008,
      },
    ],
  ]),
  strainPrices: new Map(),
  utilityPrices: {
    pricePerKwh: 0.15,
    pricePerLiterWater: 0.02,
    pricePerGramNutrients: 0.1,
  },
});

const createBaseState = (): GameState => {
  const createdAt = '2025-01-01T00:00:00.000Z';
  return {
    metadata: {
      gameId: 'test-game',
      createdAt,
      seed: 'seed',
      difficulty: 'normal',
      simulationVersion: '0.1.0',
      tickLengthMinutes: 60,
      economics: {
        initialCapital: 0,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.2,
        rentPerSqmRoomPerTick: 0.3,
      },
    },
    clock: {
      tick: 0,
      isPaused: true,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [],
    inventory: {
      resources: {
        waterLiters: 500,
        nutrientsGrams: 250,
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
      cashOnHand: 1000,
      reservedCash: 0,
      outstandingLoans: [],
      ledger: [] as LedgerEntry[],
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
        pricePerKwh: 0.15,
        pricePerLiterWater: 0.02,
        pricePerGramNutrients: 0.05,
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

const attachDeviceToState = (state: GameState, device: DeviceInstanceState): void => {
  state.structures = [
    {
      id: 'structure-1',
      blueprintId: 'structure-blueprint',
      name: 'Structure 1',
      status: 'active',
      footprint: { length: 1, width: 1, height: 1, area: 1, volume: 1 },
      rooms: [
        {
          id: 'room-1',
          structureId: 'structure-1',
          name: 'Room 1',
          purposeId: 'purpose-1',
          area: 1,
          height: 1,
          volume: 1,
          zones: [
            {
              id: 'zone-1',
              roomId: 'room-1',
              name: 'Zone 1',
              cultivationMethodId: 'method-1',
              strainId: undefined,
              area: 1,
              ceilingHeight: 1,
              volume: 1,
              environment: {
                temperature: 0,
                relativeHumidity: 0,
                co2: 0,
                ppfd: 0,
                vpd: 0,
              },
              resources: {
                waterLiters: 0,
                nutrientSolutionLiters: 0,
                nutrientStrength: 0,
                substrateHealth: 0,
                reservoirLevel: 0,
                lastTranspirationLiters: 0,
              },
              plants: [],
              devices: [device],
              metrics: {
                averageTemperature: 0,
                averageHumidity: 0,
                averageCo2: 0,
                averagePpfd: 0,
                stressLevel: 0,
                lastUpdatedTick: 0,
              },
              control: { setpoints: {} },
              health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
              activeTaskIds: [],
            },
          ],
          cleanliness: 1,
          maintenanceLevel: 1,
        },
      ],
      rentPerTick: 0,
      upfrontCostPaid: 0,
    },
  ];
};

describe('CostAccountingService', () => {
  it('records utility consumption costs and emits finance events', () => {
    const catalog = createPriceCatalog();
    const service = new CostAccountingService(catalog);
    const state = createBaseState();
    const accumulator = service.createAccumulator();
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 1);
    const timestamp = '2025-01-01T01:00:00.000Z';

    const record = service.applyUtilityConsumption(
      state,
      { energyKwh: 12, waterLiters: 50, nutrientsGrams: 10 },
      1,
      timestamp,
      accumulator,
      collector,
    );

    expect(record).toBeDefined();
    expect(record?.totalCost).toBeCloseTo(3.8, 6);
    expect(state.inventory.resources.waterLiters).toBeCloseTo(450, 6);
    expect(state.inventory.resources.nutrientsGrams).toBeCloseTo(240, 6);
    expect(state.finances.cashOnHand).toBeCloseTo(1000 - (record?.totalCost ?? 0), 6);

    service.finalizeTick(state, accumulator, 1, timestamp, collector);

    expect(state.finances.summary.lastTickExpenses).toBeCloseTo(record?.totalCost ?? 0, 6);
    expect(state.finances.summary.totalExpenses).toBeCloseTo(record?.totalCost ?? 0, 6);
    expect(state.finances.summary.totalMaintenance).toBeCloseTo(0, 6);

    const eventTypes = events.map((event) => event.type);
    expect(eventTypes).toEqual(['finance.opex', 'finance.tick']);

    const [opexEvent, tickEvent] = events;
    if (!opexEvent || !tickEvent) {
      throw new Error('Expected finance events to be recorded');
    }
    const opexPayload = opexEvent.payload as { utilities: { totalCost: number } };
    expect(opexPayload.utilities.totalCost).toBeCloseTo(record?.totalCost ?? 0, 6);

    const tickPayload = tickEvent.payload as { utilities: { totalCost: number }; expenses: number };
    expect(tickPayload.expenses).toBeCloseTo(record?.totalCost ?? 0, 6);
    expect(tickPayload.utilities.totalCost).toBeCloseTo(record?.totalCost ?? 0, 6);
  });

  it('applies payroll expenses, records ledger entries, and updates summaries', () => {
    const catalog = createPriceCatalog();
    const service = new CostAccountingService(catalog);
    const state = createBaseState();
    state.personnel.employees = [
      createEmployee('emp-1', 12.5),
      createEmployee('emp-2', 7.25),
      createEmployee('emp-3', -5),
    ];

    const accumulator = service.createAccumulator();
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 2);
    const timestamp = '2025-01-01T02:00:00.000Z';

    const payroll = service.applyPayroll(state, 2, timestamp, accumulator, collector);

    expect(payroll).toBeDefined();
    expect(payroll).toBeCloseTo(19.75, 6);
    expect(accumulator.payroll).toBeCloseTo(19.75, 6);
    expect(state.finances.cashOnHand).toBeCloseTo(1000 - 19.75, 6);
    expect(state.finances.ledger).toHaveLength(1);
    const [payrollEntry] = state.finances.ledger;
    if (!payrollEntry) throw new Error('Expected payroll ledger entry to be recorded');
    expect(payrollEntry).toMatchObject({ category: 'payroll', amount: -19.75 });

    const opexEvent = events.find((event) => event.type === 'finance.opex');
    expect(opexEvent).toBeDefined();
    expect(opexEvent?.payload).toMatchObject({
      amount: 19.75,
      category: 'payroll',
      employeeCount: 3,
    });

    service.finalizeTick(state, accumulator, 2, timestamp, collector);

    expect(state.finances.summary.totalExpenses).toBeCloseTo(19.75, 6);
    expect(state.finances.summary.totalPayroll).toBeCloseTo(19.75, 6);
    expect(state.finances.summary.totalMaintenance).toBeCloseTo(0, 6);
    expect(state.finances.summary.lastTickExpenses).toBeCloseTo(19.75, 6);

    const tickEvent = events.find((event) => event.type === 'finance.tick');
    expect(tickEvent).toBeDefined();
    expect(tickEvent?.payload).toMatchObject({
      expenses: 19.75,
      payroll: 19.75,
    });
  });

  it('escalates maintenance costs with device age and degradation', () => {
    const catalog = createPriceCatalog();
    const service = new CostAccountingService(catalog);
    const state = createBaseState();

    const device: DeviceInstanceState = {
      id: 'device-1',
      blueprintId: DEVICE_BLUEPRINT_ID,
      kind: 'Lamp',
      name: 'LED VegLight',
      zoneId: 'zone-1',
      status: 'operational',
      efficiency: 1,
      runtimeHours: 0,
      maintenance: {
        lastServiceTick: 0,
        nextDueTick: 0,
        condition: 1,
        runtimeHoursAtLastService: 0,
        degradation: 0.3,
      },
      settings: {},
    };

    const timestamp1 = '2025-01-01T05:00:00.000Z';
    const accumulator1 = service.createAccumulator();
    const events1: SimulationEvent[] = [];
    const collector1 = createEventCollector(events1, 500);
    const record1 = service.applyMaintenanceExpense(
      state,
      device,
      500,
      timestamp1,
      state.metadata.tickLengthMinutes / 60,
      accumulator1,
      collector1,
    );

    expect(record1).toBeDefined();
    expect(record1?.totalCost).toBeGreaterThan(0);

    service.finalizeTick(state, accumulator1, 500, timestamp1, collector1);

    const [maintenanceEvent1] = events1;
    if (!maintenanceEvent1) throw new Error('Expected maintenance event at initial tick');
    const maintenancePayload1 = maintenanceEvent1.payload as { maintenance: { totalCost: number } };
    expect(maintenancePayload1.maintenance.totalCost).toBeCloseTo(record1?.totalCost ?? 0, 6);

    const timestamp2 = '2025-01-02T05:00:00.000Z';
    const accumulator2 = service.createAccumulator();
    const events2: SimulationEvent[] = [];
    const collector2 = createEventCollector(events2, 1500);
    const record2 = service.applyMaintenanceExpense(
      state,
      device,
      1500,
      timestamp2,
      state.metadata.tickLengthMinutes / 60,
      accumulator2,
      collector2,
    );

    expect(record2).toBeDefined();
    expect(record2?.totalCost ?? 0).toBeGreaterThan(record1?.totalCost ?? 0);

    service.finalizeTick(state, accumulator2, 1500, timestamp2, collector2);

    const [maintenanceEvent2] = events2;
    if (!maintenanceEvent2) throw new Error('Expected maintenance event at later tick');
    const maintenancePayload2 = maintenanceEvent2.payload as { maintenance: { totalCost: number } };
    expect(maintenancePayload2.maintenance.totalCost).toBeCloseTo(record2?.totalCost ?? 0, 6);

    const totalMaintenance = (record1?.totalCost ?? 0) + (record2?.totalCost ?? 0);
    expect(state.finances.summary.totalMaintenance).toBeCloseTo(totalMaintenance, 6);
    expect(state.finances.cashOnHand).toBeCloseTo(1000 - totalMaintenance, 6);
  });

  it('records capital expenditure when purchasing devices', () => {
    const catalog = createPriceCatalog();
    const service = new CostAccountingService(catalog);
    const state = createBaseState();
    const accumulator = service.createAccumulator();
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 5);
    const timestamp = '2025-01-01T08:00:00.000Z';

    const cost = service.recordDevicePurchase(
      state,
      DEVICE_BLUEPRINT_ID,
      2,
      5,
      timestamp,
      accumulator,
      collector,
      'Install lights',
    );

    expect(cost).toBeGreaterThan(0);
    expect(state.finances.cashOnHand).toBeCloseTo(1000 - cost, 6);
    expect(state.finances.ledger).toHaveLength(1);
    const [deviceEntry] = state.finances.ledger;
    if (!deviceEntry) throw new Error('Expected device purchase ledger entry');
    expect(deviceEntry.category).toBe('device');
    expect(accumulator.capex).toBeCloseTo(cost, 6);
    expect(accumulator.expenses).toBeCloseTo(cost, 6);

    const capexEvent = events.find((event) => event.type === 'finance.capex');
    expect(capexEvent).toBeDefined();
    expect(capexEvent?.payload).toMatchObject({
      amount: cost,
      blueprintId: DEVICE_BLUEPRINT_ID,
      quantity: 2,
    });
  });

  it('drops maintenance costs back to the base tier after servicing a device', () => {
    const catalog = createPriceCatalog();
    const costService = new CostAccountingService(catalog);
    const degradationService = new DeviceDegradationService();
    const state = createBaseState();
    const device: DeviceInstanceState = {
      id: 'device-1',
      blueprintId: DEVICE_BLUEPRINT_ID,
      kind: 'Lamp',
      name: 'LED VegLight',
      zoneId: 'zone-1',
      status: 'operational',
      efficiency: 1,
      runtimeHours: 0,
      maintenance: {
        lastServiceTick: 0,
        nextDueTick: 0,
        condition: 1,
        runtimeHoursAtLastService: 0,
        degradation: 0.3,
      },
      settings: {},
    };

    attachDeviceToState(state, device);

    const baseCost = catalog.devicePrices.get(DEVICE_BLUEPRINT_ID)?.baseMaintenanceCostPerTick ?? 0;

    const beforeAccumulator = costService.createAccumulator();
    const beforeEvents: SimulationEvent[] = [];
    const beforeCollector = createEventCollector(beforeEvents, 2500);
    const beforeRecord = costService.applyMaintenanceExpense(
      state,
      device,
      2500,
      '2025-01-01T05:00:00.000Z',
      state.metadata.tickLengthMinutes / 60,
      beforeAccumulator,
      beforeCollector,
    );

    expect(beforeRecord).toBeDefined();
    expect(beforeRecord?.ageTicks).toBe(2500);
    expect(beforeRecord?.ageAdjustedCostPerHour).toBeGreaterThan(baseCost);
    expect(beforeRecord?.totalCost).toBeGreaterThan(baseCost);

    device.status = 'maintenance';
    degradationService.process(state, 2500, state.metadata.tickLengthMinutes);

    expect(device.maintenance.lastServiceTick).toBe(2500);
    expect(device.maintenance.degradation).toBe(0);
    expect(device.maintenance.nextDueTick).toBeGreaterThan(2500);

    device.status = 'operational';

    const afterAccumulator = costService.createAccumulator();
    const afterEvents: SimulationEvent[] = [];
    const afterCollector = createEventCollector(afterEvents, 2501);
    const afterRecord = costService.applyMaintenanceExpense(
      state,
      device,
      2501,
      '2025-01-01T06:00:00.000Z',
      state.metadata.tickLengthMinutes / 60,
      afterAccumulator,
      afterCollector,
    );

    expect(afterRecord).toBeDefined();
    expect(afterRecord?.ageTicks).toBe(1);
    expect(afterRecord?.ageAdjustedCostPerHour).toBeCloseTo(baseCost, 10);
    expect(afterRecord?.totalCost).toBeCloseTo(baseCost, 10);
  });

  it('throws a descriptive error when purchasing a device without a price entry', () => {
    const catalog: PriceCatalog = {
      devicePrices: new Map(),
      strainPrices: new Map(),
      utilityPrices: {
        pricePerKwh: 0.15,
        pricePerLiterWater: 0.02,
        pricePerGramNutrients: 0.1,
      },
    };
    const service = new CostAccountingService(catalog);
    const state = createBaseState();
    const accumulator = service.createAccumulator();
    const events: SimulationEvent[] = [];
    const collector = createEventCollector(events, 5);

    try {
      service.recordDevicePurchase(
        state,
        'missing-device-blueprint',
        1,
        5,
        '2025-01-01T09:00:00.000Z',
        accumulator,
        collector,
      );
      expect.fail('Expected recordDevicePurchase to throw when price is missing.');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingDevicePriceError);
      expect((error as Error).message).toContain(
        'Missing device price entry for blueprint "missing-device-blueprint"',
      );
    }
  });

  it('normalizes maintenance and rent costs across tick lengths for equivalent simulated hours', () => {
    const totalHours = 12;
    const rentPerHour = 250;

    const runScenario = (tickLengthMinutes: number) => {
      const catalog = createPriceCatalog();
      const service = new CostAccountingService(catalog);
      const state = createBaseState();
      state.metadata.tickLengthMinutes = tickLengthMinutes;
      state.finances.cashOnHand = 1_000_000;

      const device: DeviceInstanceState = {
        id: `device-${tickLengthMinutes}`,
        blueprintId: DEVICE_BLUEPRINT_ID,
        kind: 'Lamp',
        name: 'Lamp',
        zoneId: 'zone-1',
        status: 'operational',
        efficiency: 1,
        runtimeHours: 0,
        maintenance: {
          lastServiceTick: 0,
          nextDueTick: 0,
          condition: 1,
          runtimeHoursAtLastService: 0,
          degradation: 0,
        },
        settings: {},
      } satisfies DeviceInstanceState;

      attachDeviceToState(state, device);
      const [structure] = state.structures;
      if (!structure) throw new Error('Expected structure in state');
      structure.rentPerTick = rentPerHour;

      const tickLengthHours = tickLengthMinutes / 60;
      const tickCount = Math.round(totalHours / tickLengthHours);

      for (let tick = 1; tick <= tickCount; tick += 1) {
        const accumulator = service.createAccumulator();
        const events: SimulationEvent[] = [];
        const collector = createEventCollector(events, tick);
        const timestamp = new Date(Date.UTC(2025, 0, 1, tick)).toISOString();

        service.applyStructureRent(
          state,
          structure,
          tick,
          timestamp,
          tickLengthHours,
          accumulator,
          collector,
        );

        const [firstRoom] = structure.rooms;
        if (!firstRoom) throw new Error('Expected room in structure');
        const [firstZone] = firstRoom.zones;
        if (!firstZone) throw new Error('Expected zone in room');
        const [firstDevice] = firstZone.devices;
        if (!firstDevice) throw new Error('Expected device in zone');

        service.applyMaintenanceExpense(
          state,
          firstDevice,
          tick,
          timestamp,
          tickLengthHours,
          accumulator,
          collector,
        );

        service.finalizeTick(state, accumulator, tick, timestamp, collector);
      }

      const rentTotal = state.finances.ledger
        .filter((entry) => entry.category === 'rent')
        .reduce((sum, entry) => sum - entry.amount, 0);

      return {
        maintenance: state.finances.summary.totalMaintenance,
        rent: rentTotal,
      };
    };

    const hourly = runScenario(60);
    const quarterHourly = runScenario(15);

    expect(quarterHourly.maintenance).toBeCloseTo(hourly.maintenance, 6);
    expect(quarterHourly.rent).toBeCloseTo(hourly.rent, 6);
  });
});
