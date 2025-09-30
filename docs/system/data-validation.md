# Blueprint Data Validation Workflow

The simulation depends on curated blueprint bundles (strains, devices,
cultivation methods, room purposes, and price tables). To prevent drift or
accidental schema regressions, use the dedicated validation command before
checking in blueprint changes.

## Command

```bash
pnpm validate:data
```

This command runs the TypeScript tool in `tools/validate-data.ts`, which uses
the shared `loadBlueprintData` pipeline to parse every blueprint collection and
its associated price maps.

### Options

| Flag                                 | Description                                 | Default              |
| ------------------------------------ | ------------------------------------------- | -------------------- |
| `-d`, `--data`, `--data-dir <path>`  | Blueprint data directory to validate.       | `data`               |
| `-o`, `--out`, `--report-dir <path>` | Directory for generated validation reports. | `reports/validation` |
| `-h`, `--help`                       | Print usage information and exit.           | –                    |

The data directory argument can also be supplied as a positional argument.
Exit status is **non-zero** when any error-level issues are found, making the
command suitable for CI/CD gates.

## Output

During execution the tool prints a summary with the number of loaded files,
per-family counts, and a sorted list of warnings/errors. Detailed artifacts are
written to `reports/validation`:

- `latest.json` — machine-readable report (issues, versions, counts).
- `latest.txt` — human-readable summary with the same details.
- Timestamped `YYYY-MM-DDTHH-MM-SSZ.json` snapshots for historical runs.

The directory is tracked in git with an ignore file so generated reports do not
appear as untracked changes.

## Continuous Integration

The `Data Validation` workflow (`.github/workflows/data-validation.yml`) now
executes three independent jobs on every push and pull request:

- `pnpm validate:data` to gate blueprint updates.
- `pnpm audit:run` to surface dependency vulnerabilities via the audit runner.
- `pnpm lint` to keep workspace lint rules enforced in the same gate.

Each job installs dependencies with the pinned pnpm and Node.js versions so a
failure in any command marks the workflow as failed.

## Device Blueprint Strictness

Device blueprints rely on precise casing for control setpoints that the engine
expects (for example `targetTemperature`, `targetHumidity`, and `targetCO2`).
The Zod schema backing `pnpm validate:data` now rejects mis-cased variants such
as `targetCo2` and surfaces a clear suggestion in the validation report. This
keeps blueprint typos from silently disabling device controllers.

In addition to casing hints, the `settings`, `coverage`, `limits`, `meta`, and
top-level device blocks are now **strict objects**. Blueprint authors must stay
within the explicit set of keys encoded in the schema:

- **Settings** — numeric controls such as `power`, `ppfd`,
  `coverageArea`, `spectralRange`, `heatFraction`, `airflow`,
  `coolingCapacity`, `cop`, `hysteresisK`, `fullPowerAtDeltaK`,
  `moistureRemoval`, `targetTemperature`, `targetTemperatureRange`,
  `targetHumidity`, `targetCO2`, `targetCO2Range`, `hysteresis`,
  `pulsePpmPerTick`, `latentRemovalKgPerTick`,
  `humidifyRateKgPerTick`, and `dehumidifyRateKgPerTick`.
- **Coverage** — geometry descriptors limited to
  `maxArea_m2`, `maxVolume_m3`, `effectivePPFD_at_m`, `beamProfile`,
  `airflowPattern`, `distributionPattern`, `ventilationPattern`,
  `removalPattern`, and `controlPattern`.
- **Limits** — operational bounds including `power_W`, `maxPPFD`,
  `minPPFD`, `coolingCapacity_kW`, `airflow_m3_h`, `maxAirflow_m3_h`,
  `minAirflow_m3_h`, `maxStaticPressure_Pa`, `co2Rate_ppm_min`,
  `maxCO2_ppm`, `minCO2_ppm`, `removalRate_kg_h`, `capacity_kg_h`,
  `minTemperature_C`, `maxTemperature_C`, `minHumidity_percent`, and
  `maxHumidity_percent`.
- **Meta** — optional descriptive fields (`description`, `advantages`,
  `disadvantages`, `notes`).

Any new attribute must be added to the schema alongside documentation updates
before it appears in JSON. This keeps validation aligned with the engine's
expectations and makes blueprint errors fail fast during `pnpm validate:data`.
