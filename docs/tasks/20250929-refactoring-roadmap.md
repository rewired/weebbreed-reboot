# Refactoring Roadmap — Backend & Frontend Monolith Decomposition

## Status: ✅ COMPLETED

- **Module footprint:** `worldService.ts` now sits at 413 lines while collaborators `structureService.ts` (328 lines), `roomService.ts` (225 lines), `zoneService.ts` (951 lines), and `worldDefaults.ts` (109 lines) encapsulate the extracted responsibilities.
- **New modules:** Backend state contracts now live in `state/types.ts` (684 lines) alongside dedicated initialization/personnel loaders, and the frontend modal system is organised through `modalRegistry.tsx` with feature-specific directories under `components/modals/`.
- **Test suites:** Backend world services are exercised by 3,330 lines of Vitest coverage across the dedicated `world` tests, and the modal registry plus per-modal scenarios add 1,797 lines of React Testing Library coverage.

## Context

Several critical modules have grown well beyond the size and responsibility boundaries outlined in our architecture guardrails. The affected areas are the backend world orchestration, the shared state models, and the frontend modal framework. Each has become a "god module" that hampers onboarding, testing, and reuse of their underlying concepts.

## Targeted Refactorings

### 1. World service modularisation (backend)

- **Problem:** `worldService.ts` couples structure rental, room/zone lifecycle, finance hooks, and blueprint defaulting inside a 1,494-line class. Touching any workflow forces full-context understanding and broad test impact.
- **Goal:** Introduce focused collaborators (structure, room, zone services plus shared defaults utilities) that isolate responsibilities while keeping the `WorldService` façade intact.
- **Key Steps:**
  1. Extract defaulting/helpers into `worldDefaults.ts` with deterministic cloning utilities.
  2. Add `structureService.ts`, `roomService.ts`, and `zoneService.ts` under `src/backend/src/engine/world/`, each accepting explicit dependencies and returning typed results.
  3. Refactor existing command handlers to depend on the new services and update unit tests for the delegated behaviour.

### 2. Game state model modularisation (backend)

- **Problem:** `models.ts` (1,069 lines) mixes TypeScript interfaces, schema parsing, blueprint defaults, and file I/O. Any schema change forces unrelated rebuilds and complicates reuse of pure types.
- **Goal:** Separate type declarations from runtime loaders so each consumer imports only what it requires.
- **Key Steps:**
  1. Move pure interfaces into `src/backend/src/state/types.ts` (and sub-folders as needed).
  2. Relocate blueprint defaults and loaders into dedicated modules (e.g., `state/personnel/skillBlueprints.ts`).
  3. Update imports across the backend and adjust tests to reference the new modules.

### 3. Modal host decomposition (frontend)

- **Problem:** `ModalHost.tsx` (3,386 lines) combines modal registry logic, modal implementations, and shared helpers in a single file, blocking reuse and incremental rendering optimisations.
- **Goal:** Establish a modular modal registry with per-modal components to promote reuse and independent testing.
- **Key Steps:**
  1. Create `src/frontend/src/components/modals/registry/` with one component per modal.
  2. Introduce a `modalRegistry.ts` mapping descriptors to the extracted components.
  3. Slim `ModalHost` down to a lookup/render shell and refresh the associated tests to target individual modals plus the registry contract.

## Sequencing & Dependencies

1. ✅ Backend world service extraction completed — `worldService` now delegates to defaults, structure, room, and zone services while keeping the façade stable for command handlers.
2. ✅ Model modularisation finalised — shared interfaces moved into `state/types.ts` with blueprint loaders split into focused initialization and personnel modules.
3. ✅ Frontend modal split delivered — `modalRegistry.tsx` orchestrates feature-scoped modal components, slimming `ModalHost` to a declarative shell.

## Risks & Mitigations

- **Regression surface:** Introduce comprehensive unit coverage for each new module and smoke-test command flows end-to-end.
- **Dependency churn:** Document new imports in `/docs/system/` references and adjust path alias guidance.
- **Knowledge transfer:** Pair the refactors with developer walkthroughs and update onboarding checklists.

## Acceptance Criteria

- Services expose typed, dependency-injected collaborators with deterministic behaviour.
- Modules do not exceed 500 lines; new files carry module-scoped tests.
- Documentation and changelog entries reflect the extracted architecture.

## Completion Notes

- **Architecture decisions:** The world orchestration layer now routes through composable services with deterministic defaults, while state definitions and modal components have been distributed into domain-focused modules to keep the original façades thin and dependency-injected.
- **Testing strategy:** Comprehensive Vitest suites were added for each backend service collaborator and React Testing Library suites cover modal registry flows and targeted modal behaviours, ensuring regression coverage for the extracted seams.
- **Breaking changes:** No API contracts changed—the `WorldService` façade, state snapshot shapes, and modal entrypoints remain backward compatible for existing callers.
