# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 7 (Migration & Data Ops)

You are Codex preparing migrations and operational tooling for Weed Breed. Adhere to `/AGENTS.md` policies and Phase 7 tasks in `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Ship migration scripts, deployment updates, and documentation so existing blueprints/savegames adopt the new irrigation model without data loss.

## Required Steps

1. Extend blueprint seed scripts to include the new irrigation method directory. Ensure deployment pipelines copy and validate the additional files.
2. Implement migration logic that assigns default irrigation methods to existing zones (fallback `manual-watering-can` unless overrides provided). Respect the reference JSON mapping in the task plan.
3. Add CLI or scripted tooling to apply migrations to historical savegames. Include dry-run and backup options.
4. Deprecate or remove reservoir-specific tasks and blueprints no longer needed. Document the deprecation path and any replacement guidance.
5. Update operational documentation (`/docs/system`, `/docs/tasks`, `/docs/constants`, README) describing the new irrigation data flow, migration process, and rollback considerations.
6. Coordinate with release/DevOps pipelines to ensure environments preload the new blueprints and run migrations during deployment.
7. Provide validation scripts/tests confirming migrated saves load successfully and match expected telemetry/state snapshots.

## Deliverables

- Migration scripts/tooling with instructions.
- Updated deployment/seed scripts and documentation.
- Validation evidence (logs/tests) demonstrating successful migration on sample saves.

## Constraints & Reminders

- Migrations must be deterministic and idempotent—rerunning should yield the same state.
- Maintain backups and audit logs for savegame migrations to satisfy QA.
- Communicate deprecation timelines clearly; update changelogs accordingly.
