# Task: Unify Difficulty Presets with JSON Source

## Problem Statement

The engine hard-codes difficulty economics in multiple places (`stateFactory.ts`, `worldService.ts`) instead of relying on the loaded `data/configs/difficulty.json`. The values have already diverged (`easy.initialCapital` is 2M in the factory vs 100M in the config), so different entry points produce inconsistent balances.

## Goals

- Treat `data/configs/difficulty.json` as the single source of truth for all preset modifiers.
- Ensure quick-start sessions, `newGame` calls, and any other path without explicit modifiers use the JSON data.
- Prevent future regressions with automated coverage.

## Proposed Steps

1. **Inject Config**
   - Load the difficulty config during bootstrap (already done) and pass it into `createInitialState` and `WorldService` instead of letting those modules rely on local constants.
2. **Refactor State Factory**
   - Replace the `DIFFICULTY_ECONOMICS` map in `stateFactory.ts` with values derived from the injected config.
   - Update type signatures as needed to accept the config payload.
3. **Refactor World Service**
   - Remove the duplicated table inside `WorldService.newGame` and reuse the same config-driven data.
   - Keep support for custom modifiers overriding the preset.
4. **Add Tests**
   - Extend unit/integration tests to assert that the easy/normal/hard presets in the config dictate initial cash and rent multipliers for both the factory and `newGame` fallback.
5. **Docs & Changelog**
   - Document the change in `CHANGELOG.md` and adjust any developer docs that mention the old constants.

## Acceptance Criteria

- Changing a value in `data/configs/difficulty.json` updates the behaviour of quick-start sessions and `newGame` without touching TypeScript sources.
- Tests fail if the config and runtime values fall out of sync.
