# Weed Breed Frontend

This package contains the real-time dashboard that visualises the simulation
loop exposed by the backend. The app is built with React + Vite and uses
Zustand for state management, Tailwind CSS for rapid UI composition, and a
Socket.IO bridge to ingest tick updates.

## Development commands

Run these from the repository root unless noted otherwise:

- `pnpm install` – install workspace dependencies.
- `pnpm --filter frontend dev` – start the Vite dev server on
  [http://localhost:5173](http://localhost:5173) and connect to the backend
  Socket.IO gateway.
- `pnpm --filter frontend build` – generate the production bundle in
  `src/frontend/dist`.
- `pnpm --filter frontend lint` – run ESLint across the frontend sources.
- `pnpm --filter frontend test` – execute the Vitest suite.
- `pnpm --filter frontend preview` – serve the production build locally for
  smoke-testing.

The workspace-level scripts (e.g. `pnpm dev`) still work; they simply execute
the same commands for both backend and frontend packages in parallel.

The Socket.IO bridge imports `SOCKET_URL` from
`src/frontend/src/config/socket.ts`. The helper inspects
`import.meta.env.VITE_SOCKET_URL` (set via a `.env` file alongside this
package). When unset it falls back to `http://localhost:7331/socket.io`, which
matches the backend development default. Override the env variable when running
the dashboard against a remote or proxied backend.

## Simulation bridge (`useSimulationBridge`)

`src/frontend/src/hooks/useSimulationBridge.ts` encapsulates the Socket.IO
client lifecycle. The hook:

- lazily creates the Socket.IO connection (auto-connect by default, with
  optional manual control),
- wires reconnection and status events into `useGameStore` so the UI can display
  connectivity state and last error details,
- fans out `simulationUpdate` payloads into the specialised stores:
  - `useGameStore` captures raw events, time metadata, and exposes handlers for
    issuing `simulationControl` and `config.update` commands back to the
    backend,
- `useZoneStore` normalises zone/room/structure snapshots, maintains rolling
  timelines and finance history, and stores the latest setpoints,
  - `usePersonnelStore` aggregates HR roster changes and domain events.
- exposes helper methods (`sendControlCommand`, `sendConfigUpdate`,
  `sendFacadeIntent`) that store slices call when the UI triggers actions, and
- provides a `subscribe` helper so features can hook into additional socket
  channels without re-implementing connection management.

Setpoint controls call `sendConfigUpdate({ type: 'setpoint', zoneId, metric, value })`
with backend-supported metrics (`temperature`, `relativeHumidity`, `vpd`, `co2`,
`ppfd`). Responses may include warning strings when the backend clamps
out-of-range values, and successful updates are echoed via
`env.setpointUpdated` domain events—follow the socket protocol reference for the
latest contract details.

The bridge also performs light domain-specific shaping (e.g. mapping finance
payloads, splitting HR events) so components can consume ready-to-render data.

## State management with Zustand

State is split into targeted stores under `src/frontend/src/store/`:

- `gameStore.ts` tracks connection status, tick metadata, and the rolling domain
  event buffer. It also stores the socket command handlers injected by the
  bridge so UI elements can issue control/config updates via `issueControlCommand`
  and `requestTickLength`.
- `zoneStore.ts` keeps normalised structures, rooms, zones, devices, and plant
  records. It builds compact time-series timelines and finance histories from
  each tick. Handlers for zone config changes and facade intents live here so
  view components can submit updates.
- `personnelStore.ts` records employees, open positions, and HR-specific events.
- `index.ts` exposes `useAppStore`, which merges UI-only slices (`navigation`,
  `modal`, etc.) alongside re-exports of the domain stores and typed selectors.

Selectors in `selectors.ts` (with tests in `selectors.test.ts`) provide derived
views over the normalised data to keep components minimal.

## Styling with Tailwind

Tailwind CSS is baked into the build via `postcss.config.js` and
`tailwind.config.js`. The theme extends Tailwind tokens to read from the design
system variables declared in `src/frontend/src/styles/designTokens.css`. The
global stylesheet (`src/frontend/src/index.css`) imports the tokens, applies the
Tailwind layers, and sets the base typography/background for the dashboard.

Components combine Tailwind utility classes with semantic CSS variables, giving
us consistent spacing/typography while still enabling custom layout or data-viz
styling when needed.

## Project layout

Key directories to explore:

- `src/components/` – reusable UI widgets (forms, panels, charts).
  - `components/panels/BreakdownList.tsx` liefert aufschlüsselbare Listen, die u.a. vom Finanzdashboard genutzt werden.
- `src/views/` – page-level compositions that stitch together components and
  store selectors.
  - `FinancesView.tsx` bindet die tickbasierte `financeHistory` an Zeitbereichs-Umschalter,
    Diagramme und Kostenaufschlüsselungen.
- `src/providers/` – React context providers (theme, i18n, etc.).
- `src/types/` – shared TypeScript contracts for simulation payloads.

Refer to the ADRs in `docs/system/adr/` (see ADR 0002) for the motivation behind
the chosen frontend stack.
