import { formatNumber } from '@/utils/formatNumber';
import type { ZoneSnapshot, ZoneControlSetpoints } from '@/types/simulation';

export type BadgeTone = 'default' | 'success' | 'warning' | 'danger';

const determineTone = (
  current: number,
  target?: number,
  thresholds?: { success: number; warning: number },
): BadgeTone => {
  if (typeof target !== 'number') {
    return 'default';
  }
  const delta = Math.abs(current - target);
  if (!thresholds) {
    return delta < Number.EPSILON ? 'success' : 'default';
  }
  if (delta <= thresholds.success) {
    return 'success';
  }
  if (delta <= thresholds.warning) {
    return 'warning';
  }
  return 'danger';
};

export type EnvironmentBadgeDescriptor = {
  key: string;
  icon: string;
  label: string;
  value: string;
  tone: BadgeTone;
};

export const buildEnvironmentBadgeDescriptors = (
  zone: ZoneSnapshot,
  setpoints?: ZoneControlSetpoints,
): EnvironmentBadgeDescriptor[] => [
  {
    key: 'temp',
    icon: 'thermostat',
    label: 'Temp',
    value: `${formatNumber(zone.environment.temperature, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}°C`,
    tone: determineTone(zone.environment.temperature, setpoints?.temperature, {
      success: 1,
      warning: 3,
    }),
  },
  {
    key: 'humidity',
    icon: 'water_drop',
    label: 'Humidity',
    value: `${formatNumber(zone.environment.relativeHumidity * 100, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}%`,
    tone: determineTone(
      zone.environment.relativeHumidity * 100,
      setpoints?.humidity ? setpoints.humidity * 100 : undefined,
      {
        success: 5,
        warning: 10,
      },
    ),
  },
  {
    key: 'vpd',
    icon: 'science',
    label: 'VPD',
    value: `${formatNumber(zone.environment.vpd, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kPa`,
    tone: determineTone(zone.environment.vpd, setpoints?.vpd, {
      success: 0.15,
      warning: 0.35,
    }),
  },
  {
    key: 'co2',
    icon: 'co2',
    label: 'CO₂',
    value: `${formatNumber(zone.environment.co2, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} ppm`,
    tone: determineTone(zone.environment.co2, setpoints?.co2, {
      success: 100,
      warning: 250,
    }),
  },
  {
    key: 'ppfd',
    icon: 'sunny',
    label: 'PPFD',
    value: `${formatNumber(zone.environment.ppfd, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} µmol`,
    tone: determineTone(zone.environment.ppfd, setpoints?.ppfd, {
      success: 50,
      warning: 150,
    }),
  },
  {
    key: 'cycle',
    icon: 'schedule',
    label: 'Cycle',
    value:
      zone.lighting?.photoperiodHours?.on !== undefined &&
      zone.lighting?.photoperiodHours?.off !== undefined
        ? `${zone.lighting.photoperiodHours.on}h/${zone.lighting.photoperiodHours.off}h`
        : '—',
    tone: 'default',
  },
];
