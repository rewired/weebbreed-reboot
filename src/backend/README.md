# Backend Development

## Running the development server

The backend now uses [`tsx`](https://tsx.is/) for local development. `tsx`
executes TypeScript modules directly with native ESM resolution, so the source
tree mirrors the compiled layout without any experimental Node flags.

```bash
pnpm --filter @weebbreed/backend dev
# which runs:
#   tsx watch src/index.ts
```

`tsx` performs on-the-fly compilation and file watching out of the box, so the
development workflow no longer depends on the deprecated `--loader`
mechanisms from `ts-node`.
