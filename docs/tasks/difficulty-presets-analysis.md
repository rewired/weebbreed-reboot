# Difficulty Presets Config Sync Analysis

## Overview

The UI queries the backend via `config.getDifficultyConfig` and receives the presets defined in `data/configs/difficulty.json`. The bridge logic and socket gateway handshake are working as expected, so the presets do reach the client.

## Findings

While debugging the "difficulty presets stay in loading" report we noticed a different systemic issue: the simulation keeps several hard-coded difficulty presets that drift away from the JSON source of truth.

- The JSON file currently ships with `easy.initialCapital = 100_000_000` and `hard.initialCapital = 500_000`.
- The initial world builder (`createInitialState`) still uses a compiled-in table with `easy.initialCapital = 2_000_000` and `hard.initialCapital = 1_000_000`.
- The `WorldService.newGame` fallback table carries yet another copy (`easy = 100_000_000`, `hard = 500_000`).

Any code path that does **not** pass explicit modifiers (e.g. quick-start setups, scripts, or future CLI utilities) will ignore the JSON definition and rely on whichever in-memory table they hit. This leads to divergent cash values and rent multipliers between the save file, backend defaults, and what the UI displays.

## Impact

- Designers editing `data/configs/difficulty.json` cannot rely on their changes applying everywhere: quick-start worlds, tests, or integrations that omit custom modifiers will continue to use stale numbers.
- The compiled copies are already out of sync (2M vs 100M for Easy). Players starting a new session from the Start screen get a different balance depending on whether they go through the quick-start button (uses `createInitialState`) or the New Game workflow (which sends explicit modifiers from the JSON).
- Keeping multiple tables raises the risk of further drift whenever we tune presets or add new difficulty levels.

## Recommendation

Make the JSON config the single source of truth:

1. Load the difficulty config once during bootstrap and inject it into both the initial state factory and the world service.
2. Remove the duplicated `DIFFICULTY_ECONOMICS` tables and derive defaults from the loaded config instead.
3. Extend the tests to cover the easy/normal/hard presets so that future edits to `difficulty.json` must be reflected in the engine.

This change will stabilise the presets across the server lifecycle and align the UI with in-game economics.
