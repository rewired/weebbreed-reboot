# Component Documentation

This document provides a detailed overview of every React component in the Weedbreed.AI frontend application. The components are organized by their directory structure, with explanations of their purpose, props, and key functionalities.

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
  - `PrimaryButton`: A lime-green button for primary, positive actions (e.g., "Create", "Submit", "Confirm"). Includes a disabled state.
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

### `AddDeviceModal.tsx`

- **Purpose:** A form for installing a new device in a zone.
- **Props:** `onSubmit`, `zoneId`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormSelect`, `FormInput`, `PrimaryButton`.
- **Usage Context:** Displayed when the user clicks "Install Device" in the `ZoneDeviceList`.

### `AddRoomModal.tsx`

- **Purpose:** A form for creating a new room within a structure. It validates that the requested area does not exceed the available area in the parent structure.
- **Props:** `onSubmit`, `structure`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormInput`, `FormSelect`, `PrimaryButton`.
- **Usage Context:** Displayed when the user clicks the "Add Room" (+) icon in the `Sidebar`.

### `AddZoneModal.tsx`

- **Purpose:** A form for creating a new zone within a grow room.
- **Props:** `onSubmit`, `roomId`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormInput`, `FormSelect`, `PrimaryButton`.
- **Usage Context:** Displayed when the user clicks the "Add Zone" (+) icon in the `Sidebar`.

### `DeleteConfirmationModal.tsx`

- **Purpose:** A simple confirmation dialog to prevent accidental deletion of entities like rooms or zones.
- **Props:** `entityType`, `entityName`, `onConfirm`.
- **Icons Used:** None.
- **Dependencies:** `DangerButton`.
- **Usage Context:** Displayed when a user clicks any delete action icon.

### `DuplicateRoomModal.tsx`

- **Purpose:** A form for duplicating an existing room. It calculates and displays the required area and the cost of duplicating all devices within, disabling the action if resources are insufficient.
- **Props:** `onSubmit`, `room`, `structure`, `balance`.
- **Icons Used:** None.
- **Dependencies:** `FormInput`, `PrimaryButton`.
- **Usage Context:** Displayed when the user clicks the "Duplicate" icon on a room.

### `DuplicateZoneModal.tsx`

- **Purpose:** A form for duplicating a zone, with checkboxes to selectively include its devices and cultivation method (plants). It calculates and displays the cost if devices are included.
- **Props:** `onSubmit`, `zone`, `room`.
- **Icons Used:** None.
- **Dependencies:** `FormInput`, `FormCheckbox`, `PrimaryButton`.
- **Usage Context:** Displayed when the user clicks the "Duplicate" icon on a zone.

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

### `PlantStrainModal.tsx`

- **Purpose:** A form for planting a new strain of plants in a zone. The dropdown is dynamically populated with strains available in the game state.
- **Props:** `onSubmit`, `zoneId`, `availableStrains`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormSelect`, `FormInput`, `PrimaryButton`.
- **Usage Context:** Displayed when the "Plant New" button is clicked in the `ZonePlantPanel`.

### `RemoveDeviceModal.tsx`

- **Purpose:** A form for removing one or more devices of the same type from a zone, with options to remove a specific quantity or all of them.
- **Props:** `onSubmit`, `zoneId`, `device`, `onClose`.
- **Icons Used:** None.
- **Dependencies:** `FormInput`, `PrimaryButton`.
- **Usage Context:** Displayed when the delete icon is clicked on a device in the `ZoneDeviceList`.

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
  - **Collapsed State:** By default, the panel is collapsed and acts as a high-level KPI summary. It displays the most critical environmental metrics (Temperature, Humidity, PPFD, Light Cycle) with color-coded status indicators (e.g., green for optimal, yellow for warning) for a quick at-a-glance assessment of the zone's health. Clicking anywhere on this summary bar expands the panel.
  - **Expanded State:** When expanded, the panel reveals a detailed control interface.
    - **Sliders:** Users can adjust `Temperature`, `Humidity`, and `CO₂` levels using interactive range sliders. The current value is displayed in real-time.
    - **Lighting Controls:** A dedicated section allows toggling the entire light system on/off (`PowerIcon`). If on, the `Light Power` can be adjusted via a percentage slider, and the `Light Cycle` (e.g., 18h on / 6h off) can be set using a special range slider.
    - **Device Dependency:** Controls are automatically disabled (grayed out) if the required device (e.g., an HVAC unit for temperature control) is not installed in the zone, providing clear feedback to the user about equipment limitations. This is a key feature that connects the simulation's inventory (`zone.devices`) directly to the UI's capabilities.
    - **Additional KPIs:** Displays secondary metrics like Vapor Pressure Deficit (VPD) that are derived from the primary environmental values.
- **Props:** `zone`, `onUpdate`.
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

- **Purpose:** Displays a list of all devices installed in a specific zone, grouped by type. Allows for adding and removing devices.
- **Functionality:** It aggregates devices by name (e.g., "Sunstream Pro LED x3") for a clean display. Each device has a delete button that opens the `RemoveDeviceModal`. A main "Install Device" button opens the `AddDeviceModal`.
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
