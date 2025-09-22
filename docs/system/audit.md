# Simulation Audit Runner

The audit runner executes deterministic backend simulations and collects KPI
time-series suitable for CI regression tracking and artifact review. It lives in
`scripts/run_audit.ts` and is exposed via the workspace script
`pnpm audit:run`.

## Running an audit

```bash
pnpm audit:run --days 7 --seed wb-nightly --output reports/audit --run-id nightly
```

Key options:

- `--seed <value>` — deterministic RNG seed (default: `audit-default`).
- `--days <n>` / `--ticks <n>` — simulation horizon. `--ticks` overrides
  `--days`.
- `--tick-length <minutes>` — override the initial state's tick length.
- `--output <dir>` — base directory for artifacts. A timestamped subdirectory is
  created automatically unless `--run-id` is provided.
- `--baseline <file>` — JSON or JSONL metrics file to compare against.
- `--baseline-mode <tick|day>` — choose the granularity for comparisons
  (default: `day`).
- `--tolerance-default <ε>` — global numeric tolerance used during comparisons.
- `--tolerance <metric=ε>` — repeatable flag for per-metric tolerances.
- `--overrun-threshold <ms>` / `--overrun-consecutive <n>` — configure the tick
  duration watchdog that marks the `throttled` flag when sustained overruns are
  detected.

### Output structure

Every run produces JSONL and CSV streams for both tick-level and aggregated
(day-level) KPIs under the resolved output directory:

```
reports/audit/<run-id>/
  metrics-ticks.jsonl
  metrics-ticks.csv
  metrics-days.jsonl
  metrics-days.csv
  summary.json
```

The files contain the required audit KPIs (biomass delta, stress, quality,
energy/water/nutrient use, opex/capex, task drops, throttling flags). The
`summary.json` payload also records blueprint metadata, runtime settings, totals
and comparison results, making it a single artifact to publish from CI.

### Baseline comparisons

When `--baseline` is provided the runner parses the referenced metrics file,
performs ε-tolerance comparisons and exits with status `1` if regressions are
found. The tolerance map accepts numeric deviations and treats booleans as
0/1 flags. Example:

```bash
pnpm audit:run \
  --days 14 \
  --seed wb-nightly \
  --baseline reports/audit/golden/metrics-days.jsonl \
  --baseline-mode day \
  --tolerance-default 0.05 \
  --tolerance quality_avg=0.75 \
  --tolerance tasks_dropped=0
```

### CI integration

Use `pnpm audit:run` inside CI pipelines with a fixed seed and explicit
`--run-id` to produce stable artifact paths (e.g. `reports/audit/nightly`). The
resulting directory can be uploaded as a build artifact for dashboards or manual
inspection. Because the runner relies on the backend's state factory and
`SimulationLoop`, it honours deterministic seeds and blueprint data validation
exactly as the production backend does.
