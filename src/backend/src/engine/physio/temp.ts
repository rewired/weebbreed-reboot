import { GAUSSIAN_MIN_SIGMA } from '@/constants/physiology.js';

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

/**
 * Exponential relaxation towards a target value.
 *
 * @param current - Current value in the same units as the target.
 * @param target - Target value to approach.
 * @param ratePerHour - Mixing rate constant in h⁻¹.
 * @param hours - Simulation time step in hours.
 * @returns Relaxed value in the same units as `current` and `target`.
 */
export const exponentialApproach = (
  current: number,
  target: number,
  ratePerHour: number,
  hours: number,
): number => {
  const rate = Math.max(ratePerHour, 0);
  const stepHours = Math.max(hours, 0);
  if (rate === 0 || stepHours === 0) {
    return current;
  }
  const decay = Math.exp(-rate * stepHours);
  return target + (current - target) * decay;
};

/**
 * Mixes air temperature towards an ambient reference using an exponential approach.
 *
 * @param currentC - Current air temperature in degrees Celsius.
 * @param targetC - Ambient or target air temperature in degrees Celsius.
 * @param ratePerHour - Mixing rate constant in h⁻¹.
 * @param hours - Simulation time step in hours.
 * @returns Updated air temperature in degrees Celsius.
 */
export const approachTemperature = (
  currentC: number,
  targetC: number,
  ratePerHour: number,
  hours: number,
): number => {
  return exponentialApproach(currentC, targetC, ratePerHour, hours);
};

/**
 * Gaussian response curve bounded to [0, 1].
 *
 * @param value - Input value (°C for temperature-driven responses).
 * @param mean - Optimal value (°C).
 * @param sigma - Spread (standard deviation) in the same units as the input.
 * @returns Response multiplier in the range [0, 1].
 */
export const gaussianResponse = (value: number, mean: number, sigma: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(mean)) {
    return 0;
  }
  const spread = Math.max(Math.abs(sigma), GAUSSIAN_MIN_SIGMA);
  const exponent = -0.5 * ((value - mean) / spread) ** 2;
  return clamp(Math.exp(exponent), 0, 1);
};

export const clamp01 = (value: number): number => clamp(value, 0, 1);
