# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Introduced the changelog to capture noteworthy changes for upcoming releases.
- Recorded ADR 0003 describing the façade messaging overhaul and modular intent registry.
- Created a clickdummy fixture translator (`src/frontend/src/fixtures/translator.ts`) to hydrate stores with `SimulationSnapshot`-konformen Daten inklusive normalisierter SI-Einheiten und Geometriefeldern.
- Erweiterte die clickdummy-Fixtures um strain-/Stadium-Metadaten, Geräte-Blueprint-Kennungen und deterministische `financeHistory`-Einträge, sodass Frontend-Stores vollständige Snapshot-Typen erhalten.

### Changed

- Updated ADR 0001 to reflect the accepted `tsx` + `tsup` ESM backend toolchain
  and documentation touchpoints.
- Realigned workspace documentation and ADR 0001 with the `src/backend` and
  `src/frontend` layout plus the ESM backend build output.
- Refreshed AGENTS.md, socket protocol, façade, and UI interaction docs to cover
  `facade.intent`, duplication workflows, structure rename support, and
  automation toggles.
- Documented Socket.IO transport parity across AGENTS.md, the README, and the
  socket protocol reference; recorded ADR 0006 with the upgrade policy.
- Explained Socket.IO endpoint discovery (`src/frontend/src/config/socket.ts`,
  `VITE_SOCKET_URL`, and the localhost default) across AGENTS.md, the socket
  protocol guide, package READMEs, and ADR 0006 after wiring the shared
  `SOCKET_URL` constant.
- Normalized rent and maintenance accounting to use hourly base rates scaled by
  the active tick length, keeping recurring costs consistent across runtime tick
  changes.
- Collocated the physiology helpers with the engine, removed redundant path
  aliases, and recorded ADR 0007 to explain the consolidation. Confirmed the
  frontend `@/engine` alias cleanup so the tooling no longer advertises the
  defunct path.
- Expanded the clickdummy translator to normalize zone telemetry, resources,
  and health restrictions in SI units before the frontend stores hydrate.

### Fixed

- Corrected the validate-data CLI import path to target the actual data loader module location.
- Upgraded the frontend Socket.IO client to `^4.8.1` to match the backend
  dependency and eliminate protocol drift.
