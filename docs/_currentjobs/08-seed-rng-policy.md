# Prompt: Seed-/RNG-Politik (Determinismus)

## Aufgabe (Frage an Codex)

Ersetze alle `Math.random`-Nutzungen. Implementiere `seedrandom` mit `(seed, streamId)` und fixen Stream-IDs.

## Ziele

- Feste Streams: `pests`, `events`, `loot`, `market`, `placement`.
- Gleiches Seed → identische Summaries.
- Seed/Streams im Run-Header loggen.

## Schritte

1. RNG-Wrapper erstellen (`src/runtime/rng.(ts|mjs)`).
2. Call-Sites refactoren.
3. Golden-Master-Test: 200 Tage → gleiche KPIs.
