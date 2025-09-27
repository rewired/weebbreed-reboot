# Plant Physiology Constants

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation. Define
> each constant in `src/backend/src/constants/` with concise JSDoc that mirrors
> this catalogue when editing.

## Vapor Pressure & VPD

`MAGNUS_COEFFICIENT_A = 17.27`
Coefficient `a` in the Magnus saturation vapour pressure approximation used by `vaporPressureDeficit`.

`MAGNUS_COEFFICIENT_B = 237.3`
Coefficient `b` (°C) in the Magnus formulation defining the temperature offset for saturation vapour pressure.

`MAGNUS_PRESSURE_COEFFICIENT = 0.6108`
Coefficient `c` (kPa) that scales the Magnus exponential term to produce saturation vapour pressure in kilopascals.

## Temperature Response Curves

`GAUSSIAN_MIN_SIGMA = 0.05`
Lower bound on Gaussian response spread to prevent zero-width stress curves in thermal and VPD drivers.

## Transpiration & Canopy Conductance

`BASE_CANOPY_CONDUCTANCE = 0.008`
Baseline canopy conductance in mol·m⁻²·s⁻¹·kPa⁻¹ used before scaling transpiration by leaf area index.

`WATER_MOLAR_VOLUME_LITERS = 0.018`
Litres per mole of water used when converting molar fluxes from canopy conductance into litres transpired.

`SECONDS_PER_HOUR = 3600`
Seconds in a simulation hour used to accumulate molar fluxes over timestep durations.

## Photobiology Conversion Factors

`MICROMOL_TO_MOL = 1e-6`
Conversion factor from micromoles to moles applied when integrating PPFD into daily light integrals.
