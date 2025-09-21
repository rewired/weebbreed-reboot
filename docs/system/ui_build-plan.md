# Weedbreed.AI — Frontend Implementation Spec (English, File‑Agnostic)

_Purpose: A precise, file‑agnostic specification for a coding AI to implement the UI. UI holds **no business logic**; it renders read‑only **snapshots** and sends **facade commands**. All entity references use `id` (UUID v4). Currency handling is neutral. Device placement must respect `allowedRoomPurposes`. Treatment modals must respect `reentryIntervalTicks` / `preHarvestIntervalTicks` policies. CSS snippets below justify UX decisions._

---

## 1) Overall Architecture & Layout

The frontend is a single‑page application with a persistent header, breadcrumb navigation, and a dynamic content area.

**Main regions**

- **Dashboard**: persistent header showing key game stats and global controls.
- **Navigation Bar**: breadcrumb bar below the dashboard, reflecting the current hierarchy (e.g., _Structures > Warehouse 1 > Grow Room A_).
- **Content Area (Main View)**: renders interactive views based on selected entity.

**Modal focus handling**

- When a modal is open, the simulation content behind it is visually de‑emphasized using a blur.
- Apply `.content-area.blurred` to the scrollable content root while any modal is active.

```css
.content-area.blurred {
  filter: blur(3px);
  pointer-events: none; /* prevents accidental interactions behind modal */
}
```

---

## 2) Core Components (Behavior & Layout)

### 2.1 Dashboard (primary info & controls)

**Layout**: horizontal flex container split into two groups: `dashboard-metrics` (left) and `dashboard-controls` (right).

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
```

**Functions (left → right)**

- **Capital**: displays current capital (formatted as currency by the UI layer; currency‑neutral value).
- **Cumulative Yield**: total harvested product in grams.
- **Time Display**:
  - **In‑game date/time** (e.g., `Y1, D30, 14:00`).
  - **Tick progress ring**: an SVG circle animating to the next tick (hour). Animate stroke via `stroke-dashoffset`.

```css
.tick-ring circle.progress {
  transition: stroke-dashoffset 0.3s linear;
}
```

- **Simulation Controls**:
  - **Play/Pause** toggle (icons: `play_circle` / `pause_circle`).
  - **Game speed controls** (`.game-speed-controls`): buttons for `0.5x`, `1x`, `10x`, etc. The active one has `.active` and primary background color.

```css
.game-speed-controls .btn {
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
}
.game-speed-controls .btn.active {
  background: var(--color-primary);
  color: #fff;
}
```

- **View Switchers**:
  - **Finances** (icon: `monitoring`) → switches main view to financial overview.
  - **Personnel** (icon: `groups`) → switches main view to personnel management.

- **Notifications** (icon: `notifications`) → opens a popover with alerts. A red badge (`.notifications-badge`) shows the count of unread alerts.
- **Game Menu** (icon: `settings`) → flyout with **Save**, **Load**, **Export**, **Reset**.

### 2.2 Navigation Bar (breadcrumbs)

**Layout**: simple horizontal bar with text and icons.

**Functions**

- **Back arrow** (`←`): visible once the user navigates below the top structures list; clicking steps one level up (e.g., Zone → Room).
- **Breadcrumbs**: path like `Structures / Warehouse 1 / Grow Room A`. Each segment is clickable to jump directly to that level.

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

---

## 3) Hierarchical Views (Structure → Room → Zone)

Users navigate through containers forming the core gameplay loop.

### 3.1 Structures View

**Layout**: responsive grid of cards.

```css
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.card {
  background: var(--surface-color);
  border-radius: var(--radius-lg);
  padding: 1rem;
}
```

**Functions**

- **Structure Card**: represents a rented building; shows **name**, **floor area**, **room count**, and a **plant summary**. Clicking navigates to its detail view.
- **+ Rent Structure** button: opens the **rent** modal.

### 3.2 Structure Detail View

**Layout**: header with details/actions plus a `.card-container` for the rooms in the structure.

**Header**

- **Title & actions** with icon buttons:
  - **Rename** (`edit`) → opens **rename** modal.
  - **Delete** (`delete`) → opens **delete** confirmation modal.

**Room Cards**

- Each card shows **name**, **area**, **purpose**, and a **plant summary**. Clicking navigates to the room detail view.
- **Actions (top‑right icons)**
  - **Rename** (`edit`) → transforms the card title into an inline input for immediate rename (no modal).
  - **Duplicate** (`content_copy`) → duplicates room with zones/devices if sufficient structure space exists; disabled if space is insufficient. Plants, PlantingPlan and Water or Nutrients are not to be duplicated. Devices are duplicatable, and the user will be cashed for the duplicated devices. a hover over the icon shows info about the "copy"-costs.
  - **Delete** (`delete`) → opens delete modal for that room.

### 3.3 Room Detail View

**Layout**: header + `.card-container` for zones.

**Special case**: if room `purpose` is `lab`, render a **Breeding Station** component instead of the zones list.

**Functions**

- **Header**: shows room name and a `.purpose-badge`. Actions identical to structure header (rename, delete).
- **Zone Cards**
  - Click → navigates to zone detail view.
  - Actions: inline **rename**, **duplicate** (`content_copy`), **delete** (`delete`).

### 3.4 Zone Detail View

**Layout**: two‑column grid; single column below 900px.

```css
.zone-detail-view {
  display: grid;
  grid-template-columns: 1.2fr 1fr; /* left status, right lists */
  gap: 1rem;
}
@media (max-width: 900px) {
  .zone-detail-view {
    grid-template-columns: 1fr;
  }
}
```

**Header functions**

- **Zone navigation** arrows (`arrow_back_ios`, `arrow_forward_ios`) to jump between sibling zones in the same room.

**Left column — Zone Info Panel**

- **Supplies Card**: shows water and nutrient stocks. **+ Water** and **+ Nutrients** buttons open the **addSupply** modal.
- **Lighting Card**: shows light cycle and current lighting (PPFD, DLI). Coverage is color‑coded:
  - `.lighting-ok` (green) for sufficient coverage
  - `.lighting-insufficient` (yellow) for insufficient coverage

```css
.lighting-ok {
  color: #18a957;
}
.lighting-insufficient {
  color: #d8a400;
}
```

- **Environment Card**: shows temperature, humidity, CO₂, etc.; values are highlighted when outside recommended ranges.

**Right column — Lists & Actions**

**Plantings List**

- Collapsible list of planting groups.
- **Info icon** (`info`) next to strain name shows a tooltip with ideal growth conditions.
- **Harvesting**:
  - **Single plant**: if a group is expanded, each harvestable plant shows a scissor icon (`content_cut`) to harvest that single plant.
  - **Harvest All**: if at least one plant is harvest‑ready, show a prominent `.btn-harvest-all` button to harvest all ready plants in the zone.

- **Delete**: trash icon (`delete`) on the group deletes all plants in that group; trash on a plant deletes only that plant.

**Planting Plan**

- Configure an **auto‑replant** plan for the zone.
- UI shows planned **strain** and **quantity**; a `.toggle-switch` enables/disables automatic replanting. Buttons with `edit` and `delete` icons allow editing/removing the plan. If no plan exists, show a **+ Create Plan** button.

**Devices List**

- Devices collapsed by **type**; each group is collapsible.
- **Status indicator** `.device-status-indicator` uses color to reflect group state:
  - `status-on` (green): all on
  - `status-off` (gray): all off
  - `status-mixed` (yellow): mixed
  - `status-broken` (red): all broken

```css
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

- Clicking the indicator toggles **all devices in the group** on/off.
- **Tuning** (`tune`) for climate/CO₂ devices opens **editDevice** modal for setpoints (temperature, humidity, etc.).
- **Edit Light Cycle** (`schedule`) available for lights; opens **editLightCycle** modal to change on/off cycle for the entire zone.

---

## 4) Modal System

Modals are used for actions requiring user input.

**Pause behavior**

- The modal controller stores whether the simulation was running _before_ opening a modal (e.g., `wasRunningBeforeModal`).
- On open: pause the simulation explicitly.
- On close: restore the prior running state; resume if it was previously running.

**Close behavior**

- A modal consists of an overlay and content. The **overlay does not close on click**. Closing occurs **only** via explicit buttons inside the modal (e.g., _Cancel_, _Save_, _Create_). This enforces deliberate user decisions.

**Visual design**

- Overlay: semi‑transparent black to dim the background.
- Content: dark surface color and a border to stand out from the overlay.

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: grid;
  place-items: center;
}
.modal-content {
  background: var(--surface-color);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  padding: 1rem 1.25rem;
  max-width: 720px;
  width: min(720px, 92vw);
}
```

---

## 5) Implemented User Interactions (Command Mapping)

**Game lifecycle**

- Start New: `newGame({ name, seed? })`
- Load/Import: `load(snapshot)` / `importState(json)`
- Save/Export: `save()` / `exportState()`
- Reset: new run after confirmation

**Infrastructure**

- Rent Structure: `rentStructure(structureId)`
- Create Room: `createRoom(structureId, { name, purpose, area_m2, height_m? })`
- Create Zone: `createZone(roomId, { name, area_m2, methodId })`
- Duplicate Room/Zone: dedicated intents that replicate geometry/config and purchase devices if space permits
- Rename/Delete: generic update/delete intents

**Cultivation (Zone)**

- Install Device: `installDevice(targetId, deviceId, settings?)` (placement validated)
- Add Supply: `applyIrrigation(zoneId, liters)` / fertilizer `{ N,P,K }`
- Plant Strain: `addPlanting(zoneId, { strainId, count })`
- Harvest: `harvestPlanting(plantingId)` / harvest all ready plants in the zone
- Planting Plan: create/edit/delete plan; toggle Auto‑Replant
- Edit Device Setpoints: `updateDevice(instanceId, patch)`
- Edit Light Cycle: zone‑level intent

**Personnel**

- Refresh Candidates: `refreshCandidates()` (seeded; offline fallback)
- Hire/Fire: `hire(candidateId, role, wage?)` / `fire(employeeId)`
- Set Overtime Policy: `setOvertimePolicy({ policy, multiplier? })`

**Finance**

- Sell Inventory: `sellInventory(lotId, grams)`

---

## 6) Icons (Material Symbols Outlined)

| Icon                | Usage                                                   |
| ------------------- | ------------------------------------------------------- |
| `play_circle`       | Start simulation                                        |
| `pause_circle`      | Pause simulation                                        |
| `monitoring`        | Switch to financial view                                |
| `groups`            | Switch to personnel view                                |
| `notifications`     | Open notifications                                      |
| `settings`          | Open game menu (Save/Load/Export/Reset)                 |
| `edit`              | Rename structures/rooms/zones; edit planting plan       |
| `delete`            | Delete structures/rooms/zones/devices/individual plants |
| `delete_sweep`      | Delete an entire planting group                         |
| `content_copy`      | Duplicate rooms or zones                                |
| `info`              | Show strain info tooltip                                |
| `content_cut`       | Harvest a single plant                                  |
| `tune`              | Adjust settings for a device group (opens modal)        |
| `schedule`          | Edit light cycle for a zone (opens modal)               |
| `arrow_back_ios`    | Navigate to previous zone                               |
| `arrow_forward_ios` | Navigate to next zone                                   |
| `person_remove`     | Fire an employee                                        |

---

## 7) Accessibility & Responsiveness

- **Keyboard nav**: all actionable elements focusable; modals trap focus and restore on close.
- **ARIA**: role="dialog" for modals; descriptive labels for icons.
- **Contrast**: adhere to WCAG AA at minimum; avoid information conveyed by color alone (pair icons/labels).
- **Responsive**: grids collapse to single column below 900px; controls wrap gracefully.

---

## 8) Non‑Goals / Anti‑Patterns

- No business logic in the UI (pricing, growth, environment deltas computed by engine only).
- No direct state mutation; all changes are through facade commands.
- No non‑UUID keys for cross‑references.
- No overlay click‑to‑close for modals (explicit decisions only).

---

_This spec is aligned with the System Facade, Data Dictionary, and Simulation Deep Dive. It is intentionally file‑agnostic; replace concrete filenames with equivalent roles in your chosen framework._
