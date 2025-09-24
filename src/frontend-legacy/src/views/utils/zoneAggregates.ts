import type { ZoneSnapshot } from '@/types/simulation';

export type ZoneAggregateMetrics = {
  averageTemperature?: number;
  averageHumidity?: number;
  averageCo2?: number;
  averagePpfd?: number;
  averageVpd?: number;
  averageStress?: number;
  averageLightingCoverage?: number;
  plantCount: number;
};

export const computeZoneAggregateMetrics = (zones: ZoneSnapshot[]): ZoneAggregateMetrics => {
  if (!zones.length) {
    return { plantCount: 0 };
  }

  const totals = zones.reduce(
    (
      accumulator,
      zone,
    ): {
      temperature: number;
      humidity: number;
      co2: number;
      ppfd: number;
      vpd: number;
      stress: number;
      lightingCoverage: number;
      lightingSamples: number;
      plants: number;
    } => {
      accumulator.temperature += zone.environment.temperature;
      accumulator.humidity += zone.environment.relativeHumidity;
      accumulator.co2 += zone.environment.co2;
      accumulator.ppfd += zone.environment.ppfd;
      accumulator.vpd += zone.environment.vpd;
      accumulator.stress += zone.metrics.stressLevel ?? 0;
      accumulator.plants += zone.plants.length;
      if (zone.lighting?.coverageRatio !== undefined) {
        accumulator.lightingCoverage += zone.lighting.coverageRatio;
        accumulator.lightingSamples += 1;
      }
      return accumulator;
    },
    {
      temperature: 0,
      humidity: 0,
      co2: 0,
      ppfd: 0,
      vpd: 0,
      stress: 0,
      lightingCoverage: 0,
      lightingSamples: 0,
      plants: 0,
    },
  );

  const count = zones.length;

  return {
    averageTemperature: totals.temperature / count,
    averageHumidity: totals.humidity / count,
    averageCo2: totals.co2 / count,
    averagePpfd: totals.ppfd / count,
    averageVpd: totals.vpd / count,
    averageStress: totals.stress / count,
    averageLightingCoverage:
      totals.lightingSamples > 0 ? totals.lightingCoverage / totals.lightingSamples : undefined,
    plantCount: totals.plants,
  };
};
