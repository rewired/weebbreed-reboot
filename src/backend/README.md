# Backend Development

## Running the development server

The backend now uses [`tsx`](https://tsx.is/) for local development. `tsx`
executes TypeScript modules directly with native ESM resolution, so the source
tree mirrors the compiled layout without any experimental Node flags.

```bash
pnpm --filter @weebbreed/backend dev
# which runs:
#   tsx watch server/devServer.ts
```

The development entry point boots the blueprint repository, seeds the initial
game state, exposes the Socket.IO gateway on
`http://localhost:$WEEBBREED_BACKEND_PORT` (defaults to `7331`), and starts the
simulation clock. Adjust the listening port or RNG seed via the
`WEEBBREED_BACKEND_PORT` and `WEEBBREED_BACKEND_SEED` environment variables as
needed.

`tsx` performs on-the-fly compilation and file watching out of the box, so the
development workflow no longer depends on the deprecated `--loader`
mechanisms from `ts-node`.
