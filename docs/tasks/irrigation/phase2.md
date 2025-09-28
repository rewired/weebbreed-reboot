# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 2 (Irrigation Method Blueprints)

You are Codex operating within the Weed Breed repository. Use the blueprint governance rules from `/AGENTS.md` and follow Phase 2 requirements described in `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Introduce the irrigation method blueprint pipeline, schemas, and seed data for manual and automated irrigation systems.

## Required Steps

1. Create or update the blueprint schema for irrigation methods (`/data/blueprints/irrigationMethods`). Ensure the schema defines: `id`, `slug`, `name`, `kind`, `description`, `mixing`, `couplesFertilizer`, `flow_L_per_min`, `uniformity`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, and `meta`.
2. Implement validation constraints:
   - `uniformity` must be within `[0.6, 1.0]`.
   - `runoff.defaultFraction` must be within `[0, 0.5]`.
   - Methods with `mixing: inline` require `requirements.minPressure_bar ≥ 1.0`.
   - `ManualCan` must enforce `power_kW = 0` and `mixing = batch`.
   - Compatibility checks must validate against supported zone methods and substrates.
3. Seed the following blueprints with realistic default values and metadata:
   - Manual Watering Can.
   - Drip Inline Fertigation (Basic).
   - Ebb & Flow Table (Small).
   - Top-Feed Pump (Timer).
4. Integrate the new schema into the blueprint loading pipeline (Ajv/Zod validators, hot-reload watchers, index documentation). Update any registries or exports to surface the irrigation methods.
5. Document the blueprint contract and seed entries in the blueprint index docs, including how maintenance intervals are interpreted later in the engine.

## Deliverables

- Schema definition(s) with tests covering validation rules and error cases.
- Four blueprint JSON files placed under `/data/blueprints/irrigationMethods/`, fully validated.
- Updated blueprint loader wiring and documentation referencing the new directory.

## Constraints & Reminders

- Maintain deterministic ordering when loading blueprints (stable sort or keyed maps).
- Use UUIDv4 (or existing project standard) for `id` fields; ensure slugs are unique and kebab-case.
- Update any changelog or README sections that enumerate blueprint types.
