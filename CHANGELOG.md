# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Dynamic Structure Blueprint Loading**: The "Rent Structure" modal now dynamically loads available structure blueprints from the backend instead of using hardcoded frontend data. The backend exposes structure blueprints from `/data/blueprints/structures/*.json` through a new `getStructureBlueprints` facade intent. This ensures the frontend always displays the most current and accurate structure options available in the game.

- **Enhanced Seed Generation System**: Implemented sophisticated seed generation for the New Game view based on `/reports/start_new_game-changes.md`. Features include:
  - **MULLBERRY32 PRNG**: Replaced simple LCG with high-quality MULLBERRY32 algorithm for better randomness distribution
  - **Template-based Generation**: Configurable templates with weighted categories (color, strain, fruit, dessert, suffix)
  - **Quality Scoring System**: Advanced scoring algorithm considering alliteration, vowel/consonant flow, length heuristics, and strong endings
  - **Local Search Optimization**: 3-iteration mutation process to improve seed quality
  - **Configurable Parameters**: JSON-based configuration with separator, minScore, count, blacklist, and lexicon settings
  - **Deterministic Generation**: Microtime-based 32-bit seed conversion for reproducible results within process
  - **Lexicon Categories**: Comprehensive word lists for colors, strains, fruits, desserts, and suffixes with weighted selection
  - **Alliteration Support**: Optional alliteration preference with soft upweighting for cohesive naming
  - **Quality Constraints**: Length limits, score thresholds, and blacklist enforcement for consistent output

### Fixed

- **New Game Difficulty Presets**: Restored automatic loading of backend
  difficulty presets in the New Game setup flow by deferring the fetch until
  the Socket.IO bridge reports an active connection, so presets appear without
  manual retries once the UI connects to the server.
- **Facade difficulty config intent**: Fixed `config.getDifficultyConfig`
  responses being rejected because the request metadata leaked into the intent
  payload validation. The backend now strips the transport `requestId` before
  schema validation and an integration test covers the happy path, so the New
  Game view receives the difficulty presets reliably.
- **Game Menu Reset Session Button**: Implemented functionality for the "Reset Session" button in the game menu modal, which previously did nothing. The button now properly stops the simulation (if running) and returns the user to the start screen, clearing the current session state and allowing them to start fresh or load a different game.
- **Finance View Data Access**: Corrected data access in FinanceView to use `snapshot.finance` instead of `snapshot.finances` to properly display financial data
- **ExpenseBreakdown Component**: Simplified ExpenseBreakdown to work with available snapshot data instead of relying on detailed ledger entries not present in frontend
- **Finance View Blank Page**: Resolved blank page issue - Finance view now displays correctly with financial KPIs, charts, and breakdown components
- **Simulation Play Button**: Fixed play button not advancing simulation by reducing default tick length from 60 minutes to 30 seconds for development - simulation now visibly advances every 30 seconds instead of requiring hour-long waits

### Added

- **New Game Setup View**: Completely redesigned the New Game experience from a cramped modal to a full-screen dedicated view. Features clean layout with Game Seed as the first, full-width section, followed by Difficulty Preset selection. The Game Balance Modifiers section uses a 2-column grid layout for better space utilization. Removed unnecessary border styling for cleaner appearance. All modifier inputs now use proper float number inputs with 2 decimal precision, supporting direct keyboard input without complex parsing. Users can fine-tune plant stress multipliers, device failure rates, and economic settings within validated ranges. Difficulty presets (Easy, Normal, Hard) serve as starting points with automatic state synchronization via useEffect. Backend integration supports custom seed storage and modifier application to game state initialization.
- **Financial Dashboard Enhancement**: Implemented comprehensive Financial Dashboard system providing detailed revenue, expense, and profitability analysis. Created dedicated FinanceView with interactive time-range filters (1D, 1W, 1M, 1Y) displaying key financial metrics including cash on hand, total revenue, net income with profit margins, and burn rate calculations with runway days. Added RevenueBreakdown component showcasing detailed analysis of harvest sales and market pricing with revenue analytics. Implemented ExpenseBreakdown component featuring comprehensive expense analysis covering CapEx, OpEx, maintenance, and payroll with categorical breakdowns and cost optimization insights. Created ProfitChart component rendering interactive time-series visualizations of financial performance trends with computed growth metrics. Added UtilityPricing component enabling adjustment of electricity, water, and nutrient costs via facade intents with market context and price impact analysis. Enhanced DashboardHeader with Finance navigation button and integrated routing in App.tsx. All components leverage the facade intent system for backend integration and provide responsive UI with financial insights for business decision-making.

- **FireModal: Enhanced Employee Termination Safety System**: Implemented comprehensive employee termination modal with multi-layered safety checks to prevent accidental dismissals. Features include mandatory name confirmation requiring exact employee name input, detailed employee information display (role, status, morale, energy, salary, assignment), termination impact analysis showing payroll changes and staff count effects, visual warning indicators with danger-themed styling, structured confirmation workflow with permanent action warnings, and robust error handling for network issues. Provides professional HR management interface ensuring deliberate decision-making for permanent workforce changes.
- **PersonnelView: Staff Roster with Hiring/Firing Capabilities**: Implemented comprehensive personnel management system featuring a dedicated Personnel view with staff roster, applicant management, and workforce administration. Includes employee cards showing status, morale, energy, and salary information; applicant cards with skills, traits, and hiring capabilities; staff recruitment functionality; employee termination with confirmation dialogs; detailed employee information modals; role distribution analytics; and integrated navigation through sidebar. Enhances user experience by providing centralized workforce management tools for hiring, firing, and monitoring staff performance.
- **CandidateCard: Enhanced Job Market Applicant Display**: Added reusable CandidateCard component for displaying job market applicants with comprehensive skill visualization. Features include float skill levels (0-10) with color-coded proficiency indicators, skill descriptions (Novice to Expert), role display name formatting, gender-specific icons, personal information display, application summaries with average skill calculations, and trait visualization with psychology icons. Integrates with personnel skill blueprints from /data/blueprints/personnel/skills and role definitions from /data/blueprints/personnel/roles for accurate candidate representation.
- **Enhanced Personnel Management System**: Comprehensive overhaul of personnel management with dedicated components for improved user experience. Added EmployeeCard component displaying current staff with morale, energy, assignment status, performance metrics, and productivity indicators. Created HireModal with detailed candidate review workflow including skills analysis, hiring impact calculations, and comprehensive confirmation process. Implemented FireModal with safety checks, termination impact analysis, and name confirmation requirements. Added RefreshButton component for candidate pool refresh via facade.workforce.refreshCandidates with loading states and refresh timing. Introduced shared utility functions for consistent skill color coding, role display formatting, and status management across all personnel components.
- **Room Creation System**: Implemented complete room creation functionality allowing players to add custom rooms to structures with configurable names, purposes (Grow Room, Laboratory, Break Room, Sales Room), and areas. Includes frontend modal interface, backend validation, and real-time UI updates.
- **Zone Creation System**: Added comprehensive zone creation functionality enabling players to add cultivation zones to rooms with selectable names, areas, and cultivation methods (Basic Soil Pot, Screen of Green, Sea of Green). Features area validation, real-time available space calculation, and full game integration.
- **Available Space Display**: Enhanced room creation modal to show available space within structures, including real-time calculation of remaining footprint area, visual feedback for invalid inputs, and form validation to prevent exceeding structure capacity.
- Introduced the changelog to capture noteworthy changes for upcoming releases.
- Recorded ADR 0003 describing the façade messaging overhaul and modular intent registry.
- Created a clickdummy fixture translator (`src/frontend/src/fixtures/translator.ts`) to hydrate stores with `SimulationSnapshot`-konformen Daten inklusive normalisierter SI-Einheiten und Geometriefeldern.
- Erweiterte die clickdummy-Fixtures um strain-/Stadium-Metadaten, Geräte-Blueprint-Kennungen und deterministische `financeHistory`-Einträge, sodass Frontend-Stores vollständige Snapshot-Typen erhalten.
- Ergänzte ZoneDetail um interaktive Setpoint-Steuerungen, Pflanzenaktionen und Gerätegruppenlisten, nutzt dafür neue Form-Komponenten unter `components/forms` sowie die bestehenden Setpoint- und Intent-Dispatches des Zone-Stores.
- Ergänzte das Finanzdashboard um einen tick-basierten Zeitbereichs-Umschalter samt Aufschlüsselungslisten für OpEx, Utilities und Wartungsgeräte. Die Listen basieren auf dem neuen `components/panels/BreakdownList`.
- Registrierte typisierte Modal-Descriptoren für Infrastruktur- und Detail-Workflows und implementierte dedizierte Modal-Inhalte unter `views/world/modals` bzw. `views/zone/modals`, gerendert über den aktualisierten `ModalHost`.
- Modularisierte die deterministischen Clickdummy-Fixtures unter `src/frontend/src/fixtures` (inklusive `createClickDummyFixture`, Jobrollen- und Kostenkonstanten) zur Wiederverwendung in Offline-Bootstrap, Tests und künftigen Previews.
- Ergänzte `createOfflineBootstrapPayload` samt Vitest-Absicherung (`offlineBootstrap.test.ts`), sodass wiederholte Hydrationen mit gleichem Seed identische Snapshots liefern und RNG-Tausch-Regressionen früh auffallen.
- Added `ModalHost.test.tsx` regression coverage to drive the facility management modals and assert that the zone store dispatches the expected façade intents.

### Changed

- New Game setup view and modal now request difficulty presets from the backend façade
  (`config.getDifficultyConfig`), ensuring the UI reflects `/data/configs/difficulty.json`
  without relying on bundled frontend JSON assets.
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
- Wired the world management modals so renting structures, creating rooms/zones,
  and duplicating structures/rooms/zones dispatch façade intents via the zone
  store, adding dedicated rent/duplicate structure dialog components in the
  frontend.
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

- **Fixed Personnel Hiring and Firing Actions**: Corrected frontend-backend communication mismatch preventing employee hiring and firing. The frontend was sending incorrect action names ('hireApplicant' and 'fireEmployee') while the backend facade expected ('hire' and 'fire'). Updated HireModal to send proper 'hire' action with required candidateId, role, and wage parameters, and FireModal to send 'fire' action. Both workforce actions now function correctly through the facade intent system.
- Corrected the validate-data CLI import path to target the actual data loader module location.
- Upgraded the frontend Socket.IO client to `^4.8.1` to match the backend
  dependency and eliminate protocol drift.
- Fixed simulation control flow so new games always start in paused state, allowing players to examine initial conditions before starting the simulation clock.
- Implemented real-time time status synchronization between backend and frontend, ensuring play/pause button states reflect actual simulation status across all connected clients.
- Added immediate snapshot broadcasts for successful domain commands (structure rentals, room/zone creation, etc.) so UI updates appear instantly regardless of simulation running/paused state.
- Resolved duplicate structure rental prevention that was blocking multiple rentals of the same blueprint type - players can now rent multiple "Small Warehouse" structures and other blueprint types as intended.
- Fixed missing "Add Room" functionality that was showing incorrect "Room data unavailable" messages - implemented proper CreateRoomModal component with backend validation and room purpose resolution.
- Resolved missing "Add Zone" interface preventing users from adding zones to rooms - added CreateZoneModal with cultivation method selection and area validation against room constraints.
