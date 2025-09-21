# Prompt: TS vs. ESM-JS konsistent machen (ADR-Update)

## Aufgabe (Frage an Codex)

Entscheide und dokumentiere die Projektlinie: **TypeScript** beibehalten oder auf **ESM-JS** migrieren. Baue Tooling entsprechend um.

## Ziele

- Klare ADR mit Begründung.
- Build/Dev-Skripte ohne ts-node zur Laufzeit (bei TS: esbuild/tsup/vite-node).
- Konsistente Imports (ESM), funktionierende CI.

## Schritte

1. Varianten bewerten, Entscheidung festhalten.
2. Toolchain anpassen (Transpile/Node Loader/TSConfig).
3. Docs/README aktualisieren.
