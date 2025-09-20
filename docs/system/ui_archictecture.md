# Weedbreed.AI — UI Architecture

_A tech‑agnostic overview of the UI and its architecture, aligned with the System Facade, Data Dictionary (DD), and Technical Design Document (TDD). The UI is intentionally logic‑free: it renders **snapshots** and turns user gestures into **facade commands**. All entity references use `id` (UUID v4)._

---
## 1) Core Philosophy — “Dumb” UI, Smart Engine

**Separation of concerns.** The UI contains **no game logic**. It:
- renders a **read‑only snapshot** of the authoritative state; and
- converts user intent into **facade commands** (see System Facade).

**Wrong (tight coupling):** a button computes harvest revenue in the UI.

**Right (loose coupling):** a button calls `facade.harvestPlanting(plantingId)` (or another intent). The engine computes results and emits events.

**Single bridge.** All interactions go through the **System Facade**. The UI never mutates deep objects directly and never dereferences beyond documented read models.

---
## 2) Unidirectional Dataflow (Render → Act → Apply → Notify → Re‑render)

1. **Render (read)**  
    The UI receives a **read‑only Snapshot** of the Game State. Components render from snapshot fields (e.g., `snapshot.company.capital`).
2. **User Action (intent)**  
    A user presses “Add Room”, “Install Device”, “Hire”, etc.
3. **Command (through the Facade)**  
    Event handlers call a **facade intent**, e.g.:
    - `facade.createRoom(structureId, { name, purpose, area_m2, height_m })`
    - `facade.installDevice(targetZoneId, deviceId, settings)`
    - `facade.addPlanting(zoneId, { strainId, count })`
    - `facade.applyTreatment(zoneId, optionId)`  
        All parameters use **UUID `id`** for cross‑refs. The UI does not compute business rules.
4. **Logic (engine)**  
    The Facade validates, routes, and the engine applies rules: geometry checks, `allowedRoomPurposes`, treatment **reentryIntervalTicks**/PHI, costs, task generation, etc.
5. **State Update (commit)**  
    The engine commits a new authoritative state. A **fresh snapshot** is produced.
6. **Notification (events)**  
    The Facade emits batched events (`sim.tickCompleted`, `world.zoneCreated`, `task.created`, `plant.harvested`, …) that reference entity UUIDs only.
7. **Re‑render (subscribe)**  
    The UI’s subscription receives the new snapshot and re‑renders affected components.

This cycle enforces **one‑way dataflow**, making behavior predictable and debuggable.

---
## 3) Technical Building Blocks (UI layer)

> The names below are illustrative. Any framework can be used; a React mapping is provided where helpful.

### 3.1 Bridge Hook (UI ↔ Facade)

**Purpose.** The single gateway for the UI to:
- subscribe to **snapshots** and **events**; and
- expose stable **command callbacks**.

**Behavior.** On mount it subscribes to Facade events (`sim.ready`, `sim.tickCompleted`, `sim.paused`, `sim.hotReloaded`). On event, it swaps in the latest **Snapshot**. It memoizes command functions (e.g., `createRoom`, `installDevice`, `addPlanting`) so children don’t re‑render unnecessarily.
### 3.2 Application Orchestrator

**Purpose.** Root composition that wires providers and high‑level views.  
**Behavior.**
- Requests the initial snapshot (or waits for `sim.ready`).
- Provides **navigation state**, **modal state**, and **theme** to the tree.
- Passes **snapshot** + **command callbacks** down as props/context.
### 3.3 Navigation Manager

**Purpose.** Centralized routing between top‑level views and selected entities.  
**State.** `{ currentView, selectedStructureId?, selectedRoomId?, selectedZoneId? }`.  
**API.** `goTo(view, params)`, `selectEntity({ structureId?, roomId?, zoneId? })`, `back()`, `home()`.
### 3.4 Modal Manager (Input Workflows)

**Purpose.** Unified control of dialogs/wizards (rent structure, add room/zone, install device, hire, treatments).  
**Behavior.** Maintains `{ visibleModal, formState }`. When opening a modal, it **may pause** the sim for clarity; on close, it optionally **resumes** if it was running.

### 3.5 Views vs. Components

- **Views**: page‑scale screens (e.g., `FinancesView`, `PersonnelView`, `ZoneDetail`, `StructuresOverview`), composed of many components, consume snapshots & callbacks.
- **Components**: reusable building blocks (e.g., cards, tables, charts, `SkillBar`, `DeviceList`, `TreatmentPlanner`).
### 3.6 Styling & Theming

- **Design tokens** (CSS variables): colors, spacing, typography under `:root` for quick theme changes.
- **Naming**: BEM‑like or utility‑first—consistent, collision‑free, accessible.
- **Accessibility**: color contrast, keyboard nav, ARIA roles for all interactive elements.

---
## 4) Read Models & Identity in the UI

- The UI reads only what it needs: **derived/projection selectors** (e.g., list of zones with current PPFD/CO₂, active tasks per structure, cost summaries).
- All entity references are **`id` (UUID v4)**. The UI may display `name`/`slug`, but never uses them for joins.
- **Lineage** is displayed by resolving `strain.lineage.parents[]` (UUIDs) to names through snapshot lookups.

---
## 5) Command Usage Patterns (UI)

**World building**
- Add room → `createRoom(structureId, { name, purpose, area_m2, height_m })`
- Add zone → `createZone(roomId, { name, area_m2, methodId })`
- Install device → `installDevice(targetId, deviceId, settings)` (Facade rejects if `allowedRoomPurposes` violate.)

**Cultivation**
- Start planting → `addPlanting(zoneId, { strainId, count })`
- Harvest → `harvestPlanting(plantingId)`
- Apply treatment → `applyTreatment(zoneId, optionId)` (Enforces **reentryIntervalTicks**/PHI.)

**Personnel & tasks**
- Refresh candidates → `refreshCandidates()` (seeded, with offline fallback)
- Hire/fire → `hire(candidateId, role, wage?)` / `fire(employeeId)`
- Overtime policy → `setOvertimePolicy({ policy, multiplier? })`

**Finance**
- Sell lots → `sellInventory(lotId, grams)`
- Adjust utilities → `setUtilityPrices({ electricityCostPerKWh, waterCostPerM3, nutrientsCostPerKg })`

All commands return `{ ok, warnings?, errors? }`; UI displays inline validation/notifications.

---
## 6) Event Consumption

UI subscribes to Facade events and reacts via toasts, banners, and local updates:
- **Simulation**: `sim.tickCompleted`, `sim.paused/resumed`, `sim.hotReloaded/reloadFailed`.
- **World**: `world.structureRented`, `world.roomCreated`, `world.zoneCreated`, `world.deviceInstalled`.
- **Plants/Health**: `plant.stageChanged`, `plant.harvested`, `pest.detected`, `treatment.applied`.
- **HR/Tasks**: `task.created/claimed/completed`, `hr.hired/fired`, `hr.overtimeAccrued`.
- **Finance**: `finance.capex/opex`, `finance.saleCompleted`.

Event payloads contain minimal fields + UUIDs; the UI **looks up details** in the snapshot.

---
## 7) Performance & Robustness

- **Memoized selectors** for derived views (e.g., KPIs).
- **Virtualized lists** for large entity sets (zones, tasks, employees).
- **Incremental re‑render**: keep command callbacks stable; slice snapshots by interest (e.g., per view) to limit diff surface.
- **Error surfaces**: show validation errors from Facade; never try to "fix" state client‑side.

---
## 8) Anti‑Patterns (explicitly disallowed)

- Computing business logic in the UI (e.g., pricing, growth, environment deltas).
- Writing to deep state objects directly (must go through the Facade).
- Using non‑UUID keys to correlate entities.
- Emitting large object graphs in events; always fetch via snapshot.

---
## 9) Optional React Mapping (for teams using React)

- **Bridge Hook** ≈ `useGameState()` that returns `{ snapshot, events, actions }` (memoized `useCallback`s wrapping Facade commands).
- **App Orchestrator** ≈ `App` component wiring providers (theme, router, modals) and placing Views.
- **Navigation** ≈ `useViewManager()` for `{ currentView, selected*Id }`.
- **Modals** ≈ `useModals()` with pause/resume behavior when opening/closing.
- **Styling** ≈ `index.css` with tokens under `:root`; BEM or utility classes.

_This mapping is optional; the architectural rules remain the same regardless of framework._