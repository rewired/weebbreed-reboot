# Plant Health Constants

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

## Detection Thresholds

`DISEASE_DETECTION_THRESHOLD = 0.18`
Disease severity fraction that guarantees an infection is flagged once symptoms appear, ensuring consistent detection timing.
`PEST_DETECTION_THRESHOLD = 0.22`
Pest population fraction that triggers detection after observation delays, marking when infestations become noticeable.

## Spread Gates

`DISEASE_SPREAD_THRESHOLD = 0.60`
Minimum infection intensity required before a disease can jump to neighbouring plants, suppressing low-grade spread.
`PEST_SPREAD_THRESHOLD = 0.60`
Population level pests must exceed before propagating to other plants, aligning pest spread with disease logic.

## Treatment Defaults

`DEFAULT_TREATMENT_DURATION_DAYS = 1`
Fallback treatment duration applied when an option omits explicit effect or cooldown lengths.

## Treatment Efficacy Bounds

`MIN_EFFECTIVE_RATE = 0`
Lower multiplier clamp to prevent negative infection or degeneration rates when combining treatments.
`MAX_EFFECTIVE_RATE = 10`
Upper multiplier clamp to cap stacked treatment boosts and keep simulation values stable.
