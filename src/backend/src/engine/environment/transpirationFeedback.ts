import {
  DEFAULT_NUTRIENT_GRAMS_PER_LITER_AT_STRENGTH_1,
  MIN_ZONE_VOLUME_M3,
  SATURATION_VAPOR_DENSITY_KG_PER_M3,
} from '@/constants/environment.js';
import { computeVpd } from '@/engine/physio/vpd.js';
import type { AccountingPhaseTools } from '@/sim/loop.js';
import type { ZoneState } from '@/state/types.js';

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

export interface TranspirationFeedbackOptions {
  /**
   * Amount of nutrient mass (grams) consumed per liter of solution at full strength (1.0).
   */
  nutrientGramsPerLiterAtStrength1?: number;
}

export interface TranspirationFeedbackResult {
  waterConsumedLiters: number;
  nutrientsConsumedGrams: number;
  humidityDelta: number;
}

export class TranspirationFeedbackService {
  private readonly nutrientsPerLiter: number;

  constructor(options: TranspirationFeedbackOptions = {}) {
    this.nutrientsPerLiter =
      options.nutrientGramsPerLiterAtStrength1 ?? DEFAULT_NUTRIENT_GRAMS_PER_LITER_AT_STRENGTH_1;
  }

  apply(
    zone: ZoneState,
    transpirationLiters: number,
    accounting?: AccountingPhaseTools,
  ): TranspirationFeedbackResult {
    const liters = Number.isFinite(transpirationLiters) ? Math.max(transpirationLiters, 0) : 0;
    zone.resources.lastTranspirationLiters = liters;

    if (liters <= 0) {
      return { waterConsumedLiters: 0, nutrientsConsumedGrams: 0, humidityDelta: 0 };
    }

    const volume = Math.max(zone.volume, MIN_ZONE_VOLUME_M3);
    const saturationMassKg = SATURATION_VAPOR_DENSITY_KG_PER_M3 * volume;
    const humidityDelta = saturationMassKg > 0 ? clamp(liters / saturationMassKg, 0, 1) : 0;

    const updatedHumidity = clamp(zone.environment.relativeHumidity + humidityDelta, 0, 1);
    zone.environment.relativeHumidity = updatedHumidity;
    zone.environment.vpd = computeVpd(zone.environment.temperature, updatedHumidity);

    const previousWater = Math.max(zone.resources.waterLiters, 0);
    const previousSolution = Math.max(zone.resources.nutrientSolutionLiters, 0);
    const previousStrength = clamp(zone.resources.nutrientStrength, 0, 1);
    const previousReservoirLevel = clamp(zone.resources.reservoirLevel, 0, 1);

    const waterConsumed = Math.min(liters, previousWater);
    const nutrientSolutionConsumed = Math.min(liters, previousSolution);
    const estimatedCapacity =
      previousReservoirLevel > 0
        ? previousWater / previousReservoirLevel
        : previousWater > 0
          ? previousWater
          : liters;
    const capacity = Math.max(estimatedCapacity, liters, MIN_ZONE_VOLUME_M3);

    const newWater = Math.max(previousWater - waterConsumed, 0);
    const newSolution = Math.max(previousSolution - nutrientSolutionConsumed, 0);
    zone.resources.waterLiters = newWater;
    zone.resources.nutrientSolutionLiters = newSolution;

    const reservoirLevel = capacity > 0 ? clamp(newWater / capacity, 0, 1) : 0;
    zone.resources.reservoirLevel = reservoirLevel;

    const strengthDrop = capacity > 0 ? clamp(waterConsumed / capacity, 0, previousStrength) : 0;
    const nutrientStrength = clamp(previousStrength - strengthDrop, 0, 1);
    zone.resources.nutrientStrength = nutrientStrength;

    const nutrientGramsConsumed =
      nutrientSolutionConsumed * previousStrength * this.nutrientsPerLiter;

    if (accounting && (waterConsumed > 0 || nutrientGramsConsumed > 0)) {
      accounting.recordUtility({
        waterLiters: waterConsumed,
        nutrientsGrams: nutrientGramsConsumed,
      });
    }

    return {
      waterConsumedLiters: waterConsumed,
      nutrientsConsumedGrams: nutrientGramsConsumed,
      humidityDelta,
    };
  }
}
