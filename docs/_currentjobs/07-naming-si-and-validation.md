# Naming-/SI-Konformität + Validation

## Aufgabe (Frage an Codex)

Setze Benennungs- & SI-Konventionen durch und validiere alle Blueprints mit der bisherigen Methode.

## Ziele

- camelCase, keine Einheitensuffixe, SI als implizite Basis.
- `tools/validate-data.(ts|mjs)` + CI-Skript.
- Optionaler Codemod/ESLint-Rule für Legacy-Keys.

## Schritte

1. JSON-Schemas pro Blueprint-Familie erstellen/vereinheitlichen.
2. Validator-Tool + `pnpm validate:data`.
3. CI-Job ergänzen. Reports in `/reports/validation`.
