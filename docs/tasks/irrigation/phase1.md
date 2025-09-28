# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 1 (Data Model & Schemas)

You are Codex working on the Weed Breed TypeScript backend. All changes must comply with `/AGENTS.md`, the simulation tick contract, and the Phase 1 goals in `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Extend structure and zone state, JSON schemas, and save/load pipelines to support the new irrigation utilities.

## Required Steps

1. Catalogue every schema definition affecting structure, zone, and inventory state (runtime, savegame, blueprint validation). Identify the files to update and note required migrations.
2. Modify the structure schema to include:
   - `utilities.waterMeter_m3` (default 0).
   - `utilities.lastTickWaterDraw_L` (default 0).
   - `inventory.nutrients[]` entries with `id`, `name`, `form`, `npk`, `amount_kg`.
3. Extend zone schemas with `irrigation.methodId` (required) plus optional `targetEC_mS_cm` and `runoffFraction` fields.
4. Recompile or regenerate any derived schema bundles/versioned registries so validation remains deterministic.
5. Update save/load serializers, initial seed state, and schema migrations to ensure new fields persist across round-trips.
6. Document schema updates in `/docs/system` (append a changelog note) and flag downstream consumers that require adjustments.

## Deliverables

- Updated TypeScript schema modules reflecting the new fields, with defaults and validation constraints.
- Migration or fallback logic ensuring legacy saves hydrate the new fields safely.
- Documentation updates summarising the schema expansion and downstream impact.

## Constraints & Reminders

- Maintain SI naming conventions—no unit suffixes in keys, numeric fields in canonical SI (litres, kilograms, etc.).
- Ensure schema version numbers or hashes are bumped so migrations trigger predictably.
- Add or update tests that exercise schema validation for the new fields (no skipping or TODOs).
