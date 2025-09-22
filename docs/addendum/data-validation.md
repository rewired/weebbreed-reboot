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

The `Data Validation` workflow (`.github/workflows/data-validation.yml`) executes
`pnpm validate:data` on every push and pull request. This ensures blueprint
changes are validated alongside application code before merging.
