import { clamp01, exponentialApproach } from './temp.js';

/**
 * Mixes relative humidity towards an ambient reference.
 *
 * @param current - Current relative humidity (fraction 0–1).
 * @param target - Ambient relative humidity (fraction 0–1).
 * @param ratePerHour - Mixing rate constant in h⁻¹.
 * @param hours - Simulation time step in hours.
 * @returns Updated relative humidity (fraction 0–1).
 */
export const approachRelativeHumidity = (
  current: number,
  target: number,
  ratePerHour: number,
  hours: number,
): number => {
  const mixed = exponentialApproach(current, target, ratePerHour, hours);
  return clamp01(mixed);
};
