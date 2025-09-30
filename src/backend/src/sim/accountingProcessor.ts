import {
  CostAccountingService,
  type TickAccumulator,
  type UtilityConsumption,
} from '@/engine/economy/costAccounting.js';
import type { PriceCatalog } from '@/engine/economy/pricing.js';
import type { GameState } from '@/state/types.js';
import { cloneStateValue } from '@/state/snapshots.js';
import type { EventCollector } from '@/lib/eventBus.js';

interface UtilityTotals {
  energyKwh: number;
  waterLiters: number;
  nutrientsGrams: number;
}

interface PendingDevicePurchase {
  blueprintId: string;
  quantity: number;
  description?: string;
}

interface AccountingRuntime {
  accumulator: TickAccumulator;
  utilities: UtilityTotals;
  purchases: PendingDevicePurchase[];
}

export type AccountingProcessorSnapshot = AccountingRuntime | null;

export interface AccountingContext {
  state: GameState;
  tick: number;
  tickLengthMinutes: number;
  events: EventCollector;
}

export interface AccountingPhaseTools {
  recordUtility(consumption: UtilityConsumption): void;
  recordDevicePurchase(blueprintId: string, quantity: number, description?: string): void;
}

export interface AccountingProcessor {
  tools: AccountingPhaseTools;
  beginTick(): void;
  finalize(context: AccountingContext): void;
  getService(): CostAccountingService | undefined;
  reset(): void;
  createSnapshot(): AccountingProcessorSnapshot;
  restoreSnapshot(snapshot: AccountingProcessorSnapshot): void;
}

class DisabledAccountingProcessor implements AccountingProcessor {
  readonly tools: AccountingPhaseTools = {
    recordUtility: () => undefined,
    recordDevicePurchase: () => undefined,
  };

  beginTick(): void {
    // no-op
  }

  finalize(): void {
    // no-op
  }

  getService(): CostAccountingService | undefined {
    return undefined;
  }

  reset(): void {
    // no-op
  }

  createSnapshot(): AccountingProcessorSnapshot {
    return null;
  }

  restoreSnapshot(_snapshot: AccountingProcessorSnapshot): void {
    void _snapshot;
    // no-op
  }
}

class CostAccountingProcessor implements AccountingProcessor {
  private runtime: AccountingRuntime | null = null;

  constructor(private readonly service: CostAccountingService) {}

  readonly tools: AccountingPhaseTools = {
    recordUtility: (consumption) => this.recordUtilityConsumption(consumption),
    recordDevicePurchase: (blueprintId, quantity, description) =>
      this.recordDevicePurchase(blueprintId, quantity, description),
  };

  beginTick(): void {
    this.reset();
    this.runtime = this.createRuntime();
  }

  finalize(context: AccountingContext): void {
    if (!this.runtime) {
      return;
    }

    const timestamp = new Date().toISOString();
    const tickLengthHours = Number.isFinite(context.tickLengthMinutes)
      ? Math.max(context.tickLengthMinutes / 60, 0)
      : 0;

    const { accumulator, utilities, purchases } = this.runtime;

    if (utilities.energyKwh > 0 || utilities.waterLiters > 0 || utilities.nutrientsGrams > 0) {
      this.service.applyUtilityConsumption(
        context.state,
        utilities,
        context.tick,
        timestamp,
        accumulator,
        context.events,
      );
    }

    for (const structure of context.state.structures) {
      this.service.applyStructureRent(
        context.state,
        structure,
        context.tick,
        timestamp,
        tickLengthHours,
        accumulator,
        context.events,
      );

      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          for (const device of zone.devices) {
            this.service.applyMaintenanceExpense(
              context.state,
              device,
              context.tick,
              timestamp,
              tickLengthHours,
              accumulator,
              context.events,
            );
          }
        }
      }
    }

    for (const purchase of purchases) {
      this.service.recordDevicePurchase(
        context.state,
        purchase.blueprintId,
        purchase.quantity,
        context.tick,
        timestamp,
        accumulator,
        context.events,
        purchase.description,
      );
    }

    this.service.applyPayroll(context.state, context.tick, timestamp, accumulator, context.events);

    this.service.finalizeTick(context.state, accumulator, context.tick, timestamp, context.events);

    this.reset();
  }

  getService(): CostAccountingService | undefined {
    return this.service;
  }

  reset(): void {
    this.runtime = null;
  }

  createSnapshot(): AccountingProcessorSnapshot {
    if (!this.runtime) {
      return null;
    }

    return cloneStateValue(this.runtime);
  }

  restoreSnapshot(snapshot: AccountingProcessorSnapshot): void {
    if (!snapshot) {
      this.runtime = null;
      return;
    }

    this.runtime = cloneStateValue(snapshot);
  }

  private createRuntime(): AccountingRuntime {
    return {
      accumulator: this.service.createAccumulator(),
      utilities: {
        energyKwh: 0,
        waterLiters: 0,
        nutrientsGrams: 0,
      },
      purchases: [],
    };
  }

  private recordUtilityConsumption(consumption: UtilityConsumption | undefined): void {
    if (!this.runtime || !consumption) {
      return;
    }

    const addUtility = (value: number | undefined, key: keyof UtilityTotals) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return;
      }
      const sanitized = Math.max(value, 0);
      if (sanitized <= 0) {
        return;
      }
      this.runtime!.utilities[key] += sanitized;
    };

    addUtility(consumption.energyKwh, 'energyKwh');
    addUtility(consumption.waterLiters, 'waterLiters');
    addUtility(consumption.nutrientsGrams, 'nutrientsGrams');
  }

  private recordDevicePurchase(blueprintId: string, quantity: number, description?: string): void {
    if (!this.runtime || typeof blueprintId !== 'string' || blueprintId.length === 0) {
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    this.runtime.purchases.push({
      blueprintId,
      quantity,
      description:
        typeof description === 'string' && description.length > 0 ? description : undefined,
    });
  }
}

export interface AccountingProcessorOptions {
  service?: CostAccountingService;
  priceCatalog?: PriceCatalog;
}

export function createAccountingProcessor(
  options: AccountingProcessorOptions = {},
): AccountingProcessor {
  if (options.service) {
    return new CostAccountingProcessor(options.service);
  }

  if (options.priceCatalog) {
    return new CostAccountingProcessor(new CostAccountingService(options.priceCatalog));
  }

  return new DisabledAccountingProcessor();
}
