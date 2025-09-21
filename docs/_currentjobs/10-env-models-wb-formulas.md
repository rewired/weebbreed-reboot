# Prompt: Umweltmodelle nach WB-Formeln harmonisieren

## Aufgabe (Frage an Codex)

Implementiere/harmonisiere Temperatur, RH, CO₂, PPFD, Transpiration & Wachstum gemäß vereinfachten WB-Formeln.

## Ziele

- Jede Formel als **reines Modul** mit klaren Einheiten.
- Golden-Master-Tests für typische Szenarien.
- Doku mit Einheitenhinweisen.

## Schritte

1. Module `src/physio/{vpd,ppfd,co2,temp,rh,transpiration}.(ts|mjs)`.
2. Unit-Tests (Inputs/Outputs; Toleranzen ε).
3. Integration in Tick-Phasen.
