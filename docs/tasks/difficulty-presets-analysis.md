# Difficulty Presets Facade Investigation

## Overview

Difficulty presets are defined in `data/configs/difficulty.json`. The backend loads this file during server startup via `loadDifficultyConfig` and exposes it through the simulation facade's config service. The frontend requests the presets via the socket bridge using the `config.getDifficultyConfig` intent.

## Data Flow

1. **Static configuration** – The preset values live in `data/configs/difficulty.json` and match the Zod schema enforced by `loadDifficultyConfig` in `src/backend/src/data/configs/difficulty.ts`.
2. **Server bootstrap** – `startServer` loads the configuration and wires `facade.updateServices({ config: { getDifficultyConfig: () => ({ ok: true, data: difficultyConfig }) } })`, making the presets available to the facade's `config` domain (`src/backend/src/server/startServer.ts`).
3. **Facade command** – `SimulationFacade` registers the `config.getDifficultyConfig` intent and exposes it through the socket gateway (`src/backend/src/facade/index.ts`).
4. **Socket request** – The frontend bridge calls `sendIntent` with `{ domain: 'config', action: 'getDifficultyConfig' }` via `SocketSystemFacade.getDifficultyConfig` (`src/frontend/src/facade/systemFacade.ts`).

## Observed Problem

When the gateway handles a `facade.intent` payload, it resolves the command and emits the response on a **domain-specific channel**:

```ts
this.emitCommandResponse(
  socket,
  `${command.domain}.intent.result`,
  {
    requestId,
    ...result,
  },
  ack,
);
```

_Source: `src/backend/src/server/socketGateway.ts`_

However, the frontend bridge only subscribes to the **generic** `facade.intent.result` channel and uses it (together with the ack handler) to settle pending promises:

```ts
socket.on('facade.intent.result', (response) => {
  this.resolvePending('facade.intent.result', response);
});
```

_Source: `src/frontend/src/facade/systemFacade.ts`_

Because the broadcast is published as `config.intent.result`, the listener never fires. The ack callback also guards on the same channel name via `resolvePending`, so a response that lacks the matching channel will leave the `getDifficultyConfig` request unresolved. In practice the hook keeps waiting, and the Difficulty Presets panel remains in the loading state.

## Conclusion

The backend and frontend disagree on the socket channel for facade intent responses. Align the channel names (either emit `facade.intent.result` on the backend or listen for domain-specific channels on the frontend) so that the difficulty configuration response reaches the UI.
