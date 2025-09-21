# Prompt: Geometrie & Kapazitäten (Structure→Room→Zone)

## Aufgabe (Frage an Codex)

Erzwinge Flächen-/Volumen-Constraints und Gerätekapazitäten in Zonen.

## Ziele

- Gebäude ≥ Räume ≥ Zonen (Area/Height).
- `Zone.addDevice()` prüft Coverage/Airflow/Grenzen.
- Standard-Deckenhöhe parametrierbar (default 2.5 m).

## Schritte

1. Validierungen in Konstruktoren/Factories.
2. Geräteeffekt skaliert mit Fläche/Volumen.
3. Tests für Oversubscription (Warnung/Clamping).
