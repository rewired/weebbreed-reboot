import { saturationVaporPressure } from '@/engine/physio/vpd.js';
import type { ZoneControlState, ZoneState } from '@/state/types.js';
import {
  TEMPERATURE_DEVICE_KINDS,
  HUMIDITY_DEVICE_KINDS,
  CO2_DEVICE_KINDS,
  LIGHT_DEVICE_KINDS,
} from '@/constants/environment.js';

export { TEMPERATURE_DEVICE_KINDS, HUMIDITY_DEVICE_KINDS, CO2_DEVICE_KINDS, LIGHT_DEVICE_KINDS };

export const filterZoneDevices = (
  zone: ZoneState,
  kinds: ReadonlySet<string>,
): ZoneState['devices'] => zone.devices.filter((device) => kinds.has(device.kind));

export const ensureZoneControl = (zone: ZoneState): ZoneControlState => {
  if (!zone.control) {
    zone.control = { setpoints: {} } as ZoneControlState;
  } else if (!zone.control.setpoints) {
    zone.control.setpoints = {};
  }
  return zone.control;
};

export const sanitizeRelativeHumidity = (value: number, warnings: string[]): number => {
  const clamped = Math.min(Math.max(value, 0), 1);
  if (clamped !== value) {
    warnings.push('Relative humidity setpoint was clamped to the [0, 1] range.');
  }
  return clamped;
};

export const sanitizeNonNegative = (value: number, warnings: string[], message: string): number => {
  const clamped = Math.max(value, 0);
  if (clamped !== value) {
    warnings.push(message);
  }
  return clamped;
};

export const extractFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

export const resolveTemperatureForVpd = (zone: ZoneState): number => {
  const controlTemperature = extractFiniteNumber(zone.control?.setpoints.temperature);
  if (controlTemperature !== undefined) {
    return controlTemperature;
  }
  const environmentTemperature = extractFiniteNumber(zone.environment.temperature);
  if (environmentTemperature !== undefined) {
    return environmentTemperature;
  }
  return 24;
};

export const computeHumidityForVpd = (
  temperature: number,
  vpd: number,
  warnings: string[],
): number => {
  const saturation = Math.max(saturationVaporPressure(temperature), Number.EPSILON);
  const humidity = 1 - vpd / saturation;
  const clamped = Math.min(Math.max(humidity, 0), 1);
  if (clamped !== humidity) {
    warnings.push('Derived humidity target was clamped to the [0, 1] range.');
  }
  return clamped;
};
