# ADR 0002 — Frontend Real-Time Dashboard Stack

- **Status:** Accepted (2025-02-17)
- **Owner:** Simulation Platform
- **Context:** Frontend dashboard

## Context

The dashboard needs to visualise live simulation ticks, accept control commands,
and expose operational summaries without blocking future UI experiments. Earlier
iterations relied on the default Vite template docs and ad-hoc styling guidance,
leaving new contributors uncertain about the canonical state management pattern
and the styling/tooling guarantees. We must document the frontend stack so teams
can build features confidently and know which abstractions are stable.

## Decision

- Keep React + Vite as the application foundation, using the TypeScript entry
  point under `src/frontend`.
- Adopt [`socket.io-client`](https://socket.io/) with the bespoke
  `useSimulationBridge` hook as the integration point to the simulation gateway.
  The hook owns connection lifecycle, event fan-out, and exposes command helpers
  to the stores.
- Use [`zustand`](https://github.com/pmndrs/zustand) as the global state
  container. Store slices are organised by domain (`game`, `zone`, `personnel`)
  plus lightweight UI state (`useAppStore`), enabling selective subscription and
  derived selectors.
- Standardise Tailwind CSS as the styling layer, backed by CSS design tokens to
  keep the look & feel consistent with the Weed Breed visual language.
- Document the expected workspace scripts for the frontend package and link this
  ADR from contributor-facing docs (`src/frontend/README.md`, docs changelog) so
  the rationale stays visible.

## Consequences

- Contributors can rely on the Socket.IO bridge hook and Zustand stores as the
  supported extension points for real-time data instead of rolling bespoke
  wiring per view.
- Styling guidance is now explicit: Tailwind + design tokens is the baseline,
  which shortens onboarding and avoids drift toward inline styles or ad-hoc
  component libraries.
- Tests and linting integrate cleanly with the shared workspace scripts because
  the documented commands match `package.json`.
- Any future state management or styling swap must come with a new ADR because
  the current approach is now an accepted decision.

## Alternatives Considered

1. **Keep React Context for global state.** Rejected because the volume of
   real-time updates makes reducer/context solutions chatty and harder to
   optimise compared with Zustand's selectors and store slices.
2. **Adopt a component library instead of Tailwind.** Deferred: Tailwind paired
   with design tokens provides enough velocity while allowing us to build bespoke
   simulation widgets without fighting component overrides.
3. **Use the raw Socket.IO client per component.** Rejected to avoid duplicated
   connection logic and ensure consistent command routing back to the backend.

## Rollback Plan

If the combination of Tailwind, Zustand, or the Socket.IO bridge proves
untenable:

- Replace the bridge hook with a thinner wrapper around `socket.io-client`,
  update stores to connect directly, and document the new responsibilities.
- Swap Zustand for an alternative (e.g. Redux Toolkit) by introducing a parallel
  store implementation, migrating consumers incrementally, and updating this ADR
  once complete.
- Substitute Tailwind with another styling approach by refactoring the build
  pipeline (PostCSS/Vite config) and replacing utility classes in components.
  Document the new baseline in both the ADR series and the frontend README.
