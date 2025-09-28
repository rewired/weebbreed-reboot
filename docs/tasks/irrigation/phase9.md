# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 9 (Close-Out & Review)

You are Codex coordinating the close-out activities for Weed Breed’s irrigation overhaul. Follow `/AGENTS.md` governance and Phase 9 directives in `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Complete cross-package review, release preparation, and observability validation to ship the overhaul confidently.

## Required Steps

1. Organise a multi-package code review involving backend, frontend, docs, and data stakeholders. Track action items and ensure all blockers are resolved.
2. Compile release notes summarising features, schema changes, migrations, and testing outcomes. Align terminology with the PRD and task plan.
3. Obtain QA sign-off by presenting automated test results, manual verification logs, and outstanding risk assessments.
4. Audit logging and monitoring hooks to confirm new irrigation events/metrics are captured. Update observability dashboards or alerts if required.
5. Verify that documentation (README, `/docs/system`, `/docs/tasks`, `/docs/constants`) reflects the final implementation. Ensure diagrams or tables are refreshed.
6. Coordinate the final deployment checklist: migrations applied, blueprints seeded, telemetry consumers ready, rollback plan documented.
7. Archive project artefacts (design docs, test reports, migration logs) in the agreed location for future reference.

## Deliverables

- Review sign-off log capturing approvals from each discipline.
- Final release notes ready for publication (CHANGELOG entry, release page draft).
- Observability validation report confirming telemetry/logging coverage.

## Constraints & Reminders

- Ensure no open TODOs or FIXME placeholders remain in code or docs before sign-off.
- All documentation updates must reference the final schema/telemetry shapes.
- Capture lessons learned for retrospectives; propose follow-up tasks if scope was deferred.
