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
   * Default exponential decay rate per second (ρ) if a batch does not provide one.
   */
  defaultDecayRate?: number;
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
    this.defaultDecay = Math.max(0, options.defaultDecayRate ?? 0);
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

    const secondsPerTick = tickLengthMinutes * 60;
    if (!Number.isFinite(secondsPerTick) || secondsPerTick <= 0) {
      return;
    }

    for (const batch of harvest) {
      this.updateBatchQuality(batch, tick, secondsPerTick);
    }
  }

  private updateBatchQuality(batch: HarvestBatch, tick: number, secondsPerTick: number): void {
    if (batch.stage === 'waste') {
      batch.quality = this.minQuality;
      batch.qualityUpdatedAtTick = tick;
      return;
    }

    const totalStorageSeconds = (tick - batch.harvestedAtTick) * secondsPerTick;
    if (totalStorageSeconds <= 0) {
      return;
    }

    if (typeof batch.maxStorageTime === 'number' && totalStorageSeconds >= batch.maxStorageTime) {
      batch.quality = this.minQuality;
      batch.qualityUpdatedAtTick = tick;
      return;
    }

    const lastUpdateTick = batch.qualityUpdatedAtTick ?? batch.harvestedAtTick;
    if (tick <= lastUpdateTick) {
      return;
    }

    const elapsedTicks = tick - lastUpdateTick;
    const deltaSeconds = elapsedTicks * secondsPerTick;
    if (deltaSeconds <= 0) {
      return;
    }

    const baseDecay = this.resolveBaseDecay(batch);
    if (baseDecay <= 0) {
      batch.qualityUpdatedAtTick = tick;
      return;
    }

    const effectiveDecay = this.resolveEffectiveDecay(baseDecay, batch.cooling);
    const factor = Math.exp(-effectiveDecay * deltaSeconds);
    const nextQuality = clamp(batch.quality * factor, this.minQuality, this.maxQuality);

    batch.quality = nextQuality;
    batch.qualityUpdatedAtTick = tick;
  }

  private resolveBaseDecay(batch: HarvestBatch): number {
    if (typeof batch.decayRate === 'number' && Number.isFinite(batch.decayRate)) {
      return Math.max(0, batch.decayRate);
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
