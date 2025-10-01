import { saturationVaporPressure } from '@/engine/physio/vpd.js';
import type { ZoneControlState, ZoneState } from '@/state/types.js';
import {
  TEMPERATURE_DEVICE_KINDS,
  HUMIDITY_DEVICE_KINDS,
  CO2_DEVICE_KINDS,
  LIGHT_DEVICE_KINDS,
  MIN_ZONE_TEMPERATURE_SETPOINT_C,
  MAX_ZONE_TEMPERATURE_SETPOINT_C,
  MIN_ZONE_HUMIDITY_SETPOINT,
  MAX_ZONE_HUMIDITY_SETPOINT,
  MIN_ZONE_CO2_SETPOINT_PPM,
  MAX_ZONE_CO2_SETPOINT_PPM,
  MIN_ZONE_PPFD_SETPOINT,
  MAX_ZONE_PPFD_SETPOINT,
  MIN_ZONE_VPD_SETPOINT_KPA,
  MAX_ZONE_VPD_SETPOINT_KPA,
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

const clampWithWarning = (
  value: number,
  min: number,
  max: number,
  warnings: string[],
  message: string,
): number => {
  const clamped = Math.min(Math.max(value, min), max);
  if (clamped !== value) {
    warnings.push(message);
  }
  return clamped;
};

export const sanitizeTemperatureSetpoint = (value: number, warnings: string[]): number =>
  clampWithWarning(
    value,
    MIN_ZONE_TEMPERATURE_SETPOINT_C,
    MAX_ZONE_TEMPERATURE_SETPOINT_C,
    warnings,
    `Temperature setpoint was clamped to the [${MIN_ZONE_TEMPERATURE_SETPOINT_C}, ${MAX_ZONE_TEMPERATURE_SETPOINT_C}] °C range.`,
  );

export const sanitizeRelativeHumidity = (value: number, warnings: string[]): number =>
  clampWithWarning(
    value,
    MIN_ZONE_HUMIDITY_SETPOINT,
    MAX_ZONE_HUMIDITY_SETPOINT,
    warnings,
    'Relative humidity setpoint was clamped to the [0, 1] range.',
  );

export const sanitizeCo2Setpoint = (value: number, warnings: string[]): number =>
  clampWithWarning(
    value,
    MIN_ZONE_CO2_SETPOINT_PPM,
    MAX_ZONE_CO2_SETPOINT_PPM,
    warnings,
    `CO₂ setpoint was clamped to the [${MIN_ZONE_CO2_SETPOINT_PPM}, ${MAX_ZONE_CO2_SETPOINT_PPM}] ppm range.`,
  );

export const sanitizePpfdSetpoint = (value: number, warnings: string[]): number =>
  clampWithWarning(
    value,
    MIN_ZONE_PPFD_SETPOINT,
    MAX_ZONE_PPFD_SETPOINT,
    warnings,
    `PPFD setpoint was clamped to the [${MIN_ZONE_PPFD_SETPOINT}, ${MAX_ZONE_PPFD_SETPOINT}] µmol·m⁻²·s⁻¹ range.`,
  );

export const sanitizeVpdSetpoint = (value: number, warnings: string[]): number =>
  clampWithWarning(
    value,
    MIN_ZONE_VPD_SETPOINT_KPA,
    MAX_ZONE_VPD_SETPOINT_KPA,
    warnings,
    `VPD setpoint was clamped to the [${MIN_ZONE_VPD_SETPOINT_KPA}, ${MAX_ZONE_VPD_SETPOINT_KPA}] kPa range.`,
  );

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
