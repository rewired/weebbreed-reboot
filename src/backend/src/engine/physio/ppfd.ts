import { MICROMOL_TO_MOL, SECONDS_PER_HOUR } from '@/constants/physiology.js';

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

/**
 * Rectangular hyperbola response of photosynthesis to PPFD (µmol·m⁻²·s⁻¹).
 *
 * @param ppfd - Incident photosynthetic photon flux density in µmol·m⁻²·s⁻¹.
 * @param halfSaturation - Half-saturation constant (µmol·m⁻²·s⁻¹).
 * @param maxResponse - Optional maximum response multiplier (default 1).
 * @returns Response multiplier in the range [0, maxResponse].
 */
export const lightSaturationResponse = (
  ppfd: number,
  halfSaturation: number,
  maxResponse = 1,
): number => {
  if (ppfd <= 0) {
    return 0;
  }
  const half = Math.max(halfSaturation, 1);
  const response = ppfd / (ppfd + half);
  return clamp(response * maxResponse, 0, maxResponse);
};

/**
 * Integrates PPFD over a time step and converts it to mol·m⁻².
 *
 * @param ppfd - Photosynthetic photon flux density in µmol·m⁻²·s⁻¹.
 * @param durationHours - Duration of the time step in hours.
 * @returns Photon dose in mol·m⁻² for the given time step.
 */
export const ppfdToMoles = (ppfd: number, durationHours: number): number => {
  const photons = Math.max(ppfd, 0);
  const hours = Math.max(durationHours, 0);
  return photons * MICROMOL_TO_MOL * hours * SECONDS_PER_HOUR;
};
