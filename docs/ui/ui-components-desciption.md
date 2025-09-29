# Component Documentation

This document provides a detailed overview of every React component in the Weedbreed.AI frontend application. The components are organized by their directory structure, with explanations of their purpose, props, and key functionalities.

## Screenshot Reference Map

The following mapping links each UX screenshot in `/docs/ui/screenshots` to the components and interactions described below. Use it as a quick index when reviewing the visual design alongside the technical breakdown.

| Screenshot                                          | View context                                                             | Primary components                                                                                                                                                                                                                                                              | Interaction focus                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-welcome-screen.png`                             | Initial landing screen that introduces the simulation and entry actions. | `StartScreen` provides the New/Quick/Import game CTAs rendered while `App.tsx` is in the `startScreen` state.【F:docs/ui/ui-components-desciption.md†L393-L399】                                                                                                                | Launch points for `newGame`, `load`, and `import` flows outlined in the interaction spec.【F:docs/ui/ui_interactions_spec.md†L13-L23】             |
| `02-modal-new_game.png`                             | New game setup modal collecting company metadata and deterministic seed. | `NewGameModal` wrapped by the generic `Modal` shell with `FormInput`/`PrimaryButton` controls.【F:docs/ui/ui-components-desciption.md†L347-L353】【F:docs/ui/ui-components-desciption.md†L123-L140】【F:docs/ui/ui-components-desciption.md†L167-L178】                         | Confirms the start-of-run workflow before handing control to `facade.newGame` per the lifecycle spec.【F:docs/ui/ui_interactions_spec.md†L13-L23】 |
| `03-structure-overview.png`                         | Portfolio overview of rented structures presented as cards.              | `DashboardView` composes structure cards with inline rename/duplicate affordances via `InlineEdit` and `ActionIcons`.【F:docs/ui/ui-components-desciption.md†L483-L487】【F:docs/ui/ui-components-desciption.md†L95-L105】【F:docs/ui/ui-components-desciption.md†L150-L165】   | Supports structure rental/duplication and drill-down navigation from the macro loop.【F:docs/ui/ui_interactions_spec.md†L27-L37】                  |
| `04-personell-overview-(job-market).png`            | Personnel screen focused on external candidates.                         | `PersonnelView` in the “Job Market” tab lists `CandidateCard`s with hire actions surfaced through modal flows.【F:docs/ui/ui-components-desciption.md†L504-L509】【F:docs/ui/ui-components-desciption.md†L333-L337】                                                            | Hiring and candidate refresh intents driven by the workforce interaction flow.【F:docs/ui/ui_interactions_spec.md†L58-L61】                        |
| `05-personell-overview-(my-employees).png`          | Personnel screen showing the internal staff roster.                      | `PersonnelView` “Your Staff” tab renders `EmployeeCard`s with fire/assignment controls tied to the store actions.【F:docs/ui/ui-components-desciption.md†L504-L509】                                                                                                            | Manages firing and reassignment interactions described for workforce management.【F:docs/ui/ui_interactions_spec.md†L60-L65】                      |
| `06-finances-overview-(cards_closed).png`           | Finance dashboard with collapsed revenue/expense summaries.              | `FinanceView` stacks KPI `StatCard`s above collapsible categories controlled by chevron toggles.【F:docs/ui/ui-components-desciption.md†L490-L500】【F:docs/ui/ui-components-desciption.md†L182-L193】                                                                          | Gives at-a-glance access to CapEx/OpEx metrics from the finance overview loop.【F:docs/ui/ui_interactions_spec.md†L69-L73】                        |
| `07-finances-overview-(cards_opened).png`           | Finance dashboard with expanded detail panels.                           | `FinanceView` shows the same sections after expansion, revealing the detailed breakdowns under each card.【F:docs/ui/ui-components-desciption.md†L490-L500】                                                                                                                    | Highlights the deeper inspection step of the financial reporting flow.【F:docs/ui/ui_interactions_spec.md†L69-L73】                                |
| `08-model-game_menu.png`                            | Game-level menu summoned from the dashboard header.                      | `GameMenuModal` surfaced from the header cog presents save/load/export/reset options within the shared modal chassis.【F:docs/ui/ui-components-desciption.md†L323-L329】【F:docs/ui/ui-components-desciption.md†L167-L178】                                                     | Access point for global save/load/reset actions described in the lifecycle spec.【F:docs/ui/ui_interactions_spec.md†L18-L23】                      |
| `09-structure-detailview.png`                       | Detail page for a single structure with nested rooms/zones.              | `StructureDetailView` lists rooms leveraging `ZoneCard` summaries and inline rename/duplicate actions.【F:docs/ui/ui-components-desciption.md†L521-L525】【F:docs/ui/ui-components-desciption.md†L413-L420】                                                                    | Enables room-level CRUD/duplicate paths as part of infrastructure management.【F:docs/ui/ui_interactions_spec.md†L27-L36】                         |
| `10-room-overview-(growroom).png`                   | Room detail focusing on the grid of grow zones.                          | `RoomDetailView` renders a collection of `ZoneCard`s with inline rename/duplicate controls for each zone.【F:docs/ui/ui-components-desciption.md†L513-L517】【F:docs/ui/ui-components-desciption.md†L413-L420】                                                                 | Supports zone creation/duplication flows from the macro management loop.【F:docs/ui/ui_interactions_spec.md†L31-L36】                              |
| `11-zone-detailview-(setup-closed).png`             | Zone management view with the environment panel collapsed.               | `ZoneDetailView` layout plus the collapsed state of `EnvironmentPanel` summarizing KPIs alongside device/plant panels.【F:docs/ui/ui-components-desciption.md†L529-L533】【F:docs/ui/ui-components-desciption.md†L407-L417】【F:docs/ui/ui-components-desciption.md†L421-L429】 | Anchors monitoring of climate KPIs and device status per the cultivation micro loop.【F:docs/ui/ui_interactions_spec.md†L40-L50】                  |
| `12-zone-detailview-(setup-opened).png`             | Zone management view with environment controls expanded.                 | Expanded `EnvironmentPanel` exposes sliders/toggles while `ZoneDeviceList` remains adjacent for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L415】【F:docs/ui/ui-components-desciption.md†L421-L429】                                                        | Demonstrates runtime setpoint adjustments and device management described for zone control.【F:docs/ui/ui_interactions_spec.md†L40-L48】           |
| `13-zone-detailview-(mass-selection-activated).png` | Zone plant grid in batch-selection mode.                                 | `ZonePlantPanel` selection workflow with `BatchActionBar` for multi-plant harvest/trash/treat operations.【F:docs/ui/ui-components-desciption.md†L451-L462】                                                                                                                    | Executes batch cultivation actions and automation toggles outlined in the zone interaction spec.【F:docs/ui/ui_interactions_spec.md†L45-L54】      |

---

## Simulation Facade Intent Coverage

The backend façade groups all write operations behind intent domains (`time`, `world`, `devices`, `plants`, `health`, `workforce`, `finance`) plus configuration helpers such as zone setpoints.【F:src/backend/src/facade/index.ts†L1134-L1385】【F:src/backend/src/facade/index.ts†L856-L901】 The tables below list which UI elements currently dispatch those intents and highlight the commands that have not been wired up yet.

### Time & Loop Control

- `time.start`, `time.pause`, `time.step`, `time.setSpeed`: dispatched through the dashboard control bar (`DashboardControls`) which wires Play/Pause/Step/Fast Forward buttons in `App.tsx` to `useGameStore.issueControlCommand`, ultimately emitting `simulationControl` commands handled by the façade’s time registry.【F:src/backend/src/facade/index.ts†L1134-L1165】【F:src/frontend/src/App.tsx†L208-L217】【F:src/frontend/src/App.tsx†L526-L548】【F:src/frontend/src/store/gameStore.ts†L148-L163】
- `time.setTickLength`: triggered when the tick-length slider changes; `useGameStore.requestTickLength` forwards the update via the socket to `SimulationFacade.setTickLength`, which rebuilds the scheduler with the new interval.【F:src/backend/src/facade/index.ts†L856-L899】【F:src/frontend/src/App.tsx†L535-L545】【F:src/frontend/src/store/gameStore.ts†L157-L163】
- `time.resume`: emitted automatically when modal flows request a resume (e.g., after closing auto-paused dialogs) via the same control channel; there is no dedicated UI button, but the façade command exists for completeness.【F:src/backend/src/facade/index.ts†L1134-L1146】

### Environment Configuration

- `config.setSetpoint` (`SimulationFacade.setZoneSetpoint`): the zone detail view exposes temperature, humidity, CO₂, PPFD, and VPD sliders. Interactions call `useZoneStore.sendSetpoint`, which routes to the façade and emits `env.setpointUpdated` events for the UI timeline.【F:src/backend/src/facade/index.ts†L904-L1068】【F:src/frontend/src/views/ZoneDetail.tsx†L321-L370】【F:src/frontend/src/store/zoneStore.ts†L240-L247】

### World Domain (Structures, Rooms, Zones)

- Active flows: rent/create/duplicate/delete/rename actions (`world.rentStructure`, `world.createRoom`, `world.createZone`, `world.duplicateStructure`, `world.duplicateRoom`, `world.duplicateZone`, `world.renameStructure`, `world.updateRoom`, `world.updateZone`, `world.deleteStructure`, `world.deleteRoom`, `world.deleteZone`) are surfaced through `ModalHost` dialogs. Each modal now invokes the matching `useZoneStore` intent helper which emits the façade command so the backend processes geometry, costing, and duplication rules deterministically, and the regression suite drives these flows through `ModalHost.test.tsx` to assert both the dispatched intent and modal teardown.【F:src/backend/src/facade/index.ts†L1168-L1233】【F:src/frontend/src/components/ModalHost.tsx†L157-L318】【F:src/frontend/src/store/zoneStore.ts†L240-L338】【F:src/frontend/src/components/ModalHost.test.tsx†L80-L262】

- `CreateRoomModal`, `CreateZoneModal`, `RentStructureModal`, and `DuplicateStructureModal` dispatch `useZoneStore.createRoom`, `useZoneStore.createZone`, `useZoneStore.rentStructure`, and `useZoneStore.duplicateStructure` respectively, wiring the previously inert forms to façade intents.【F:src/frontend/src/views/world/modals/CreateRoomModal.tsx†L9-L114】【F:src/frontend/src/views/world/modals/CreateZoneModal.tsx†L9-L132】【F:src/frontend/src/views/world/modals/RentStructureModal.tsx†L1-L71】【F:src/frontend/src/views/world/modals/DuplicateStructureModal.tsx†L1-L108】

### Device Domain

- Active flow: the “Device automation” panel toggles device groups via `devices.toggleDeviceGroup`, using the zone store dispatcher that sends façade intents for each switch interaction.【F:src/backend/src/facade/index.ts†L1236-L1266】【F:src/frontend/src/views/ZoneDetail.tsx†L964-L1014】【F:src/frontend/src/store/zoneStore.ts†L385-L393】
- New UI: the “Device inventory” panel now surfaces install/update/move/remove lifecycle commands. The Install/Update/Move actions open dedicated modals that collect blueprint IDs, JSON settings patches, or destination zones before dispatching `devices.installDevice`, `devices.updateDevice`, and `devices.moveDevice`. Remove uses the shared confirmation modal to emit `devices.removeDevice`. All flows reuse `ModalHost` wiring and new zone-store helpers so façade intents fire deterministically from a single place.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】【F:src/backend/src/facade/index.ts†L1236-L1266】

### Plant Domain

- Active flows: irrigation, fertilizer dosing, harvest (single and batch), and planting-plan toggles map to `plants.applyIrrigation`, `plants.applyFertilizer`, `plants.harvestPlanting`, and `plants.togglePlantingPlan`, all triggered from the zone detail actions drawer.【F:src/backend/src/facade/index.ts†L1269-L1304】【F:src/frontend/src/views/ZoneDetail.tsx†L321-L352】【F:src/frontend/src/store/zoneStore.ts†L356-L419】
- Not yet wired: `plants.addPlanting` and `plants.cullPlanting` have façade handlers but are not surfaced in the UI yet.【F:src/backend/src/facade/index.ts†L1269-L1304】【F:src/frontend/src/store/zoneStore.ts†L356-L419】

### Health Domain

- The façade exposes scouting, treatment, and quarantine commands, but no current component or store dispatches `domain: 'health'` intents, so these flows remain backend-only placeholders.【F:src/backend/src/facade/index.ts†L1307-L1325】【F:src/frontend/src/store/zoneStore.ts†L240-L420】

### Workforce Domain

- Active flows: hire/fire/refresh candidate operations map to `workforce.hire`, `workforce.fire`, and `workforce.refreshCandidates`. The personnel store sends these intents, and the personnel view exposes the corresponding UI (Hire/Fire modals and refresh button).【F:src/backend/src/facade/index.ts†L1327-L1365】【F:src/frontend/src/store/personnelStore.ts†L40-L90】【F:src/frontend/src/views/PersonnelView.tsx†L123-L304】【F:src/frontend/src/components/ModalHost.tsx†L120-L156】
- Not yet wired: overtime policy, structure assignment, and task queueing (`workforce.setOvertimePolicy`, `workforce.assignStructure`, `workforce.enqueueTask`) have façade hooks but no front-end dispatchers yet.【F:src/backend/src/facade/index.ts†L1327-L1365】【F:src/frontend/src/store/personnelStore.ts†L40-L97】

### Finance Domain

- The façade supports selling inventory and adjusting utility or maintenance pricing, but the finance view is read-only today—no store issues `domain: 'finance'` intents, so these commands remain unused by the UI.【F:src/backend/src/facade/index.ts†L1367-L1385】【F:src/frontend/src/views/FinancesView.tsx†L1-L186】【F:src/frontend/src/store/zoneStore.ts†L240-L420】

---

## 1. Top-Level Components

### `src/App.tsx`

- **Purpose:** The main entry point and root component of the application. It acts as the central state manager and orchestrator for the entire UI.
- **Detailed Functionality:**
  - **Game State Machine:** Manages the overall application flow through the `gameState` state (`'loading'`, `'startScreen'`, `'playing'`, `'error'`). It begins by fetching all necessary blueprint data (showing a loading screen), then transitions to the `StartScreen`. Once the user initiates a game, it moves to the `'playing'` state, rendering the main simulation interface.
  - **Central State Hub:** `App.tsx` is the single source of truth for the application's dynamic data. It holds the `gameData` object (the entire simulation state), the `selection` object (which dictates what the user is currently viewing), and the `modal` state (which controls pop-up dialogs).
  - **Action Dispatcher:** All user actions that modify the game state are handled by `handle...` functions within this component (e.g., `handleCreateRoom`, `handleHireEmployee`). These functions receive events from child components, compute the new state immutably (by creating deep copies and modifying them), and then update the `gameData` using `setGameData`. This ensures a predictable, top-down data flow.
  - **Modal Orchestration:** A central `modalContent` function acts as a router or switch. It reads the `modal.type` from the state and renders the corresponding modal component (e.g., `NewGameModal`, `AddRoomModal`), passing in all the necessary props and callbacks. This keeps all modal-related logic centralized and prevents individual components from needing to manage their own visibility.
- **Props:** None.
- **Icons Used:** None directly.
- **Dependencies:** `ToastProvider`, `DashboardHeader`, `Sidebar`, `MainContent`, `EventLog`, `Modal`, `StartScreen`, and all modal components.
- **Usage Context:** Rendered once by `index.tsx` to mount the entire application to the DOM. It wraps the core application logic in a `ToastProvider` for global notifications.

---

## 2. Common Components (`src/components/common/`)

These are generic, reusable components used throughout the application.

### `ActionIcons.tsx`

- **Purpose:** A small component that groups common action icons (Duplicate, Delete) together for consistent placement and styling.
- **Props:**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `onDuplicate` | `(event: React.MouseEvent) => void` | Yes | Callback function for the duplicate button click. |
  | `onDelete` | `(event: React.MouseEvent) => void` | Yes | Callback function for the delete button click. |
  | `className` | `string` | No | Optional classes for custom styling. |
- **Icons Used:** `DuplicateIcon`, `DeleteIcon`.
- **Dependencies:** `DuplicateIcon`, `DeleteIcon`.
- **Usage Context:** Used in detail views (`StructureDetailView`, `RoomDetailView`, `ZoneDetailView`) and cards (`ZoneCard`) to provide consistent action buttons.

### `Breadcrumbs.tsx`

- **Purpose:** Displays the current navigation path (e.g., Structures > Warehouse 1 > Room A) and allows users to navigate back to parent levels.
- **Functionality:** The component dynamically generates a series of buttons from the `path` prop. Clicking any part of the path calls the `onNavigate` function with the appropriate parameters to update the global `selection` state, causing the `MainContent` to render the corresponding view.
- **Props:**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `path` | `BreadcrumbItem[]` | Yes | An array of objects representing the navigation hierarchy. |
  | `onNavigate` | `(...) => void` | Yes | Callback function to handle navigation when a breadcrumb link is clicked. |
- **Icons Used:** `ChevronRightIcon`.
- **Dependencies:** `ChevronRightIcon`.
- **Usage Context:** Used in `MainContent.tsx` to show the user's current location within the game's structural hierarchy.

### `Buttons.tsx`

- **Purpose:** Provides standardized, pre-styled button components to ensure UI consistency.
- **Components:**
  - `PrimaryButton`: An evergreen-toned button (`bg-primary` / `bg-primary-strong`) for primary, positive actions (e.g., "Create", "Submit", "Confirm"). Includes a disabled state that keeps the moss palette consistent with the rest of the theme.【F:src/frontend/src/components/primitives/Button.tsx†L9-L33】
  - `DangerButton`: A red button for destructive actions (e.g., "Delete", "Fire").
- **Props:** Standard HTML button attributes.
- **Icons Used:** None.
- **Dependencies:** None.
- **Usage Context:** Used in forms and modals across the application.

### `Form.tsx`

- **Purpose:** Provides standardized, pre-styled form elements to ensure a consistent look and feel for all user input fields.
- **Components:**
  - `FormInput`: A labeled text, number, or password input field.
  - `FormSelect`: A labeled dropdown/select field.
  - `FormCheckbox`: A labeled checkbox.
- **Props:** Standard HTML input/select attributes, plus a `label` prop.
- **Icons Used:** None.
- **Dependencies:** None.
- **Usage Context:** Used extensively in all modals that require user input.

### `Icons.tsx`

- **Purpose:** A central repository for all Google Material Icons used in the app, wrapped as React components. This ensures consistency, simplifies usage, and allows for easy swapping of icons in the future.
- **Props:** Some icons accept an optional `className` for custom styling (e.g., changing size or color).
- **Icons Used:** This is the definition file; it does not use other icons.
- **Dependencies:** None.
- **Usage Context:** Icons are imported from this file and used in virtually every other component.

### `InlineEdit.tsx`

- **Purpose:** A component that displays text, but transforms into an input field when clicked, allowing for in-place editing.
- **Functionality:**
  - It starts as a simple `<span>`. On click, it switches its state to `isEditing` and renders an `<input>` field, automatically focusing it.
  - When the user presses "Enter" or the input field loses focus (onBlur), the `onSave` callback is triggered with the new value.
  - If the user presses "Escape", the edit is cancelled, and the value reverts to the original.
- **Props:**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `value` | `string` | Yes | The initial text value to display and edit. |
  | `onSave` | `(newValue: string) => void` | Yes | Callback function triggered when editing is complete. |
  | `className` | `string` | No | Optional classes to style the text/input. |
- **Icons Used:** None.
- **Dependencies:** None.
- **Usage Context:** Used for renaming structures, rooms, and zones in their respective detail views without needing a separate modal.

### `Modal.tsx`

- **Purpose:** A generic modal component that provides a styled container, a title bar with a close button, and a content area. It handles the outer shell and overlay, while the specific content is passed in as children.
- **Props:**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `title` | `string` | Yes | The title displayed in the modal's header. |
  | `children` | `React.ReactNode` | Yes | The content to be rendered inside the modal. |
  | `onClose` | `() => void` | Yes | Callback function for the close button. |
- **Icons Used:** `XIcon`.
- **Dependencies:** `XIcon`.
- **Usage Context:** The main `App.tsx` component uses this to wrap the content of whatever modal is currently active.

### `StatCard.tsx`

- **Purpose:** A small, reusable card for displaying a key statistic with an icon, title, value, and unit.
- **Props:**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `icon` | `React.ReactNode` | Yes | The icon to display. |
  | `title` | `string` | Yes | The label for the statistic. |
  | `value` | `string` | Yes | The value of the statistic. |
  | `unit` | `string` | No | The unit for the value (e.g., "€", "m²"). |
  | `color` | `string` | Yes | The Tailwind color class for the icon (e.g., 'green', 'cyan'). |
- **Icons Used:** Receives an icon via props; does not use any specific icons itself.
- **Dependencies:** None.
- **Usage Context:** Used in the `DashboardHeader` and `FinanceView` to display key performance indicators.

### `Toast.tsx`

- **Purpose:** Provides the visual components for the notification system.
- **Functionality:** The `ToastContainer` positions itself in the top-right corner of the screen and renders a list of active `Toast` components from the `ToastContext`. Each `Toast` has an entry animation controlled by Tailwind classes and can be dismissed manually or, for non-error types, automatically after a timeout.
- **Components:**
  - `Toast`: A single toast notification with an icon, message, and close button, styled by its type (success, error, etc.).
  - `ToastContainer`: A container that positions and renders all active toasts on the screen.
- **Props (`Toast`):**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `message` | `string` | Yes | The notification message. |
  | `type` | `'success' \| 'error' \| ...` | Yes | The type of toast, which determines its style. |
  | `onClose` | `() => void` | Yes | Callback to close the toast. |
- **Icons Used:**
  - `XIcon`
  - `CheckIcon`
  - Direct Material Icons: `error`, `warning`, `info`.
- **Dependencies:** `useToast` (context hook), `XIcon`, `CheckIcon`.
- **Usage Context:** `ToastContainer` is rendered once in `App.tsx`. Toasts are added via the `useToast` hook from anywhere in the app.

---

## 3. Layout Components (`src/components/layout/`)

These components define the main structure and layout of the application interface.

### `DashboardHeader.tsx`

- **Purpose:** The main header bar at the top of the application. It contains game controls (play/pause, speed), primary navigation links (Structures, Personnel, Finance), key global stats, and a button to open the game menu.
- **Functionality:** The play/pause and speed controls directly manipulate the game loop state in `App.tsx`. The navigation buttons call `onNavigate` to change the `selection` state, which updates the `MainContent` view. The stats are passed in and displayed in `StatCard` components.
- **Props:** A large number of props for stats, game state, and event handlers.
- **Icons Used:**
  - `ClockIcon`
  - `DollarIcon`
  - `PauseIcon`
  - `PlayIcon`
  - `HomeIcon`
  - `BadgeIcon`
  - `CogIcon`
  - Direct Material Icons: `paid`.
- **Dependencies:** `StatCard`, various `Icon` components.
- **Usage Context:** Rendered in `App.tsx` as the persistent header for the 'playing' state.

### `EventLog.tsx`

- **Purpose:** The footer component that displays a log of recent in-game events, color-coded by type (info, success, warning, danger).
- **Props:**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `events` | `EventLogItem[]` | Yes | An array of event objects to display. |
- **Icons Used:** None.
- **Dependencies:** None.
- **Usage Context:** Rendered in `App.tsx` as the persistent footer for the 'playing' state.

### `MainContent.tsx`

- **Purpose:** Acts as a content router for the main area of the UI. It determines which view to display based on the global `selection` state and renders the appropriate `Breadcrumbs`.
- **Functionality:** It inspects the `selection` object (`view`, `structureId`, `roomId`, `zoneId`). Based on these values, it conditionally renders the correct detailed view (e.g., `DashboardView` if no IDs are selected, `ZoneDetailView` if a `zoneId` is present). It passes all necessary data and callbacks down to the currently active view. This component is the critical link between the navigation state (`selection`) and the actual content presented to the user.
- **Props:** A large number of props for game state, selection state, and event handlers to pass down to the active view.
- **Icons Used:** None directly.
- **Dependencies:** `Breadcrumbs`, all `View` components.
- **Usage Context:** Rendered in `App.tsx` to control the central panel of the UI.

### `Sidebar.tsx`

- **Purpose:** The left-hand sidebar that displays the rooms and zones of the currently selected structure, allowing for hierarchical navigation.
- **Functionality:** Its content is conditional. If no structure is selected in the global state (`selection.structureId` is null), it displays a prompt. If a structure is selected, it maps over that structure's rooms and zones to create a nested list of navigation links. Clicking on any of these links triggers the `onNavigate` callback, which updates the global `selection` state in `App.tsx`. This, in turn, causes the `MainContent` to show the corresponding detail view.
- **Props:**
  | Prop | Type | Required | Description |
  |---|---|---|---|
  | `structures` | `Structure[]` | Yes | The list of all structures in the game. |
  | `selection` | `Selection` | Yes | The current UI selection state. |
  | `onNavigate` | `(...) => void` | Yes | Callback for navigation clicks. |
  | `onOpenModal` | `(...) => void` | Yes | Callback to open modals (e.g., "Add Room"). |
- **Icons Used:** `ChevronDownIcon`, `PlusIcon`.
- **Dependencies:** `ChevronDownIcon`, `PlusIcon`.
- **Usage Context:** Rendered in `App.tsx` as the persistent sidebar for the 'playing' state.

---

## 4. Modal Components (`src/components/modals/`)

These components define the content for various modals used for user input and information display.

### `PlantZoneModal` (`ModalHost`)

- **Purpose:** Gathers strain and count for a zone planting, loads the strain catalog via the facade, and surfaces cultivation-method capacity and affinity hints before dispatching `plants.addPlanting`.
- **State:** Manages async catalog loading, selection state, capacity feedback, and warning surfaces from the command response.
- **Usage Context:** Triggered from the zone detail "Plant zone" CTA; modal pausing handled by `ModalHost` ensures safe execution.【F:src/frontend/src/views/ZoneView.tsx†L380-L398】【F:src/frontend/src/components/modals/ModalHost.tsx†L104-L323】【F:src/frontend/src/components/modals/**tests**/PlantAndDeviceModals.test.tsx†L64-L103】

### `InstallDeviceModal` (`ModalHost`)

- **Purpose:** Presents the device catalog with coverage/compatibility hints, allows JSON overrides for settings, and submits `devices.installDevice` while relaying facade warnings back to the user.
- **State:** Tracks catalog loading, editable JSON text, parse errors, and facade warnings so the modal only closes on clean installs.
- **Usage Context:** Invoked from the zone detail "Install device" CTA; complements device list empty states and hooks into the shared modal pause/resume workflow.【F:src/frontend/src/views/ZoneView.tsx†L286-L305】【F:src/frontend/src/components/modals/ModalHost.tsx†L325-L470】【F:src/frontend/src/components/modals/**tests**/PlantAndDeviceModals.test.tsx†L104-L149】

### `CreateRoomModal.tsx`

- **Purpose:** Collects a room name, purpose, footprint area, and height before dispatching `world.createRoom`. Geometry limits are enforced in the UI and the sanitized payload is sent via `useZoneStore.createRoom` on submit.【F:src/frontend/src/views/world/modals/CreateRoomModal.tsx†L9-L114】【F:src/frontend/src/components/ModalHost.tsx†L175-L197】
- **Props:** `structure`, `existingRooms`, `onSubmit`, `onCancel`, `title?`, `description?`.
- **Usage Context:** Shown when the user adds a room from structure-level actions; the modal pauses the sim (via `ModalHost`) and resumes after the command is dispatched. Regression coverage exercises the default confirm path via `ModalHost.test.tsx` to ensure the zone store receives the create-room intent and the dialog closes.【F:src/frontend/src/components/ModalHost.test.tsx†L103-L142】

### `CreateZoneModal.tsx`

- **Purpose:** Allocates footprint within a room, selects a cultivation method, and relays the intent to `world.createZone` with the trimmed name, method UUID, and optional plant count.【F:src/frontend/src/views/world/modals/CreateZoneModal.tsx†L9-L145】【F:src/frontend/src/components/ModalHost.tsx†L198-L222】
- **Props:** `room`, `existingZones`, `availableMethods?`, `onSubmit`, `onCancel`, `title?`, `description?`.
- **Usage Context:** Launched from room-level actions when expanding a grow area. The ModalHost regression test submits the default form state to verify the `createZone` intent wiring and modal dismissal.【F:src/frontend/src/components/ModalHost.test.tsx†L144-L184】

### `RentStructureModal.tsx`

- **Purpose:** Confirms structure rental and provides a summary of footprint, rooms/zones, and rent per tick before emitting `world.rentStructure` through `useZoneStore`.
- **Props:** `structure`, `rooms?`, `zones?`, `onConfirm`, `onCancel`, `title?`, `description?`.
- **Usage Context:** Triggered from structure catalog cards; the confirm button sends the rent intent and closes the modal once acknowledged. Automated coverage in `ModalHost.test.tsx` clicks the confirm action to assert the rent intent and modal teardown paths.【F:src/frontend/src/views/world/modals/RentStructureModal.tsx†L1-L71】【F:src/frontend/src/components/ModalHost.tsx†L223-L246】【F:src/frontend/src/components/ModalHost.test.tsx†L186-L218】

### `DuplicateStructureModal.tsx`

- **Purpose:** Allows renaming and reviewing totals (rooms, zones, area, device count) before cloning a structure via `world.duplicateStructure`.
- **Props:** `structure`, `rooms`, `zones`, `onConfirm`, `onCancel`, `title?`, `description?`.
- **Usage Context:** Available from structure actions; after submission the façade handles geometry/cost validation while the UI awaits confirmation. The ModalHost regression suite submits the dialog with its default copy name to prove the duplicate-structure intent is dispatched and the modal closes.【F:src/frontend/src/views/world/modals/DuplicateStructureModal.tsx†L1-L108】【F:src/frontend/src/components/ModalHost.tsx†L247-L270】【F:src/frontend/src/components/ModalHost.test.tsx†L220-L262】

### `DuplicateRoomModal.tsx`

- **Purpose:** Mirrors an existing room, summarising footprint consumption, zones, devices, and estimated CapEx before issuing `world.duplicateRoom`.
- **Props:** `room`, `structure`, `zones`, `availableArea`, `deviceCount`, `estimatedDeviceCapex?`, `onConfirm`, `onCancel`, `title?`, `description?`.
- **Usage Context:** Appears from room action menus; the confirm action triggers the façade intent through `useZoneStore.duplicateRoom` and closes the dialog.【F:src/frontend/src/views/world/modals/DuplicateRoomModal.tsx†L1-L112】【F:src/frontend/src/components/ModalHost.tsx†L205-L221】

### `DuplicateZoneModal.tsx`

- **Purpose:** Clones a zone with optional device/method copying options before calling `world.duplicateZone`.
- **Props:** `zone`, `room`, `availableArea`, `deviceCount`, `onConfirm`, `onCancel`, `title?`, `description?`.
- **Usage Context:** Accessed via zone-level duplicate actions; the modal relays the selected options through `useZoneStore.duplicateZone` on confirm.【F:src/frontend/src/views/world/modals/DuplicateZoneModal.tsx†L1-L113】【F:src/frontend/src/components/ModalHost.tsx†L222-L245】

### `GameMenuModal.tsx`

- **Purpose:** Displays a list of game-level actions like Save, Load, and Reset. (Currently placeholder functionality).
- **Props:** None.
- **Icons Used:** None.
- **Dependencies:** None.
- **Usage Context:** Displayed when the user clicks the settings (cog) icon in the `DashboardHeader`.

### `HireEmployeeModal.tsx`

- **Purpose:** A form for hiring a candidate and assigning them to a structure via a dropdown menu.
- **Props:** `onSubmit`, `candidate`, `structures`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormSelect`, `PrimaryButton`.
- **Usage Context:** Displayed when the user clicks "Hire" on a `CandidateCard` in the `PersonnelView`.

### `InfoModal.tsx`

- **Purpose:** Displays detailed information about a specific pest or disease, sourced from its blueprint file. It shows symptoms and categorized control options to help the player make informed decisions.
- **Props:** `blueprint`.
- **Icons Used:** None.
- **Dependencies:** None.
- **Usage Context:** Displayed when a user clicks on a pest or disease icon on a `Plant` card.

### `NewGameModal.tsx`

- **Purpose:** A form that appears when starting a new game, allowing the player to set their company name, CEO name, and a deterministic game seed.
- **Props:** `onSubmit`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormInput`, `PrimaryButton`.
- **Usage Context:** Displayed when the "New Game" button is clicked on the `StartScreen`.

### `PlantDetailModal.tsx`

- **Purpose:** Displays detailed stats for a single plant (health, progress, status) and provides actions to harvest or trash it. The harvest button is disabled if the plant is not yet harvestable.
- **Props:** `plant`, `onHarvest`, `onTrash`.
- **Icons Used:** `CutIcon`, `TrashIcon`.
- **Dependencies:** `CutIcon`, `TrashIcon`.
- **Usage Context:** Displayed when a user clicks on a plant card in the `ZonePlantPanel` (when not in selection mode).

### Device removal confirmation

- **Purpose:** Device removal reuses `ConfirmDeletionModal`, injecting device-specific copy before emitting `devices.removeDevice` so the facade handles bookkeeping.【F:src/frontend/src/components/modals/ModalHost.tsx†L1356-L1371】
- **Usage Context:** Available from the “Remove” button in the device inventory panel; once confirmed the zone snapshot updates after the façade acknowledges the command.【F:src/frontend/src/components/modals/ModalHost.tsx†L1356-L1371】

### `RentStructureModal.tsx`

- **Purpose:** A form for renting a new structure (e.g., warehouse). The dropdown of available structures disables options the player cannot afford.
- **Props:** `onSubmit`, `availableStructures`, `balance`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormInput`, `FormSelect`, `PrimaryButton`.
- **Usage Context:** Displayed when the "Rent New Structure" button is clicked on the `DashboardView`.

---

## 5. Screen Components (`src/components/screens/`)

These components represent full-screen states of the application, like the initial start screen.

### `StartScreen.tsx`

- **Purpose:** The initial screen the user sees after the app loads. It provides the main entry points into the game: "New Game", "Quick Start", and "Import Game".
- **Props:** `onNewGame`, `onQuickStart`, `onImportGame`.
- **Icons Used:** `AddCircleOutlineIcon`, `ForwardIcon`, `UploadIcon`.
- **Dependencies:** `AddCircleOutlineIcon`, `ForwardIcon`, `UploadIcon`.
- **Usage Context:** Rendered by `App.tsx` when the `gameState` is 'startScreen'.

---

## 6. Simulation Components (`src/components/simulation/`)

These are complex components directly related to displaying and interacting with the core simulation elements.

### `EnvironmentPanel.tsx`

- **Purpose:** A detailed panel for viewing and adjusting the environmental controls of a zone. It has two states to balance information density with control availability.
- **Detailed Functionality:**
  - **Collapsed State:** By default, the panel is collapsed and acts as a high-level KPI summary. It displays the most critical environmental metrics (Temperature, Humidity, VPD, CO₂, PPFD, and Light Cycle) with color-coded status indicators (e.g., green for optimal, yellow for warning) for a quick at-a-glance assessment of the zone's health. Clicking anywhere on this summary bar expands the panel.
  - **Expanded State:** When expanded, the panel reveals a detailed control interface.
    - **Range Inputs:** Users can adjust `Temperature`, `Relative Humidity`, `VPD`, `CO₂`, and `PPFD` using interactive range sliders. Slider values mirror the current setpoints and update as `env.setpointUpdated` events arrive from the simulation facade so remote changes remain in sync.
    - **Lighting Controls:** A dedicated section allows toggling the entire light system on/off (`PowerIcon`). Turning the lights off sends a PPFD target of zero while preserving the previous non-zero target for a quick restore. The panel reads the current light cycle from telemetry for context.
    - **Device Dependency:** Controls are automatically disabled (grayed out) if the required device (e.g., an HVAC unit for temperature control) is not installed in the zone, providing clear feedback to the user about equipment limitations. This is a key feature that connects the simulation's inventory (`zone.devices`) directly to the UI's capabilities.
    - **Warnings:** Facade warnings (for example, clamp notifications) are surfaced inline beneath the controls so operators can react immediately when a target is adjusted beyond safe bounds.
    - **Additional KPIs:** Displays secondary metrics like Vapor Pressure Deficit (VPD) that are derived from the primary environmental values.
- **Props:** `zone`, `setpoints`, `bridge`.
- **Icons Used:**
  - `ThermometerIcon`
  - `DropletIcon`
  - `SunIcon`
  - `WindIcon`
  - `PowerIcon`
  - `LightCycleIcon`
  - `NightlightIcon`
  - `WbSunnyIcon`
  - `ChevronRightIcon`
  - `ChevronDownIcon`
  - Direct Material Icons: `science`.
- **Dependencies:** Various `Icon` components.
- **Usage Context:** A key part of the `ZoneDetailView`.

### `ZoneCard.tsx`

- **Purpose:** A compact card representing a single zone. Used in list views to provide a summary and quick access to details or actions.
- **Functionality:** Displays the zone's name, strain, phase, and a progress bar for plant growth. The main body is clickable to navigate to the `ZoneDetailView`. It also includes `ActionIcons` for quick duplication or deletion.
- **Props:** `zone`, `onClick`, `onOpenModal`.
- **Icons Used:** Relies on `ActionIcons` for its icons.
- **Dependencies:** `ActionIcons`.
- **Usage Context:** Used in `RoomDetailView` and `StructureDetailView` to list zones.

### `ZoneDeviceList.tsx`

- **Purpose:** Displays a list of all devices installed in a specific zone, grouped by type, and surfaces lifecycle actions.
- **Functionality:** It aggregates devices by name (e.g., "Sunstream Pro LED x3") for a clean display. From here operators can launch the install, update, move, and removal modals described above via the inline action buttons rendered by `ZoneDetailView`’s device inventory panel.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】
- **Props:** `devices`, `onOpenModal`, `zoneId`.
- **Icons Used:** `DeleteIcon`.
- **Dependencies:** `DeleteIcon`.
- **Usage Context:** A key part of the `ZoneDetailView`.

### `ZonePlantPanel.tsx`

- **Purpose:** A large, interactive panel that displays all the plants in a zone as a grid. It has two primary interaction modes to handle both individual and batch operations efficiently.
- **Detailed Functionality:**
  - **Normal Mode (Default):**
    - **Inspection:** Hovering over a plant card shows a tooltip with its basic stats. Clicking the card opens the detailed `PlantDetailModal` for a full overview and specific actions.
    - **Direct Actions:** Clicking on a status icon on the plant card triggers a direct action, bypassing the detail modal. Clicking a pest or disease icon opens the `InfoModal` with blueprint data. Clicking the harvest icon immediately harvests the plant. This provides a fast workflow for common tasks.
  - **Selection Mode:**
    - **Activation:** The user clicks the "Select Plants" button to enter this mode. The button then changes to "Cancel Selection".
    - **Interaction:** In this mode, clicking a plant toggles its selection state, indicated by a visual highlight (a green border and overlay).
    - **Batch Actions:** A `BatchActionBar` appears at the top, showing the number of selected plants. This bar has buttons for "Harvest", "Trash", and "Treat". Clicking one of these buttons applies the action to _all_ selected plants, sends the batch action to the `App` component's state handler, and then automatically exits selection mode. This is designed for efficient management of large numbers of plants.
- **Props:** `zone`, `onOpenModal`, `onBatchAction`, `onPlantAction`.
- **Icons Used:**
  - `ChevronDownIcon`
  - `ChevronRightIcon`
  - `BugIcon`
  - `SickIcon`
  - `HealingIcon`
  - `CheckIcon`
  - `CutIcon`
  - Direct Material Icons: `grass`.
- **Dependencies:** `FormSelect`, various `Icon` components.
- **Usage Context:** A key part of the `ZoneDetailView`.

---

## 7. View Components (`src/components/views/`)

These components represent the main content for each primary section of the application.

### `DashboardView.tsx`

- **Purpose:** The main dashboard screen, showing an overview of all player-owned structures as a series of cards.
- **Props:** `structures`, `onNavigate`, `onOpenModal`, `onRename`.
- **Icons Used:** `StoreIcon`.
- **Dependencies:** `InlineEdit`, `StoreIcon`.
- **Usage Context:** The default view when the game starts.

### `FinanceView.tsx`

- **Purpose:** Displays a detailed financial overview.
- **Functionality:** Features several `StatCard` components for high-level numbers. The main content consists of collapsible cards for Revenue, OpEx, and CapEx. The user can select a time range (1D, 1W, 1M, 1Y) which dynamically recalculates and displays the financial data for that period.
- **Props:** `gameData`.
- **Icons Used:**
  - `DollarIcon`
  - `ChevronDownIcon`
  - `ChevronRightIcon`
  - Direct Material Icons: `trending_up`, `receipt_long`, `account_balance`.
- **Dependencies:** `StatCard`, various `Icon` components.
- **Usage Context:** Shown when the user navigates to the "Finance" section.

### `PersonnelView.tsx`

- **Purpose:** The personnel management screen.
- **Functionality:** Uses a tabbed interface to switch between the "Job Market" (a grid of `CandidateCard`s for hiring) and "Your Staff" (a grid of `EmployeeCard`s for managing current staff). Provides buttons to refresh candidates and fire employees.
- **Props:** `gameData`, `onOpenModal`, `onRefreshCandidates`, `onFireEmployee`.
- **Icons Used:** `DeleteIcon`.
- **Dependencies:** `DeleteIcon`.
- **Usage Context:** Shown when the user navigates to the "Personnel" section.

### `RoomDetailView.tsx`

- **Purpose:** Displays the details of a single room, primarily by listing all the zones within it as a grid of `ZoneCard`s.
- **Props:** `room`, `structure`, `onNavigate`, `onRename`, `onOpenModal`.
- **Icons Used:** Relies on `ActionIcons` for its icons.
- **Dependencies:** `InlineEdit`, `ActionIcons`, `ZoneCard`.
- **Usage Context:** Shown when a user navigates to a specific room.

### `StructureDetailView.tsx`

- **Purpose:** Provides a detailed overview of a single structure, listing all of its rooms. For grow rooms, it also shows a nested list of `ZoneCard`s.
- **Props:** `structure`, `onNavigate`, `onOpenModal`, `onRename`.
- **Icons Used:** `GroupIcon`. Relies on `ZoneCard` and `ActionIcons` for other icons.
- **Dependencies:** `InlineEdit`, `ZoneCard`, `ActionIcons`, `GroupIcon`.
- **Usage Context:** Shown when a user selects a structure from the main dashboard.

### `ZoneDetailView.tsx`

- **Purpose:** The most detailed view in the simulation. It composes the `EnvironmentPanel`, `ZonePlantPanel`, and `ZoneDeviceList` to provide a complete interface for managing a single grow zone.
- **Props:** `zone`, `onControlsChange`, `onOpenModal`, `onRename`, `onBatchAction`, `onPlantAction`.
- **Icons Used:** Relies on its child components (`ActionIcons`, `EnvironmentPanel`, `ZonePlantPanel`, `ZoneDeviceList`) for all icons.
- **Dependencies:** `InlineEdit`, `ActionIcons`, `EnvironmentPanel`, `ZonePlantPanel`, `ZoneDeviceList`.
- **Usage Context:** Shown when a user navigates to a specific zone.
- **Device lifecycle controls:** The device inventory panel now features an “Install device” CTA plus inline buttons for adjusting settings, relocating hardware to another zone, or removing a unit. Each action opens a modal (`InstallDeviceModal`, `UpdateDeviceModal`, `MoveDeviceModal`, or the shared confirmation dialog) and delegates to the new zone-store helpers so façade intents fire in order.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】

---

## 8. Contexts (`src/contexts/`)

### `ToastContext.tsx`

- **Purpose:** Provides a global state management solution for toast notifications using React Context, decoupling the notification-triggering logic from the presentation component.
- **Components:**
  - `ToastProvider`: The provider component that should wrap the entire application to make the toast context available.
- **Hooks:**
  - `useToast`: A custom hook that allows any component to access the `addToast` function. Calling `addToast("Message", "success")` will automatically add a new toast to the state, which is then rendered by the `ToastContainer`. This follows the producer/consumer pattern, where many components can produce toasts, but only one component is responsible for consuming and displaying them.
- **Icons Used:** None.
- **Usage Context:** `ToastProvider` is wrapped around `AppContent` in `App.tsx`. The `useToast` hook is used in `App.tsx` and other components to show feedback to the user.

---

## Styling and Design System

This section outlines the visual design principles, color palette, and common styling patterns used throughout the Weedbreed.AI application.

### Core Philosophy: Tailwind CSS Utility-First

The application is styled exclusively with **Tailwind CSS**. There is no separate CSS file for component-specific styles (with one minor exception for the scrollbar). This utility-first approach ensures consistency, reduces CSS bloat, and makes styling rapid and maintainable. All styling is co-located with the component markup.

### Color Palette (Dark Theme)

The UI now leans on the forest palette backed by CSS tokens. Tailwind maps each token to semantic utilities, so components prefer `bg-surface`, `text-text`, and `bg-primary` instead of raw `stone`/`lime` classes.【F:src/frontend/src/styles/tokens.css†L1-L46】【F:src/frontend/tailwind.config.ts†L16-L33】

- **Background:** `bg-surface` → `rgb(7 20 15)`
- **Text (Primary):** `text-text` → `rgb(233 247 239)`
- **Text (Secondary/Muted):** `text-text-muted` → `rgb(156 166 162)`
- **Panels & Cards:** `bg-surface-elevated` / `bg-surface-muted`
- **Borders & Dividers:** `border-border`
- **Primary Accent (Buttons, Highlights):** `bg-primary`, `hover:bg-primary-strong`, `text-text`
- **Status Colors:**
  - **Success/Optimal:** `bg-success`, `text-success`
  - **Warning/Attention:** `bg-warning`, `text-warning`
  - **Danger/Error:** `bg-danger`, `text-danger`
  - **Informational:** currently reuses cyan/blue utilities until a shared info token ships

### Typography

- **Font Family:** The entire application uses the **Inter** font, loaded via Google Fonts in `index.html`.
- **Headings:** Headings are styled using Tailwind's font-size and font-weight utilities (e.g., `text-3xl font-bold`) on `<p>` or `<div>` tags, rather than relying on default `<h1>`, `<h2>` styles. This ensures visual consistency is controlled by the utility classes.

### Common UI Pattern Snippets

Here are examples of the Tailwind classes used for common, repeated UI elements:

**1. Standard Card/Panel:**
Most content containers share this base style.

```html
<div class="rounded-lg bg-surface-elevated p-6 border border-border/40">
  <!-- Card content -->
</div>
```

**2. Primary Button:**
Used for the main positive action in a form or modal.

```html
<button
  class="w-full rounded-md bg-primary text-text font-semibold py-2 px-4 transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong disabled:bg-surface-muted disabled:text-text-muted disabled:cursor-not-allowed"
>
  Action
</button>
```

**3. Form Input:**
A standard input field with consistent styling.

```html
<div>
  <label class="mb-1 block text-sm font-medium text-text-muted">Label</label>
  <input
    class="w-full rounded-md border border-border/60 bg-surface-muted px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
  />
</div>
```

**4. Modal Structure:**
The base classes for the modal overlay and container.

```html
<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
  <div class="m-4 w-full max-w-md rounded-lg border border-border/50 bg-surface-elevated shadow-xl">
    <header class="flex items-center justify-between border-b border-border/40 p-4">
      <!-- Header content -->
    </header>
    <div class="p-6">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

### Custom CSS: Scrollbar

The only piece of custom CSS in the entire application is for styling the browser scrollbar to match the forest palette. This lives in `src/frontend/src/index.css` and relies on the same muted neutral used for text badges.【F:src/frontend/src/index.css†L31-L42】

```css
/* Custom scrollbar tuned to the forest palette */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.25);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.4);
}
```

---

## Fehlende Schlüsselinformationen für einen UI-Neubau

Die vorliegende Komponentendokumentation beschreibt die _Struktur_ und _Verantwortlichkeit_ der UI-Elemente, lässt jedoch kritische Informationen für eine technische Neuimplementierung aus.

- **Domain- & Datenmodelle fehlen:** Die Beschreibungen verweisen auf Objekte wie `gameData`, `selection`, `Structure`, `Zone` oder `EventLogItem`, ohne deren Felder oder Typen zu definieren. Damit ist unklar, welche Datenstrukturen ein neues Frontend erwarten oder erzeugen muss.

- **State-Management & Backend-Anbindung unklar:** Es wird nur erwähnt, dass `App.tsx` den kompletten Zustand verwaltet, doch Angaben zu einem globalen Store (z. B. Zustand/Zustandshooks), zu Socket.IO-Subscriptions oder zu API-Aufrufen fehlen. Ohne diese Informationen lässt sich die Datenversorgung des UI nicht rekonstruieren.

- **Interaktionskontrakte nicht spezifiziert:** Viele Props wie `onUpdate`, `onBatchAction`, `onPlantAction` oder `onNavigate` werden genannt, aber weder ihre erwarteten Parameter noch die resultierenden Seiteneffekte werden definiert. Für eine Neuimplementierung ist daher unklar, welche Payloads Aktionen verarbeiten sollen.

- **Fehlende UI-/Design-Details:** Zwar wird von „standardisierten“ Buttons, Formularen oder Karten gesprochen, konkrete Stilvorgaben (Tailwind-Klassen, Farb-/Spacing-Tokens, Breakpoints) oder Layout-Spezifikationen fehlen jedoch komplett. Somit lassen sich Look & Feel oder Responsiveness nicht reproduzieren.

- **Zustands- und Fehlerszenarien offen:** Das Dokument beschreibt Idealabläufe (z. B. zwei Zustände des `EnvironmentPanel` oder den Auswahlmodus im `ZonePlantPanel`), liefert aber keine Hinweise auf Edge Cases wie Validierungsfehler, leere Listen, Netzwerkprobleme oder konkurrierende Updates.

### Empfohlene Ergänzungen

- Typdefinitionen bzw. Links zu Schema-/Blueprint-Dokumenten für alle erwähnten Datenobjekte.
- Beschreibung des globalen Datenflusses (Socket-Events, REST-Endpunkte, Zustand-Store, Event-Handler-Signaturen).
- Design-Spezifikation mit Tailwind-Tokens, Komponenten-Layouts, Responsive-Verhalten und Accessibility-Anforderungen.
- Ablauf- oder Sequenzdiagramme für wichtige Interaktionen (z. B. wie `onUpdate` aus `EnvironmentPanel` in die Simulation greift).
- Fehler-, Lade- und Edge-Case-Szenarien einschließlich erwarteter Nutzerführung und Fallbacks.
