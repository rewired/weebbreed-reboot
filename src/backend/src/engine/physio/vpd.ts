import {
  MAGNUS_COEFFICIENT_A,
  MAGNUS_COEFFICIENT_B,
  MAGNUS_PRESSURE_COEFFICIENT,
} from '@/constants/physiology.js';

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

/**
 * Computes the saturation vapour pressure of air at a given temperature.
 *
 * @param temperatureC - Air temperature in degrees Celsius.
 * @returns Saturation vapour pressure in kilopascals (kPa).
 */
export const saturationVaporPressure = (temperatureC: number): number => {
  const temperature = clamp(temperatureC, -50, 60);
  const exponent = (MAGNUS_COEFFICIENT_A * temperature) / (temperature + MAGNUS_COEFFICIENT_B);
  return MAGNUS_PRESSURE_COEFFICIENT * Math.exp(exponent);
};

/**
 * Computes the actual vapour pressure given temperature and relative humidity.
 *
 * @param temperatureC - Air temperature in degrees Celsius.
 * @param relativeHumidity - Relative humidity as a fraction (0–1).
 * @returns Actual vapour pressure in kilopascals (kPa).
 */
export const actualVaporPressure = (temperatureC: number, relativeHumidity: number): number => {
  const humidity = clamp(relativeHumidity, 0, 1);
  return saturationVaporPressure(temperatureC) * humidity;
};

/**
 * Calculates the vapour pressure deficit (VPD) using the simplified Magnus equation.
 *
 * @param temperatureC - Air temperature in degrees Celsius.
 * @param relativeHumidity - Relative humidity as a fraction (0–1).
 * @returns Vapour pressure deficit in kilopascals (kPa).
 */
export const vaporPressureDeficit = (temperatureC: number, relativeHumidity: number): number => {
  const saturation = saturationVaporPressure(temperatureC);
  const actual = actualVaporPressure(temperatureC, relativeHumidity);
  return Math.max(saturation - actual, 0);
};

export const computeVpd = vaporPressureDeficit;
