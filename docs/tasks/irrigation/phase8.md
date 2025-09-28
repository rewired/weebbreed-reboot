# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 8 (Testing & QA)

You are Codex leading the testing effort for Weed Breed’s irrigation overhaul. Honour `/AGENTS.md` quality standards and Phase 8 guidance from `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Design and execute comprehensive tests covering unit logic, scenario simulations, and economic regression for the new irrigation systems.

## Required Steps

1. Draft a test matrix enumerating unit, integration, scenario, and regression cases. Include coverage for water/NPK demand fulfilment, runoff capture, inventory blending, and cost postings.
2. Implement unit tests for:
   - Demand → fulfilment calculations (manual and automated methods).
   - Runoff handling with and without capture.
   - `pickInventoryBlend` shortage detection and event emissions.
   - Telemetry/event ID determinism.
3. Build scenario tests comparing manual vs automated methods delivering identical demand. Validate plant states align while labour/cost metrics differ.
4. Add economic regression tests simulating 7 in-game days; assert that water/nutrient costs align with meter and inventory deltas.
5. Extend golden-master event fixtures (Phase 3 focus) to include irrigation events, ensuring telemetry stays stable between runs.
6. Update CI pipelines or scripts (`pnpm run test`, `pnpm run bench`) to include the new test suites. Ensure runtime stays within acceptable limits.
7. Produce QA documentation summarising test coverage, known gaps, and instructions for manual verification (UI checks, telemetry inspection).

## Deliverables

- Automated test suites (unit, integration, scenario) committed and passing.
- Updated CI configuration to run the new suites.
- QA summary document referencing test results and manual verification steps.

## Constraints & Reminders

- Tests must be deterministic; seed RNGs and avoid time-of-day dependencies.
- Keep golden-master fixtures lightweight but representative; document update procedures.
- Collaborate with QA to capture any tooling needs (log scrapers, dashboards).
