# Weedbreed.AI UI Building Guide

The Weedbreed.AI dashboard renders read-only simulation snapshots and routes every user gesture through the System Facade so that the deterministic engine enforces geometry, biology, and economic rules.【F:docs/ui/ui_archictecture.md†L1-L74】【F:docs/ui/ui-implementation-spec.md†L1-L96】 This guide consolidates the architecture notes, interaction specs, component references, and screenshot insights into a single build manual for teams extending or rebuilding the frontend without introducing business logic to the UI layer.

The application follows a structure → room → zone drill-down supported by persistent dashboard controls, breadcrumb navigation, and modal workflows that pause gameplay until intents succeed, aligning macro management with per-zone cultivation flows.【F:docs/ui/ui-implementation-spec.md†L11-L220】【F:docs/ui/ui-screenshot-insights.md†L1-L52】 All requirements below reuse the existing terminology (UUID identifiers, facade intents, Tailwind tokens) and consolidate the latest architecture decisions so downstream teams can implement features without guessing at contract details.

## Table of Contents

- [Guiding Principles](#guiding-principles)
- [Layout & Navigation](#layout--navigation)
- [Core Views](#core-views)
- [UI Elements & Patterns](#ui-elements--patterns)
- [Interactions](#interactions)
- [States & Telemetry](#states--telemetry)
- [Accessibility & Performance](#accessibility--performance)
- [Visual Guardrails](#visual-guardrails)
- [Glossary](#glossary)
- [Changelog Note](#changelog-note)
- [Open Issues](#open-issues)

## Guiding Principles

- **Logic-free presentation.** The UI never computes harvest revenue, growth, or geometry; it renders snapshots and issues facade commands only.【F:docs/ui/ui_archictecture.md†L1-L74】【F:docs/ui/ui_interactions_spec.md†L1-L88】 Components remain "dumb" so the deterministic engine governs validation, costing, and state transitions.
- **Unidirectional dataflow.** Rendering always follows the Render → Intent → Facade Command → Engine Commit → Event Notify → Re-render cycle, ensuring predictable updates and debuggable behavior.【F:docs/ui/ui_archictecture.md†L16-L74】
- **Authoritative identities.** Every cross-reference uses `id` (UUID v4); UI elements may display names but never join on them, and events carry minimal UUID payloads that must be resolved against the latest snapshot.【F:docs/ui/ui_archictecture.md†L1-L140】【F:docs/ui/ui_interactions_spec.md†L1-L114】
- **Naming conventions.** Inputs and intents reuse the System Facade vocabulary (`world.createRoom`, `devices.installDevice`, `plants.addPlanting`, etc.) without introducing alternative spellings, keeping parity with backend docs.【F:docs/ui/ui_archictecture.md†L75-L140】【F:docs/ui/ui-implementation-spec.md†L260-L380】
- **Design-system primitives.** Teams must rely on the shared Button, IconButton, form field, and InlineEdit primitives instead of ad-hoc styling so that theme and focus states remain centralised.【F:docs/ui/ui_elements.md†L5-L24】
- **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】
- **Dark-first theming.** Tailwind tokens rooted in the stone palette with lime accents define the dark theme across cards, inputs, and overlays; the light theme pairs `#fafafa` surfaces and `#111827` text with lime-600 accents so both themes share semantic tokens and AA contrast.【F:docs/ui/ui-components-desciption.md†L551-L614】
- **Responsive-first layouts.** Desktop is the design baseline. Breakpoints align with Tailwind (`lg ≥1024px`, `xl ≥1440px`) while `md`/`sm` fall back to stacked single-column layouts: dashboards switch to `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`, zone detail stacks below `md`, and header controls wrap under `sm` before rejoining on wider screens.【F:docs/ui/ui-implementation-spec.md†L160-L220】【F:docs/ui/ui-components-desciption.md†L407-L533】
- **Tick length controlled by backend.** The UI only exposes deterministic play/pause and speed presets; users cannot adjust tick duration directly so simulation cadence remains façade governed.

## Layout & Navigation

### Application Shell

- The single-page app keeps a persistent header (`DashboardHeader`), breadcrumb navigation, sidebar, and dynamic content area orchestrated by the navigation manager (`{ currentView, selectedStructureId?, selectedRoomId?, selectedZoneId? }`).【F:docs/ui/ui-implementation-spec.md†L11-L120】【F:docs/ui/ui_archictecture.md†L75-L140】【F:docs/ui/ui-components-desciption.md†L225-L360】
- The start screen centers the Weedbreed.AI title, subtitle, and primary actions (New, Load, Import) before transitioning to the main shell once a run is active.【F:docs/ui/ui_elements.md†L11-L44】【F:docs/ui/ui-components-desciption.md†L393-L420】 The "Quick Start" preset seeds `"WB-quickstart-default"`, rents one compact warehouse (≈600 m², 2.5 m height), provisions a growroom with three 20 m² zones configured for SOG, stocks 10 000 L water and 100 kg nutrients, equips each zone with 2× GrowLight (10–12 m² coverage), 1× ClimateUnit, 1× Dehumidifier, and 1× CO₂-Injector, and plants 40 `ak-47` strain starters with Auto-Replant disabled; simulation remains paused until the player explicitly starts it.
- Sidebar navigation lists rooms and zones for the selected structure, with nested toggles and CTA hooks (e.g., "Add Room") tied to modal flows.【F:docs/ui/ui-components-desciption.md†L225-L360】

### Responsive Breakpoints & Navigation Behaviour

- Breakpoints follow a desktop-first Tailwind scale: `xs <480px`, `sm 480–767px`, `md 768–1023px`, `lg 1024–1439px`, `xl ≥1440px`. Only `lg` and `xl` have bespoke layouts; smaller breakpoints reuse stacked single-column variants.
- Dashboard and grid surfaces use `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` from `sm` upward, collapsing to a single stretched card column on `xs` widths.
- Zone detail presents two columns (`1.2fr / 1fr`) from `lg` upward; `md` and below stack content with the status column rendering before management panels to preserve reading order.
- Header controls wrap into two rows under `sm`, then collapse back to a single row from `md` upward so presets stay reachable without overflow.
- Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.

### Persistent Dashboard & Controls

```css
.dashboard {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.dashboard-metrics,
.dashboard-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.game-speed-controls .btn {
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
}
.game-speed-controls .btn.active {
  background: var(--color-primary);
  color: #fff;
}
```

- The left cluster surfaces Capital, Cumulative Yield, planned plant capacity (hidden when zero), and an animated tick progress ring tied to in-game time.【F:docs/ui/ui-implementation-spec.md†L37-L120】【F:docs/ui/ui_elements.md†L24-L84】
- The right cluster offers play/pause, multiple speed presets (0.5×–100×), quick links to Finances (`monitoring`) and Personnel (`groups`), notifications, and the game menu (`settings`).【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui_elements.md†L62-L116】
- Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.

### Breadcrumbs & States

```css
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.breadcrumbs a {
  color: var(--color-link);
  text-decoration: none;
}
.breadcrumbs .sep {
  opacity: 0.6;
}
```

- Breadcrumbs mirror the hierarchy (Structures → Structure → Room → Zone) and expose a back arrow for stepping upward; each segment is clickable and updates the navigation state via `goTo`/`back` actions.【F:docs/ui/ui-implementation-spec.md†L120-L150】【F:docs/ui/ui_archictecture.md†L75-L140】
- The content area applies a blur and disables pointer events whenever any modal is active, reinforcing modal focus and the pause-first policy.【F:docs/ui/ui-implementation-spec.md†L80-L106】

```css
.content-area.blurred {
  filter: blur(3px);
  pointer-events: none;
}
```

### Panel Layouts & Responsive Breakpoints

- Zone detail screens render a two-column grid (`1.2fr / 1fr`) for status vs. list panels, collapsing to a single column below 900 px, which must be respected when designing responsive breakpoints.【F:docs/ui/ui-implementation-spec.md†L180-L220】
- Structure, room, and zone overviews rely on responsive card grids using `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`, ensuring cards wrap gracefully on narrow screens.【F:docs/ui/ui-implementation-spec.md†L120-L180】
- The screenshot insights confirm that dashboard, structure, room, and zone compositions must preserve quick inline actions (rename, duplicate, delete) within these responsive layouts.【F:docs/ui/ui-screenshot-insights.md†L1-L64】
- Personnel and finance views use tabbed and collapsible panels while remaining accessible through the persistent header navigation.【F:docs/ui/ui-components-desciption.md†L470-L533】
- Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).

## Core Views

### Start Screen

- Displays "Weedbreed.AI - Reboot" with subtitle "Your AI-powered cannabis cultivation simulator." and three actions: New Game, Load Game, Import Game (Quick Start optional per StartScreen component).【F:docs/ui/ui_elements.md†L11-L44】【F:docs/ui/ui-components-desciption.md†L393-L420】
- The corresponding screenshot (`01-welcome-screen.png`) maps to `StartScreen` in `App.tsx`, invoking lifecycle intents (`newGame`, `load`, `importState`).【F:docs/ui/ui-components-desciption.md†L393-L420】
- Quick Start loads the deterministic seed `"WB-quickstart-default"`, rents a 600 m² warehouse with a growroom of three 20 m² SOG zones, preloads 10 000 L water and 100 kg nutrients, installs 2× GrowLight, 1× ClimateUnit, 1× Dehumidifier, and 1× CO₂-Injector per zone, and plants 40 `ak-47` starters with Auto-Replant disabled.

### Dashboard & Global Chrome

- Persistent header summarising Capital, Cumulative Yield, planned plant capacity, and an in-game clock with tick progress ring.【F:docs/ui/ui-implementation-spec.md†L37-L120】【F:docs/ui/ui_elements.md†L24-L84】
- Control cluster includes Play/Pause, speed presets, view switchers (Finances, Personnel), notifications popover, and settings flyout for Save/Load/Export/Reset.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L225-L360】
- `DashboardHeader` consumes stats, simulation state, and navigation callbacks; `EventLog` sits at the footer to surface recent telemetry color-coded by severity.【F:docs/ui/ui-components-desciption.md†L225-L360】
- Screenshot insights show inline actions within cards to encourage drill-down and highlight consistent dark theming across cards.【F:docs/ui/ui-screenshot-insights.md†L1-L64】
- Notification popover mirrors header alerts with tabs for _All_, _Warnings_, and _Errors_, paginates 20 items per lazy-loaded page, and surfaces severity icons consistent with toast/event log styling.

### Structures Overview

- `DashboardView` renders rented structures as cards inside a responsive grid, each showing name, floor area, room count, plant summary, and inline rename/duplicate actions via `InlineEdit` + `ActionIcons`.【F:docs/ui/ui-implementation-spec.md†L120-L180】【F:docs/ui/ui-components-desciption.md†L483-L487】【F:docs/ui/ui_elements.md†L84-L140】
- `+ Rent Structure` button launches the rent modal; duplication flows preview costs and device counts before dispatching intents.【F:docs/ui/ui-implementation-spec.md†L120-L180】【F:docs/ui/ui-components-desciption.md†L313-L360】
- Screenshot `03-structure-overview.png` confirms these cards and quick actions.【F:docs/ui/ui-screenshot-insights.md†L1-L64】

### Structure Detail View

- Header displays structure name with rename (`edit`) and delete (`delete`) icons, area usage, and CTA to `+ Add Room`. Cards for each room include area, purpose, zone counts, plant summaries, and inline rename/duplicate/delete actions.【F:docs/ui/ui-implementation-spec.md†L120-L200】【F:docs/ui/ui_elements.md†L116-L176】【F:docs/ui/ui-components-desciption.md†L521-L525】
- Duplicate flows use modals summarizing footprint, zone counts, and CapEx estimates before invoking `world.duplicateStructure`.【F:docs/ui/ui-components-desciption.md†L313-L360】
- Screenshot `09-structure-detailview.png` illustrates nested zone cards inside the structure detail.【F:docs/ui/ui-screenshot-insights.md†L21-L52】

### Room Detail View

- Header lists room name, purpose badge, rename/delete icons, and capacity usage; zone grids appear for grow rooms, while labs swap in the `BreedingStation` component.【F:docs/ui/ui-implementation-spec.md†L200-L260】【F:docs/ui/ui_elements.md†L140-L196】
- Zone cards show name, area, cultivation method, plant summaries, and inline rename/duplicate/delete actions; clicking navigates to zone detail.【F:docs/ui/ui-implementation-spec.md†L200-L240】【F:docs/ui/ui-components-desciption.md†L407-L420】
- Screenshot `10-room-overview-(growroom).png` captures the zone grid and inline actions.【F:docs/ui/ui-screenshot-insights.md†L21-L52】

#### BreedingStation (Lab Rooms)

- Lab-purpose rooms swap the standard zone grid for the `BreedingStation` workspace that manages deterministic breeding runs while keeping grow-room flows untouched.
- Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).
- Core components include `ParentPicker` (multi-select by strain UUID with phenology/lighting hints), `TraitTargets` sliders (THC/CBD, vigor, stress resilience, growth duration), `CrossSummary` badges (F1/F2 label, batch size, seed, noise bounds), `RunProgress` (steps, elapsed ticks/days, logs), `OffspringTable` (sortable columns for id/genotype/chemotype/phenology/qualityScore/viability/notes with keep/promote actions), and `PromoteModal` (confirms new strain blueprint metadata and parent lineage).
- Data contract relies on `BreedingRun` snapshots providing metadata, parent IDs, batch size, seed, optional trait targets, run status timestamps, offspring previews, and notes. Each offspring exposes heuristic quality/chemotype/phenology/resilience/viability fields plus `keep` flags for client-side toggles.
- Facade intents routed through the bridge hook: `breeding.startRun`, `breeding.abortRun`, `breeding.finalizeRun`, and `breeding.promoteOffspring` (with blueprint naming + optional slug) — every action pauses the simulation like other modals and resumes after commit.

### Zone Detail View

- Header includes zone name with sibling navigation arrows (`arrow_back_ios`, `arrow_forward_ios`), rename/delete icons, and ensures zone-level actions remain accessible.【F:docs/ui/ui-implementation-spec.md†L220-L320】【F:docs/ui/ui_elements.md†L196-L260】
- Layout splits into two columns (status vs. management) above 900 px and stacks below; screenshot `11`–`13` illustrate collapsed vs. expanded environment controls and batch plant selection.【F:docs/ui/ui-implementation-spec.md†L220-L360】【F:docs/ui/ui-screenshot-insights.md†L33-L64】
- **Zone Info Panel (left column):**
  - General info for area, method, plant counts.
  - Supplies card with water/nutrient stocks plus buttons to add supply (modal).
  - Lighting card with cycle, coverage (color-coded classes), and DLI/PPFD metrics derived from backend `coverageRatio` and readings.【F:docs/ui/ui-implementation-spec.md†L240-L360】
  - Environment card showing temperature, humidity, CO₂ with out-of-range highlighting and VPD proxy as secondary metric.【F:docs/ui/ui-implementation-spec.md†L240-L360】【F:docs/ui/ui-components-desciption.md†L407-L462】 Thresholds: temperature 22–28 °C (green), 20–22/28–30 °C (yellow), <20/>30 °C (red with copy "Canopy warm → Transpiration ↑, Stress risk" when exceeding 30 °C); relative humidity 0.45–0.65 (green), 0.40–0.45/0.65–0.70 (yellow), <0.40/>0.70 (red with "Air too humid → Pathogen risk; increase dehumidification" at >0.70); CO₂ 800–1 200 ppm (green), 600–800/1 200–1 400 ppm (yellow), <600/>1 400 ppm (red, recommending safety shutdown above 1 800 ppm).
- **Management Panels (right column):**
  - Plantings list supports expand/collapse, per-plant harvest (`content_cut`), group delete (`delete`), and strain info tooltips; Harvest All CTA appears when plants ready.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- Planting Plan panel manages auto-replant toggles, strain/quantity config, and edit/delete flows using modals.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- Manual planting overrides Auto-Replant by applying a manual lock; the UI raises a banner "Auto-Replant paused (manual planting active)" with a "Resume Auto-Replant" CTA that clears the lock and emits `plants.autoReplantResumed`, while the pause event triggers `plants.autoReplantPaused`.
- Devices list groups by type with status indicator chips (`status-on/off/mixed/broken`), toggles all-on/off, exposes tuning, light cycle, install, update, move, and remove actions via modals.【F:docs/ui/ui-implementation-spec.md†L260-L360】【F:docs/ui/ui-components-desciption.md†L421-L533】
- Device group toggles confirm for safety-critical HVAC, CO₂, and dehumidifier groups with risk copy, while low-impact lighting and ventilation flips act immediately, showing "Group: ON/OFF" toasts and still awaiting façade acknowledgements.
  - ZonePlantPanel supports normal inspection (tooltips, direct actions) and batch-selection mode with BatchActionBar actions for Harvest/Trash/Treat across selected plants.【F:docs/ui/ui-components-desciption.md†L421-L533】
- Empty zone states include dedicated illustrations plus CTAs: "Install device" when device list empty, "Plant" when no plantings exist, and secondary "Configure Auto-Replant" when plans are absent; each tooltip explains prerequisites (e.g., method setup).
- Strain info tooltips (hover on `info` icon) display name, genotype percentages (sativa/indica/ruderalis when available), phenology (seedling/veg/flowering days), environmental targets (PPFD, temperature, RH corridors), NPK guidance for veg/flower, price hints (baseline harvest price when price maps resolve), and resolved lineage parent names pulled from strain blueprints and lineage lookups.
- Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.

### Finances View

- Presents high-level KPIs via `StatCard`s and collapsible panels for Revenue, OpEx, and CapEx, with time-range filters (1D/1W/1M/1Y).【F:docs/ui/ui-components-desciption.md†L470-L509】【F:docs/ui/ui_elements.md†L260-L300】
- Icons include `trending_up`, `receipt_long`, `account_balance`, and `DollarIcon` for quick comprehension.【F:docs/ui/ui-components-desciption.md†L470-L509】
- Screenshots `06` and `07` show collapsed vs. expanded states, confirming the toggle affordances.【F:docs/ui/ui-screenshot-insights.md†L41-L64】
- Missing finance figures render an em dash (`—`) with tooltip "No data in range"; negative numbers tint red and may optionally use parentheses `(–1 234,56)` to emphasise losses while preserving locale formatting.
- Currency and number formatting leverage `Intl.NumberFormat`, deriving locale from app language (DE/EN) and currency from configuration (default EUR) without storing currency codes in blueprints.

### Personnel View

- Tabbed interface toggling between "Job Market" (candidate cards with hire actions) and "Your Staff" (employee cards with fire/assignment controls and morale/energy bars).【F:docs/ui/ui_components-desciption.md†L504-L509】【F:docs/ui/ui_elements.md†L300-L360】
- Hiring uses `HireEmployeeModal`; firing uses global confirmation; refresh triggers `workforce.refreshCandidates`.【F:docs/ui/ui_components-desciption.md†L333-L337】【F:docs/ui/ui_interactions_spec.md†L58-L73】
- Screenshots `04` and `05` illustrate both tabs and their CTAs.【F:docs/ui/ui-screenshot-insights.md†L41-L64】
- Lists virtualize once they exceed 100 cards; pagination uses 50-card pages to keep keyboard navigation predictable while preserving infinite-scroll as an enhancement.
- Morale and energy scales both span 0–100: morale renders green ≥75, yellow 50–74, red <50; energy below 20 shows a lightning icon labelled "Overtime risk" with tooltips describing impact on task claiming utility.

### Event Log & Ancillary Panels

- `EventLog` sits at the footer, rendering `EventLogItem[]` with severity color coding to echo recent `sim.*`, `world.*`, `hr.*`, and `finance.*` events.【F:docs/ui/ui-components-desciption.md†L225-L360】
- `ToastContainer` anchors notifications in the top-right, with `Toast` entries styled by type (`success`, `error`, etc.) and optional auto-dismiss for non-error states.【F:docs/ui/ui-components-desciption.md†L95-L220】
- Footer event log retains the latest 200 entries, dropping oldest first; the toast queue renders at most three concurrent toasts, keeping errors sticky until dismissed while other severities auto-dismiss after 4 s.

## UI Elements & Patterns

### Screenshot Reference Map

| Screenshot                                          | View Context                                                            | Primary Components                                                                                                                                                                                       | Interaction Focus                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `01-welcome-screen.png`                             | Initial landing screen introducing simulation entry actions.            | `StartScreen` renders New/Quick/Import CTAs while `App.tsx` remains in `startScreen` state.【F:docs/ui/ui-components-desciption.md†L393-L420】                                                           | Launch points for `newGame`, `load`, and `importState` lifecycle flows.【F:docs/ui/ui_interactions_spec.md†L13-L23】 |
| `02-modal-new_game.png`                             | New game setup modal capturing company metadata and deterministic seed. | `NewGameModal` inside shared `Modal` shell with `FormInput` and `PrimaryButton` controls.【F:docs/ui/ui-components-desciption.md†L123-L178】【F:docs/ui/ui-components-desciption.md†L347-L353】          | Confirms start-of-run workflow before dispatching `facade.newGame`.【F:docs/ui/ui_interactions_spec.md†L13-L23】     |
| `03-structure-overview.png`                         | Portfolio overview of rented structures displayed as cards.             | `DashboardView` cards with `InlineEdit` and `ActionIcons` for rename/duplicate.【F:docs/ui/ui-components-desciption.md†L95-L165】【F:docs/ui/ui-components-desciption.md†L483-L487】                     | Supports rent/duplicate/drill-down navigation in the macro loop.【F:docs/ui/ui_interactions_spec.md†L27-L37】        |
| `04-personell-overview-(job-market).png`            | Personnel screen focusing on external candidates.                       | `PersonnelView` job-market tab listing `CandidateCard`s with hire modals.【F:docs/ui/ui-components-desciption.md†L333-L337】【F:docs/ui/ui-components-desciption.md†L504-L509】                          | Drives hiring and candidate refresh intents.【F:docs/ui/ui_interactions_spec.md†L58-L61】                            |
| `05-personell-overview-(my-employees).png`          | Personnel screen showing internal staff roster.                         | `PersonnelView` staff tab with `EmployeeCard`s exposing fire/assignment controls.【F:docs/ui/ui-components-desciption.md†L504-L509】                                                                     | Manages firing and reassignment per workforce spec.【F:docs/ui/ui_interactions_spec.md†L60-L65】                     |
| `06-finances-overview-(cards_closed).png`           | Finance dashboard with collapsed summaries.                             | `FinanceView` stacking KPI `StatCard`s above collapsible categories.【F:docs/ui/ui-components-desciption.md†L182-L193】【F:docs/ui/ui-components-desciption.md†L490-L500】                               | Provides at-a-glance CapEx/OpEx metrics.【F:docs/ui/ui_interactions_spec.md†L69-L73】                                |
| `07-finances-overview-(cards_opened).png`           | Finance dashboard with expanded detail panels.                          | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】                                                                                                 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】                        |
| `08-model-game_menu.png`                            | Game-level menu triggered from dashboard header.                        | `GameMenuModal` rendered by shared modal chassis.【F:docs/ui/ui-components-desciption.md†L167-L178】【F:docs/ui/ui-components-desciption.md†L323-L329】                                                  | Accesses Save/Load/Export/Reset lifecycle commands.【F:docs/ui/ui_interactions_spec.md†L18-L23】                     |
| `09-structure-detailview.png`                       | Detail page for a single structure with nested rooms/zones.             | `StructureDetailView` lists rooms via `ZoneCard` summaries and inline actions.【F:docs/ui/ui-components-desciption.md†L413-L420】【F:docs/ui/ui-components-desciption.md†L521-L525】                     | Enables room-level CRUD and duplicate flows.【F:docs/ui/ui_interactions_spec.md†L27-L36】                            |
| `10-room-overview-(growroom).png`                   | Room detail focusing on grow zones.                                     | `RoomDetailView` showing `ZoneCard`s with rename/duplicate controls.【F:docs/ui/ui-components-desciption.md†L407-L420】【F:docs/ui/ui-components-desciption.md†L513-L517】                               | Supports zone creation and duplication in macro management loop.【F:docs/ui/ui_interactions_spec.md†L31-L36】        |
| `11-zone-detailview-(setup-closed).png`             | Zone management view with environment panel collapsed.                  | `ZoneDetailView` with collapsed `EnvironmentPanel` summarizing KPIs alongside device/plant panels.【F:docs/ui/ui-components-desciption.md†L407-L417】【F:docs/ui/ui-components-desciption.md†L529-L533】 | Anchors climate monitoring and device status for cultivation loop.【F:docs/ui/ui_interactions_spec.md†L40-L50】      |
| `12-zone-detailview-(setup-opened).png`             | Zone management view with environment controls expanded.                | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】                                                                     | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】        |
| `13-zone-detailview-(mass-selection-activated).png` | Zone plant grid in batch-selection mode.                                | `ZonePlantPanel` with `BatchActionBar` for multi-plant operations.【F:docs/ui/ui-components-desciption.md†L451-L462】                                                                                    | Executes Harvest/Trash/Treat batch actions and automation toggles.【F:docs/ui/ui_interactions_spec.md†L45-L54】      |

### Design-System Primitives

- **Buttons & IconButtons** replace ad-hoc CSS, covering primary/secondary, danger, link styles, and active states via props such as `variant`, `tone`, `size`, `isActive`.【F:docs/ui/ui_elements.md†L5-L24】
- **Form fields** (`FormInput`, `FormSelect`, `FormCheckbox`, `RangeInput`) encapsulate Tailwind styling and are composed via `FormField` and modal forms.【F:docs/ui/ui_elements.md†L5-L24】【F:docs/ui/ui-components-desciption.md†L95-L193】
- **InlineEdit** toggles between display and input modes with confirm/cancel interactions to support in-place renaming of structures, rooms, and zones.【F:docs/ui/ui_elements.md†L5-L24】【F:docs/ui/ui-components-desciption.md†L95-L140】
- **Modal shell** supplies overlay, title bar, close button, and content area while pausing the sim and restoring prior state on close.【F:docs/ui/ui-implementation-spec.md†L96-L152】【F:docs/ui/ui-components-desciption.md†L123-L193】

### Generic Components

- **ActionIcons** group Duplicate and Delete buttons for consistent placement; require `onDuplicate`/`onDelete` callbacks and optional `className`. Icons: `DuplicateIcon`, `DeleteIcon`.【F:docs/ui/ui-components-desciption.md†L95-L120】
- **Breadcrumbs** accept `BreadcrumbItem[]` and `onNavigate` to display hierarchical trail with `ChevronRightIcon`.【F:docs/ui/ui-components-desciption.md†L95-L140】
- **Buttons** supply Tailwind-styled `PrimaryButton` and `DangerButton` variants with disabled states.【F:docs/ui/ui-components-desciption.md†L95-L140】
- **Form components** standardize labeled inputs/selects/checkboxes across modals.【F:docs/ui/ui-components-desciption.md†L95-L167】
- **Icons** centralize Google Material icon wrappers, allowing consistent styling via optional `className`.【F:docs/ui/ui-components-desciption.md†L140-L150】
- **InlineEdit** (detailed above) listens for Enter/Escape/blur to commit or cancel edits.【F:docs/ui/ui-components-desciption.md†L140-L165】
- **Modal** component handles overlay, header, and children, using `XIcon` for close affordance.【F:docs/ui/ui-components-desciption.md†L165-L178】
- **StatCard** shows icon, title, value, optional unit, color; reused in header and finance view.【F:docs/ui/ui-components-desciption.md†L178-L193】
- **Toast/ToastContainer** render notifications with icons (`XIcon`, `CheckIcon`, `error`, `warning`, `info`), auto-dismiss for non-error types, and rely on `useToast` context.【F:docs/ui/ui-components-desciption.md†L193-L220】

### Layout Components

- **DashboardHeader** hosts controls, nav links, stats, and game menu (icons: `ClockIcon`, `DollarIcon`, `PauseIcon`, `PlayIcon`, `HomeIcon`, `BadgeIcon`, `CogIcon`, `paid`).【F:docs/ui/ui-components-desciption.md†L225-L260】
- **EventLog** displays `EventLogItem[]` with severity colors at the footer.【F:docs/ui/ui-components-desciption.md†L260-L280】
- **MainContent** routes based on selection state and renders breadcrumbs; passes data/callbacks to active view.【F:docs/ui/ui-components-desciption.md†L280-L313】
- **Sidebar** lists structures/rooms/zones with toggle icons (`ChevronDownIcon`, `PlusIcon`) and CTA integration for modal flows.【F:docs/ui/ui-components-desciption.md†L313-L360】

### Modal Components

- **AddDeviceModal**: install device form using `FormSelect`, `FormInput`, `PrimaryButton` for zone context.【F:docs/ui/ui-components-desciption.md†L360-L420】
- **CreateRoomModal**: collects name, purpose, area, height; enforces geometry; uses `useZoneStore.createRoom`; tested via `ModalHost`.【F:docs/ui/ui-components-desciption.md†L360-L420】
- **CreateZoneModal**: allocates footprint, selects method, optional plant count; dispatches `world.createZone`; validated in tests.【F:docs/ui/ui-components-desciption.md†L360-L420】
- **DuplicateStructureModal/DuplicateRoomModal/DuplicateZoneModal**: review footprint, device counts, names before cloning via respective intents; confirm actions handled through zone store helpers and regression tests.【F:docs/ui/ui-components-desciption.md†L360-L460】
- **GameMenuModal**: lists Save/Load/Reset options (currently placeholder); launched from header cog.【F:docs/ui/ui-components-desciption.md†L323-L337】
- **HireEmployeeModal**: assign structure on hire using dropdown; relies on `FormSelect` and `PrimaryButton`.【F:docs/ui/ui-components-desciption.md†L360-L440】
- **InfoModal**: surfaces pest/disease blueprint details (symptoms, controls).【F:docs/ui/ui-components-desciption.md†L440-L451】
- **NewGameModal**: collects company/CEO name and deterministic seed; uses `FormInput` + `PrimaryButton`.【F:docs/ui/ui-components-desciption.md†L333-L347】
- **PlantDetailModal**: shows plant stats with harvest/trash actions using `CutIcon` and `TrashIcon`; harvest disabled until ready.【F:docs/ui/ui-components-desciption.md†L440-L462】
- **PlantStrainModal**: plants new strain; populates options from snapshot; uses forms primitives.【F:docs/ui/ui-components-desciption.md†L440-L462】
- **InstallDeviceModal/UpdateDeviceModal/MoveDeviceModal**: manage device lifecycle (install JSON validation, patch existing settings, relocate hardware) through zone-store helpers and `SimulationFacade` intents.【F:docs/ui/ui-components-desciption.md†L440-L533】
- **Device removal confirmation**: reuses confirmation modal to call `devices.removeDevice` via zone store helper.【F:docs/ui/ui-components-desciption.md†L440-L533】
- **RentStructureModal**: rents new structure with affordability gating; uses forms primitives.【F:docs/ui/ui-components-desciption.md†L533-L540】
- **Duplicate flows** described above require inline cost previews and compliance with `allowedRoomPurposes` for devices.【F:docs/ui/ui-components-desciption.md†L360-L533】【F:docs/ui/ui_interactions_spec.md†L27-L54】 Cost tooltips break totals into Rooms, Zones, Devices (count × individual CapEx via `devicePrices.json`), Setup (method/container/substrate), and Other, summing capital and setup costs while reminding players that maintenance remains separate.

### Simulation Components

- **EnvironmentPanel**: collapsed summary vs. expanded controls for temperature, humidity, CO₂ sliders, lighting toggles/cycle; disables controls when devices missing; displays VPD as derived metric.【F:docs/ui/ui-components-desciption.md†L407-L462】
- **ZoneCard**: compact zone summary with navigation click and `ActionIcons`; includes progress bars for plant growth.【F:docs/ui/ui-components-desciption.md†L420-L440】
- **ZoneDeviceList**: groups devices by name, aggregates counts, exposes install/update/move/remove actions; draws from zone store helpers.【F:docs/ui/ui-components-desciption.md†L421-L533】
- **ZonePlantPanel**: grid of plants with inspection mode (tooltips, direct actions) and selection mode enabling `BatchActionBar` for Harvest/Trash/Treat; integrates pest/disease info and automation toggles.【F:docs/ui/ui-components-desciption.md†L440-L462】

### View Components (Composition Level)

- **DashboardView**: default view listing structures; integrates InlineEdit and ActionIcons; default landing post-start.【F:docs/ui/ui-components-desciption.md†L470-L487】 Structure cards sort by most recently used (descending) with name (ascending) as fallback, persisting any user override in local storage or URL params so ordering remains stable across sessions.
- **FinanceView**: detailed financial breakdown with collapsible cards and timeframe filter; uses `StatCard` icons (`trending_up`, `receipt_long`, `account_balance`).【F:docs/ui/ui-components-desciption.md†L470-L509】
- **PersonnelView**: tabbed candidate/staff management with hire/fire actions and icon usage (e.g., `DeleteIcon`).【F:docs/ui/ui-components-desciption.md†L504-L509】
- **RoomDetailView** and **StructureDetailView**: compose zone cards, InlineEdit, and ActionIcons to manage nested rooms/zones.【F:docs/ui/ui-components-desciption.md†L513-L525】
- **ZoneDetailView**: orchestrates EnvironmentPanel, ZonePlantPanel, ZoneDeviceList, and device lifecycle CTAs with modals and zone store helpers.【F:docs/ui/ui-components-desciption.md†L407-L533】

### Context Providers

- **ToastContext/ToastProvider** exposes `addToast` for success/error notifications while `ToastContainer` renders them; follows producer/consumer pattern to decouple triggers from presentation.【F:docs/ui/ui-components-desciption.md†L509-L533】

### Contract Type Definitions

```ts
export type UUID = string;

export interface Selection {
  currentView: 'dashboard' | 'structure' | 'room' | 'zone' | 'finances' | 'personnel';
  selectedStructureId?: UUID;
  selectedRoomId?: UUID;
  selectedZoneId?: UUID;
}

export interface StructureSummary {
  id: UUID;
  name: string;
  area_m2: number | null;
  roomCount: number;
  plantCount: number;
}

export interface ZoneKpis {
  area_m2: number;
  methodId?: UUID;
  plantCount: number;
  env: {
    temperature_C?: number;
    relativeHumidity?: number;
    co2_ppm?: number;
    vpd_kPa?: number;
    ppfd?: number;
  };
  coverageRatio?: number;
}

export interface ZoneSummary {
  id: UUID;
  name: string;
  kpis: ZoneKpis;
  deviceGroups: Array<{
    kind: string;
    count: number;
    status: 'on' | 'off' | 'mixed' | 'broken';
  }>;
}

export interface EventLogItem {
  id: UUID;
  ts: number;
  severity: 'info' | 'success' | 'warning' | 'error';
  type: string;
  entityId?: UUID;
  message: string;
}

export interface OnNavigatePayload {
  target: 'dashboard' | 'structure' | 'room' | 'zone' | 'finances' | 'personnel';
  id?: UUID;
}

export interface OnPlantActionPayload {
  zoneId: UUID;
  action: 'harvest' | 'trash' | 'treat' | 'plant';
  plantIds?: UUID[];
  strainId?: UUID;
  quantity?: number;
}

export interface OnBatchActionPayload {
  zoneId: UUID;
  plantIds: UUID[];
  action: 'harvest' | 'trash' | 'treat';
}

export interface OnUpdatePayload {
  entity: 'zoneSetpoint' | 'deviceGroup' | 'inlineName';
  zoneId?: UUID;
  metric?: 'temperature' | 'relativeHumidity' | 'vpd' | 'co2' | 'ppfd';
  value?: number;
  kind?: string;
  toggle?: 'on' | 'off';
  targetId?: UUID;
  name?: string;
}
```

These interfaces mirror the façade intent contract and reinforce the intent-only, snapshot-read-only boundary.

### State Management & Backend Integration

- A lightweight Zustand store (`useGameStore`) is the single source of truth for connection status, latest snapshot, last tick, and event buffer. `connect(url)` instantiates a Socket.IO client (websocket transport), updates `connected` flags on connect/disconnect, and wires listeners for `simulationSnapshot` (full state) and `simulationUpdate` (diff + events) while capping the event buffer to the most recent 200 entries. The socket instance is exposed on `window.__wb_socket` for debugging.
- `disconnect()` delegates to the underlying socket disconnect, and `sendIntent(domain, action, payload?)` emits `facade.intent` over the socket, returning a promise that resolves with the façade response so callers can await `{ ok, warnings?, errors? }` without optimistic UI.
- Components use selectors to read the store, memoizing derived data (e.g., `selectSnapshot`, `selectEvents`) to avoid unnecessary renders; bridge hooks wrap `useGameStore` to expose typed façade commands to views.
- App bootstrap calls `useGameStore.getState().connect(SOCKET_URL)` on mount and ensures cleanup on unmount. Intent dispatchers always disable their originating controls and show `… applying` copy until the promise settles, matching the deterministic façade loop.

### Styling & Responsiveness Guardrails

- Tailwind spacing adheres to a 4 px baseline: `space-1 = 4px`, `space-2 = 8px`, `space-3 = 12px`, `space-4 = 16px`, `space-6 = 24px`, `space-8 = 32px`, `space-10 = 40px`, `space-12 = 48px`. Vertical rhythm guidelines: section headers `mt-8`, card title-to-body `mt-4`, form rows `gap-3`, dense lists `gap-2`.
- Card padding defaults to `px-6 py-5` on desktop and `px-4 py-4` on mobile; column layouts prefer `gap-4` with `gap-6` reserved for room/zone detail two-column layouts. Inline forms use `gap-3` with `min-w-[220px]` fields to maintain alignment.
- Icon sizing is standardized: 24 px for header controls, 20 px for card action clusters, 18 px for table/list rows, and 10 px for status dots. Hover affordances adjust opacity only—no scaling to prevent layout shift.

### Resilience Patterns

- Validation warnings returned from intents render as persistent inline banners within the originating modal, referencing `payload.path` when present. Hard errors (`level: error`) trigger sticky red toasts and log entries including `entityId` (if provided).
- Empty states ship bespoke illustrations and CTAs: zones without devices prompt “Install device,” plant-less zones show “Plant” plus “Configure Auto-Replant,” and finance panels render an em dash (`—`) with tooltip “No data in range.”
- Network resilience uses exponential backoff up to 30 s while reconnecting; the header shows a “Reconnecting…” badge and, upon reconnect, the client requests a fresh `simulationSnapshot`.
- Concurrency handling disables the initiating control while an intent is in flight and trusts the façade as the authority. If competing updates adjust a record, the client discards local assumptions and re-renders from the latest snapshot—no local merges.

## Interactions

### Game Lifecycle

- Start new games via modal capturing name/seed (`facade.newGame`), load/import snapshots (`facade.load`, `facade.importState`), and reset runs after confirmation.【F:docs/ui/ui_interactions_spec.md†L13-L35】【F:docs/ui/ui-components-desciption.md†L323-L353】
- Save/export from the game menu dispatches `facade.save()` and `facade.exportState()`; loading or deleting slots routes through the same menu flows.【F:docs/ui/ui_interactions_spec.md†L18-L35】
- Play/pause/step/fast-forward controls issue `simulationControl` intents (`play|pause|step|fastForward`, `setSetpoint`) through `useGameStore` and bridge hooks; tick length remains façade-managed and is not user-adjustable from the UI.【F:docs/ui/ui-implementation-spec.md†L260-L380】【F:docs/ui/ui-components-desciption.md†L225-L260】

### Infrastructure & Navigation

- Rent structures (`facade.world.rentStructure`), create rooms (`createRoom`), create zones (`createZone`), and duplicate structures/rooms/zones via dedicated intents that replicate geometry, cultivation methods, automation, and eligible devices (costed per blueprint).【F:docs/ui/ui_interactions_spec.md†L27-L54】【F:docs/ui/ui-implementation-spec.md†L260-L340】
- Rename/delete flows rely on inline edit (rooms/zones) or modals (structures) to dispatch updates and confirmations.【F:docs/ui/ui-implementation-spec.md†L120-L260】【F:docs/ui/ui-components-desciption.md†L407-L533】
- Breadcrumbs and sidebar navigation trigger `goTo`/`selectEntity` to update selection state without duplicating routing logic.【F:docs/ui/ui_archictecture.md†L75-L140】

### Cultivation & Zone Management

- Install devices (`facade.devices.installDevice`) with placement checks against `allowedRoomPurposes`, update device settings (`updateDevice`), move devices between zones (`moveDevice`), toggle groups, and remove devices via confirmation flows.【F:docs/ui/ui_interactions_spec.md†L40-L54】【F:docs/ui/ui-components-desciption.md†L421-L533】
- Apply irrigation (`facade.plants.applyIrrigation`) and fertilizer (`facade.plants.applyFertilizer`) from supplies card actions; add supplies triggers shared modal flows.【F:docs/ui/ui_interactions_spec.md†L40-L54】【F:docs/ui/ui-implementation-spec.md†L240-L320】
- Plant strains (`facade.plants.addPlanting`), harvest individual plants or groups (`facade.plants.harvestPlanting`), delete plantings, and manage automation via Planting Plan (create/edit/delete/toggle Auto-Replant).【F:docs/ui/ui_interactions_spec.md†L40-L54】【F:docs/ui/ui-implementation-spec.md†L260-L360】
- Zone navigation arrows allow stepping between sibling zones with wrap-around enabled at list boundaries; keyboard shortcuts mirror the behavior (Left/Right arrows) for quick cycling.【F:docs/ui/ui-implementation-spec.md†L220-L320】

### Environment & Telemetry Control

- EnvironmentPanel adjustments send zone setpoints (`temperature`, `relativeHumidity`, `vpd`, `co2`, `ppfd`) via `config.update` while reflecting backend clamp warnings and `env.setpointUpdated` events.【F:docs/ui/ui-implementation-spec.md†L260-L360】【F:docs/ui/ui-components-desciption.md†L407-L462】
- Lighting cards display coverage sufficiency using `.lighting-ok` and `.lighting-insufficient` classes and allow editing light cycles through modals (`schedule`).【F:docs/ui/ui-implementation-spec.md†L240-L360】
- Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- Zone layout editing supports drag-and-drop drawing/snapping of rectangles in 0.5 m increments (minimum 1.0 m × 1.0 m). Dropping proposals emits `world.createZone` or `world.resizeZone`, with the façade clamping invalid placements and returning adjustments via toast copy “Adjusted to valid placement.” Device tiles optionally support drag-and-drop within a zone to trigger ghost placement and `devices.moveDevice`; dropping confirms via façade intent. Plant management remains modal/batch-action only—no drag-and-drop to avoid complexity.

### Personnel & Finance

- Refresh candidates (`facade.workforce.refreshCandidates`), hire (`facade.workforce.hire`), assign structures, negotiate raises, and fire employees (`facade.workforce.fire`) via modal workflows; overtime policy adjustments use `setOvertimePolicy`.【F:docs/ui/ui_interactions_spec.md†L58-L73】【F:docs/ui/ui-components-desciption.md†L333-L337】
- Financial interactions include selling inventory lots (`facade.finance.sellInventory`), adjusting utility prices, and maintenance policy updates via façade commands surfaced in the finance view or modal dialogs.【F:docs/ui/ui_interactions_spec.md†L69-L88】

### Modals & Focus Management

- Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】
- Shared modal styles enforce dark overlay, bordered content, max width 720 px (or 92 vw), and rely on Tailwind for structure; focus remains trapped inside until closure.【F:docs/ui/ui-implementation-spec.md†L96-L152】
- Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.

## States & Telemetry

- The Bridge Hook (`useGameState` analogue) is the single gateway to subscribe to snapshots and events (`sim.ready`, `sim.tickCompleted`, `sim.paused`, `sim.hotReloaded`) while memoizing command callbacks to prevent unnecessary re-renders.【F:docs/ui/ui_archictecture.md†L75-L120】
- Application orchestrator requests the initial snapshot (waiting for `sim.ready`), provides navigation, modal, and theme context, and feeds snapshots plus command callbacks down the tree.【F:docs/ui/ui_archictecture.md†L75-L120】
- Unidirectional flow ensures snapshots are read-only: render snapshot → dispatch facade intent → engine validates/applies → commit emits new snapshot and events → subscribers re-render.【F:docs/ui/ui_archictecture.md†L16-L74】
- Read models should remain lean; selectors derive subsets such as zone KPIs, device summaries, and cost aggregates for views to minimize diff surfaces.【F:docs/ui/ui_archictecture.md†L140-L180】
- Event consumption drives toasts, banners, and local updates across simulation (`sim.tickCompleted`, `sim.paused/resumed`, `sim.hotReloaded/reloadFailed`), world (`world.structureRented`, `world.roomCreated`, `world.zoneCreated`, `world.deviceInstalled`), plants (`plant.stageChanged`, `plant.harvested`, `pest.detected`, `treatment.applied`), HR/tasks (`task.created/claimed/completed`, `hr.hired/fired`, `hr.overtimeAccrued`), and finance (`finance.capex/opex`, `finance.saleCompleted`) channels.【F:docs/ui/ui_archictecture.md†L140-L200】
- Event payloads carry minimal fields + UUIDs; the UI resolves details via the latest snapshot, never from event payload alone.【F:docs/ui/ui_archictecture.md†L140-L200】
- Toast provider/context decouples producers from the UI, allowing components to emit notifications while `ToastContainer` renders them; event log component retains recent events for quick scanning.【F:docs/ui/ui-components-desciption.md†L193-L360】
- Modal controller pauses simulation state, storing `wasRunningBeforeModal` to resume after closing, which is critical for deterministic telemetry history.【F:docs/ui/ui-implementation-spec.md†L96-L152】
- Initial connection displays a full-screen skeleton (header bar, three stat cards, two-column placeholder) until the first snapshot arrives; long-running intents show inline button spinners with copy "… applying" beside the action.
- Facade responses surface validation warnings as persistent yellow banners inside the originating modal, while hard `ERR_*` failures trigger red toasts and Event Log entries including the failing `payload.path`.
- Telemetry retention follows three rings: per-tick series keep the last 15 minutes of real time, per-hour aggregates store the last seven in-game days, and per-day aggregates persist the last 90 in-game days. Keep total rendered points per series ≤ 5 000.
- Downsampling occurs on every `sim.tickCompleted`, rolling per-tick data into hourly buckets (avg/min/max) and promoting to daily aggregates as ranges grow. Charts automatically switch to hourly/daily series when the visible range exceeds one day to guard performance.

## Accessibility & Performance

- All actionable elements must be keyboard focusable; modals trap focus and restore it on close while using `role="dialog"` and descriptive labels for icons to meet WCAG AA contrast requirements.【F:docs/ui/ui-implementation-spec.md†L360-L420】
- Avoid conveying information through color alone—pair icons or labels with status hues (e.g., lighting coverage, device states).【F:docs/ui/ui-implementation-spec.md†L240-L360】
- Toasts, notifications, and badges should provide accessible text alternatives when icon-only controls are present (e.g., header icons).【F:docs/ui/ui-implementation-spec.md†L37-L142】
- Virtualize large lists (zones, tasks, employees) and memoize selectors to limit re-render scope; throttle chart updates and downsample telemetry where necessary.【F:docs/ui/ui_archictecture.md†L140-L200】【F:docs/ui/ui_interactions_spec.md†L88-L120】
- Use responsive layouts (column collapse below 900 px, grid auto-fill) and ensure controls wrap gracefully without overlap.【F:docs/ui/ui-implementation-spec.md†L160-L220】
- Avoid optimistic UI; wait for facade ACK or events before updating to maintain deterministic order.【F:docs/ui/ui_interactions_spec.md†L120-L150】
- Keyboard shortcuts: Space toggles Play/Pause (announced via SR-only live region), `ö`/`ä` adjust speed down/up, `g`/`f`/`p`/`s` jump to Dashboard/Finances/Personnel/Structures, and Left/Right arrows cycle zones with wrap-around.
- Provide a global ARIA live region (`role="status" aria-live="polite"`) that announces simulation pause/resume, throttled tick completions (≤ 1 announcement every 5 s), and warning/error titles so screen-reader users receive timely feedback. Icon-only controls require `aria-label` + `title`, and modal roots declare `role="dialog" aria-modal="true" aria-labelledby`.
- Performance budgets: virtualize lists ≥ 100 rows, cap concurrent toasts at 3, limit chart line series to ≤ 2 000 rendered points, and throttle streaming UI updates to ≥ 250 ms. CI/dev validation includes a Jest/Vitest smoke test rendering `FinanceView` with 5 000 rows (target ≥ 50 FPS on reference laptop) and a bridge-hook stress test pumping 1 000 `simulationUpdate` messages at 20 Hz without memory growth over 20 MB.

## Visual Guardrails

### Iconography

| Icon                | Usage                                                    |
| ------------------- | -------------------------------------------------------- |
| `play_circle`       | Start simulation.                                        |
| `pause_circle`      | Pause simulation.                                        |
| `monitoring`        | Switch to financial view.                                |
| `groups`            | Switch to personnel view.                                |
| `notifications`     | Open notifications.                                      |
| `settings`          | Open game menu (Save/Load/Export/Reset).                 |
| `edit`              | Rename structures/rooms/zones; edit planting plan.       |
| `delete`            | Delete structures/rooms/zones/devices/individual plants. |
| `delete_sweep`      | Delete an entire planting group.                         |
| `content_copy`      | Duplicate rooms or zones.                                |
| `info`              | Show strain info tooltip.                                |
| `content_cut`       | Harvest a single plant.                                  |
| `tune`              | Adjust settings for a device group (opens modal).        |
| `schedule`          | Edit light cycle for a zone (opens modal).               |
| `arrow_back_ios`    | Navigate to previous zone.                               |
| `arrow_forward_ios` | Navigate to next zone.                                   |
| `person_remove`     | Fire an employee.                                        |

### Spacing & Vertical Rhythm

- Base spacing units follow Tailwind’s 4 px grid: `space-1` (4 px), `space-2` (8 px), `space-3` (12 px), `space-4` (16 px), `space-6` (24 px), `space-8` (32 px), `space-10` (40 px), `space-12` (48 px).
- Section headers land at `mt-8` with `mb-3`, card title-to-body spacing uses `mt-4`, and vertical card stacks default to `gap-4` (upgrade to `gap-6` in two-column zone detail layouts).
- Form rows observe `gap-3`, dense lists `gap-2`, and inline form fields keep `min-w-[220px]` to align labels/inputs.
- Card padding defaults to `px-6 py-5` on desktop and `px-4 py-4` on mobile to respect touch targets without crowding.

### Icon Sizing Guidelines

| Context                    | Size  | Notes                                                       |
| -------------------------- | ----- | ----------------------------------------------------------- |
| Topbar/Header controls     | 24 px | Primary affordances (play/pause, menus); opacity hover only |
| Card action clusters       | 20 px | Inline rename/duplicate/delete icons                        |
| Table/List row leading     | 18 px | Row indicators, status glyphs                               |
| Status dots (device group) | 10 px | Filled dots for aggregated device state                     |

Maintain consistent icon weights (default Material weight) and avoid scaling on hover to prevent layout shifts; prefer opacity changes or background highlights for feedback.

### Dark Theme Tokens

- Background: `bg-stone-900`.
- Text: primary `text-stone-100/200`, secondary `text-stone-400/500`.
- Panels/cards: `bg-stone-800/30` with `border-stone-700`.
- Primary accent: `bg-lime-600`, `text-lime-400`; status colors include `text-green-400`, `text-yellow-400`, `text-red-400`, `text-blue-400`, `text-cyan-400` for success/warning/danger/info states.【F:docs/ui/ui-components-desciption.md†L551-L574】
- Typography: Inter font, headings styled via Tailwind utilities (`text-3xl font-bold`, etc.) instead of default heading tags.【F:docs/ui/ui-components-desciption.md†L551-L574】
- ### Light Theme Tokens

- Background: `#fafafa` base with cards at `#ffffff` bordered by `#e5e7eb`.
- Text: primary `#111827`, secondary `#6b7280` to mirror dark-theme contrast ratios.
- Accent: lime-600 (`#65a30d`) with hover at `#4d7c0f`; status hues reuse green/yellow/red/blue/cyan 600 shades to keep semantic parity.
- Buttons maintain AA contrast by pairing dark text with light fills and vice versa, sharing the same component tokens as the dark theme.

### Core CSS Snippets

```css
.tick-ring circle.progress {
  transition: stroke-dashoffset 0.3s linear;
}
.lighting-ok {
  color: #18a957;
}
.lighting-insufficient {
  color: #d8a400;
}
.device-status-indicator {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
}
.device-status-indicator.status-on {
  background: #19b56b;
}
.device-status-indicator.status-off {
  background: #8b8f97;
}
.device-status-indicator.status-mixed {
  background: #d8a400;
}
.device-status-indicator.status-broken {
  background: #d64545;
}
```

### Tailwind Building Blocks

```html
<div class="bg-stone-800/30 rounded-lg p-6">
  <!-- Card content -->
</div>

<button
  class="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-stone-600 disabled:cursor-not-allowed"
>
  Action
</button>

<div>
  <label class="block text-sm font-medium text-stone-300 mb-1">Label</label>
  <input
    class="w-full bg-stone-900 border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none"
  />
</div>

<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
  <div class="bg-stone-800 border border-stone-700 rounded-lg shadow-xl w-full max-w-md m-4">
    <header class="flex items-center justify-between p-4 border-b border-stone-700">
      <!-- Header content -->
    </header>
    <div class="p-6">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

### Custom Scrollbar

```css
/* Custom scrollbar for a better dark-mode aesthetic */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #1c1917; /* stone-900 */
}
::-webkit-scrollbar-thumb {
  background: #57534e; /* stone-600 */
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #78716c; /* stone-500 */
}
```

### Layout Reminders

- Card grids rely on `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` with `gap: 1rem` to maintain consistent spacing across views.【F:docs/ui/ui-implementation-spec.md†L120-L200】
- Zone detail columns use `grid-template-columns: 1.2fr 1fr` with `gap: 1rem`, collapsing to one column below 900 px.【F:docs/ui/ui-implementation-spec.md†L200-L240】
- Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】
- Spacing and vertical rhythm follow the 4 px scale documented in [Styling & Responsiveness Guardrails](#styling--responsiveness-guardrails); custom CSS should align with those Tailwind utilities.
- Icon usage must adhere to the standardized sizes in [Icon Sizing Guidelines](#icon-sizing-guidelines) to keep density consistent across headers, cards, and tables.

## Glossary

- **System Facade**: Authoritative API that validates intents (`world.*`, `devices.*`, `plants.*`, `health.*`, `workforce.*`, `finance.*`, `time.*`) and emits snapshots/events for the UI; all mutations go through it.【F:docs/ui/ui_archictecture.md†L1-L140】【F:docs/ui/ui_interactions_spec.md†L13-L120】
- **Snapshot**: Read-only representation of the current game state (structures, rooms, zones, devices, plants, finance, personnel) consumed by views and selectors.【F:docs/ui/ui_archictecture.md†L16-L120】
- **Structure / Room / Zone**: Hierarchical containers forming the macro navigation path; structures hold rooms, rooms hold zones, and zones manage cultivation data/controls.【F:docs/ui/ui-implementation-spec.md†L120-L320】【F:docs/ui/ui_elements.md†L84-L220】
- **BreedingStation**: Specialized component replacing the zone grid in lab-purpose rooms to manage custom strains.【F:docs/ui/ui-implementation-spec.md†L200-L240】
- **ZonePlantPanel**: Interactive grid for plants supporting inspection mode and selection mode with batch actions.【F:docs/ui/ui-components-desciption.md†L440-L462】
- **BatchActionBar**: Toolbar appearing in ZonePlantPanel selection mode enabling Harvest/Trash/Treat operations across selected plants.【F:docs/ui/ui-components-desciption.md†L451-L462】
- **EnvironmentPanel**: Zone detail panel summarizing and controlling environmental metrics (temperature, humidity, CO₂, PPFD, VPD) with device-aware enablement logic.【F:docs/ui/ui-components-desciption.md†L407-L462】
- **Planting Plan**: Automation configuration specifying strain and quantity for auto-replant, with toggle/edit/delete flows in zone detail view.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- **Device Group**: Aggregated view of devices of the same type within a zone, showing status indicator, count, and collective actions (toggle, tune, schedule).【F:docs/ui/ui-implementation-spec.md†L260-L360】
- **InlineEdit**: Component enabling in-place renaming with confirm/cancel semantics for structures, rooms, and zones.【F:docs/ui/ui-elements.md†L5-L24】【F:docs/ui/ui-components-desciption.md†L140-L165】
- **ModalHost**: Controller orchestrating modal rendering, pause/resume behavior, and tests ensuring intents dispatch correctly.【F:docs/ui/ui-components-desciption.md†L360-L420】
- **ToastProvider / ToastContainer**: Context + renderer for notifications triggered by events or intent results.【F:docs/ui/ui-components-desciption.md†L193-L220】【F:docs/ui/ui-components-desciption.md†L509-L533】
- **EventLogItem**: Entries displayed in footer event log summarizing recent domain events with severity coloring.【F:docs/ui/ui-components-desciption.md†L225-L313】
- **Auto-Replant**: Toggle within Planting Plan enabling automatic replant tasks after harvest/cleaning, based on configured strain/quantity.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- **Navigation Manager**: State machine controlling `{ currentView, selectedStructureId?, selectedRoomId?, selectedZoneId? }` and exposing `goTo`, `back`, `home` helpers.【F:docs/ui/ui_archictecture.md†L75-L120】
- **Bridge Hook**: Single subscription layer connecting UI to snapshots/events and exposing memoized facade commands to components.【F:docs/ui/ui_archictecture.md†L75-L120】

## Changelog Note

Maintain this guide alongside facade, component, and screenshot updates: when new intents or components ship, extend the relevant interaction lists, screenshot map, and glossary so downstream teams stay aligned with the System Facade contract.【F:docs/ui/ui_archictecture.md†L1-L200】【F:docs/ui/ui-components-desciption.md†L393-L462】 Continue layering in type definitions, dataflow diagrams, and responsive specs as they mature, and ensure screenshot references remain current whenever the visual system or layout patterns change to keep this guide authoritative for rebuilds.【F:docs/ui/ui-components-desciption.md†L614-L688】【F:docs/ui/ui-screenshot-insights.md†L1-L64】
