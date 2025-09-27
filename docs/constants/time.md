# Timekeeping Defaults

> These values anchor the simulation's default cadence and provide shared
> conversions for systems that scale behaviour with tick length.

| Constant                      | Default       | Rationale                                                                                                                      |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `MINUTES_PER_HOUR`            | `60` minutes  | Canonical minutes-per-hour conversion used across scheduling maths.                                                            |
| `HOURS_PER_DAY`               | `24` hours    | Standard day length for aggregating tick metrics.                                                                              |
| `DAYS_PER_MONTH`              | `30` days     | Baseline month length for maintenance and finance rollups.                                                                     |
| `DEFAULT_TICK_LENGTH_MINUTES` | `5` minutes   | Default simulated minutes advanced per tick, keeping within the documented 1–10 minute guidance for responsive gameplay loops. |
| `DEFAULT_TICK_INTERVAL_MS`    | `300 000` ms  | Millisecond interval corresponding to the default tick cadence at 1×.                                                          |
| `DEFAULT_TICKS_PER_HOUR`      | `12` ticks    | Number of ticks executed during one simulated hour at the default cadence.                                                     |
| `DEFAULT_TICKS_PER_DAY`       | `288` ticks   | One simulated day (24 hours) represented at the default tick length.                                                           |
| `DEFAULT_TICKS_PER_MONTH`     | `8 640` ticks | Thirty simulated days worth of ticks at the default cadence; reused by maintenance scheduling.                                 |

All time-sensitive subsystems (scheduler, accounting, maintenance) should source
these constants to avoid desynchronised assumptions when the default cadence
changes.
