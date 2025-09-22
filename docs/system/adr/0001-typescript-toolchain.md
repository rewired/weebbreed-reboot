# ADR 0001 — Backend TypeScript Toolchain Stabilization

- **Status:** Accepted (2025-01-22)
- **Owner:** Simulation Platform
- **Context:** Backend service

## Context

The backend had been relying on `ts-node` and custom loader flags to execute
TypeScript directly. The approach created friction when running on modern Node
(>20), complicated debugging (custom loaders), and made it hard to ship a clean
ESM bundle. The TypeScript configuration also mixed multiple source roots
(`src/`, `data/`, `facade/`, `server/`), complicating analysis and bundling. A
dedicated `typecheck` command was missing because `tsc --noEmit` surfaced
hundreds of issues under the old layout.

## Decision

- Keep TypeScript as the implementation language.
- Consolidate all backend sources under `src/backend/src` and expose internal
  modules via the `@/` alias (`@runtime/` for shared runtime helpers).
- Replace `ts-node` with [`tsx`](https://tsx.is/) for the development server
  (`pnpm dev` ⇒ `tsx --watch src/index.ts`).
- Build production artifacts with [`tsup`](https://tsup.egoist.dev/) targeting
  pure ESM (`pnpm build` ⇒ `dist/index.js` + sourcemaps). Declaration output will
  be re-enabled once the strict typecheck backlog is addressed.
- Run the packaged server through plain Node (`pnpm start` ⇒ `node dist/index.js`).
- Add a strict `tsconfig.json` that uses bundler resolution, enforces modern ESM
  semantics (isolated modules, verbatim module syntax, exact optional property
  types, etc.), and declares the `@/`/`@runtime/` path aliases.
- Introduce a `typecheck` script (`tsc -p tsconfig.json --noEmit`) and wire it
  into the workspace-level `pnpm typecheck` target.
- Document the workflow in `src/backend/README.md` and capture the rationale in
  this ADR.

## Consequences

- Development and production runtimes no longer require experimental loaders or
  custom flags; Node ≥23 runs the compiled output directly.
- `tsup` produces deterministic ESM bundles with type declarations, aligning the
  backend with the rest of the toolchain and simplifying deployment.
- The stricter compiler settings will surface previously hidden issues; teams
  must address outstanding errors before enabling the new `typecheck` step in CI.
- Shared runtime utilities continue to live in `src/runtime`, but they are
  consumed through the explicit `@runtime/` alias to keep module boundaries
  obvious.
- Path updates touched many files; downstream branches must rebase to adopt the
  consolidated layout.

## Alternatives Considered

1. **Stay on `ts-node`.** Rejected because modern Node has native ESM support;
   custom loaders add startup overhead and platform-specific instability.
2. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds
   sensible defaults (bundle splitting, declaration emit) with less manual
   wiring.
3. **Transpile with `tsc`.** `tsc` alone cannot emit bundles or tree-shake the
   runtime. It also slows down incremental builds compared to `tsup`+`esbuild`.

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
