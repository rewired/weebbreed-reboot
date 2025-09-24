# Weedbreed.AI UI Building Guide

The Weedbreed.AI dashboard renders read-only simulation snapshots and routes every user gesture through the System Facade so that the deterministic engine enforces geometry, biology, and economic rules.【F:docs/ui/ui_archictecture.md†L1-L74】【F:docs/ui/ui-implementation-spec.md†L1-L96】 This guide consolidates the architecture notes, interaction specs, component references, and screenshot insights into a single build manual for teams extending or rebuilding the frontend without introducing business logic to the UI layer.

The application follows a structure → room → zone drill-down supported by persistent dashboard controls, breadcrumb navigation, and modal workflows that pause gameplay until intents succeed, aligning macro management with per-zone cultivation flows.【F:docs/ui/ui-implementation-spec.md†L11-L220】【F:docs/ui/ui-screenshot-insights.md†L1-L52】 All requirements below reuse the existing terminology (UUID identifiers, facade intents, Tailwind tokens) and highlight outstanding gaps as TODOs for future clarification.

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
- **Dark-first theming.** Tailwind tokens rooted in the stone palette with lime accents define the dark theme across cards, inputs, and overlays; no light-theme variant exists yet.【F:docs/ui/ui-components-desciption.md†L551-L614】 **TODO:** Document light-theme requirements once defined for parity across surfaces.
- **Responsive-first layouts.** Grids collapse to single columns below 900px, controls wrap, and mobile-first stacking is expected for dashboards, zone detail columns, and modal content.【F:docs/ui/ui-implementation-spec.md†L160-L220】【F:docs/ui/ui-components-desciption.md†L407-L533】 **TODO:** Provide explicit breakpoints and behavior for each view in handset and tablet widths to satisfy mobile-first guidance.

## Layout & Navigation

### Application Shell

- The single-page app keeps a persistent header (`DashboardHeader`), breadcrumb navigation, sidebar, and dynamic content area orchestrated by the navigation manager (`{ currentView, selectedStructureId?, selectedRoomId?, selectedZoneId? }`).【F:docs/ui/ui-implementation-spec.md†L11-L120】【F:docs/ui/ui_archictecture.md†L75-L140】【F:docs/ui/ui-components-desciption.md†L225-L360】
- The start screen centers the Weedbreed.AI title, subtitle, and primary actions (New, Load, Import) before transitioning to the main shell once a run is active.【F:docs/ui/ui_elements.md†L11-L44】【F:docs/ui/ui-components-desciption.md†L393-L420】
- Sidebar navigation lists rooms and zones for the selected structure, with nested toggles and CTA hooks (e.g., "Add Room") tied to modal flows.【F:docs/ui/ui-components-desciption.md†L225-L360】

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
- Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】

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
- **TODO:** Document explicit off-canvas or bottom-sheet behavior for sidebar navigation and modal stacking on mobile to complete the mobile-first mandate.

## Core Views

### Start Screen

- Displays "Weedbreed.AI - Reboot" with subtitle "Your AI-powered cannabis cultivation simulator." and three actions: New Game, Load Game, Import Game (Quick Start optional per StartScreen component).【F:docs/ui/ui_elements.md†L11-L44】【F:docs/ui/ui-components-desciption.md†L393-L420】
- The corresponding screenshot (`01-welcome-screen.png`) maps to `StartScreen` in `App.tsx`, invoking lifecycle intents (`newGame`, `load`, `importState`).【F:docs/ui/ui-components-desciption.md†L393-L420】
- **TODO:** Specify Quick Start defaults (seed selection, structure presets) so the CTA can be implemented consistently across clients.

### Dashboard & Global Chrome

- Persistent header summarising Capital, Cumulative Yield, planned plant capacity, and an in-game clock with tick progress ring.【F:docs/ui/ui-implementation-spec.md†L37-L120】【F:docs/ui/ui_elements.md†L24-L84】
- Control cluster includes Play/Pause, speed presets, view switchers (Finances, Personnel), notifications popover, and settings flyout for Save/Load/Export/Reset.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L225-L360】
- `DashboardHeader` consumes stats, simulation state, and navigation callbacks; `EventLog` sits at the footer to surface recent telemetry color-coded by severity.【F:docs/ui/ui-components-desciption.md†L225-L360】
- Screenshot insights show inline actions within cards to encourage drill-down and highlight consistent dark theming across cards.【F:docs/ui/ui-screenshot-insights.md†L1-L64】
- **TODO:** Detail notification popover contents (grouping, pagination, severity icons) to align header alerts with toast/event log behavior.

### Structures Overview

- `DashboardView` renders rented structures as cards inside a responsive grid, each showing name, floor area, room count, plant summary, and inline rename/duplicate actions via `InlineEdit` + `ActionIcons`.【F:docs/ui/ui-implementation-spec.md†L120-L180】【F:docs/ui/ui-components-desciption.md†L483-L487】【F:docs/ui/ui_elements.md†L84-L140】
- `+ Rent Structure` button launches the rent modal; duplication flows preview costs and device counts before dispatching intents.【F:docs/ui/ui-implementation-spec.md†L120-L180】【F:docs/ui/ui-components-desciption.md†L313-L360】
- Screenshot `03-structure-overview.png` confirms these cards and quick actions.【F:docs/ui/ui-screenshot-insights.md†L1-L64】
- **TODO:** Define sorting/default ordering for structure cards (e.g., by name, area, acquisition date) to ensure consistent dashboards.

### Structure Detail View

- Header displays structure name with rename (`edit`) and delete (`delete`) icons, area usage, and CTA to `+ Add Room`. Cards for each room include area, purpose, zone counts, plant summaries, and inline rename/duplicate/delete actions.【F:docs/ui/ui-implementation-spec.md†L120-L200】【F:docs/ui/ui_elements.md†L116-L176】【F:docs/ui/ui-components-desciption.md†L521-L525】
- Duplicate flows use modals summarizing footprint, zone counts, and CapEx estimates before invoking `world.duplicateStructure`.【F:docs/ui/ui-components-desciption.md†L313-L360】
- Screenshot `09-structure-detailview.png` illustrates nested zone cards inside the structure detail.【F:docs/ui/ui-screenshot-insights.md†L21-L52】
- **TODO:** Clarify duplicate cost breakdowns (devices vs. rooms vs. zones) and how copy-cost tooltips should present pricing.

### Room Detail View

- Header lists room name, purpose badge, rename/delete icons, and capacity usage; zone grids appear for grow rooms, while labs swap in the `BreedingStation` component.【F:docs/ui/ui-implementation-spec.md†L200-L260】【F:docs/ui/ui_elements.md†L140-L196】
- Zone cards show name, area, cultivation method, plant summaries, and inline rename/duplicate/delete actions; clicking navigates to zone detail.【F:docs/ui/ui-implementation-spec.md†L200-L240】【F:docs/ui/ui-components-desciption.md†L407-L420】
- Screenshot `10-room-overview-(growroom).png` captures the zone grid and inline actions.【F:docs/ui/ui-screenshot-insights.md†L21-L52】
- **TODO:** Outline BreedingStation UI states, required data fields, and modal triggers distinct from grow-room zones.

### Zone Detail View

- Header includes zone name with sibling navigation arrows (`arrow_back_ios`, `arrow_forward_ios`), rename/delete icons, and ensures zone-level actions remain accessible.【F:docs/ui/ui-implementation-spec.md†L220-L320】【F:docs/ui/ui_elements.md†L196-L260】
- Layout splits into two columns (status vs. management) above 900 px and stacks below; screenshot `11`–`13` illustrate collapsed vs. expanded environment controls and batch plant selection.【F:docs/ui/ui-implementation-spec.md†L220-L360】【F:docs/ui/ui-screenshot-insights.md†L33-L64】
- **Zone Info Panel (left column):**
  - General info for area, method, plant counts.
  - Supplies card with water/nutrient stocks plus buttons to add supply (modal).
  - Lighting card with cycle, coverage (color-coded classes), and DLI/PPFD metrics derived from backend `coverageRatio` and readings.【F:docs/ui/ui-implementation-spec.md†L240-L360】
  - Environment card showing temperature, humidity, CO₂ with out-of-range highlighting and VPD proxy as secondary metric.【F:docs/ui/ui-implementation-spec.md†L240-L360】【F:docs/ui/ui-components-desciption.md†L407-L462】
- **TODO:** Document threshold values for environment highlights (temperature, humidity, CO₂) and associated copy to avoid inconsistent warnings.
- **Management Panels (right column):**
  - Plantings list supports expand/collapse, per-plant harvest (`content_cut`), group delete (`delete`), and strain info tooltips; Harvest All CTA appears when plants ready.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- Planting Plan panel manages auto-replant toggles, strain/quantity config, and edit/delete flows using modals.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- **TODO:** Clarify how manual planting interacts with active Auto-Replant plans (priority, conflict resolution, notifications).
- Devices list groups by type with status indicator chips (`status-on/off/mixed/broken`), toggles all-on/off, exposes tuning, light cycle, install, update, move, and remove actions via modals.【F:docs/ui/ui-implementation-spec.md†L260-L360】【F:docs/ui/ui-components-desciption.md†L421-L533】
- **TODO:** Determine whether device group toggles require confirmation prompts or immediate execution feedback for safety-critical hardware.
  - ZonePlantPanel supports normal inspection (tooltips, direct actions) and batch-selection mode with BatchActionBar actions for Harvest/Trash/Treat across selected plants.【F:docs/ui/ui-components-desciption.md†L421-L533】
- **TODO:** Define empty-state visuals and behavior when a zone has no devices, plantings, or automation plan to maintain UX parity.
- **TODO:** Specify tooltip content and data sources for strain info, pests, and disease icons within zone plant lists.

### Finances View

- Presents high-level KPIs via `StatCard`s and collapsible panels for Revenue, OpEx, and CapEx, with time-range filters (1D/1W/1M/1Y).【F:docs/ui/ui-components-desciption.md†L470-L509】【F:docs/ui/ui_elements.md†L260-L300】
- Icons include `trending_up`, `receipt_long`, `account_balance`, and `DollarIcon` for quick comprehension.【F:docs/ui/ui-components-desciption.md†L470-L509】
- Screenshots `06` and `07` show collapsed vs. expanded states, confirming the toggle affordances.【F:docs/ui/ui-screenshot-insights.md†L41-L64】
- **TODO:** Capture how negative values, missing telemetry, or long-range aggregations should display (e.g., placeholders vs. zeros).
- **TODO:** Document currency formatting rules and localization strategy for all finance metrics to avoid mismatched displays.

### Personnel View

- Tabbed interface toggling between "Job Market" (candidate cards with hire actions) and "Your Staff" (employee cards with fire/assignment controls and morale/energy bars).【F:docs/ui/ui_components-desciption.md†L504-L509】【F:docs/ui/ui_elements.md†L300-L360】
- Hiring uses `HireEmployeeModal`; firing uses global confirmation; refresh triggers `workforce.refreshCandidates`.【F:docs/ui/ui_components-desciption.md†L333-L337】【F:docs/ui/ui_interactions_spec.md†L58-L73】
- Screenshots `04` and `05` illustrate both tabs and their CTAs.【F:docs/ui/ui-screenshot-insights.md†L41-L64】
- **TODO:** Document pagination or virtualization thresholds for large candidate/employee pools to uphold performance guidance.
- **TODO:** Define morale and energy scale ranges, color thresholds, and tooltip explanations for personnel cards.

### Event Log & Ancillary Panels

- `EventLog` sits at the footer, rendering `EventLogItem[]` with severity color coding to echo recent `sim.*`, `world.*`, `hr.*`, and `finance.*` events.【F:docs/ui/ui-components-desciption.md†L225-L360】
- `ToastContainer` anchors notifications in the top-right, with `Toast` entries styled by type (`success`, `error`, etc.) and optional auto-dismiss for non-error states.【F:docs/ui/ui-components-desciption.md†L95-L220】
- **TODO:** Specify retention length and truncation strategy for the footer event list and toast queue to avoid overflow.

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
- **Duplicate flows** described above require inline cost previews and compliance with `allowedRoomPurposes` for devices.【F:docs/ui/ui-components-desciption.md†L360-L533】【F:docs/ui/ui_interactions_spec.md†L27-L54】

### Simulation Components

- **EnvironmentPanel**: collapsed summary vs. expanded controls for temperature, humidity, CO₂ sliders, lighting toggles/cycle; disables controls when devices missing; displays VPD as derived metric.【F:docs/ui/ui-components-desciption.md†L407-L462】
- **ZoneCard**: compact zone summary with navigation click and `ActionIcons`; includes progress bars for plant growth.【F:docs/ui/ui-components-desciption.md†L420-L440】
- **ZoneDeviceList**: groups devices by name, aggregates counts, exposes install/update/move/remove actions; draws from zone store helpers.【F:docs/ui/ui-components-desciption.md†L421-L533】
- **ZonePlantPanel**: grid of plants with inspection mode (tooltips, direct actions) and selection mode enabling `BatchActionBar` for Harvest/Trash/Treat; integrates pest/disease info and automation toggles.【F:docs/ui/ui-components-desciption.md†L440-L462】

### View Components (Composition Level)

- **DashboardView**: default view listing structures; integrates InlineEdit and ActionIcons; default landing post-start.【F:docs/ui/ui-components-desciption.md†L470-L487】
- **FinanceView**: detailed financial breakdown with collapsible cards and timeframe filter; uses `StatCard` icons (`trending_up`, `receipt_long`, `account_balance`).【F:docs/ui/ui-components-desciption.md†L470-L509】
- **PersonnelView**: tabbed candidate/staff management with hire/fire actions and icon usage (e.g., `DeleteIcon`).【F:docs/ui/ui-components-desciption.md†L504-L509】
- **RoomDetailView** and **StructureDetailView**: compose zone cards, InlineEdit, and ActionIcons to manage nested rooms/zones.【F:docs/ui/ui-components-desciption.md†L513-L525】
- **ZoneDetailView**: orchestrates EnvironmentPanel, ZonePlantPanel, ZoneDeviceList, and device lifecycle CTAs with modals and zone store helpers.【F:docs/ui/ui-components-desciption.md†L407-L533】

### Context Providers

- **ToastContext/ToastProvider** exposes `addToast` for success/error notifications while `ToastContainer` renders them; follows producer/consumer pattern to decouple triggers from presentation.【F:docs/ui/ui-components-desciption.md†L509-L533】

### Documented Gaps from Component Audit

- **TODO:** Provide type definitions for objects such as `gameData`, `selection`, `Structure`, `Zone`, and `EventLogItem` to unblock reimplementation clarity.【F:docs/ui/ui-components-desciption.md†L614-L688】
- **TODO:** Describe state management and backend integration details (global store, Socket.IO subscriptions, API calls) beyond `App.tsx` owning state.【F:docs/ui/ui-components-desciption.md†L614-L688】
- **TODO:** Document interaction contract payloads (`onUpdate`, `onBatchAction`, `onPlantAction`, `onNavigate`) with expected parameters and side effects.【F:docs/ui/ui-components-desciption.md†L614-L688】
- **TODO:** Capture styling directives for Tailwind tokens, spacing, breakpoints, and responsiveness to back existing references.【F:docs/ui/ui-components-desciption.md†L614-L688】
- **TODO:** Outline edge-case handling for validation errors, empty lists, network issues, and concurrent updates.【F:docs/ui/ui-components-desciption.md†L614-L688】

## Interactions

### Game Lifecycle

- Start new games via modal capturing name/seed (`facade.newGame`), load/import snapshots (`facade.load`, `facade.importState`), and reset runs after confirmation.【F:docs/ui/ui_interactions_spec.md†L13-L35】【F:docs/ui/ui-components-desciption.md†L323-L353】
- Save/export from the game menu dispatches `facade.save()` and `facade.exportState()`; loading or deleting slots routes through the same menu flows.【F:docs/ui/ui_interactions_spec.md†L18-L35】
- Play/pause/step/fast-forward controls issue `simulationControl` intents (`play|pause|step|fastForward`, `setTickLength`, `setSetpoint`) through `useGameStore` and bridge hooks.【F:docs/ui/ui-implementation-spec.md†L260-L380】【F:docs/ui/ui-components-desciption.md†L225-L260】

### Infrastructure & Navigation

- Rent structures (`facade.world.rentStructure`), create rooms (`createRoom`), create zones (`createZone`), and duplicate structures/rooms/zones via dedicated intents that replicate geometry, cultivation methods, automation, and eligible devices (costed per blueprint).【F:docs/ui/ui_interactions_spec.md†L27-L54】【F:docs/ui/ui-implementation-spec.md†L260-L340】
- Rename/delete flows rely on inline edit (rooms/zones) or modals (structures) to dispatch updates and confirmations.【F:docs/ui/ui-implementation-spec.md†L120-L260】【F:docs/ui/ui-components-desciption.md†L407-L533】
- Breadcrumbs and sidebar navigation trigger `goTo`/`selectEntity` to update selection state without duplicating routing logic.【F:docs/ui/ui_archictecture.md†L75-L140】

### Cultivation & Zone Management

- Install devices (`facade.devices.installDevice`) with placement checks against `allowedRoomPurposes`, update device settings (`updateDevice`), move devices between zones (`moveDevice`), toggle groups, and remove devices via confirmation flows.【F:docs/ui/ui_interactions_spec.md†L40-L54】【F:docs/ui/ui-components-desciption.md†L421-L533】
- Apply irrigation (`facade.plants.applyIrrigation`) and fertilizer (`facade.plants.applyFertilizer`) from supplies card actions; add supplies triggers shared modal flows.【F:docs/ui/ui_interactions_spec.md†L40-L54】【F:docs/ui/ui-implementation-spec.md†L240-L320】
- Plant strains (`facade.plants.addPlanting`), harvest individual plants or groups (`facade.plants.harvestPlanting`), delete plantings, and manage automation via Planting Plan (create/edit/delete/toggle Auto-Replant).【F:docs/ui/ui_interactions_spec.md†L40-L54】【F:docs/ui/ui-implementation-spec.md†L260-L360】
- Zone navigation arrows allow stepping between sibling zones; screenshot references confirm this quick switching behavior.【F:docs/ui/ui-implementation-spec.md†L220-L320】
- **TODO:** Define wrap-around behavior and keyboard shortcuts (if any) for zone navigation arrows.

### Environment & Telemetry Control

- EnvironmentPanel adjustments send zone setpoints (`temperature`, `relativeHumidity`, `vpd`, `co2`, `ppfd`) via `config.update` while reflecting backend clamp warnings and `env.setpointUpdated` events.【F:docs/ui/ui-implementation-spec.md†L260-L360】【F:docs/ui/ui-components-desciption.md†L407-L462】
- Lighting cards display coverage sufficiency using `.lighting-ok` and `.lighting-insufficient` classes and allow editing light cycles through modals (`schedule`).【F:docs/ui/ui-implementation-spec.md†L240-L360】
- Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- **TODO:** Specify drag-and-drop mechanics for device or plant rearrangement, including whether move actions rely solely on modals or support direct manipulation.
- **TODO:** Provide resize behavior for cultivation grids to honour the 0.5 m × 0.5 m layout rule when repositioning zones or plants.

### Personnel & Finance

- Refresh candidates (`facade.workforce.refreshCandidates`), hire (`facade.workforce.hire`), assign structures, negotiate raises, and fire employees (`facade.workforce.fire`) via modal workflows; overtime policy adjustments use `setOvertimePolicy`.【F:docs/ui/ui_interactions_spec.md†L58-L73】【F:docs/ui/ui-components-desciption.md†L333-L337】
- Financial interactions include selling inventory lots (`facade.finance.sellInventory`), adjusting utility prices, and maintenance policy updates via façade commands surfaced in the finance view or modal dialogs.【F:docs/ui/ui_interactions_spec.md†L69-L88】

### Modals & Focus Management

- Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】
- Shared modal styles enforce dark overlay, bordered content, max width 720 px (or 92 vw), and rely on Tailwind for structure; focus remains trapped inside until closure.【F:docs/ui/ui-implementation-spec.md†L96-L152】
- **TODO:** Clarify modal stacking rules (e.g., nested modals vs. sequential) and how to queue commands if multiple dialogs attempt to pause/resume simultaneously.

## States & Telemetry

- The Bridge Hook (`useGameState` analogue) is the single gateway to subscribe to snapshots and events (`sim.ready`, `sim.tickCompleted`, `sim.paused`, `sim.hotReloaded`) while memoizing command callbacks to prevent unnecessary re-renders.【F:docs/ui/ui_archictecture.md†L75-L120】
- Application orchestrator requests the initial snapshot (waiting for `sim.ready`), provides navigation, modal, and theme context, and feeds snapshots plus command callbacks down the tree.【F:docs/ui/ui_archictecture.md†L75-L120】
- Unidirectional flow ensures snapshots are read-only: render snapshot → dispatch facade intent → engine validates/applies → commit emits new snapshot and events → subscribers re-render.【F:docs/ui/ui_archictecture.md†L16-L74】
- Read models should remain lean; selectors derive subsets such as zone KPIs, device summaries, and cost aggregates for views to minimize diff surfaces.【F:docs/ui/ui_archictecture.md†L140-L180】
- Event consumption drives toasts, banners, and local updates across simulation (`sim.tickCompleted`, `sim.paused/resumed`, `sim.hotReloaded/reloadFailed`), world (`world.structureRented`, `world.roomCreated`, `world.zoneCreated`, `world.deviceInstalled`), plants (`plant.stageChanged`, `plant.harvested`, `pest.detected`, `treatment.applied`), HR/tasks (`task.created/claimed/completed`, `hr.hired/fired`, `hr.overtimeAccrued`), and finance (`finance.capex/opex`, `finance.saleCompleted`) channels.【F:docs/ui/ui_archictecture.md†L140-L200】
- Event payloads carry minimal fields + UUIDs; the UI resolves details via the latest snapshot, never from event payload alone.【F:docs/ui/ui_archictecture.md†L140-L200】
- Toast provider/context decouples producers from the UI, allowing components to emit notifications while `ToastContainer` renders them; event log component retains recent events for quick scanning.【F:docs/ui/ui-components-desciption.md†L193-L360】
- Modal controller pauses simulation state, storing `wasRunningBeforeModal` to resume after closing, which is critical for deterministic telemetry history.【F:docs/ui/ui-implementation-spec.md†L96-L152】
- **TODO:** Document loading indicators (e.g., skeletons or spinners) for initial snapshot fetch and long-running intents so teams can provide feedback during facade operations.
- **TODO:** Define error banner/toast taxonomy for validation warnings vs. hard failures emitted by facade responses to ensure consistent UX.
- **TODO:** Clarify how long historical telemetry (charts, tables) is retained in-memory and whether snapshots are down-sampled for performance.

## Accessibility & Performance

- All actionable elements must be keyboard focusable; modals trap focus and restore it on close while using `role="dialog"` and descriptive labels for icons to meet WCAG AA contrast requirements.【F:docs/ui/ui-implementation-spec.md†L360-L420】
- Avoid conveying information through color alone—pair icons or labels with status hues (e.g., lighting coverage, device states).【F:docs/ui/ui-implementation-spec.md†L240-L360】
- Toasts, notifications, and badges should provide accessible text alternatives when icon-only controls are present (e.g., header icons).【F:docs/ui/ui-implementation-spec.md†L37-L142】
- Virtualize large lists (zones, tasks, employees) and memoize selectors to limit re-render scope; throttle chart updates and downsample telemetry where necessary.【F:docs/ui/ui_archictecture.md†L140-L200】【F:docs/ui/ui_interactions_spec.md†L88-L120】
- Use responsive layouts (column collapse below 900 px, grid auto-fill) and ensure controls wrap gracefully without overlap.【F:docs/ui/ui-implementation-spec.md†L160-L220】
- Avoid optimistic UI; wait for facade ACK or events before updating to maintain deterministic order.【F:docs/ui/ui_interactions_spec.md†L120-L150】
- **TODO:** Provide keyboard shortcut inventory (e.g., for play/pause, navigation) to ensure parity with power-user expectations.
- **TODO:** Document screen-reader announcements for simulation state changes (tick progress, alerts) to confirm accessible feedback loops.
- **TODO:** Define performance budgets for charts/tables (e.g., max rows before virtualization) and specify test strategies to enforce them.

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

### Dark Theme Tokens

- Background: `bg-stone-900`.
- Text: primary `text-stone-100/200`, secondary `text-stone-400/500`.
- Panels/cards: `bg-stone-800/30` with `border-stone-700`.
- Primary accent: `bg-lime-600`, `text-lime-400`; status colors include `text-green-400`, `text-yellow-400`, `text-red-400`, `text-blue-400`, `text-cyan-400` for success/warning/danger/info states.【F:docs/ui/ui-components-desciption.md†L551-L574】
- Typography: Inter font, headings styled via Tailwind utilities (`text-3xl font-bold`, etc.) instead of default heading tags.【F:docs/ui/ui-components-desciption.md†L551-L574】
- **TODO:** Provide light-theme palette and contrast pairs once defined to support theme switching.

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
- **TODO:** Define spacing scale (e.g., multiples of 4 px) and vertical rhythm to align bespoke layouts with Tailwind utilities.
- **TODO:** Provide icon sizing guidelines (e.g., 24 px Material icons in headers, 20 px in tables) to maintain visual consistency.

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

Maintain this guide alongside facade, component, and screenshot updates: when new intents or components ship, extend the relevant interaction lists, screenshot map, and glossary so downstream teams stay aligned with the System Facade contract.【F:docs/ui/ui_archictecture.md†L1-L200】【F:docs/ui/ui-components-desciption.md†L393-L462】 Incorporate the documented gaps (type definitions, dataflow diagrams, responsive specs, error states) as they become available to retire the TODO markers highlighted in this consolidation.【F:docs/ui/ui-components-desciption.md†L614-L688】 Ensure screenshot references remain current whenever the visual system or layout patterns change to keep this guide authoritative for rebuilds.【F:docs/ui/ui-screenshot-insights.md†L1-L64】

## Open Issues

- [ ] [Guiding Principles](#guiding-principles) – Document light-theme requirements so dark/light parity can be achieved.
- [ ] [Guiding Principles](#guiding-principles) – Provide explicit handset/tablet breakpoints and responsive behavior per view.
- [ ] [Layout & Navigation](#layout--navigation) – Describe off-canvas or bottom-sheet patterns for mobile navigation and modal stacking.
- [ ] [Core Views](#core-views) – Capture Quick Start defaults (seed, structures) for the start screen CTA.
- [ ] [Core Views](#core-views) – Detail notification popover content structure, pagination, and severity indicators.
- [ ] [Core Views](#core-views) – Define default sorting/ordering rules for structure cards.
- [ ] [Core Views](#core-views) – Clarify duplicate cost breakdowns and copy-cost tooltip content.
- [ ] [Core Views](#core-views) – Outline BreedingStation UI states and data requirements distinct from grow rooms.
- [ ] [Core Views](#core-views) – Document environment highlight thresholds and warning copy for temperature, humidity, and CO₂.
- [ ] [Core Views](#core-views) – Clarify manual planting vs. Auto-Replant behavior and resulting notifications.
- [ ] [Core Views](#core-views) – Decide whether device group toggles need confirmations or immediate feedback messaging.
- [ ] [Core Views](#core-views) – Provide empty-state visuals for zones without devices, plantings, or automation plans.
- [ ] [Core Views](#core-views) – Specify tooltip content/data sources for strain, pest, and disease indicators in plant lists.
- [ ] [Core Views](#core-views) – Define treatment for negative or missing finance metrics across time ranges.
- [ ] [Core Views](#core-views) – Document currency formatting and localization strategy for finance KPIs and tables.
- [ ] [Core Views](#core-views) – Establish pagination/virtualization thresholds for personnel lists.
- [ ] [Core Views](#core-views) – Describe morale and energy scale ranges plus tooltip guidance on personnel cards.
- [ ] [Core Views](#core-views) – Determine event log retention limits and toast queue truncation strategy.
- [ ] [UI Elements & Patterns](#ui-elements--patterns) – Publish type definitions for `gameData`, `selection`, `Structure`, `Zone`, and `EventLogItem`.
- [ ] [UI Elements & Patterns](#ui-elements--patterns) – Document state management and backend integration flow (stores, Socket.IO subscriptions, API usage).
- [ ] [UI Elements & Patterns](#ui-elements--patterns) – Specify payload schemas for `onUpdate`, `onBatchAction`, `onPlantAction`, and `onNavigate` callbacks.
- [ ] [UI Elements & Patterns](#ui-elements--patterns) – Capture Tailwind token/spacing/breakpoint guidance referenced by components.
- [ ] [UI Elements & Patterns](#ui-elements--patterns) – Outline error, empty-list, network, and concurrency edge-case handling.
- [ ] [Interactions](#interactions) – Define wrap-around behavior and shortcuts for zone navigation arrows.
- [ ] [Interactions](#interactions) – Describe drag-and-drop mechanics (if any) for devices or plants versus modal-driven moves.
- [ ] [Interactions](#interactions) – Provide resize rules honoring the 0.5 m × 0.5 m grid when repositioning layout elements.
- [ ] [Interactions](#interactions) – Clarify modal stacking policy and command queuing when multiple dialogs pause/resume the sim.
- [ ] [States & Telemetry](#states--telemetry) – Add loading indicator patterns for initial snapshots and long-running intents.
- [ ] [States & Telemetry](#states--telemetry) – Define error banner/toast taxonomy for validation vs. fatal facade responses.
- [ ] [States & Telemetry](#states--telemetry) – Document telemetry retention/downsampling strategy for charts and tables.
- [ ] [Accessibility & Performance](#accessibility--performance) – Publish keyboard shortcut inventory for common controls.
- [ ] [Accessibility & Performance](#accessibility--performance) – Describe screen-reader announcements for tick updates and alerts.
- [ ] [Accessibility & Performance](#accessibility--performance) – Set performance budgets and validation tests for charts and tables.
- [ ] [Visual Guardrails](#visual-guardrails) – Provide light-theme palette and contrast pairs when theme switching is supported.
- [ ] [Visual Guardrails](#visual-guardrails) – Define spacing scale/vertical rhythm beyond Tailwind defaults for bespoke layouts.
- [ ] [Visual Guardrails](#visual-guardrails) – Establish icon sizing guidelines across headers, tables, and cards.
