# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Introduced the changelog to capture noteworthy changes for upcoming releases.

### Changed

- Updated ADR 0001 to reflect the accepted `tsx` + `tsup` ESM backend toolchain
  and documentation touchpoints.
- Realigned workspace documentation and ADR 0001 with the `src/backend` and
  `src/frontend` layout plus the ESM backend build output.

### Fixed

- Corrected the validate-data CLI import path to target the actual data loader module location.
