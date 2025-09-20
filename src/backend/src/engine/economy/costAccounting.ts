import type { EventCollector } from '../../lib/eventBus.js';
import type {
  DeviceInstanceState,
  FinanceState,
  GameState,
  LedgerCategory,
  LedgerEntry,
} from '../../state/models.js';
import type { PriceCatalog } from './pricing.js';

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
  baseCostPerTick: number;
  ageAdjustedCostPerTick: number;
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
};

export class CostAccountingService {
  constructor(private readonly prices: PriceCatalog) {}

  createAccumulator(): TickAccumulator {
    return {
      revenue: 0,
      expenses: 0,
      capex: 0,
      opex: 0,
      maintenance: 0,
      utilities: createEmptyUtilityBreakdown(),
      maintenanceDetails: [],
    };
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
    accumulator: TickAccumulator,
    events: EventCollector,
  ): MaintenanceExpenseRecord | undefined {
    const computation = this.calculateMaintenanceCost(device, tick);
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
    const entry = this.prices.devicePrices.get(blueprintId);
    const sanitizedQuantity = Math.max(Number.isFinite(quantity) ? quantity : 0, 0);

    if (!entry || sanitizedQuantity <= 0) {
      return 0;
    }

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
    summary.lastTickRevenue = accumulator.revenue;
    summary.lastTickExpenses = accumulator.expenses;
    summary.netIncome = summary.totalRevenue - summary.totalExpenses;

    events.queue({
      type: 'finance.tick',
      level: 'info',
      payload: {
        tick,
        timestamp,
        revenue: accumulator.revenue,
        expenses: accumulator.expenses,
        netIncome: accumulator.revenue - accumulator.expenses,
        capex: accumulator.capex,
        opex: accumulator.opex,
        utilities: accumulator.utilities,
        maintenance: accumulator.maintenanceDetails,
      },
    });
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
  ): MaintenanceComputation | undefined {
    const price = this.prices.devicePrices.get(device.blueprintId);
    if (!price) {
      return undefined;
    }

    const baseCost = Math.max(price.baseMaintenanceCostPerTick, 0);
    const incrementPerBlock = Math.max(price.costIncreasePer1000Ticks, 0);
    const ageTicks = Math.max(tick - device.maintenance.lastServiceTick, 0);
    const increments = Math.floor(ageTicks / 1000);
    const ageAdjustedCost = baseCost + increments * incrementPerBlock;

    const degradation = clamp(device.maintenance.degradation ?? 0, 0, 5);
    const degradationMultiplier = 1 + degradation;
    const preMultiplierCost = ageAdjustedCost * degradationMultiplier;

    return {
      deviceId: device.id,
      blueprintId: device.blueprintId,
      ageTicks,
      increments,
      baseCostPerTick: baseCost,
      ageAdjustedCostPerTick: ageAdjustedCost,
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
    if (detailKind === 'capex') {
      accumulator.capex += amount;
    } else {
      accumulator.opex += amount;
    }

    events.queue({
      type: detailKind === 'capex' ? 'finance.capex' : 'finance.opex',
      level: 'info',
      payload: {
        tick,
        amount,
        category,
        description,
        ...metadata,
      },
    });
  }

  private createLedgerEntry(finances: FinanceState, entry: Omit<LedgerEntry, 'id'>): LedgerEntry {
    const id = `ledger_${finances.ledger.length + 1}`;
    return {
      ...entry,
      id,
    };
  }
}
