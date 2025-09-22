import type { DeviceInstanceState, ZoneState } from './models.js';
import type { ZoneGeometry } from './geometry.js';

const EPSILON = 1e-6;
export const RECOMMENDED_AIR_CHANGES_PER_HOUR = 5;

export type DeviceInstallIssueType =
  | 'invalid-geometry'
  | 'invalid-coverage'
  | 'invalid-airflow'
  | 'coverage-clamped'
  | 'coverage-oversubscribed'
  | 'airflow-clamped'
  | 'airflow-oversubscribed';

export interface DeviceInstallWarning {
  type: DeviceInstallIssueType;
  level: 'warning' | 'error';
  message: string;
}

export interface AddDeviceToZoneOptions {
  geometry?: ZoneGeometry;
  maxAirChangesPerHour?: number;
}

export interface AddDeviceToZoneResult {
  added: boolean;
  device?: DeviceInstanceState;
  warnings: DeviceInstallWarning[];
}

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

const sumDeviceCoverage = (devices: readonly DeviceInstanceState[], zoneArea: number): number => {
  return devices.reduce((total, existing) => {
    const coverage = toFiniteNumber(existing.settings.coverageArea);
    if (coverage === undefined) {
      return total;
    }
    const sanitized = Math.min(Math.max(coverage, 0), zoneArea);
    return total + sanitized;
  }, 0);
};

const sumDeviceAirflow = (devices: readonly DeviceInstanceState[]): number => {
  return devices.reduce((total, existing) => {
    const airflow = toFiniteNumber(existing.settings.airflow);
    if (airflow === undefined) {
      return total;
    }
    return total + Math.max(airflow, 0);
  }, 0);
};

const deriveGeometry = (zone: ZoneState, geometry?: ZoneGeometry): ZoneGeometry => {
  if (geometry) {
    return geometry;
  }
  return {
    area: zone.area,
    ceilingHeight: zone.ceilingHeight,
    volume: zone.volume,
  } satisfies ZoneGeometry;
};

const formatNumber = (value: number): string => value.toFixed(2);

export const addDeviceToZone = (
  zone: ZoneState,
  device: DeviceInstanceState,
  options: AddDeviceToZoneOptions = {},
): AddDeviceToZoneResult => {
  const geometry = deriveGeometry(zone, options.geometry);
  const zoneAreaValid = Number.isFinite(geometry.area) && geometry.area > 0;
  const zoneVolumeValid = Number.isFinite(geometry.volume) && geometry.volume > 0;
  const zoneArea = zoneAreaValid ? geometry.area : 0;
  const zoneVolume = zoneVolumeValid ? geometry.volume : 0;
  const zoneLabel = zone.name ?? zone.id;
  const deviceLabel = device.name ?? device.kind ?? device.id;

  const warnings: DeviceInstallWarning[] = [];

  const settings: Record<string, unknown> = {
    ...device.settings,
  };

  const coverage = toFiniteNumber(settings.coverageArea);
  if (coverage !== undefined) {
    if (coverage <= 0) {
      return {
        added: false,
        warnings: [
          {
            type: 'invalid-coverage',
            level: 'error',
            message: `Unable to install ${deviceLabel}: coverage area must be positive.`,
          },
        ],
      };
    }

    if (!zoneAreaValid) {
      return {
        added: false,
        warnings: [
          {
            type: 'invalid-geometry',
            level: 'error',
            message: `Unable to install ${deviceLabel}: zone ${zoneLabel} has no usable area for coverage-based devices.`,
          },
        ],
      };
    }

    const clampedCoverage = Math.min(coverage, zoneArea);
    if (clampedCoverage < coverage - EPSILON) {
      warnings.push({
        type: 'coverage-clamped',
        level: 'warning',
        message: `Coverage for ${deviceLabel} clamped from ${formatNumber(coverage)} m² to ${formatNumber(clampedCoverage)} m² to fit zone ${zoneLabel}.`,
      });
    }

    const existingCoverage = sumDeviceCoverage(zone.devices, zoneArea);
    const totalCoverage = existingCoverage + clampedCoverage;
    if (totalCoverage - zoneArea > EPSILON) {
      warnings.push({
        type: 'coverage-oversubscribed',
        level: 'warning',
        message: `Installing ${deviceLabel} pushes zone ${zoneLabel} coverage to ${formatNumber(totalCoverage)} m², exceeding the available ${formatNumber(zoneArea)} m².`,
      });
    }

    settings.coverageArea = clampedCoverage;
  }

  const airflow = toFiniteNumber(settings.airflow);
  if (airflow !== undefined) {
    if (airflow <= 0) {
      return {
        added: false,
        warnings: [
          {
            type: 'invalid-airflow',
            level: 'error',
            message: `Unable to install ${deviceLabel}: airflow must be positive.`,
          },
        ],
      };
    }

    if (!zoneVolumeValid) {
      return {
        added: false,
        warnings: [
          {
            type: 'invalid-geometry',
            level: 'error',
            message: `Unable to install ${deviceLabel}: zone ${zoneLabel} has no valid volume for airflow calculations.`,
          },
        ],
      };
    }

    const recommendedAch = Math.max(
      options.maxAirChangesPerHour ?? RECOMMENDED_AIR_CHANGES_PER_HOUR,
      0,
    );
    const recommendedCapacity = zoneVolume * recommendedAch;
    const existingAirflow = sumDeviceAirflow(zone.devices);
    const totalAirflowBeforeClamp = existingAirflow + airflow;

    let sanitizedAirflow = airflow;
    let clamped = false;

    if (recommendedCapacity > 0 && sanitizedAirflow - recommendedCapacity > EPSILON) {
      sanitizedAirflow = recommendedCapacity;
      clamped = true;
    }

    const availableCapacity = Math.max(recommendedCapacity - existingAirflow, 0);
    if (sanitizedAirflow - availableCapacity > EPSILON) {
      sanitizedAirflow = availableCapacity;
      clamped = true;
    }

    if (clamped) {
      warnings.push({
        type: 'airflow-clamped',
        level: 'warning',
        message: `Airflow for ${deviceLabel} clamped to ${formatNumber(sanitizedAirflow)} m³/h to respect zone ${zoneLabel} limits.`,
      });
    }

    if (recommendedCapacity >= 0 && totalAirflowBeforeClamp - recommendedCapacity > EPSILON) {
      warnings.push({
        type: 'airflow-oversubscribed',
        level: 'warning',
        message: `Installing ${deviceLabel} pushes zone ${zoneLabel} airflow to ${formatNumber(totalAirflowBeforeClamp)} m³/h which exceeds the recommended ${formatNumber(recommendedCapacity)} m³/h (${formatNumber(recommendedAch)} ACH).`,
      });
    }

    settings.airflow = sanitizedAirflow;
  }

  const sanitizedDevice: DeviceInstanceState = {
    ...device,
    zoneId: zone.id,
    settings,
  };

  zone.devices.push(sanitizedDevice);

  return {
    added: true,
    device: sanitizedDevice,
    warnings,
  };
};
