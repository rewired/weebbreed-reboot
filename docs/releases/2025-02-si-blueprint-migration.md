# Blueprint Unit Migration (SI Base Units)

**Release date:** 2025-02-XX  
**Audience:** Blueprint authors, content integrators, backend engineers

## Summary

Blueprint schemas for devices and strains now require SI base units without encoding the unit in the property name. Duration fields are provided in **seconds**, masses in **kilograms**, and decay/flux rates in their base SI equivalents.

## Renamed Fields & Unit Changes

| Blueprint                             | Old property                 | New property                 | Conversion                            |
| ------------------------------------- | ---------------------------- | ---------------------------- | ------------------------------------- |
| Device                                | `lifespanInHours`            | `lifespan`                   | hours → seconds (`value * 3600`)      |
| Strain → `growthModel`                | `maxBiomassDry_g`            | `maxBiomassDry`              | grams → kilograms (`value / 1000`)    |
| Strain → `growthModel`                | `baseLUE_gPerMol`            | `baseLightUseEfficiency`     | g/mol → kg/mol (`value / 1000`)       |
| Strain → `photoperiod`                | `vegetationDays`             | `vegetationTime`             | days → seconds (`value * 86400`)      |
| Strain → `photoperiod`                | `floweringDays`              | `floweringTime`              | days → seconds                        |
| Strain → `photoperiod`                | `transitionTriggerHours`     | `transitionTrigger`          | hours → seconds (`value * 3600`)      |
| Strain                                | `harvestWindowInDays`        | `harvestWindow`              | days → seconds                        |
| Strain → `harvestProperties`          | `ripeningTimeInHours`        | `ripeningTime`               | hours → seconds                       |
| Strain → `harvestProperties`          | `maxStorageTimeInHours`      | `maxStorageTime`             | hours → seconds                       |
| Strain → `harvestProperties`          | `qualityDecayPerHour`        | `qualityDecayRate`           | 1/hour → 1/second (`value / 3600`)    |
| Cultivation method compatibility keys | `photoperiod.vegetationDays` | `photoperiod.vegetationTime` | Apply days → seconds before comparing |

## Authoring Guidance

- Provide all duration values in seconds. Example: a 48-hour ripening window becomes `172800`.
- Provide dry mass limits in kilograms. Example: `180 g` → `0.18`.
- Provide light-use efficiency in kilograms per mol of photons. Example: `0.9 g/mol` → `0.0009`.
- Provide exponential decay constants per second. Example: `0.02 per hour` → `5.555555555555556e-6`.
- Update any cultivation method trait thresholds that referenced `photoperiod.vegetationDays` to the new `photoperiod.vegetationTime` key, converting bounds to seconds.

## Runtime Implications

- Internal simulation logic continues to operate on hours and grams where appropriate, so loaders now convert from seconds/kilograms back to the expected runtime units.
- Harvest quality decay now interprets the per-second rate directly, so test expectations and downstream calculations should use seconds when deriving analytic values.

## Migration Checklist

1. Rename the affected fields in custom blueprints and convert their values using the table above.
2. Update any scripts or tooling that reference the previous keys (e.g., editors, validators).
3. Re-run schema validation to confirm compliance with the updated device and strain Zod schemas.
4. Review cultivation method compatibility rules for the renamed photoperiod key.
