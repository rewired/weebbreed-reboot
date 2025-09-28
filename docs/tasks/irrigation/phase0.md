# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 0 (Preparation & Alignment)

You are Codex assisting with the Weed Breed monorepo (TypeScript backend, React frontend). Follow the architectural guardrails from `/AGENTS.md` and the plan in `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Establish cross-discipline alignment and gather the artefacts required before implementing the irrigation & nutrient overhaul.

## Required Steps

1. Read the existing irrigation-related code paths, schema definitions, and task pipelines to build an inventory of current behaviour. Document each source file, schema, and blueprint you inspect.
2. Schedule syncs with the Simulation, UI, and Data domain owners. Capture open questions, approved decisions, and follow-up actions in `/docs/tasks/irrigation/phase0-notes.md` (create if absent).
3. Analyse the residual “reservoir” task flows. Produce a decision brief summarising which tasks will be deprecated, migrated, or retained; include impact on savegames and telemetry contracts.
4. Summarise the agreed target state (structure-level water meter & nutrient store, zone irrigation method) and list the artefacts that must be updated in later phases.

## Deliverables

- A written summary (`phase0-notes.md`) covering meetings, decisions, and outstanding risks.
- A deprecation decision brief appended to `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md` or linked from the notes.

## Constraints & Reminders

- Do not modify executable code in this phase—only notes/decision docs.
- Ensure stakeholders sign off on the prepared materials before Phase 1 starts.
- Track any schema or telemetry implications so the downstream phases stay coordinated.
