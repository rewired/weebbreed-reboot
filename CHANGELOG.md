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
- Ergänzte ZoneDetail um interaktive Setpoint-Steuerungen, Pflanzenaktionen und Gerätegruppenlisten, nutzt dafür neue Form-Komponenten unter `components/forms` sowie die bestehenden Setpoint- und Intent-Dispatches des Zone-Stores.
- Ergänzte das Finanzdashboard um einen tick-basierten Zeitbereichs-Umschalter samt Aufschlüsselungslisten für OpEx, Utilities und Wartungsgeräte. Die Listen basieren auf dem neuen `components/panels/BreakdownList`.
- Registrierte typisierte Modal-Descriptoren für Infrastruktur- und Detail-Workflows und implementierte dedizierte Modal-Inhalte unter `views/world/modals` bzw. `views/zone/modals`, gerendert über den aktualisierten `ModalHost`.
- Modularisierte die deterministischen Clickdummy-Fixtures unter `src/frontend/src/fixtures` (inklusive `createClickDummyFixture`, Jobrollen- und Kostenkonstanten) zur Wiederverwendung in Offline-Bootstrap, Tests und künftigen Previews.
- Ergänzte `createOfflineBootstrapPayload` samt Vitest-Absicherung (`offlineBootstrap.test.ts`), sodass wiederholte Hydrationen mit gleichem Seed identische Snapshots liefern und RNG-Tausch-Regressionen früh auffallen.

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
- Rebuilt the frontend layout shell so `App.tsx` composes `DashboardHeader`, `TimeDisplay`, and `Navigation`
  with the game/navigation slices, including a facility sidebar and header ticker wired to live telemetry.
- Extended the frontend navigation slice with a facility hierarchy and shared view metadata so the header
  tabs and sidebar tree consume the same state without recomputing local copies.
- Ported the structure, room, and zone cards into reusable components and wired the overview/detail
  drilldown so DashboardOverview and ZoneDetail mirror the facility hierarchy with breadcrumbs and
  aggregated telemetry panels.
- Offline-Bootstrap erzeugt den Store-Hydrationssnapshot jetzt über `createClickDummyFixture()` aus dem modularen Fixturepaket.
- Portierte Struktur-/Raum-/Zonen-Helfer in wiederverwendbare Store-Selektoren und ersetzte duplizierte Filterlogik in ZoneDetail
  sowie ModalHost durch die neuen Utilities.
- Ergänzte Vitest-Abdeckung für die migrierten Selektoren, deterministischen Fixture-Utilities sowie `StructureSummaryCard` und
  `Navigation`, inklusive Snapshot-Assertions für die UI-Komponenten.

### Fixed

- Corrected the validate-data CLI import path to target the actual data loader module location.
- Upgraded the frontend Socket.IO client to `^4.8.1` to match the backend
  dependency and eliminate protocol drift.
