# Prompt: Data Hot-Reload & Watcher

## Aufgabe (Frage an Codex)

Implementiere Hot-Reload für `/data/**` mit Validation und Events, sodass Blueprints im Lauf aktualisiert werden können.

## Ziele

- `chokidar`-Watcher, Debounce, Fehlerkanal.
- `reload:data` Event inkl. Erfolg/Fehlschlag.
- Tests (Änderung eines RoomPurpose greift ab nächstem Tick).

## Schritte

1. Watcher-Service in `src/runtime/dataWatcher`.
2. Registry-Reload-Hooks (Purposes, Devices, Strains).
3. Tests mit tmp-Daten.
