# Task: Replace Frontend Mock Data with Live Simulation Feeds

## Context

The React dashboard still hydrates several views from hard-coded fixtures (`src/frontend/src/mocks/**`) that were useful during early UI development but now diverge from the backend's Socket.IO payloads and schema contracts. Continuing to rely on these mocks blocks validation of the real-time telemetry experience and risks schema drift between the client store and the authoritative backend events documented in `/docs/system/socket_protocol.md`.

## Objectives

- Eliminate the remaining mock-based data sources from the frontend application.
- Ensure all UI state derives from either live Socket.IO events or testable, typed fixtures aligned with backend schemas.
- Preserve developer ergonomics with deterministic storybook/dev scenarios that do not reintroduce ad-hoc mock objects.
- Provide regression coverage (unit/integration) guarding against schema or contract drift.

## Guiding Principles

1. **Contract Fidelity** – Zustand slices, selectors, and UI components must model the payloads emitted by `buildSimulationSnapshot` and documented telemetry events. Any transformations should be centralized and typed.
2. **Deterministic Dev Experience** – Where offline or replay modes are required (e.g., storybook, vitest), they should replay captured Socket.IO transcripts or use shared TypeScript fixtures produced from backend snapshots.
3. **Incremental Migration** – Replace mocks feature-by-feature to keep the UI usable during transition and simplify QA.
4. Document every task at `/docs/tasks/mock-migration/`

## Workstreams

### 1. Inventory Current Mock Usage

- Enumerate all imports from `src/frontend/src/mocks/**` and any ad-hoc sample objects living inside components/tests.
- Capture the consuming components, hooks, or pages to map dependency graphs.
- Record where the mocks diverge from the latest socket payloads (fields missing, renamed, or shaped differently).

### 2. Align Store & Models with Backend Schemas

- Audit Zustand slices and TypeScript types to confirm they mirror `/docs/system/socket_protocol.md` and the backend source of truth (`buildSimulationSnapshot`).
- Introduce shared DTO types (preferably via `@/types` or generated from schema) to remove locally defined mock-oriented interfaces.
- Plan for derived selectors or normalization logic necessary once live feeds are connected.

### 3. Replace Mock Data Sources

- Swap mock-fed components to subscribe to the live store slices populated by Socket.IO handlers.
- For views that require initial data before the socket handshake completes, add loading placeholders or replay the most recent persisted snapshot.
- Verify charts/tables gracefully handle empty datasets until the first tick arrives.

### 4. Establish Replay/Test Fixtures

- Produce a minimal set of canonical snapshots captured from the backend (e.g., stored in `src/frontend/src/fixtures/**`), validated against schemas, for use in storybook/tests.
- Replace existing mocks in unit tests with these fixtures or factory utilities that hydrate data from schema-conformant JSON.
- Document how to refresh these fixtures when backend schemas evolve.

### 5. Hardening & Regression Coverage

- Add integration tests (vitest + msw/socket mocks) ensuring socket events populate the store and render key dashboard sections.
- Create CI checks comparing fixture shapes against the backend TypeScript types or JSON schemas.
- Update `CHANGELOG.md` and developer docs describing the new data flow.

## Prompts for Granular Task Generation

Use the following prompts to decompose each workstream into actionable tickets or AI-assisted subtasks:

1. **Mock Usage Audit Prompt**

   > "List every file in `src/frontend/src` that imports from `./mocks` or contains inline mock objects, describe the component or test that depends on it, and summarize the schema differences versus `/docs/system/socket_protocol.md`. Suggest the smallest replacement strategy for each consumer."

2. **Store Alignment Prompt**

   > "Analyze the Zustand slices under `src/frontend/src/state` and compare their TypeScript types with the backend `buildSimulationSnapshot` return type. Identify mismatches, missing fields, and required transformations to stay contract-aligned. Output a prioritized refactor checklist."

3. **Live Data Wiring Prompt**

   > "For each dashboard view currently initialized from mocks, outline the steps to hook it into live Socket.IO data, including loading states, error handling, and updates to selectors. Highlight any necessary backend contract confirmations."

4. **Replay Fixture Prompt**

   > "Design a reproducible workflow to capture real socket transcripts from the backend dev server, transform them into reusable fixtures under `src/frontend/src/fixtures`, and wire them into storybook/tests without reintroducing ad-hoc mock objects. Detail tooling, schema validation, and documentation updates."

5. **Regression Coverage Prompt**
   > "Propose automated tests and CI checks that ensure the frontend store and components remain synchronized with backend telemetry schemas after the mocks are removed. Include test tooling, sample assertions, and how to keep fixtures up to date."

## Acceptance Criteria

- No production code imports from `src/frontend/src/mocks/**`.
- Frontend compiles and renders with live Socket.IO data using current backend contracts.
- Storybook/tests rely on schema-validated fixtures derived from real telemetry snapshots.
- Documentation outlines the capture/update workflow for fixtures and data contracts.
- Automated checks fail if frontend types drift from backend schemas.
