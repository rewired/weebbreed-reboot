# WeedBreed Reboot

[![Data Validation](https://github.com/WeedBreed/weebbreed-reboot/actions/workflows/data-validation.yml/badge.svg?branch=main&job=validate)](https://github.com/WeedBreed/weebbreed-reboot/actions/workflows/data-validation.yml)
[![Audit](https://github.com/WeedBreed/weebbreed-reboot/actions/workflows/data-validation.yml/badge.svg?branch=main&job=audit)](https://github.com/WeedBreed/weebbreed-reboot/actions/workflows/data-validation.yml)
[![Lint](https://github.com/WeedBreed/weebbreed-reboot/actions/workflows/data-validation.yml/badge.svg?branch=main&job=lint)](https://github.com/WeedBreed/weebbreed-reboot/actions/workflows/data-validation.yml)

Modular plant-growth simulation and dashboard platform inspired by the WeedBreed
architecture. The backend (Node.js + TypeScript) runs a deterministic
multi-phase tick loop that models climate, physiology, and save/load flows,
while a React front end streams telemetry for real-time visualization.

## Architecture at a Glance

- **Backend** – Deterministic simulation engine, schema validation, and
  Socket.IO gateway housed under `src/backend`. The production build ships as an
  ESM bundle at `dist/index.js` for direct execution on modern Node runtimes.
- **Frontend** – Vite + React dashboard in `src/frontend` for live telemetry,
  controls, and analytics.
- **Blueprint data** – Authoritative JSON bundles in `/data` define strains,
  devices, cultivation methods, and price tables per the data dictionary.
- **Telemetry contract** – Socket and SSE gateways stream
  `SimulationSnapshot` payloads plus scheduler `TimeStatus` metadata. The shape
  is documented in [`docs/system/socket_protocol.md`](docs/system/socket_protocol.md)
  and anchored by ADR 0005. Keep the Socket.IO server (`socket.io`) and client
  (`socket.io-client`) dependencies on the **same minor version** across
  packages to avoid protocol drift in the wire format and handshake helpers.
- **Socket endpoint discovery** – The dashboard imports `SOCKET_URL` from
  `src/frontend/src/config/socket.ts`. It reads `import.meta.env.VITE_SOCKET_URL`
  (set via a `.env` file beside `src/frontend`) and falls back to
  `http://localhost:7331/socket.io`, the backend development default
  (`WEEBBREED_BACKEND_PORT=7331`).

Detailed architecture, module boundaries, and naming rules live in the
workspace documentation. Start with the product vision and system references in
[`docs/vision_scope.md`](docs/vision_scope.md), the data dictionary in
[`docs/DD.md`](docs/DD.md), and additional deep dives under `docs/system/`.

### Project History & Decisions

- Track notable workspace changes in [`CHANGELOG.md`](CHANGELOG.md) following the
  Keep a Changelog convention with Semantic Versioning.
- Accepted architecture decisions are recorded in `docs/system/adr/`. The
  TypeScript toolchain direction lives in
  [`docs/system/adr/0001-typescript-toolchain.md`](docs/system/adr/0001-typescript-toolchain.md)
  and the snapshot/time-status contract is captured in
  [`docs/system/adr/0005-snapshot-time-sync.md`](docs/system/adr/0005-snapshot-time-sync.md).
  Real-time transport version parity is tracked in
  [`docs/system/adr/0006-socket-transport-parity.md`](docs/system/adr/0006-socket-transport-parity.md).

## Continuous Verification

Our automation pipeline keeps data, security, and code quality aligned with the
"docs as source of truth" directive:

- `Data Validation` checks run `pnpm validate:data` to guard blueprint changes.
  Workflow and tooling notes are captured in
  [`docs/addendum/data-validation.md`](docs/addendum/data-validation.md).
- `Audit` jobs execute `pnpm audit:run` to surface dependency vulnerabilities
  early.
- `Lint` jobs enforce workspace-wide lint rules via `pnpm lint`.

## Getting Started

1. Install Node.js 23 and pnpm 10 (matching CI).
2. Install dependencies with `pnpm install`.
3. Use `pnpm dev` for parallel backend/frontend development, or individual
   package scripts (`pnpm --filter @weebbreed/backend dev`, etc.).
4. Run targeted checks locally before opening a pull request:
   - `pnpm validate:data`
   - `pnpm audit:run`
   - `pnpm lint`

Refer to the docs for simulation tuning, schema updates, and naming conventions
before changing blueprints or code. Review the changelog and ADRs when planning
tooling or architecture updates to stay aligned with previous decisions.

### Personnel Role Blueprints

- Author editable role definitions under
  [`data/blueprints/personnel/roles/`](docs/system/personnel_roles_blueprint.md).
  The backend validates every file at startup so changes feed both the initial
  roster factory and the job market without code edits. Keep the doc in sync
  when adding new roles or fields and run `pnpm validate:data` before
  committing blueprint updates.

## Contributing

Contribution guidelines, review expectations, and commit hygiene requirements
are documented in [`CONTRIBUTING.md`](CONTRIBUTING.md). Please follow them in
concert with the domain rules captured across the `/docs` tree.
