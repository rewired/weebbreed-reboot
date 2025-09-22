# Contributing to Weed Breed Reboot

Welcome! This document describes how to contribute changes to the Weed Breed Reboot monorepo. It complements the authoritative design and schema references tracked in [`docs/`](docs/).

## Before You Start

1. **Study the domain docs.** The blueprint and schema definitions in the [Data Dictionary](docs/DD.md), the extended JSON blueprint listings in [All JSON Blueprints](docs/addendum/all-json.md), and the simulation notes in the [Simulation Engine Overview](docs/system/simulation-engine.md) are the source of truth for content and engine behaviour. When working on blueprint data or engine logic, consult these first to avoid schema drift.
2. **Understand validation expectations.** The [Blueprint Data Validation Workflow](docs/addendum/data-validation.md) explains the reporting pipeline that backs `pnpm validate:data` and documents how CI enforces data quality gates.
3. **Install dependencies.** Use Node.js 20+ with [pnpm](https://pnpm.io/) and run `pnpm install` at the repository root to hydrate all workspace packages.

## Expected Workflow

1. Create a feature branch in your fork and sync with `main`.
2. Make focused changes while keeping the tick engine, schema contracts, and naming conventions aligned with the docs listed above.
3. Run targeted unit/integration tests for the packages you touched (`pnpm -r test` or package-specific scripts) and generate any necessary blueprint validation reports.
4. Review generated artifacts (e.g., under `reports/validation`) before committing.
5. Open a pull request that summarises the change, references the relevant docs, and links to any blueprint reports when applicable.

## Pull Request Checklist

Complete these steps before marking your pull request ready for review:

- [ ] Re-read the blueprint and schema references to confirm the change matches the documented contracts ([Data Dictionary](docs/DD.md), [All JSON Blueprints](docs/addendum/all-json.md), [Simulation Engine Overview](docs/system/simulation-engine.md)).
- [ ] Run the workspace lint task: `pnpm lint`.
- [ ] Validate blueprint data (required when any JSON blueprints or schema-driven code is touched): `pnpm validate:data`.
- [ ] Execute the dependency audit gate: `pnpm audit:run`.
- [ ] Run the relevant test suites (`pnpm -r test` or scoped package commands) and ensure they pass.
- [ ] Update or add documentation in [`docs/`](docs/) when behaviour or contracts change.

Following this workflow keeps contributions aligned with the deterministic simulation architecture and ensures CI gates remain green.
