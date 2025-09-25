# Frontend Migration Notes

## Summary

- `src/frontend` now hosts the rebuilt Weedbreed.AI dashboard scaffolded with React, Vite, TypeScript, and Tailwind CSS. The
  layout follows the structure → room → zone drill-down defined in the UI building guide and wires navigation, breadcrumbs,
  modal handling, and telemetry mocks via a dedicated Zustand store and facade bridge.
- The previous implementation lives under `src/frontend-legacy`. Its build scripts, Tailwind setup, and dependencies remain
  intact so the legacy UI can still be executed or referenced during the transition period.
- Type-only contracts (`src/frontend/src/types/simulation.ts`) and faceless utilities were copied from the legacy codebase to
  retain authoritative domain schemas without duplicating layout logic.

## Omitted Legacy Elements

- Legacy layout containers, routing constructs, and bespoke component styling were not migrated because the new dashboard shell
  aligns directly with the guide’s layout, Tailwind token system, and navigation semantics.
- The legacy simulation bridge, query clients, and bespoke stores were excluded; the new facade mock provides the required
  telemetry snapshots without reintroducing business logic into the UI layer.
- Stateful UI flows that depended on engine-specific logic (e.g., market, workforce) were postponed until the rebuilt facade is
  connected to real telemetry and intents.

## Follow-up Tasks

1. ✅ Replace the mock facade (`src/frontend/src/facade/systemFacade.ts`) with live Socket.IO wiring once the backend exposes the
   deterministic streams documented in `/docs/system`. The bridge now connects to the real gateway, manages reconnection, routes
   intent ACKs, and hydrates the global simulation store without optimistic updates.
2. ✅ Reintegrate analytics-heavy components (Recharts time-series expansions, TanStack Table virtualisation) using live data when
   telemetry volume warrants it. Zone telemetry respects the 5 000-point budget via dynamic downsampling and virtualised plant
   tables render efficiently beyond 100 rows.
3. ✅ Port modal workflows for rent/duplicate/delete actions to real facade intents, including optimistic UI feedback and command
   acknowledgements. Rent, duplicate, rename, and delete flows pause the simulation, await façade ACKs, and resume only after
   modal closure.
4. ✅ Extend automated tests for navigation, modal focus trapping, and responsive sidebar behaviour once the UI stabilises. Added
   Vitest suites cover navigation reducers, ModalFrame focus trapping, sidebar toggling, and telemetry history retention as a
   performance smoke test.
