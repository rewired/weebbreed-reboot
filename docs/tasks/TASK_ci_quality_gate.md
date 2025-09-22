- [ ] done

# TASK_ci_quality_gate

## Goal

Qualitäts‑Gate für Konsistenz: ESLint, Prettier, Tests, Schema‑Checks, Import‑Aliase.

## Acceptance Criteria

- `pnpm check` führt Lint, Format‑Check, Tests, Schemas aus.
- CI‑Workflow (GitHub Actions) bricht bei Fehlern ab.

## Steps

1. ESLint/Prettier konfigurieren; Format‑Fehler automatisch korrigierbar machen (`pnpm fmt`).
2. Schema‑Validator in `check` integrieren.
3. Pfadaliase `@/*` für Backend & Frontend (keine „hässlichen“ Relativ‑Imports).
