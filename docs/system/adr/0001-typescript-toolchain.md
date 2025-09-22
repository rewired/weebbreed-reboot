# ADR 0001 — Backend TypeScript Toolchain Stabilization

- **Status:** Accepted (initial decision 2025-01-22, updated 2025-02-04)
- **Owner:** Simulation Platform
- **Context:** Backend service

## Context

The backend had been relying on `ts-node` and custom loader flags to execute
TypeScript directly. The approach created friction when running on modern Node
(>20), complicated debugging (custom loaders), and made it hard to ship a clean
Node-compatible bundle for operations teams. The TypeScript configuration also
mixed multiple source roots (`src/`, `data/`, `facade/`, `server/`), complicating
analysis and bundling. A dedicated `typecheck` command was missing because
`tsc --noEmit` surfaced hundreds of issues under the old layout.

## Decision

- Keep TypeScript as the implementation language for the backend runtime and
  supporting tooling.
- Keep all backend sources under `src/backend/src` and expose internal modules
  via the `@/` alias (`@runtime/` for shared runtime helpers) so refactors do not
  rely on brittle relative imports.
- Replace `ts-node` with [`tsx`](https://tsx.is/) for the development server
  (`pnpm dev` ⇒ `tsx --watch src/index.ts`). `tsx` offers a fast feedback loop
  without experimental ESM loader flags.
- Build production artifacts with [`tsup`](https://tsup.egoist.dev/) targeting a
  CommonJS bundle in `dist/` (`pnpm build` ⇒ `dist/index.cjs` + sourcemaps). The
  CommonJS output avoids ESM loader drift across Node 20–23 while preserving the
  ability to emit type declarations once the strict typecheck backlog is cleared.
- Run the packaged server through plain Node (`pnpm start` ⇒ `node dist/index.cjs`).
- Ship a strict `tsconfig.json` that uses Node resolution, enforces modern
  TypeScript safety nets (isolated modules, exact optional property types, no
  unchecked indexed access), and declares the `@/`/`@runtime/` path aliases.
- Introduce a `typecheck` script (`tsc -p tsconfig.json --noEmit`) and wire it
  into the workspace-level `pnpm typecheck` target so CI can enforce the
  settings.
- Document the workflow in `src/backend/README.md`, link the changelog in the
  workspace `README.md`, and capture the rationale in this ADR to keep the tool
  choice visible for future audits.

## Consequences

- Development and production runtimes no longer require experimental loaders or
  custom flags; Node 20–23 runs the compiled CommonJS output directly.
- `tsup` produces deterministic CommonJS bundles (and, when enabled, declaration
  files), reducing drift between local development and production deploys.
- The stricter compiler settings surface previously hidden issues; teams must
  address outstanding errors before the CI `typecheck` gate can be flipped to
  “required”.
- Shared runtime utilities continue to live in `src/runtime`, but they are
  consumed through the explicit `@runtime/` alias to keep module boundaries
  obvious.
- Path updates touched many files; downstream branches must rebase to adopt the
  consolidated layout and the new import conventions.

## Alternatives Considered

1. **Stay on `ts-node`.** Rejected because modern Node has native ESM support;
   custom loaders add startup overhead and platform-specific instability.
2. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds
   sensible defaults (bundle splitting, declaration emit) with less manual
   wiring.
3. **Emit ESM-only bundles.** Rejected for the primary build because Node’s ESM
   loader differences across versions routinely introduced regressions in our
   deployment targets. CommonJS keeps runtime friction low while still allowing
   ESM-friendly authoring during development.

## Rollback Plan

If the new stack causes blocking regressions, restore commit `2ec8852` (the last
known good `ts-node` setup) and reinstate the previous scripts:

- Revert `src/backend/package.json` scripts to `tsx watch server/devServer.ts`
  and `tsc --project tsconfig.json`.
- Restore the old directory layout (`data/`, `facade/`, `server/` as top-level
  siblings of `src/`).
- Remove the `typecheck` script and delete `tsup` from dependencies.
- Re-add `ts-node` to the workspace dev dependencies.

Rollback requires reintroducing the legacy loader flags when running on Node 20.
