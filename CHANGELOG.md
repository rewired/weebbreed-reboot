# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Introduced the changelog to capture noteworthy changes for upcoming releases.
- Recorded ADR 0003 describing the façade messaging overhaul and modular intent registry.

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

### Fixed

- Corrected the validate-data CLI import path to target the actual data loader module location.
- Upgraded the frontend Socket.IO client to `^4.8.1` to match the backend
  dependency and eliminate protocol drift.
