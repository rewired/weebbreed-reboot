# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 6 (UI & Telemetry)

You are Codex updating the Weed Breed React dashboard and telemetry contracts. Follow `/AGENTS.md` guidance, frontend standards, and Phase 6 requirements from `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Expose the new irrigation state in telemetry payloads and surface it within the dashboard UI (zone details, task queues, structure metrics).

## Required Steps

1. Extend backend snapshot builders and Socket.IO payloads to include:
   - Zone irrigation method metadata (method name/slug, target EC, runoff overrides, last delivery stats).
   - Structure water meter readings (`waterMeter_m3`, `lastTickWaterDraw_L`) and nutrient inventory summaries.
   - Task queue counts for `water_fertilize_plants` when manual methods are active.
2. Version or annotate telemetry payloads so clients can differentiate the new fields. Update `/docs/system/socket_protocol.md` accordingly.
3. Update the frontend Zustand store slices to ingest the new telemetry fields while maintaining backward compatibility (default fallbacks when fields missing).
4. Implement UI components:
   - Zone detail pill showing irrigation method and maintenance countdowns.
   - Readouts for target EC and runoff overrides.
   - Badges/indicators for pending manual irrigation tasks.
   - Structure-level widgets summarising daily/weekly water usage and nutrient stock levels (with reorder hinting logic, even if disabled).
5. Ensure automated method maintenance intervals are displayed (next inspection/cleaning based on telemetry or derived in UI).
6. Add tests (unit for selectors, component tests, or Playwright e2e) verifying the UI renders new data and handles missing fields gracefully.
7. Update user-facing docs/UX guides (`/docs/ui-building_guide.md`, README snippets) describing the new dashboard panels.

## Deliverables

- Updated telemetry contract with documentation.
- React components/store updates displaying irrigation state.
- Test coverage ensuring UI stability and compatibility.

## Constraints & Reminders

- Respect performance constraints: throttle chart updates, memoise selectors when necessary.
- Coordinate CSS/theming changes with existing design tokens; avoid ad-hoc styles.
- If mock data or fixtures are used for UI tests, update them to include irrigation fields.
