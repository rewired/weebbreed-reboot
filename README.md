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
  Socket.IO gateway housed under `packages/backend`.
- **Frontend** – Vite + React dashboard in `apps/frontend` for live telemetry,
  controls, and analytics.
- **Blueprint data** – Authoritative JSON bundles in `/data` define strains,
  devices, cultivation methods, and price tables per the data dictionary.

Detailed architecture, module boundaries, and naming rules live in the
workspace documentation. Start with the product vision and system references in
[`docs/vision_scope.md`](docs/vision_scope.md), the data dictionary in
[`docs/DD.md`](docs/DD.md), and additional deep dives under `docs/system/`.

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
before changing blueprints or code.

## Contributing

Contribution guidelines, review expectations, and commit hygiene requirements
are documented in [`CONTRIBUTING.md`](CONTRIBUTING.md). Please follow them in
concert with the domain rules captured across the `/docs` tree.
