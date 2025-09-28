# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 5 (Task System & Facade Intents)

You are Codex enhancing Weed Breed’s tasking system and simulation facade. Align with `/AGENTS.md` policies and Phase 5 tasks in `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Introduce new irrigation-related tasks, scheduling hooks, and facade intents to orchestrate manual and automated irrigation workflows.

## Required Steps

1. Extend `/data/configs/task_definitions.json` with the four irrigation tasks: `water_fertilize_plants`, `inspect_irrigation_lines`, `clean_irrigation_system`, `mix_nutrient_batch`. Ensure cost models, roles, skills, and descriptions follow existing conventions.
2. Update task routing logic to respect the new definitions, including permission/skill matrix adjustments so workers with irrigation skills are prioritised appropriately.
3. Implement scheduling hooks that translate irrigation method maintenance metadata (`inspectionEveryDays`, `cleaningEveryDays`) into recurring tasks. Ensure deterministic scheduling keyed by tick counters.
4. Integrate manual irrigation methods with the task system: when `phase_irrigationAndNutrients` enqueues pending resources, create corresponding `water_fertilize_plants` tasks through the task facade.
5. Extend the simulation facade with intents:
   - `zone.setIrrigationMethod` (validates compatibility and emits `irrigation.methodChanged`).
   - `inventory.addNutrientStock` (ingests nutrient deliveries with validation).
   - `task.enqueue.waterFertilizePlants` (exposed for engine/manual overrides).
6. Update documentation and TypeScript types for the facade API so frontend/automation clients can adopt the new intents safely.
7. Add unit/integration tests verifying task creation, scheduling cadence, and facade validation (including error cases for incompatible methods).

## Deliverables

- Updated task definitions and routing logic with supporting tests.
- New facade intent implementations plus documentation describing payload shapes and emitted events.
- Wiring between irrigation phase outputs and task system inputs.

## Constraints & Reminders

- Keep all new intents idempotent and deterministic; avoid random IDs—derive from tick + zone identifiers.
- Ensure manual task queues integrate with existing UX expectations (status flags, notifications).
- Document any new event types in `/docs/system/socket_protocol.md` or related references.
