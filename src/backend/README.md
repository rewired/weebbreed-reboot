# Backend Development

## Running the development server

The backend uses [`ts-node`](https://typestrong.org/ts-node/) in ESM mode during
development so that we can execute the TypeScript sources directly. Several of
the runtime modules import the data blueprints using `.js` specifiers even
though the sources live alongside them as `.ts` files under `src/backend/data/`.

To make sure those imports resolve correctly we have to enable the experimental
module resolver that ships with `ts-node`. This is now wired into the `dev`
script together with [`cross-env`](https://github.com/kentcdodds/cross-env) so
the required environment variable is set in a cross-platform way:

Setting `NODE_OPTIONS=--loader=ts-node/esm` ensures Node always attaches
ts-node's ESM loader before executing the entrypoint, which keeps `.ts` modules
loadable when the project is executed on different platforms.

```bash
pnpm --filter @weebbreed/backend dev
# which runs:
#   cross-env NODE_OPTIONS=--loader=ts-node/esm TS_NODE_EXPERIMENTAL_RESOLVER=1 \
#   ts-node --esm src/index.ts
```

Running the script without `TS_NODE_EXPERIMENTAL_RESOLVER=1` will lead to
`MODULE_NOT_FOUND` errors when `ts-node` tries to resolve the `.js` specifiers,
so the flag is mandatory for local development.
