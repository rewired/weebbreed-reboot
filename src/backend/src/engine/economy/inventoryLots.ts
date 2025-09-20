export interface InventoryLot {
  id: string;
  kind: string;
  quantity: number;
  unitCost: number;
  remainingQuantity: number;
  createdAtTick: number;
  metadata?: Record<string, unknown>;
}

export interface LotConsumptionDetail {
  lotId: string;
  quantity: number;
  unitCost: number;
  cost: number;
}

export interface LotConsumptionResult {
  kind: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  totalCost: number;
  shortage: number;
  details: LotConsumptionDetail[];
}

const toPositive = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(value, 0);
};

export class InventoryLotManager {
  private readonly lots = new Map<string, InventoryLot[]>();

  constructor(initialLots?: Record<string, InventoryLot[]>) {
    if (!initialLots) {
      return;
    }
    for (const [kind, entries] of Object.entries(initialLots)) {
      this.lots.set(
        kind,
        entries.map((entry) => ({
          ...entry,
          remainingQuantity: toPositive(entry.remainingQuantity ?? entry.quantity),
        })),
      );
    }
  }

  addLot(kind: string, lot: Omit<InventoryLot, 'kind' | 'remainingQuantity'>): InventoryLot {
    const sanitizedQuantity = toPositive(lot.quantity);
    const normalized: InventoryLot = {
      ...lot,
      kind,
      quantity: sanitizedQuantity,
      remainingQuantity: sanitizedQuantity,
      unitCost: Number.isFinite(lot.unitCost) ? lot.unitCost : 0,
    };
    const existing = this.lots.get(kind);
    if (existing) {
      existing.push(normalized);
    } else {
      this.lots.set(kind, [normalized]);
    }
    return normalized;
  }

  getLots(kind: string): InventoryLot[] {
    return this.lots.get(kind)?.map((lot) => ({ ...lot })) ?? [];
  }

  getAvailableQuantity(kind: string): number {
    const lots = this.lots.get(kind);
    if (!lots) {
      return 0;
    }
    return lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  }

  consume(kind: string, quantity: number): LotConsumptionResult {
    const requested = toPositive(quantity);
    const lots = this.lots.get(kind) ?? [];
    const details: LotConsumptionDetail[] = [];

    let remaining = requested;
    for (const lot of lots) {
      if (remaining <= 0) {
        break;
      }
      const take = Math.min(lot.remainingQuantity, remaining);
      if (take <= 0) {
        continue;
      }
      lot.remainingQuantity -= take;
      remaining -= take;
      const cost = take * lot.unitCost;
      details.push({
        lotId: lot.id,
        quantity: take,
        unitCost: lot.unitCost,
        cost,
      });
    }

    this.lots.set(
      kind,
      lots.filter((lot) => lot.remainingQuantity > 1e-6),
    );

    const fulfilled = requested - remaining;
    const totalCost = details.reduce((sum, item) => sum + item.cost, 0);

    return {
      kind,
      requestedQuantity: requested,
      fulfilledQuantity: fulfilled,
      totalCost,
      shortage: remaining,
      details,
    };
  }
}
