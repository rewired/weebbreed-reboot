# AGENT.md — Weed Breed (TypeScript Backend + React/Vite)

**Purpose.** Steer a coding AI ("Codex") to implement and maintain this project correctly. Backend is **TypeScript** (Node 20/23), **not** plain ESM‑JS at runtime. Frontend is **React + Vite**. All work must follow the domain docs in `/docs` (schemas, naming rules, formulas, architecture). **Do not rename JSON keys**; only additive, **user‑trusted extensions/changes** are allowed.

---

## 0) Ground Rules

- **No experimental loaders.** Do **not** use `ts-node` loaders or experimental ESM loaders at runtime. Use **`tsx`** for dev, **`tsup`**/**`tsc`** for builds.
- **TypeScript everywhere in backend.** Frontend stays React + Vite.
- **Deterministic simulation.** RNG always via a **seeded generator**. No `Math.random`.
- **Respect `/docs`** schemas & naming conventions: SI units implicit, camelCase, **no unit suffixes** in keys.
- **Do not rename JSON keys.** Only additive, user‑approved fields (optional) are allowed.
- **Tick‑based engine, explicit phase order.** Events are **telemetry only** (no commands through the bus).
- **Economics externalized.** Prices/maintenance are outside device blueprints (separate price maps). Do **not** re‑introduce prices into device JSONs.
- **Socket transport parity.** Keep `socket.io` and `socket.io-client` on the **same minor version** across backend and frontend packages. Update both sides together to avoid wire-protocol drift.
- **No breaking directory churn.** Prefer additive refactors with clear commits, green CI at every step.

---

## 1) Monorepo Layout (pnpm workspaces)

- Root `pnpm-workspace.yaml` groups the backend and frontend packages alongside
  shared libraries.
- **Backend package:** `src/backend` (`@weebbreed/backend`). Source lives under
  `src/backend/src`; build outputs are emitted to `src/backend/dist`. Scripts
  run with the package directory as the working directory.
- **Frontend package:** `src/frontend`. React + Vite application code resides in
  `src/frontend/src`; production assets land in `src/frontend/dist`.
- **Shared TypeScript modules:** `src/backend/src/engine/physio` (domain
  formulas packaged with the engine) and
  `src/runtime` (cross-cutting runtime helpers). These folders are consumed via
  the `@/` and `@runtime/` path aliases exposed through the workspace
  TypeScript configs.

## 2) Toolchain & Config (backend)

- **Dev runner:** `tsx` (e.g., `pnpm --filter @weebbreed/backend dev`) — **no
  experimental loaders**.
- **Testing:** `vitest` (+ happy-dom or Node environment).
- **Lint/format:** ESLint (TS) + Prettier.
- **Path alias:** `@/*` → `./src/*` via `tsconfig.json` + `tsconfig.paths.json`.
- **Build:** `tsup` bundles `src/index.ts` to an **ESM** artifact at
  `dist/index.js` with sourcemaps. `pnpm start` executes `node dist/index.js`
  under the package `type: module` contract.

**`src/backend/tsconfig.json` (minimal)**

---

## 3) Toolchain & Config (frontend)

- React + Vite TypeScript app under `src/frontend`. No CRA. Keep the setup lean and
  align ESLint/Prettier rules with the backend package.
- Tailwind CSS is part of the standard UI stack. It is wired through
  `index.css`, `postcss.config.js`, and `tailwind.config.js` with design tokens
  exposed as CSS custom properties.

**`src/frontend/package.json` scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```

---

## 4) Simulation Contract (must implement)

### 4.1 Tick Phases (strict order)

1. **applyDevices** – apply device effects (lamp heat/PPFD, HVAC, vent, dehumid)
2. **deriveEnvironment** – combine effects → effective zone env
3. **irrigationAndNutrients** – watering + NPK
4. **updatePlants** – growth, stress, disease, stage transitions
5. **harvestAndInventory** – produce items, storage, spoilage timers
6. **accounting** – OpEx, CapEx‑related maintenance, sales/market
7. **commit** – snapshot, emit batched telemetry events

> Implement as a small state machine so pausing/stepping is trivial.

### 4.2 Physio Modules (pure, unit‑aware)

Create pure TS modules under `src/backend/src/engine/physio/`:

`vpd.ts`, `ppfd.ts`, `co2.ts`, `temp.ts`, `rh.ts`, `transpiration.ts`

Each exports pure functions with explicit units in JSDoc and TS types.
Add **Golden‑Master tests** for typical scenarios with tight tolerances (`ε_rel = 1e-6`, `ε_abs = 1e-9`).

**Example stub (`src/backend/src/engine/physio/vpd.ts`)**

```ts
/**
 * Computes a simple VPD proxy.
 * @param T Temperature [°C]
 * @param RH Relative humidity [0..1]
 * @param Tbase Base temperature for activity [°C]
 * @returns VPD proxy [unitless]
 */
export function vpdProxy(T: number, RH: number, Tbase = 10): number {
  const x = Math.max(T - Tbase, 0);
  return (1 - RH) * x; // tuned coefficient applied by caller
}
```

### 4.3 Event Bus & Real-Time Transports (telemetry only)

- Minimal API: `emit(type, payload, tick, level = 'info')`.
- Provide `uiStream$` with basic filtering/buffering for UI consumption.
- **Transports:** Socket.IO gateway (`src/backend/src/server/socketGateway.ts`) and SSE gateway (`src/backend/src/server/sseGateway.ts`) both subscribe to the shared stream. Keep docs (`docs/system/socket_protocol.md`) and frontend bridge hooks in sync with payload updates.
- **Socket endpoint discovery:** The dashboard resolves its Socket.IO endpoint through `src/frontend/src/config/socket.ts`. It exports a `SOCKET_URL` constant derived from `import.meta.env.VITE_SOCKET_URL` and falls back to `http://localhost:7331/socket.io` (backend dev default). Update the docs whenever this lookup changes so integrators can point non-proxied deployments at a custom URL.
- **No commands through the event bus.**

### 4.4 Factories + JSON Blueprints

- Strains, Devices, Cultivation Methods, Strain Prices load from `/data`.
- Validate shape on load (lightweight Zod/Ajv optional but recommended).
- **Do not store prices/maintenance inside device JSONs.** Keep separate `devicePrices.json` and `strainPrices.json`.
- **Do not change field names in JSON models** (only user‑trusted additive fields).

### 4.5 Determinism & RNG

Provide `lib/rng.ts` with `createRng(seed: string, streamId?: string)`.
All randomness (pests/events/market) comes from here.

### 4.6 Facade Intent Catalog & Command Routing

- **Modular registry.** `SimulationFacade` owns a domain registry built via
  `registerDomain(domain, commands)`. Each domain maps actions to Zod schemas
  and service handlers; Socket.IO clients issue `facade.intent` payloads with
  `{ domain, action, payload?, requestId? }`.
- **Result channels.** Responses for façade intents are emitted on
  `<domain>.intent.result` and mirror the `CommandResult` shape
  (`{ ok, data?, warnings?, errors? }`). Validation failures always return
  `ERR_VALIDATION` with a dotted `path` back to the offending field.
- **World intents** (beyond the original CRUD):
  `renameStructure`, `deleteStructure`, `duplicateStructure`, `duplicateRoom`,
  `duplicateZone` — all accept optional `name` overrides where applicable.
- **Device intents** include `toggleDeviceGroup` (batch enable/disable by
  domain/kind) alongside `installDevice`, `updateDevice`, `moveDevice`,
  `removeDevice`.
- **Plant intents** include `togglePlantingPlan` (automation enable/disable)
  plus `addPlanting`, `cullPlanting`, `harvestPlanting`, `applyIrrigation`,
  `applyFertilizer`.
- **Future extensions.** When adding a domain/action, register it through the
  façade builders, export the typed intent, and document it under
  `/docs/system` + `/docs/tasks`. Keep Socket docs in sync so UI teams can
  adopt new actions without spelunking through code.

### 4.7 Zone Setpoint Contract

- Socket clients issue zone setpoint updates via
  `config.update { type: 'setpoint', zoneId, metric, value }`.
- Supported metrics and their routing:
  - `temperature` → writes `targetTemperature` on HVAC-capable devices.
  - `relativeHumidity` → writes `targetHumidity` on humidifier/dehumidifier
    devices (also clears active VPD setpoint).
  - `vpd` → converts the VPD target (at the zone control reference
    temperature) into a humidity value and programs it on humidity devices
    while storing both humidity and VPD setpoints.
  - `co2` → writes `targetCO2` on enrichment/scrubber devices.
  - `ppfd` → writes `ppfd` (and scales `power` when present) on dimmable
    lighting.
- Values are validated and clamped (finite numbers, non-negative for PPFD/CO₂
  /VPD, humidity forced to `[0,1]`); clamp warnings are returned to the client
  in the command response.
- A zone without supporting devices returns `ERR_INVALID_STATE`.
- Successful updates emit `env.setpointUpdated` with `{ zoneId, metric, value,
control }` and, when humidity is derived (RH/VPD), `effectiveHumidity`.

### 4.7a Recurring Cost Normalization

- Treat `structure.rentPerTick` and `devicePrices[].baseMaintenanceCostPerTick`
  as **hourly** base rates. Multiply by the current tick length in hours when
  charging rent or maintenance so recurring costs track simulated hours, not raw
  tick counts.
- Tick-length updates via `facade.setTickLength` (which refresh
  `state.metadata.tickLengthMinutes`) must be observed before the accounting
  phase runs, ensuring immediate normalization.

---

### 4.8 UI Snapshot & Time Status Contract

- `buildSimulationSnapshot(state, roomPurposeSource)` is the single producer for
  UI-visible state. It MUST include the `clock` block with
  `{ tick, isPaused, targetTickRate, startedAt, lastUpdatedAt }` in addition to
  structures, rooms, zones (with control/resources/health), personnel, and
  finance summaries.
- Socket telemetry mirrors this structure and augments each update with the
  scheduler-derived `time` payload from `SimulationFacade.getTimeStatus()`. Treat
  `time` as ephemeral (scheduler view) and `snapshot.clock` as the persisted
  state; both are required for consumers to reconcile pause/resume UX.
- `time.status` is only emitted on the initial connection handshake. Subsequent
  time drift is communicated through the `simulationUpdate.time` entries. Keep
  dashboard logic and docs aligned with this behaviour.
- Keep `docs/system/socket_protocol.md`, `README.md`, and ADR 0005 synchronized
  with any snapshot/time-shape evolution so downstream clients and automation
  stay in lock-step.

---

## 5) Developer Ergonomics

- **Env:** load `.env` (tick length, log level, seeds…).
- **Logging:** `pino` (JSON logs; pretty in dev).
- **Hot‑data reload:** watch `/data` in dev and reload blueprints safely.
- **Error policy:** fail fast on malformed JSON; emit a structured error event.

---

## 6) Workspace Commands (root)

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "format": "pnpm -r format"
  }
}
```

**Expected dev output:**

- Backend starts via `tsx src/index.ts` (**no** `ExperimentalWarning`).
- Frontend Vite dev server available. UI connects to backend event stream.

---

## 7) Definition of Done (DoD)

- ✅ No usage of ts-node loaders; no `ExperimentalWarning` on startup.
- ✅ `pnpm build` produces `src/backend/dist/**` and `src/frontend/dist/**`.
- ✅ Golden‑Master tests for physio modules green with tight tolerances.
- ✅ Deterministic 200‑day run: same seed ⇒ identical summary metrics.
- ✅ JSON blueprints conform to docs; naming rules respected.
- ✅ ESLint (no warnings) + Prettier (clean) in CI.

---

## 8) Guardrails & Non‑Goals

- ❌ Do **not** change field names in JSON models (except user‑trusted additive fields).
- ❌ Do **not** push real‑time threads or physics‑heavy libs without need.
- ❌ Do **not** route commands via telemetry bus.
- ❌ Do **not** re‑introduce device prices into device JSONs.

---

## 9) Acceptance Checks (manual)

- Start dev: `pnpm dev` → **no** experimental loader warnings.
- Trigger a short sim (e.g., 7 days) → UI shows phase events in order; summary log contains energy/water/costs.
- Run same sim twice with same seed → identical outputs (byte‑equal summaries).

---

## 10) Notes for Future Work

- Upgrade temp/RH model from proxy to proper psychrometrics when needed.
- Add device degradation & maintenance curves (externalized config).
- Expand market engine (quality × demand × brand value multiplier).

**End of AGENT.md.**
