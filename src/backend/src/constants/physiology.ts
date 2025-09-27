/** Magnus equation coefficient `a` used to compute saturation vapour pressure as a function of temperature. */
export const MAGNUS_COEFFICIENT_A = 17.27;

/** Magnus equation coefficient `b` (°C) representing the temperature offset in the saturation vapour pressure formula. */
export const MAGNUS_COEFFICIENT_B = 237.3;

/** Magnus equation coefficient `c` (kPa) scaling the exponential saturation vapour pressure term. */
export const MAGNUS_PRESSURE_COEFFICIENT = 0.6108;

/** Minimum Gaussian spread (σ) enforced for response curves to avoid degenerate zero-width distributions. */
export const GAUSSIAN_MIN_SIGMA = 0.05;

/** Baseline canopy conductance (mol·m⁻²·s⁻¹·kPa⁻¹) applied before scaling by leaf area index. */
export const BASE_CANOPY_CONDUCTANCE = 0.008;

/** Molar volume of liquid water in litres per mole, used to convert transpiration flux into litres. */
export const WATER_MOLAR_VOLUME_LITERS = 0.018;

/** Number of seconds in a simulation hour, used for flux integrations over time. */
export const SECONDS_PER_HOUR = 3600;

/** Conversion factor from micromoles to moles for photon flux density integrals. */
export const MICROMOL_TO_MOL = 1e-6;
