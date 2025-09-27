/**
 * Simulation timekeeping constants shared across the backend. These values
 * define the default cadence for ticks and help downstream systems derive
 * hourly/daily/monthly aggregates from minutes-per-tick inputs.
 */
export const MINUTES_PER_HOUR = 60;

export const HOURS_PER_DAY = 24;

export const DAYS_PER_MONTH = 30;

/**
 * Default simulated minutes advanced per tick when booting a fresh game.
 * Aligned with the 1–10 minute window documented in the PRD to keep early
 * game feedback loops responsive while preserving hourly aggregation maths.
 */
export const DEFAULT_TICK_LENGTH_MINUTES = 5;

/**
 * Millisecond interval corresponding to the default tick cadence at 1× speed.
 */
export const DEFAULT_TICK_INTERVAL_MS = DEFAULT_TICK_LENGTH_MINUTES * MINUTES_PER_HOUR * 1000;

/**
 * Number of ticks that elapse during one simulated hour at the default tick
 * length.
 */
export const DEFAULT_TICKS_PER_HOUR = MINUTES_PER_HOUR / DEFAULT_TICK_LENGTH_MINUTES;

/**
 * Number of ticks that elapse during one simulated day at the default tick
 * length.
 */
export const DEFAULT_TICKS_PER_DAY = DEFAULT_TICKS_PER_HOUR * HOURS_PER_DAY;

/**
 * Number of ticks that elapse during one simulated 30-day month at the
 * default tick length.
 */
export const DEFAULT_TICKS_PER_MONTH = DEFAULT_TICKS_PER_DAY * DAYS_PER_MONTH;
