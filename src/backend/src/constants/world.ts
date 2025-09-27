import { DEFAULT_TICKS_PER_MONTH } from './time.js';

/**
 * Fractional fill level (0–1) applied to freshly provisioned zone reservoirs.
 * Keeps irrigation controllers within their nominal operating range while
 * leaving headroom for overfill events.
 */
export const DEFAULT_ZONE_RESERVOIR_LEVEL = 0.75;

/**
 * Litres of plain water stocked into a new zone's reservoir. Sized for roughly
 * one week of transpiration at mid-vegetative demand before refills.
 */
export const DEFAULT_ZONE_WATER_LITERS = 800;

/**
 * Litres of nutrient solution charged at strength 1. Mirrors the default water
 * allocation so irrigation can alternate between water and feed cycles.
 */
export const DEFAULT_ZONE_NUTRIENT_LITERS = 400;

/**
 * Number of simulation ticks between routine device maintenance windows.
 * Derives a monthly cadence (30 days) using the default tick length (5 minutes
 * per tick ⇒ 288 ticks per day, 8,640 per 30-day month).
 */
export const DEFAULT_MAINTENANCE_INTERVAL_TICKS = DEFAULT_TICKS_PER_MONTH;
