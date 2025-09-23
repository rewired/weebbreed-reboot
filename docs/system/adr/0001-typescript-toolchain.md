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
analysis and bundling. After consolidating the service into `src/backend`, the
workspace adopted `type: module` semantics, but the documentation still pointed
to CommonJS build outputs, leading to confusion about the canonical runtime
artifact. A dedicated `typecheck` command was missing because `tsc --noEmit`
surfaced hundreds of issues under the old layout.

## Decision

- Keep TypeScript as the implementation language for the backend runtime and
  supporting tooling.
- Keep all backend sources under `src/backend/src` and expose internal modules
  via the `@/` alias (`@runtime/` for shared runtime helpers) so refactors do not
  rely on brittle relative imports.
- Replace `ts-node` with [`tsx`](https://tsx.is/) for the development server
  (`pnpm --filter @weebbreed/backend dev` ⇒ `tsx --watch src/index.ts`). `tsx`
  offers a fast feedback loop without experimental ESM loader flags.
- Build production artifacts with [`tsup`](https://tsup.egoist.dev/) targeting an
  ESM bundle in `dist/` (`pnpm build` ⇒ `dist/index.js` + sourcemaps) that aligns
  with the package’s `type: module` contract.
- Run the packaged server through plain Node (`pnpm start` ⇒ `node dist/index.js`).
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
  custom flags; Node 20–23 runs the compiled ESM output directly under the
  standard loader.
- `tsup` produces deterministic ESM bundles (and, when enabled, declaration
  files), reducing drift between local development and production deploys while
  matching the `type: module` expectation of downstream tooling.
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
2. **Keep emitting CommonJS bundles.** Rejected because the package already
   declares `"type": "module"`, and forcing a CommonJS artifact would reintroduce
   dual-module resolution issues for downstream tooling and deployment targets.
3. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds
   sensible defaults (bundle splitting, declaration emit) with less manual
   wiring.

## Rollback Plan

If the ESM bundle introduces blocking regressions, reconfigure the backend to
emit CommonJS again:

- Update `src/backend/package.json` to set `"type": "commonjs"`, point `main`
  to `dist/index.cjs`, and adjust `start` to `node dist/index.cjs`.
- Change the `tsup` build target to `--format cjs` and rename the output file to
  `dist/index.cjs`.
- Re-introduce any compatibility shims required by downstream consumers that
  rely on CommonJS semantics.

If loader issues persist even after reverting to CommonJS, fall back to the
pre-toolchain-migration stack (`ts-node` + legacy directory layout) by restoring
commit `2ec8852` and reapplying the historical scripts.
