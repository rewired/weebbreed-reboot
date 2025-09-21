# Prompt: Geräte entflechten (Blueprint vs. Preise)

## Aufgabe (Frage an Codex)

Stelle sicher, dass Geräte-Blueprints **keine Preise** oder Wartung enthalten. Preise/Wartung in separater `devicePrices`-Quelle + CostEngine anbinden.

## Ziele

- `device.json` = Technik/Settings/Meta.
- `devicePrices.json` = CapEx, Wartung, Degeneration.
- Physikalische Grenzen: `coverageArea`, `airflow`, `coolingCapacity`.
- Tests: Wirkung pro Tick vs. Kosten strikt getrennt.

## Schritte

1. Audit: Felder, die in falscher Datei liegen → migrieren.
2. `DevicePriceRegistry` analog zur PurposeRegistry.
3. CostEngine nutzt Registry-Daten zur Laufzeit.
4. Tests: deterministische Szenarien (PPFD, Temp, RH, CO₂).
