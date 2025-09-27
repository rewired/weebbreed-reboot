/**
 * Disease severity threshold (0–1) above which an infection is guaranteed to be
 * detected once symptoms manifest. Keeps detection logic consistent across the
 * simulation and test fixtures.
 */
export const DISEASE_DETECTION_THRESHOLD = 0.18;

/**
 * Pest population threshold (0–1) that triggers detection once observation
 * delays expire. Encodes when pests become noticeable to staff.
 */
export const PEST_DETECTION_THRESHOLD = 0.22;

/**
 * Infection level (0–1) required before a disease is allowed to spread to
 * neighbouring plants. Prevents low-grade infections from propagating.
 */
export const DISEASE_SPREAD_THRESHOLD = 0.6;

/**
 * Pest population fraction (0–1) that must be exceeded before an infestation
 * can jump to another plant. Mirrors the disease spread gate.
 */
export const PEST_SPREAD_THRESHOLD = 0.6;

/**
 * Default duration in days applied to plant treatments when a blueprint omits
 * explicit effect or cooldown durations.
 */
export const DEFAULT_TREATMENT_DURATION_DAYS = 1;

/**
 * Minimum multiplier applied to treatment efficacy values to guard against
 * negative rates when stacking modifiers.
 */
export const MIN_EFFECTIVE_RATE = 0;

/**
 * Maximum multiplier applied to treatment efficacy values, preventing stacked
 * boosts from growing without bound.
 */
export const MAX_EFFECTIVE_RATE = 10;
