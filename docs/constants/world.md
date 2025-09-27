# World Defaults

> See [ADR 0009](../system/adr/0009-simulation-constants-governance.md) for the
> stewardship policy that governs these constants and their documentation.

The world module exposes shared defaults for the resources stocked into a new
zone and the recurring maintenance cadence. These values align engine behaviours
(`stateFactory`, `WorldService`) and prevent drift between initialization and
runtime management flows.

| Constant                             | Default                                 | Rationale                                                                                                                                                                    |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_ZONE_RESERVOIR_LEVEL`       | `0.75`                                  | New reservoirs launch three-quarters full so irrigation controllers have working volume while still leaving headroom for rapid top-offs or rain events triggered by devices. |
| `DEFAULT_ZONE_WATER_LITERS`          | `800` litres                            | Provides roughly a week of transpiration supply for a mid-vegetative canopy before automated refills need to trigger.                                                        |
| `DEFAULT_ZONE_NUTRIENT_LITERS`       | `400` litres                            | Mirrors the water allocation while assuming a 50 % nutrient dilution plan, allowing alternating water/feed cycles without immediate mixing.                                  |
| `DEFAULT_MAINTENANCE_INTERVAL_TICKS` | `DEFAULT_TICKS_PER_MONTH` (8 640 ticks) | Schedules routine device servicing every in-game month (30 days). Uses the default 5-minute tick length (288 ticks/day) to keep maintenance aligned with finance accruals.   |

Referencing these constants ensures all world management flows respect the same
default resource budgets and maintenance timeline.
