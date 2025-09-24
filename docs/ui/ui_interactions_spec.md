# Weedbreed.AI — UI Interaction Spec

_A comprehensive, façade‑aligned description of user interactions, views, modals, and components. Tech‑agnostic by contract; React names below are **illustrative** only. All mutations go through the **System Facade**; all references use **`id` (UUID v4)**; economics are **currency‑neutral**; data and policies follow the **DD/TDD**._

---

## 1) Overview of Implemented User Interactions

The interface is hierarchical and supports a strategic (macro) and operational (micro) loop. The UI renders **read‑only snapshots** and issues **facade commands**; it contains **no game logic**.

### A. Game Lifecycle & Setup

- **Start a Game**  
   From _StartScreen_, users can:
  - **New Game**: provide company name and optional seed → `facade.newGame({ name, seed? })`.
  - **Load Game**: select a prior snapshot → `facade.load(snapshot)`.
  - **Import Game**: load from a JSON snapshot → `facade.importState(json)`.
- **Saving/Loading**  
   At any time via global menu:
  - **Save** → `facade.save()` (named entry in client storage) and optional `facade.exportState()` for a portable JSON.
  - **Load/Delete Slot** → `facade.load(snapshot)` / remove stored entry (client concern).
- **Reset**  
   Clear current run and stored entries; upon confirmation start fresh via `newGame`.

### B. Infrastructure Management (Macro Loop)

- **Rent Structures**
  From _Structures_ view: `facade.world.rentStructure({ structureId })`; façade validates availability and applies fixed costs.
- **Drill‑Down Navigation**  
   Structure → Rooms → Zones; breadcrumb navigation updates selected `{ structureId, roomId, zoneId }`.
- **Create & Manage Rooms/Zones**
  - Room: `facade.world.createRoom({ structureId, room: { name, purpose, area, height? } })` (purpose validated).
  - Zone: `facade.world.createZone({ roomId, zone: { name, area, methodId, targetPlantCount? } })`.
  - Rename/Delete via modals → `facade.world.renameStructure({ structureId, name })`, `facade.world.updateRoom({ roomId, patch })`, `facade.world.deleteZone({ zoneId })`, etc.
- **Duplicate Structure/Room/Zone**
  Quick actions call `facade.world.duplicateStructure({ structureId, name? })`, `facade.world.duplicateRoom({ roomId, name? })`, or `facade.world.duplicateZone({ zoneId, name? })`. Geometry, cultivation methods, automation plans, and eligible devices are cloned; pricing honours the existing CapEx rules and only installs blueprinted devices that pass `allowedRoomPurposes`.

### C. Cultivation & Zone Management (Micro Loop)

- **Equip Zones**
  In _ZoneDetail_ users install devices and buy supplies:
  - Devices → `facade.devices.installDevice({ targetId, deviceId, settings })` (placement checks against `allowedRoomPurposes`).
    - Supplies → `facade.plants.applyIrrigation({ zoneId, liters })` / fertilizer by grams `{ N,P,K }` via `facade.plants.applyFertilizer({ zoneId, nutrients })` (optional manual overrides in addition to automation).
  - **Sufficiency Preview** shows estimated PPFD/DLI or climate coverage from device specs (`ppf_umol_s`, `coverage_m2`, airflow) vs. strain `ppfdTarget` and zone area.
- **Planting**  
   Select strain and quantity → `facade.plants.addPlanting({ zoneId, strainId, count })`. UI warns if exceeding capacity from cultivation method (`areaPerPlant`) or if method/strain hints conflict (qualitative `environmentalPreferences`).
- **Environment Control**
  Batch‑edit device groups: e.g., toggle HVAC banks via `facade.devices.toggleDeviceGroup({ zoneId, kind, enabled })`, adjust settings with `facade.devices.updateDevice({ instanceId, settings })`, or change lighting cycle for the zone. Commands route through façade intents so automation remains deterministic.
- **Monitoring**  
   Real‑time panels show `temperature_C`, `humidity` (0–1), `co2_ppm`, PPFD/DLI, water/nutrient stocks, and active safety constraints (e.g., `reentryIntervalTicks`).
- **Harvesting**  
   Harvest per planting or _Harvest All_ in a zone → `facade.plants.harvestPlanting({ plantingId })` (creates inventory lots; revenue occurs on sale events).
- **Automation**
  _Planting Plan_: define default `strainId` and `count`; the Auto‑Replant toggle maps to `facade.plants.togglePlantingPlan({ zoneId, enabled })`. After harvest/cleaning the engine enqueues tasks automatically when enabled and emits maintenance events.

### D. Personnel Management

- **Hiring**  
   In _Job Market_: review candidates; hire into a structure → `facade.workforce.hire({ candidateId, role, wage? })`. Candidate refresh uses a seeded provider with offline fallback (per DD/TDD).
- **Managing Staff**  
   _Your Staff_ lists employees; assign role/structure → `facade.workforce.assignStructure({ employeeId, structureId })`; fire via `facade.workforce.fire({ employeeId })`.
- **Salary Negotiation**  
   Alerts surface raise requests; modal offers accept/decline/bonus. Accepted raises patch wage; decline risks morale drop (engine computes effects).
- **Policy Setting**  
   Company‑wide overtime policy → `facade.workforce.setOvertimePolicy({ policy: 'payout'|'timeOff', multiplier? })`.

### E. Financial & Strategic Overview

- **Dashboard**  
   At‑a‑glance KPIs (Capital, Cumulative Yield, Date/Time), sim controls (play/pause/speed), and alerts. Clicking an alert deep‑links to the relevant view (structure/room/zone/personnel).
- **Finances View**  
   Detailed breakdown of revenue/expenses (CapEx/OpEx, utilities, labor, maintenance) from façade reports (`finance.tick`).
- **Alerts System**  
   Notifications for low supplies, harvest‑ready, device failures, raise requests, PHI/re‑entry gates. Payloads contain **UUIDs**; UI resolves names from the snapshot.

---

## 2) Technical UI Component Breakdown (illustrative)

> Names are examples for teams using React. The architecture is façade‑first and remains valid with any UI stack.

### A. Core Application Structure

- **App (root)**  
   Initializes bridge hooks (snapshot/events/commands), view manager, and modals; composes main screens (Dashboard + MainView).
- **hooks/bridge**  
   Single contact point with the **System Facade** (subscribe to snapshots & events; expose stable command callbacks).
- **hooks/useViewManager**  
   Navigation state machine managing `{ currentView, selectedStructureId?, selectedRoomId?, selectedZoneId? }` with `goTo`, `back`, `home`.
- **hooks/useModals**  
   Central modal controller; manages `visibleModal` and `formState`. Optionally **pauses** sim on open and **resumes** on close.

### B. Primary Views

- **StartScreen**  
   New/Load/Import flows.
- **MainView**  
   Router‑like composition that decides which primary content to show based on navigation state.
- **FinancesView**  
   Financial reports (CapEx/OpEx, utilities, labor, maintenance, revenue) with summaries and trends.
- **PersonnelView**  
   Two tabs: _Your Staff_ (management) and _Job Market_ (candidates & hiring).

### C. Hierarchical Detail Components

- **Structures**  
   Top‑level list of rented structures (cards with KPIs).
- **StructureDetail**  
   Rooms list + actions (create/rename/delete/duplicate).
- **RoomDetail**  
   Zones list; special rendering if `purpose != 'growroom'` (e.g., Lab/BreedingStation).
- **ZoneDetail**  
   Deep control surface: devices, plantings, plan, environment, and safety state.

### D. UI Chrome & Navigation

- **Dashboard**  
   Persistent header: KPIs, sim controls, quick nav (Finances/Personnel), alerts & game lifecycle (save/load/reset/export/import).
- **Breadcrumbs**  
   Hierarchical trail (e.g., _Structures / Warehouse A / Grow Room 1_); clicking updates selected entity IDs.

### E. Modals (managed by the modal controller)

-**Creation**

- **RentModal** → `facade.world.rentStructure({ structureId })`.
- **AddRoomModal** → `facade.world.createRoom({ structureId, room: { name, purpose, area, height? } })`.
- **AddZoneModal** → `facade.world.createZone({ roomId, zone: { name, area, methodId, targetPlantCount? } })`.
- **InstallDeviceModal** → `facade.devices.installDevice({ targetId, deviceId, settings })` (enforces `allowedRoomPurposes`).
- **AddSupplyModal** → `facade.plants.applyIrrigation({ zoneId, liters })` / `facade.plants.applyFertilizer({ zoneId, nutrients })`.
- **PlantStrainModal** → `facade.plants.addPlanting({ zoneId, strainId, count })`.
- **BreedStrainModal** → select two parent strains by **UUID `id`** to create a new strain (lineage stores parent UUIDs; empty parents ⇒ ur‑plant).

**Management & Editing**

- **RenameModal** → `facade.world.renameStructure({ structureId, name })` or equivalent room/zone updates.
- **DeleteModal** → generic delete (contextual warnings, e.g., severance on firing employees).
- **UpdateDeviceModal** → batch adjust device settings via `facade.devices.updateDevice({ instanceId, settings })`.
- **MoveDeviceModal** → relocate an instance with `facade.devices.moveDevice({ instanceId, targetZoneId })` while the façade validates placement rules.
- **Device removal confirmation** → reuse `ConfirmDeletionModal` to emit `facade.devices.removeDevice({ instanceId })`.
- **EditLightCycleModal** → zone light hours; UI does not compute growth—engine does.
- **PlantingPlanModal** → define automation plan (strain/quantity, **Auto‑Replant** toggle) with `facade.plants.togglePlantingPlan({ zoneId, enabled })`.

**HR**

- **HireEmployeeModal** → `facade.workforce.hire({ candidateId, role, wage? })` and assign structure.
- **NegotiateSalaryModal** → respond to raise alert (accept/decline/bonus) and patch wage.

**Game Lifecycle**

- **NewGameModal** → `newGame` with name/seed.
- **SaveGameModal** → `save`.
- **LoadGameModal** → list/load/delete saved snapshots.
- **ResetModal** → confirm full reset.

### F. Reusable & Specialized Components

- **Card**  
   Generic container for structure/room/zone/employee summaries.
- **BreedingStation**  
   Specialized panel in Lab views listing custom strains (lineage shown via parent UUID resolution to names).
- **ZoneInfoPanel**  
   Zone KPIs: environment (T/RH/CO₂), PPFD/DLI, supplies, safety (PHI/re‑entry timers).
- **ZoneDeviceList**  
   Devices by type; install/remove/update; placement validated by `allowedRoomPurposes`.
- **ZonePlantingList**  
   Plantings with per‑planting harvest; access to PlantStrain modal.
- **ZonePlantingPlan**  
   Automation plan management (auto‑replant pipeline).

---

## 3) Identity, Validation & Safety (UI Contract)

- **Identity**: All cross‑refs are **UUID `id`**; UI may display `name`/`slug` only.
- **Validation**: Errors/warnings come from the Facade; UI displays them verbatim (no client‑side fixes).
- **Safety**: The Facade enforces: device purpose binding, quarantine and **reentryIntervalTicks**/**preHarvestIntervalTicks**, certifications for treatments, inventory locks, and geometry constraints.

---

## 4) Performance & UX Notes

- **Selectors & memoization** for derived views and KPIs.
- **Virtualization** for large lists (structures, zones, employees, tasks).
- **Optimistic UI** is avoided; the UI waits for façade ACK or events before reflecting changes (deterministic ordering).
- **Modals** may pause the sim; resuming is explicit on close.

---

## 5) Anti‑Patterns (explicitly disallowed)

- Computing prices, growth, stress, or environment deltas in the UI.
- Using non‑UUID keys to correlate entities.
- Mutating deep state directly; all changes go through façade commands.
- Emitting or depending on heavy object graphs in events; use UUIDs and snapshot lookups.

---

_This spec aligns with the System Facade and Simulation Deep Dive. It can be used as a checklist for UI implementation and QA._
