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
- **No breaking directory churn.** Prefer additive refactors with clear commits, green CI at every step.

---

## 1) Monorepo Layout (pnpm workspaces)

## 2) Toolchain & Config (backend)

- **Dev runner:** `tsx` (`tsx src/index.ts`) — **no experimental loaders**.
- **Testing:** `vitest` (+ happy-dom or Node environment).
- **Lint/format:** ESLint (TS) + Prettier.
- **Path alias:** `@/*` → `./src/*` via `tsconfig.json` + `tsconfig.paths.json`.

**`packages/backend/tsconfig.json` (minimal)**

---

## 3) Toolchain & Config (frontend)

- Vite React with TypeScript template.
- No CRA. Keep it lean. Use ESLint + Prettier aligned with backend.
- Eventually we have to consider to usa a library like TailWind

**`apps/frontend/package.json` (key scripts)**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "format": "prettier --write ."
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

Create pure TS modules under `src/physio/`:

`vpd.ts`, `ppfd.ts`, `co2.ts`, `temp.ts`, `rh.ts`, `transpiration.ts`

Each exports pure functions with explicit units in JSDoc and TS types.
Add **Golden‑Master tests** for typical scenarios with tight tolerances (`ε_rel = 1e-6`, `ε_abs = 1e-9`).

**Example stub (`src/physio/vpd.ts`)**

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

### 4.3 Event Bus (telemetry only)

- Minimal API: `emit(type, payload, tick, level = 'info')`.
- Provide `uiStream$` with basic filtering/buffering for UI consumption.
- **No commands through the event bus.**

### 4.4 Factories + JSON Blueprints

- Strains, Devices, Cultivation Methods, Strain Prices load from `/data`.
- Validate shape on load (lightweight Zod/Ajv optional but recommended).
- **Do not store prices/maintenance inside device JSONs.** Keep separate `devicePrices.json` and `strainPrices.json`.
- **Do not change field names in JSON models** (only user‑trusted additive fields).

### 4.5 Determinism & RNG

Provide `lib/rng.ts` with `createRng(seed: string, streamId?: string)`.
All randomness (pests/events/market) comes from here.

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
- ✅ `pnpm build` produces `packages/backend/dist/**` and `apps/frontend/dist/**`.
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
