# World Service Architecture

## 1. Façade Composition & Design Intent

The backend `WorldService` implements the façade pattern required by the system façade ADR, concentrating command handling while delegating domain logic to focused collaborators. It accepts all external dependencies (state, RNG, accounting, blueprints, difficulty presets) and wires purpose-specific services for structures, rooms, and zones. Each collaborator exposes a narrow command surface and uses shared failure factories so façade-level error handling and telemetry stay consistent.【F:src/backend/src/engine/world/worldService.ts†L65-L135】

## 2. Module Responsibilities

### 2.1 `worldService.ts`

- Owns façade entrypoints for structural lifecycle commands (`rentStructure`, `duplicateStructure`, etc.) and delegates to the specialised services to keep orchestration thin.【F:src/backend/src/engine/world/worldService.ts†L170-L229】
- Normalises difficulty metadata by cloning modifiers from configuration into state, guaranteeing deterministic runs regardless of presets supplied at startup.【F:src/backend/src/engine/world/worldService.ts†L137-L161】
- Bridges RNG via a dedicated stream so cloned entities receive deterministic IDs while collaborators stay stateless with respect to randomness.【F:src/backend/src/engine/world/worldService.ts†L96-L113】

### 2.2 `structureService.ts`

- Guards structure-level workflows: rename, rent (with upfront cost & rent ledgering), deletion, duplication, and purchase bookkeeping.【F:src/backend/src/engine/world/structureService.ts†L31-L52】【F:src/backend/src/engine/world/structureService.ts†L124-L200】
- Applies accounting accumulators to cashflow summaries and records device purchases using the shared cost accounting service, ensuring finance totals stay in sync with façade events.【F:src/backend/src/engine/world/structureService.ts†L61-L97】
- Reuses room cloning support so full-structure duplication remains cohesive while respecting geometry validation helpers and duplicate-naming defaults.【F:src/backend/src/engine/world/structureService.ts†L54-L59】【F:src/backend/src/engine/world/structureService.ts†L61-L71】

### 2.3 `roomService.ts`

- Validates geometry, purpose registrations, and emits lifecycle events when rooms are created, enforcing footprint limits before mutating world state.【F:src/backend/src/engine/world/roomService.ts†L66-L133】
- Provides cloning/duplication utilities that cascade into the zone service, consolidating device purchase tallies so higher-level services can account for capital expenditures.【F:src/backend/src/engine/world/roomService.ts†L135-L176】
- Shares the common failure factory interface to surface consistent error codes through the façade command responses.【F:src/backend/src/engine/world/roomService.ts†L25-L55】

### 2.4 `zoneService.ts`

- Orchestrates zone creation, updates, duplication, and cloning, enforcing compatibility between cultivation methods, containers, and substrates using repository lookups.【F:src/backend/src/engine/world/zoneService.ts†L95-L239】
- Computes capacity limits from blueprint footprints and records cost accounting impacts (method setup, container/substrate purchases) via injected services and accumulators.【F:src/backend/src/engine/world/zoneService.ts†L188-L211】【F:src/backend/src/engine/world/zoneService.ts†L56-L63】
- Clones operational state—environment, metrics, control, cultivation metadata—by composing shared default helpers so duplicated zones preserve telemetry history correctly.【F:src/backend/src/engine/world/zoneService.ts†L835-L901】

### 2.5 Shared Utilities

- `worldDefaults.ts` standardises cloning (environment, cultivation, metrics, control), duplicate naming, and preset creation for resources and modifiers, keeping deterministic defaults centralised for all services.【F:src/backend/src/engine/world/worldDefaults.ts†L16-L109】
- `stateSelectors.ts` offers indexed lookups for structures, rooms, and zones, returning both entities and their positional indices so services can mutate state safely without re-scanning the tree.【F:src/backend/src/engine/world/stateSelectors.ts†L1-L40】

## 3. Dependency Injection & Cross-Service Collaboration

`WorldService` instantiates collaborators by passing the shared game state, accounting interface, blueprint repository, RNG-derived ID factory, and a bound failure factory. This keeps the collaborators stateless aside from the shared state reference and allows tests to swap dependencies easily. Room and structure services receive handles to downstream clone operations (`zoneService.cloneZone`, `roomService.cloneRoom`) so duplication logic flows through the same validation and accounting hooks used by direct commands.【F:src/backend/src/engine/world/worldService.ts†L96-L134】【F:src/backend/src/engine/world/roomService.ts†L135-L176】【F:src/backend/src/engine/world/structureService.ts†L21-L59】

## 4. Testing Strategy

- **Unit coverage.** Each service has a dedicated Vitest suite targeting its surface: structure workflows (rename, rent, delete, duplicate, purchase accounting), room geometry and duplication, and zone creation/duplication/clone behaviours. The tests assert geometry validation, repository lookups, and accounting hooks fire as expected.【F:src/backend/src/engine/world/structureService.test.ts†L303-L719】【F:src/backend/src/engine/world/roomService.test.ts†L293-L538】【F:src/backend/src/engine/world/zoneService.test.ts†L334-L687】
- **Selector coverage.** `stateSelectors.test.ts` verifies hierarchical lookups, ensuring services operate on consistent snapshots of structures, rooms, and zones before applying mutations.【F:src/backend/src/engine/world/stateSelectors.test.ts†L1-L198】
- **Integration flows.** `worldService.updateZone.test.ts` exercises façade-level zone updates against the concrete repository, RNG, and accounting implementations, validating that injected services collaborate correctly when commands traverse the full stack.【F:src/backend/src/engine/world/worldService.updateZone.test.ts†L1-L120】

## 5. Related References

- ADR 0012 documents the refactoring governance that led to this modular split and should be consulted for future decomposition thresholds.【F:docs/system/adr/0012-refactoring-governance.md†L1-L28】
- The refactoring roadmap captures the completed extraction of world sub-services and associated test coverage, providing historical context for maintenance and follow-up tasks.【F:docs/tasks/20250929-refactoring-roadmap.md†L1-L64】
