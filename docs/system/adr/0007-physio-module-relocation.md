# ADR 0007 — Physiology Modules Collocate with the Engine

- **Status:** Accepted (2025-09-23)
- **Owner:** Simulation Platform
- **Context:** Backend physiology helpers and path aliases

## Context

The simplified canopy physiology formulas (VPD, PPFD integration, CO₂ response,
transpiration, etc.) originally lived in a root-level `src/physio` folder. The
backend accessed them through a bespoke `@/physio` alias while the engine's own
packages (`@/engine/...`) remained under `src/backend/src/engine`. The split
introduced several problems:

- The helpers appeared to be a workspace-level shared module even though only
  the backend consumed them.
- The duplicated alias required extra configuration (`tsconfig`, Vitest) and
  complicated editor IntelliSense compared to the existing `@` alias rooted at
  `src/backend/src`.
- Docs and onboarding materials had drifted, making it unclear where new
  physiology work should live and why the helpers were not beside the engine
  code that orchestrates them.

## Decision

- Move all physiology helpers (`co2.ts`, `ppfd.ts`, `rh.ts`, `temp.ts`,
  `transpiration.ts`, `vpd.ts`, and their `index.ts` barrel) into
  `src/backend/src/engine/physio/` so they sit next to the engine subsystems
  that use them.
- Update backend imports to use `@/engine/physio/...` and re-export the barrel
  from `src/backend/src/engine/index.ts` for consistency with other engine
  modules.
- Drop the custom `@/physio` alias from `tsconfig.json` and `vitest.config.ts`
  in favour of the existing `@` base alias.
- Remove the unused `@/engine` alias from the frontend `vite.config.ts` to avoid
  future confusion now that the helpers are collocated with the backend engine.
- Refresh AGENTS.md, the physiology system note, and the outstanding tasks entry
  to point at the new location and record the change history.

## Consequences

- Physiology helpers travel with the engine when it is refactored or packaged,
  reducing the risk of stale imports and simplifying code navigation.
- Backend build and test tooling no longer carries redundant alias wiring,
  which shortens configuration files and eliminates a class of path resolution
  bugs.
- Documentation, tasks, and onboarding materials now agree on where physiology
  work belongs, making it easier for contributors to extend or replace the
  formulas.
- Frontend tooling no longer advertises a non-existent `@/engine` path, avoiding
  accidental imports that would break at runtime.

## Alternatives Considered

1. **Leave the helpers at the repository root.** Rejected because it perpetuates
   the alias drift and keeps physiology logic detached from the engine domain.
2. **Promote the helpers to a dedicated workspace package.** Deferred until we
   have a second consumer. Today the backend is the only user, so a package
   boundary would add publishing overhead without improving reuse.

## Rollback Plan

If the relocation causes unforeseen coupling issues, restore the previous
`src/physio` directory via git history, reinstate the `@/physio` alias in the
backend config, and revert the documentation changes. No data migrations are
needed because the move only touches source files.

## Status Updates

- 2025-09-24 — Confirmed the frontend Vite and TypeScript configs no longer
  expose the unused `@/engine` alias, and the outstanding task tracker entry was
  closed to document the cleanup.
