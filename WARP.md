# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: WeedBreed Reboot (pnpm monorepo: backend + frontend)

1. Common commands

Root (workspace-wide)

- Install deps: pnpm install
- Dev (backend + frontend in parallel): pnpm dev
- Build all: pnpm build
- Lint all: pnpm lint
- Format (write): pnpm fmt
- Check (lint + prettier check + tests + typecheck + data validation): pnpm check
- Tests (all packages): pnpm test
- Typecheck (all packages): pnpm typecheck
- Data validation (blueprints): pnpm validate:data
- Audit runner: pnpm audit:run

Scoped/package commands

- Backend dev: pnpm --filter @weebbreed/backend dev
- Backend build: pnpm --filter @weebbreed/backend build
- Backend start (built artifact): pnpm --filter @weebbreed/backend start
- Backend tests: pnpm --filter @weebbreed/backend test
- Backend tests with coverage: pnpm --filter @weebbreed/backend exec vitest run --coverage
- Backend single test by name: pnpm --filter @weebbreed/backend exec vitest run -t "Name or regex"
- Backend bench: pnpm --filter @weebbreed/backend bench

- Frontend dev (Vite): pnpm --filter @weebbreed/frontend dev
- Frontend build: pnpm --filter @weebbreed/frontend build
- Frontend preview: pnpm --filter @weebbreed/frontend preview
- Frontend tests: pnpm --filter @weebbreed/frontend test
- Frontend single test by name: pnpm --filter @weebbreed/frontend exec vitest run -t "Name or regex"

Notes

- Node 23 and pnpm 10 are expected (see README). On Windows PowerShell, commands are the same.
- Keep socket.io and socket.io-client on the same minor version across packages.

2. High-level architecture and structure

Overview

- Backend (src/backend, @weebbreed/backend): Deterministic simulation engine with a tick-based loop. Exposes telemetry over Socket.IO and SSE. Built as ESM via tsup; development uses tsx. Emits structured logs via pino and validates blueprint data on startup.
- Frontend (src/frontend, @weebbreed/frontend): React + Vite dashboard for live telemetry, controls, and analytics. Uses Tailwind. Connects to the backend’s Socket.IO endpoint.
- Runtime utilities (src/runtime): Cross-cutting event bus, logging, RNG, data watcher utilities used by the backend and for tests.
- Data (data/\*): Authoritative content for configs, personnel, and prices. Validated via tools/validate-data.ts and surfaced in reports/.

Key backend pieces

- Entry point: src/backend/src/index.ts boots data, starts server (startBackendServer), and registers fatal handlers. The server binds transports and manages graceful shutdown on SIGINT/SIGTERM.
- Event bus: src/runtime/eventBus\*.ts provides an emit/stream abstraction for telemetry only (no commands). ui stream is derived from runtime events for the transports.
- Facade and intents: src/backend/src/facade exposes typed command routing with validation; results are structured and emitted on dedicated channels. Frontend (or clients) send facade.intent payloads; responses mirror CommandResult.
- Simulation loop and scheduler: src/backend/src/sim/\* drive the deterministic tick phases and time status. The UI receives both snapshot.clock and scheduler-derived time metadata to reconcile pause/resume/step UX.
- Persistence & hot reload: src/backend/src/persistence handles save/load flows and dev-time blueprint hot reload.

Key frontend notes

- Socket endpoint resolution: Frontend reads import.meta.env.VITE_SOCKET_URL (from src/frontend/.env.\*). Fallback aligns with backend default dev port (see README). Keep env and docs consistent when changing.
- State and data: React + common libraries (TanStack) for tables/lists/virtualization; socket.io-client must match backend’s minor version.

Validation and CI hooks

- Data validation: pnpm validate:data runs tools/validate-data.ts, generating reports in reports/validation and failing on errors. Use flags like --data and --out if needed (see docs/system/data-validation.md).
- Husky pre-commit is installed via prepare script; lint-staged enforces formatting/lint on staged files.

Critical rules and guardrails (from AGENTS.md and README/docs)

- Determinism: All randomness must use a seeded RNG; do not use Math.random in simulation core.
- No experimental loaders: Use tsx for development and tsup/tsc for builds. Backend runtime is ESM.
- Schema and naming: Follow docs/DD.md rules. Do not rename JSON keys in blueprints; only additive, user-approved fields are allowed.
- Transport parity: Maintain same minor version for socket.io and socket.io-client in backend and frontend to avoid protocol drift.
- Telemetry only on event bus: Command/control flows go through the facade, not the telemetry stream.

Quick start (summary)

- pnpm install
- pnpm dev (runs backend and frontend together)
- Frontend dev server shows dashboard; it connects to the backend Socket.IO endpoint per env.
- Before PRs, run: pnpm validate:data && pnpm audit:run && pnpm lint && pnpm test && pnpm typecheck
