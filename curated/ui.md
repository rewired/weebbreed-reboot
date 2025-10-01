# Ui

## Migration — Backend TypeScript Toolchain (docs/addendum/migrations/2025-01-22-typescript-toolchain.md)

Source: [`docs/addendum/migrations/2025-01-22-typescript-toolchain.md`](../docs/addendum/migrations/2025-01-22-typescript-toolchain.md)

# Migration — Backend TypeScript Toolchain

**Date:** 2025-01-22

## Summary

The backend now builds with `tsup` and runs with `tsx`. All TypeScript sources
live under `src/backend/src`, exposed through the `@/` alias. Runtime helpers in
`src/runtime` are consumed via `@runtime/`.

## Required actions for feature branches

1. Rebase onto the toolchain commit. Resolve path conflicts by replacing
   relative imports (`../data/...`) with `@/data/...` or `@runtime/...`.
2. Update local scripts:
   - Development: `pnpm --filter @weebbreed/backend dev`
   - Build: `pnpm --filter @weebbreed/backend build`
   - Start: `pnpm --filter @weebbreed/backend start`
   - Typecheck: `pnpm --filter @weebbreed/backend typecheck`
3. If your branch added new backend files outside `src/backend/src`, move them
   under the consolidated directory structure.
4. Install workspace dependencies (`pnpm install`) to obtain `tsup`.

## Notes

- `pnpm typecheck` currently exposes latent type issues. Clean up affected files
  before gating CI on the new step.
- Declaration emit is temporarily disabled in the build script until the strict
  type backlog is resolved.
- The CLI entry point now resides in `src/backend/src/index.ts`. Any scripts that
  referenced `server/devServer.ts` should be updated to use the shared entry
  point instead.
