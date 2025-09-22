import { exponentialApproach } from './temp.js';

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

/**
 * Mixes CO₂ concentration towards an ambient reference using an exponential approach.
 *
 * @param current - Current CO₂ concentration in parts per million (ppm).
 * @param target - Ambient CO₂ concentration in ppm.
 * @param ratePerHour - Mixing rate constant in h⁻¹.
 * @param hours - Simulation time step in hours.
 * @returns Updated CO₂ concentration in ppm.
 */
export const approachCo2 = (
  current: number,
  target: number,
  ratePerHour: number,
  hours: number,
): number => {
  const mixed = exponentialApproach(current, target, ratePerHour, hours);
  return Math.max(mixed, 0);
};

/**
 * Computes a half-saturation response for CO₂ assimilation.
 *
 * @param concentrationPpm - CO₂ concentration in parts per million (ppm).
 * @param halfSaturationPpm - Half-saturation constant in ppm.
 * @returns Response multiplier in the range [0, 1].
 */
export const co2HalfSaturationResponse = (
  concentrationPpm: number,
  halfSaturationPpm: number,
): number => {
  if (concentrationPpm <= 0) {
    return 0;
  }
  const half = Math.max(halfSaturationPpm, 1);
  const response = concentrationPpm / (concentrationPpm + half);
  return clamp(response, 0, 1);
};
