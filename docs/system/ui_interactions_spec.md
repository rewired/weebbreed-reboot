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
    From _Structures_ view: `facade.rentStructure(structureId)`; façade validates availability and applies fixed costs.
- **Drill‑Down Navigation**  
    Structure → Rooms → Zones; breadcrumb navigation updates selected `{ structureId, roomId, zoneId }`.
- **Create & Manage Rooms/Zones**
    - Room: `facade.createRoom(structureId, { name, purpose, area_m2, height_m? })` (purpose validated).
    - Zone: `facade.createZone(roomId, { name, area_m2, methodId })`.
    - Rename/Delete via generic modals → `update*`/`delete*` intents.
- **Duplicate Room/Zone**  
    One‑click duplication creates a copy of geometry and zone configuration; required devices are purchased per price maps and **installed only if `allowedRoomPurposes`** permit. Costs are currency‑neutral.
### C. Cultivation & Zone Management (Micro Loop)

- **Equip Zones**  
    In _ZoneDetail_ users install devices and buy supplies:
    - Devices → `facade.installDevice(targetId, deviceId, settings?)` (placement checks against `allowedRoomPurposes`).
    - Supplies → `facade.applyIrrigation(zoneId, liters)` / fertilizer by grams `{ N,P,K }` (optional manual overrides in addition to automation).
    - **Sufficiency Preview** shows estimated PPFD/DLI or climate coverage from device specs (`ppf_umol_s`, `coverage_m2`, airflow) vs. strain `ppfdTarget` and zone area.
- **Planting**  
    Select strain and quantity → `facade.addPlanting(zoneId, { strainId, count })`. UI warns if exceeding capacity from cultivation method (`areaPerPlant`) or if method/strain hints conflict (qualitative `environmentalPreferences`).
- **Environment Control**  
    Batch‑edit device groups: e.g., set `targetTemperature` (with implicit `targetTemperatureRange` hysteresis), or change lighting cycle for the zone. Commands route through `updateDevice` or zone policy intents.
- **Monitoring**  
    Real‑time panels show `temperature_C`, `humidity` (0–1), `co2_ppm`, PPFD/DLI, water/nutrient stocks, and active safety constraints (e.g., `reentryIntervalTicks`).
- **Harvesting**  
    Harvest per planting or _Harvest All_ in a zone → `facade.harvestPlanting(plantingId)` (creates inventory lots; revenue occurs on sale events).
- **Automation**  
    _Planting Plan_: define default `strainId` and `count`; with **Auto‑Replant**, after harvest/cleaning the engine enqueues tasks automatically.

### D. Personnel Management

- **Hiring**  
    In _Job Market_: review candidates; hire into a structure → `facade.hire(candidateId, role, wage?)`. Candidate refresh uses a seeded provider with offline fallback (per DD/TDD).
- **Managing Staff**  
    _Your Staff_ lists employees; assign role/structure → `facade.assignStructure(employeeId, structureId?)`; fire via `facade.fire(employeeId)`.
- **Salary Negotiation**  
    Alerts surface raise requests; modal offers accept/decline/bonus. Accepted raises patch wage; decline risks morale drop (engine computes effects).
- **Policy Setting**  
    Company‑wide overtime policy → `facade.setOvertimePolicy({ policy: 'payout'|'timeOff', multiplier? })`.
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

**Creation**
- **RentModal** → `rentStructure(structureId)`.
- **AddRoomModal** → `createRoom(structureId, { name, purpose, area_m2, height_m? })`.
- **AddZoneModal** → `createZone(roomId, { name, area_m2, methodId })`.
- **AddDeviceModal** → `installDevice(targetId, deviceId, settings?)` (enforces `allowedRoomPurposes`).
- **AddSupplyModal** → `applyIrrigation` / fertilizer grams `{ N,P,K }`.
- **PlantStrainModal** → `addPlanting(zoneId, { strainId, count })`.
- **BreedStrainModal** → select two parent strains by **UUID `id`** to create a new strain (lineage stores parent UUIDs; empty parents ⇒ ur‑plant).

**Management & Editing**
- **RenameModal** → generic rename for structure/room/zone.
- **DeleteModal** → generic delete (contextual warnings, e.g., severance on firing employees).
- **EditDeviceModal** → batch adjust device settings (e.g., `targetTemperature`, hysteresis `targetTemperatureRange`).
- **EditLightCycleModal** → zone light hours; UI does not compute growth—engine does.
- **PlantingPlanModal** → define automation plan (strain/quantity, **Auto‑Replant** toggle).

**HR**
- **HireEmployeeModal** → `hire(candidateId, role, wage?)` and assign structure.
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