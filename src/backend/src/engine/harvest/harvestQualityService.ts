import type { GameState, HarvestBatch, HarvestCoolingState } from '../../state/models.js';

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export interface HarvestQualityOptions {
  /**
   * Default exponential decay rate per hour (ρ) if a batch does not provide one.
   */
  defaultDecayRatePerHour?: number;
  /**
   * Multiplier applied to the decay rate when cooling is enabled (defaults to halving ρ).
   */
  coolingDecayModifier?: number;
  /**
   * Lower bound for harvest quality (defaults to 0).
   */
  minimumQuality?: number;
  /**
   * Upper bound for harvest quality (defaults to 100).
   */
  maximumQuality?: number;
}

export class HarvestQualityService {
  private readonly defaultDecay: number;

  private readonly coolingModifier: number;

  private readonly minQuality: number;

  private readonly maxQuality: number;

  constructor(options: HarvestQualityOptions = {}) {
    this.defaultDecay = Math.max(0, options.defaultDecayRatePerHour ?? 0);
    const modifier = options.coolingDecayModifier ?? 0.5;
    this.coolingModifier = clamp(Number.isFinite(modifier) ? modifier : 0.5, 0, 1);
    this.minQuality = options.minimumQuality ?? 0;
    this.maxQuality = options.maximumQuality ?? 100;
  }

  process(state: GameState, tick: number, tickLengthMinutes: number): void {
    const harvest = state.inventory?.harvest ?? [];
    if (harvest.length === 0) {
      return;
    }

    const hoursPerTick = tickLengthMinutes / 60;
    if (!Number.isFinite(hoursPerTick) || hoursPerTick <= 0) {
      return;
    }

    for (const batch of harvest) {
      this.updateBatchQuality(batch, tick, hoursPerTick);
    }
  }

  private updateBatchQuality(batch: HarvestBatch, tick: number, hoursPerTick: number): void {
    if (batch.stage === 'waste') {
      batch.quality = this.minQuality;
      batch.qualityUpdatedAtTick = tick;
      return;
    }

    const totalStorageHours = (tick - batch.harvestedAtTick) * hoursPerTick;
    if (totalStorageHours <= 0) {
      return;
    }

    if (
      typeof batch.maxStorageTimeInHours === 'number' &&
      totalStorageHours >= batch.maxStorageTimeInHours
    ) {
      batch.quality = this.minQuality;
      batch.qualityUpdatedAtTick = tick;
      return;
    }

    const lastUpdateTick = batch.qualityUpdatedAtTick ?? batch.harvestedAtTick;
    if (tick <= lastUpdateTick) {
      return;
    }

    const elapsedTicks = tick - lastUpdateTick;
    const deltaHours = elapsedTicks * hoursPerTick;
    if (deltaHours <= 0) {
      return;
    }

    const baseDecay = this.resolveBaseDecay(batch);
    if (baseDecay <= 0) {
      batch.qualityUpdatedAtTick = tick;
      return;
    }

    const effectiveDecay = this.resolveEffectiveDecay(baseDecay, batch.cooling);
    const factor = Math.exp(-effectiveDecay * deltaHours);
    const nextQuality = clamp(batch.quality * factor, this.minQuality, this.maxQuality);

    batch.quality = nextQuality;
    batch.qualityUpdatedAtTick = tick;
  }

  private resolveBaseDecay(batch: HarvestBatch): number {
    if (typeof batch.decayRatePerHour === 'number' && Number.isFinite(batch.decayRatePerHour)) {
      return Math.max(0, batch.decayRatePerHour);
    }
    return this.defaultDecay;
  }

  private resolveEffectiveDecay(
    baseDecay: number,
    cooling: HarvestCoolingState | undefined,
  ): number {
    if (!cooling?.enabled) {
      return baseDecay;
    }
    return baseDecay * this.coolingModifier;
  }
}
