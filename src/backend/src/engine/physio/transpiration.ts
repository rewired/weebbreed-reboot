import {
  BASE_CANOPY_CONDUCTANCE,
  SECONDS_PER_HOUR,
  WATER_MOLAR_VOLUME_LITERS,
} from '@/constants/physiology.js';

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

export interface TranspirationInput {
  /** Vapour pressure deficit in kilopascals (kPa). */
  vpdKPa: number;
  /** Effective canopy area exposed to air in square metres (m²). */
  canopyAreaM2: number;
  /** Leaf area index (dimensionless, m² leaf area per m² ground). */
  leafAreaIndex: number;
  /** Duration of the time step in hours. */
  durationHours: number;
  /** Optional stomatal opening factor (0–1) capturing stress modulation. */
  stomatalFactor?: number;
}

/**
 * Estimates plant transpiration over a time step using a canopy conductance model.
 *
 * The formulation is a simplified Penman–Monteith proxy:
 *   `E = g_c * VPD * f_stomatal`
 * where `g_c` scales with the leaf area index. The resulting flux is converted from
 * mol·m⁻²·s⁻¹ to litres over the given canopy area and time step.
 */
export const estimateTranspirationLiters = ({
  vpdKPa,
  canopyAreaM2,
  leafAreaIndex,
  durationHours,
  stomatalFactor,
}: TranspirationInput): number => {
  const vpd = Math.max(vpdKPa, 0);
  const area = Math.max(canopyAreaM2, 0);
  const hours = Math.max(durationHours, 0);
  if (vpd === 0 || area === 0 || hours === 0) {
    return 0;
  }
  const laiFactor = clamp(leafAreaIndex / 3, 0.3, 2);
  const stomatal = clamp(stomatalFactor ?? 1, 0, 1);
  const conductance = BASE_CANOPY_CONDUCTANCE * laiFactor;
  const fluxMolPerM2S = conductance * vpd * stomatal;
  const mol = fluxMolPerM2S * area * hours * SECONDS_PER_HOUR;
  return mol * WATER_MOLAR_VOLUME_LITERS;
};
