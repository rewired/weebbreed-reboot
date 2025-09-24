import type { EventCollector } from '@/lib/eventBus.js';
import type {
  DeviceInstanceState,
  FinanceState,
  GameState,
  LedgerCategory,
  LedgerEntry,
  StructureState,
} from '@/state/models.js';
import type { PriceCatalog } from './pricing.js';
import { DevicePriceRegistry } from './devicePriceRegistry.js';

export interface UtilityConsumption {
  energyKwh?: number;
  waterLiters?: number;
  nutrientsGrams?: number;
}

export interface UtilityCostDetail {
  quantity: number;
  baseUnitCost: number;
  unitCost: number;
  totalCost: number;
}

export interface UtilityCostBreakdown {
  energy: UtilityCostDetail;
  water: UtilityCostDetail;
  nutrients: UtilityCostDetail;
  totalCost: number;
}

export interface UtilityExpenseRecord extends UtilityCostBreakdown {
  appliedMultiplier: number;
}

export interface MaintenanceComputation {
  deviceId: string;
  blueprintId: string;
  ageTicks: number;
  increments: number;
  baseCostPerHour: number;
  ageAdjustedCostPerHour: number;
  hoursBilled: number;
  degradationMultiplier: number;
  preMultiplierCost: number;
}

export interface MaintenanceExpenseRecord extends MaintenanceComputation {
  appliedMultiplier: number;
  totalCost: number;
}

export interface TickAccumulator {
  revenue: number;
  expenses: number;
  capex: number;
  opex: number;
  maintenance: number;
  payroll: number;
  utilities: UtilityCostBreakdown;
  maintenanceDetails: MaintenanceExpenseRecord[];
}

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const createEmptyUtilityDetail = (): UtilityCostDetail => ({
  quantity: 0,
  baseUnitCost: 0,
  unitCost: 0,
  totalCost: 0,
});

const createEmptyUtilityBreakdown = (): UtilityCostBreakdown => ({
  energy: createEmptyUtilityDetail(),
  water: createEmptyUtilityDetail(),
  nutrients: createEmptyUtilityDetail(),
  totalCost: 0,
});

const MULTIPLIER_TOLERANCE = 1e-9;

const DEFAULT_DESCRIPTION = {
  utilities: 'Utility consumption',
  maintenance: 'Device maintenance',
  devicePurchase: 'Device purchase',
  payroll: 'Employee payroll',
};

export class CostAccountingService {
  private devicePrices: DevicePriceRegistry;

  constructor(private prices: PriceCatalog) {
    this.devicePrices = DevicePriceRegistry.fromCatalog(prices);
  }

  createAccumulator(): TickAccumulator {
    return {
      revenue: 0,
      expenses: 0,
      capex: 0,
      opex: 0,
      maintenance: 0,
      payroll: 0,
      utilities: createEmptyUtilityBreakdown(),
      maintenanceDetails: [],
    };
  }

  updatePriceCatalog(catalog: PriceCatalog): void {
    this.prices = catalog;
    this.devicePrices = DevicePriceRegistry.fromCatalog(catalog);
  }

  applyUtilityConsumption(
    state: GameState,
    consumption: UtilityConsumption,
    tick: number,
    timestamp: string,
    accumulator: TickAccumulator,
    events: EventCollector,
  ): UtilityExpenseRecord | undefined {
    const actual = this.clampUtilityConsumption(state, consumption);
    if (
      actual.energyKwh <= MULTIPLIER_TOLERANCE &&
      actual.waterLiters <= MULTIPLIER_TOLERANCE &&
      actual.nutrientsGrams <= MULTIPLIER_TOLERANCE
    ) {
      return undefined;
    }

    const baseBreakdown = this.calculateUtilityCost(actual);
    const multiplier = state.metadata.economics.itemPriceMultiplier ?? 1;
    const record = this.scaleUtilityBreakdown(baseBreakdown, multiplier);

    if (record.totalCost <= MULTIPLIER_TOLERANCE) {
      return undefined;
    }

    this.addUtilityToAccumulator(accumulator.utilities, record);

    this.recordExpense(
      state,
      record.totalCost,
      'utilities',
      DEFAULT_DESCRIPTION.utilities,
      tick,
      timestamp,
      accumulator,
      events,
      'opex',
      { utilities: record },
    );

    return record;
  }

  applyMaintenanceExpense(
    state: GameState,
    device: DeviceInstanceState,
    tick: number,
    timestamp: string,
    tickLengthHours: number,
    accumulator: TickAccumulator,
    events: EventCollector,
  ): MaintenanceExpenseRecord | undefined {
    const computation = this.calculateMaintenanceCost(device, tick, tickLengthHours);
    if (!computation || computation.preMultiplierCost <= MULTIPLIER_TOLERANCE) {
      return undefined;
    }

    const multiplier = state.metadata.economics.itemPriceMultiplier ?? 1;
    const totalCost = computation.preMultiplierCost * multiplier;
    if (totalCost <= MULTIPLIER_TOLERANCE) {
      return undefined;
    }

    const record: MaintenanceExpenseRecord = {
      ...computation,
      appliedMultiplier: multiplier,
      totalCost,
    };

    accumulator.maintenanceDetails.push(record);

    this.recordExpense(
      state,
      totalCost,
      'maintenance',
      `${DEFAULT_DESCRIPTION.maintenance}: ${device.name ?? device.id}`,
      tick,
      timestamp,
      accumulator,
      events,
      'opex',
      {
        deviceId: device.id,
        blueprintId: device.blueprintId,
        maintenance: record,
      },
    );

    return record;
  }

  applyStructureRent(
    state: GameState,
    structure: StructureState,
    tick: number,
    timestamp: string,
    tickLengthHours: number,
    accumulator: TickAccumulator,
    events: EventCollector,
  ): number | undefined {
    const hoursBilled = Number.isFinite(tickLengthHours) ? Math.max(tickLengthHours, 0) : 0;
    if (!(hoursBilled > 0)) {
      return undefined;
    }

    const rentRatePerHour = this.getStructureRentRatePerHour(structure);
    const rentCost = rentRatePerHour * hoursBilled;
    if (rentCost <= MULTIPLIER_TOLERANCE) {
      return undefined;
    }

    this.recordExpense(
      state,
      rentCost,
      'rent',
      `Structure rent: ${structure.name ?? structure.id}`,
      tick,
      timestamp,
      accumulator,
      events,
      'opex',
      {
        structureId: structure.id,
        rentPerHour: rentRatePerHour,
        hoursBilled,
      },
    );

    return rentCost;
  }

  /**
   * `StructureState.rentPerTick` is a legacy field name; the stored value already
   * represents an hourly base rate so recurring costs stay consistent when tick
   * length changes. Centralizing the sanitization keeps this convention obvious
   * and prevents other callers from reintroducing per-tick assumptions.
   */
  private getStructureRentRatePerHour(structure: StructureState): number {
    const rawRate = Number.isFinite(structure.rentPerTick) ? structure.rentPerTick : 0;
    return Math.max(rawRate, 0);
  }

  applyPayroll(
    state: GameState,
    tick: number,
    timestamp: string,
    accumulator: TickAccumulator,
    events: EventCollector,
  ): number | undefined {
    const employees = state.personnel.employees ?? [];
    if (employees.length === 0) {
      return undefined;
    }

    const totalPayroll = employees.reduce((sum, employee) => {
      const salary = Number.isFinite(employee.salaryPerTick) ? employee.salaryPerTick : 0;
      return sum + Math.max(0, salary);
    }, 0);

    if (totalPayroll <= MULTIPLIER_TOLERANCE) {
      return undefined;
    }

    this.recordExpense(
      state,
      totalPayroll,
      'payroll',
      DEFAULT_DESCRIPTION.payroll,
      tick,
      timestamp,
      accumulator,
      events,
      'opex',
      {
        employeeCount: employees.length,
        payroll: totalPayroll,
        averageSalaryPerTick: employees.length > 0 ? totalPayroll / employees.length : 0,
      },
    );

    return totalPayroll;
  }

  recordDevicePurchase(
    state: GameState,
    blueprintId: string,
    quantity: number,
    tick: number,
    timestamp: string,
    accumulator: TickAccumulator,
    events: EventCollector,
    description = DEFAULT_DESCRIPTION.devicePurchase,
  ): number {
    const sanitizedQuantity = Math.max(Number.isFinite(quantity) ? quantity : 0, 0);

    if (sanitizedQuantity <= 0) {
      return 0;
    }

    const entry = this.devicePrices.require(blueprintId, {
      context: 'recording device purchase',
      quantity: sanitizedQuantity,
    });

    const baseCost = entry.capitalExpenditure * sanitizedQuantity;
    const multiplier = state.metadata.economics.itemPriceMultiplier ?? 1;
    const totalCost = baseCost * multiplier;

    if (totalCost <= MULTIPLIER_TOLERANCE) {
      return 0;
    }

    this.recordExpense(
      state,
      totalCost,
      'device',
      description,
      tick,
      timestamp,
      accumulator,
      events,
      'capex',
      {
        blueprintId,
        quantity: sanitizedQuantity,
        unitCost: entry.capitalExpenditure,
        baseCost,
        multiplier,
      },
    );

    return totalCost;
  }

  finalizeTick(
    state: GameState,
    accumulator: TickAccumulator,
    tick: number,
    timestamp: string,
    events: EventCollector,
  ): void {
    const summary = state.finances.summary;
    summary.totalRevenue += accumulator.revenue;
    summary.totalExpenses += accumulator.expenses;
    summary.totalMaintenance += accumulator.maintenance;
    summary.totalPayroll += accumulator.payroll;
    summary.lastTickRevenue = accumulator.revenue;
    summary.lastTickExpenses = accumulator.expenses;
    summary.netIncome = summary.totalRevenue - summary.totalExpenses;

    events.queue(
      'finance.tick',
      {
        tick,
        timestamp,
        revenue: accumulator.revenue,
        expenses: accumulator.expenses,
        netIncome: accumulator.revenue - accumulator.expenses,
        capex: accumulator.capex,
        opex: accumulator.opex,
        utilities: accumulator.utilities,
        maintenance: accumulator.maintenanceDetails,
        payroll: accumulator.payroll,
      },
      tick,
      'info',
    );
  }

  private clampUtilityConsumption(
    state: GameState,
    consumption: UtilityConsumption,
  ): Required<UtilityConsumption> {
    const desiredEnergy = Math.max(
      Number.isFinite(consumption.energyKwh) ? (consumption.energyKwh ?? 0) : 0,
      0,
    );
    const desiredWater = Math.max(
      Number.isFinite(consumption.waterLiters) ? (consumption.waterLiters ?? 0) : 0,
      0,
    );
    const desiredNutrients = Math.max(
      Number.isFinite(consumption.nutrientsGrams) ? (consumption.nutrientsGrams ?? 0) : 0,
      0,
    );

    const resources = state.inventory.resources;

    const availableWater = Math.max(resources.waterLiters, 0);
    const availableNutrients = Math.max(resources.nutrientsGrams, 0);

    const actualWater = Math.min(desiredWater, availableWater);
    const actualNutrients = Math.min(desiredNutrients, availableNutrients);

    resources.waterLiters = availableWater - actualWater;
    resources.nutrientsGrams = availableNutrients - actualNutrients;

    return {
      energyKwh: desiredEnergy,
      waterLiters: actualWater,
      nutrientsGrams: actualNutrients,
    };
  }

  private calculateUtilityCost(consumption: Required<UtilityConsumption>): UtilityCostBreakdown {
    const prices = this.prices.utilityPrices;
    const energyTotal = consumption.energyKwh * prices.pricePerKwh;
    const waterTotal = consumption.waterLiters * prices.pricePerLiterWater;
    const nutrientTotal = consumption.nutrientsGrams * prices.pricePerGramNutrients;

    return {
      energy: {
        quantity: consumption.energyKwh,
        baseUnitCost: prices.pricePerKwh,
        unitCost: prices.pricePerKwh,
        totalCost: energyTotal,
      },
      water: {
        quantity: consumption.waterLiters,
        baseUnitCost: prices.pricePerLiterWater,
        unitCost: prices.pricePerLiterWater,
        totalCost: waterTotal,
      },
      nutrients: {
        quantity: consumption.nutrientsGrams,
        baseUnitCost: prices.pricePerGramNutrients,
        unitCost: prices.pricePerGramNutrients,
        totalCost: nutrientTotal,
      },
      totalCost: energyTotal + waterTotal + nutrientTotal,
    };
  }

  private scaleUtilityBreakdown(
    breakdown: UtilityCostBreakdown,
    multiplier: number,
  ): UtilityExpenseRecord {
    const scaleDetail = (detail: UtilityCostDetail): UtilityCostDetail => {
      const unitCost = detail.unitCost * multiplier;
      return {
        quantity: detail.quantity,
        baseUnitCost: detail.baseUnitCost,
        unitCost,
        totalCost: detail.quantity * unitCost,
      };
    };

    const energy = scaleDetail(breakdown.energy);
    const water = scaleDetail(breakdown.water);
    const nutrients = scaleDetail(breakdown.nutrients);
    const totalCost = energy.totalCost + water.totalCost + nutrients.totalCost;

    return {
      energy,
      water,
      nutrients,
      totalCost,
      appliedMultiplier: multiplier,
    };
  }

  private addUtilityToAccumulator(
    target: UtilityCostBreakdown,
    addition: UtilityExpenseRecord,
  ): void {
    const accumulate = (
      targetDetail: UtilityCostDetail,
      additionDetail: UtilityCostDetail,
    ): void => {
      const combinedQuantity = targetDetail.quantity + additionDetail.quantity;
      const combinedTotal = targetDetail.totalCost + additionDetail.totalCost;
      const combinedBaseTotal =
        targetDetail.baseUnitCost * targetDetail.quantity +
        additionDetail.baseUnitCost * additionDetail.quantity;

      targetDetail.quantity = combinedQuantity;
      targetDetail.totalCost = combinedTotal;
      targetDetail.baseUnitCost =
        combinedQuantity > MULTIPLIER_TOLERANCE
          ? combinedBaseTotal / combinedQuantity
          : targetDetail.baseUnitCost;
      targetDetail.unitCost =
        combinedQuantity > MULTIPLIER_TOLERANCE
          ? combinedTotal / combinedQuantity
          : targetDetail.unitCost;
    };

    accumulate(target.energy, addition.energy);
    accumulate(target.water, addition.water);
    accumulate(target.nutrients, addition.nutrients);
    target.totalCost += addition.totalCost;
  }

  private calculateMaintenanceCost(
    device: DeviceInstanceState,
    tick: number,
    tickLengthHours: number,
  ): MaintenanceComputation | undefined {
    const price = this.devicePrices.get(device.blueprintId);
    if (!price) {
      return undefined;
    }

    const hoursBilled = Number.isFinite(tickLengthHours) ? Math.max(tickLengthHours, 0) : 0;
    if (!(hoursBilled > 0)) {
      return {
        deviceId: device.id,
        blueprintId: device.blueprintId,
        ageTicks: Math.max(tick - device.maintenance.lastServiceTick, 0),
        increments: 0,
        baseCostPerHour: 0,
        ageAdjustedCostPerHour: 0,
        hoursBilled: 0,
        degradationMultiplier: 1,
        preMultiplierCost: 0,
      } satisfies MaintenanceComputation;
    }

    const baseCostPerHour = Math.max(price.baseMaintenanceCostPerTick, 0);
    const incrementPerBlockPerHour = Math.max(price.costIncreasePer1000Ticks, 0);
    const ageTicks = Math.max(tick - device.maintenance.lastServiceTick, 0);
    const increments = Math.floor(ageTicks / 1000);
    const ageAdjustedCostPerHour = baseCostPerHour + increments * incrementPerBlockPerHour;

    const degradation = clamp(device.maintenance.degradation ?? 0, 0, 5);
    const degradationMultiplier = 1 + degradation;
    const preMultiplierCost = ageAdjustedCostPerHour * hoursBilled * degradationMultiplier;

    return {
      deviceId: device.id,
      blueprintId: device.blueprintId,
      ageTicks,
      increments,
      baseCostPerHour,
      ageAdjustedCostPerHour,
      hoursBilled,
      degradationMultiplier,
      preMultiplierCost,
    };
  }

  private recordExpense(
    state: GameState,
    amount: number,
    category: LedgerCategory,
    description: string,
    tick: number,
    timestamp: string,
    accumulator: TickAccumulator,
    events: EventCollector,
    detailKind: 'capex' | 'opex',
    metadata?: Record<string, unknown>,
  ): void {
    if (amount <= MULTIPLIER_TOLERANCE) {
      return;
    }

    state.finances.cashOnHand -= amount;

    const ledgerEntry = this.createLedgerEntry(state.finances, {
      tick,
      timestamp,
      amount: -amount,
      type: 'expense',
      category,
      description,
    });

    state.finances.ledger.push(ledgerEntry);

    accumulator.expenses += amount;
    accumulator.maintenance += category === 'maintenance' ? amount : 0;
    accumulator.payroll += category === 'payroll' ? amount : 0;
    if (detailKind === 'capex') {
      accumulator.capex += amount;
    } else {
      accumulator.opex += amount;
    }

    events.queue(
      detailKind === 'capex' ? 'finance.capex' : 'finance.opex',
      {
        tick,
        amount,
        category,
        description,
        ...metadata,
      },
      tick,
      'info',
    );
  }

  private createLedgerEntry(finances: FinanceState, entry: Omit<LedgerEntry, 'id'>): LedgerEntry {
    const id = `ledger_${finances.ledger.length + 1}`;
    return {
      ...entry,
      id,
    };
  }
}
