# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 3 (Engine Phase Update)

You are Codex modifying the Weed Breed backend simulation engine. Follow `/AGENTS.md` guardrails and implement the Phase 3 plan from `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Replace the legacy reservoir-driven irrigation logic with the new `irrigationAndNutrients` phase flow that consumes irrigation method blueprints and updates zone resources deterministically.

## Required Steps

1. Identify and remove the old reservoir/queue logic tied to irrigation. Map all call sites and ensure no dead references remain.
2. Implement a new `phase_irrigationAndNutrients` module that:
   - Iterates zones, calculates water & nutrient demand, and fetches the assigned irrigation method via the blueprint registry.
   - Branches on method kind (`ManualCan` vs automated) to either enqueue manual tasks or fulfil delivery immediately.
3. Create helper functions such as `fulfillWaterAndNutrients`, `enqueueWaterTask`, `updateZoneDeliveryStats`, and `scheduleMaintenanceIfDue`, ensuring pure/deterministic behaviour and unit-compliant calculations.
4. Update zone resource tracking (`zone.resources.pending.*`) for manual methods while preserving existing queue semantics.
5. For automated methods, apply irrigation instantly, update structure utility counters, and invoke maintenance scheduling hooks.
6. Integrate with plant physiology modules so water/nutrient availability feeds existing growth/stress models without breaking determinism.
7. Ensure events and telemetry emitted from this phase have deterministic IDs and adhere to established namespaces (`irrigation.*`, `sim.*`). Add regression tests where necessary.

## Deliverables

- New engine phase module(s) with full TypeScript typings, replacing reservoir logic.
- Updated unit/integration tests covering manual vs automated flows, maintenance triggers, and deterministic telemetry output.
- Documentation updates summarising the phase rewrite and any new events.

## Constraints & Reminders

- Preserve the prescribed tick phase order; do not move side-effects into adjacent phases.
- Avoid duplicating blueprint lookups—cache or inject references as required for performance without compromising determinism.
- All numeric computations must respect SI units; clearly document any assumptions in JSDoc.
