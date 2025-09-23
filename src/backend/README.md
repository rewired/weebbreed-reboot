# Backend Development

## Development server

The backend uses [`tsx`](https://tsx.is/) for local development. `tsx`
executes TypeScript directly with native ESM resolution, so the source tree
mirrors the compiled layout without experimental Node flags.

```bash
pnpm --filter @weebbreed/backend dev
# runs:
#   tsx --watch src/index.ts
```

The CLI entry point starts the blueprint loader, seeds the initial game state,
attaches the Socket.IO and SSE gateways, and starts the simulation clock. Use
`WEEBBREED_BACKEND_PORT` and `WEEBBREED_BACKEND_SEED` to override the defaults.
The frontend resolves its Socket.IO endpoint from the `SOCKET_URL` export in
`src/frontend/src/config/socket.ts`, which inspects
`import.meta.env.VITE_SOCKET_URL` and otherwise defaults to
`http://localhost:7331/socket.io`. Keep the backend port and the frontend env
variable aligned when running the packages separately.

## Production build

Create an optimized ESM bundle and definition files with [`tsup`](https://tsup.egoist.dev/):

```bash
pnpm --filter @weebbreed/backend build
```

The bundle lives in `dist/`. Declaration output is temporarily paused until
`tsc --noEmit` is clean; start the bundle with Node (23+):

```bash
pnpm --filter @weebbreed/backend start
# runs:
#   node dist/index.js
```

## Quality checks

```bash
pnpm --filter @weebbreed/backend lint
pnpm --filter @weebbreed/backend typecheck
pnpm --filter @weebbreed/backend test
```

`pnpm typecheck` runs `tsc --noEmit` with the strict ESM config. The
workspace-level script `pnpm typecheck` fans out to all packages.

## Path aliases

The backend resolves internal modules through the `@/` prefix, e.g.
`import { bootstrap } from '@/bootstrap.js'`. Runtime helpers that still live in
`src/runtime` are available via `@runtime/…`. Both aliases are supported by the
development tooling (`tsx`, `vitest`) and the build pipeline (`tsup`).
