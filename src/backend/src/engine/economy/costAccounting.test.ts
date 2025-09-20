import { describe, expect, it } from 'vitest';
import { createEventCollector } from '../../lib/eventBus.js';
import type { SimulationEvent } from '../../lib/eventBus.js';
import type { DeviceInstanceState, GameState, LedgerEntry } from '../../state/models.js';
import { CostAccountingService } from './costAccounting.js';
import type { PriceCatalog } from './pricing.js';

const DEVICE_BLUEPRINT_ID = '3b5f6ad7-672e-47cd-9a24-f0cc45c4101e';

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

    const opexPayload = events[0].payload as { utilities: { totalCost: number } };
    expect(opexPayload.utilities.totalCost).toBeCloseTo(record?.totalCost ?? 0, 6);

    const tickPayload = events[1].payload as { utilities: { totalCost: number }; expenses: number };
    expect(tickPayload.expenses).toBeCloseTo(record?.totalCost ?? 0, 6);
    expect(tickPayload.utilities.totalCost).toBeCloseTo(record?.totalCost ?? 0, 6);
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
      accumulator1,
      collector1,
    );

    expect(record1).toBeDefined();
    expect(record1?.totalCost).toBeGreaterThan(0);

    service.finalizeTick(state, accumulator1, 500, timestamp1, collector1);

    const maintenancePayload1 = events1[0].payload as { maintenance: { totalCost: number } };
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
      accumulator2,
      collector2,
    );

    expect(record2).toBeDefined();
    expect(record2?.totalCost ?? 0).toBeGreaterThan(record1?.totalCost ?? 0);

    service.finalizeTick(state, accumulator2, 1500, timestamp2, collector2);

    const maintenancePayload2 = events2[0].payload as { maintenance: { totalCost: number } };
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
    expect(state.finances.ledger[0].category).toBe('device');
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
});
