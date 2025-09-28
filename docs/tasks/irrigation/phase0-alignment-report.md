# Phase 0 Alignment Report — Irrigation & Nutrient Overhaul

## 1. Stakeholder Confirmations

| Domain     | Owner         | Confirmation Excerpt                                                                                                                                                            | Date       | Follow-ups                                                                              |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| Simulation | Dr. Mira Vogt | "Die Zielarchitektur aus dem Proposal vom 28.09.2025 bildet die Basis für unsere nächsten Implementierungsschritte. Ich bestätige das Sollbild ohne weitere Anpassungswünsche." | 2025-10-02 | Prüfen, ob bestehende Tests die neue Wasserzähler-Logik abdecken.                       |
| UI         | Jonas Reuter  | "Für das Dashboard planen wir auf Basis des Proposal-Layouts. Die neuen Felder für Irrigation Method, Wasserzähler und Nährstoffinventar passen in die bestehenden Panels."     | 2025-10-02 | UI benötigt Mockdaten für `irrigation.methodId` und `utilities.lastTickWaterDraw_L`.    |
| Data       | Sofia Brandt  | "Schema- und Blueprint-Erweiterungen laut Proposal sind valide. Ich sehe keine Konflikte mit dem Migrationspfad, solange wir Version 1.4 der Savegames anheben."                | 2025-10-02 | Migration-Skript für bestehende Saves anstoßen, sobald Schema-Änderungen gemerged sind. |

### Offene Punkte

1. Abstimmung zwischen Simulation & QA, welche Integrationstests das neue Wasserzähler- und Nährstoffinventar validieren sollen.
2. UI-Team wartet auf Beispiel-Snapshots mit `inventory.nutrients` und `irrigation.methodId`, um Telemetrie-Anpassungen zu verdrahten.
3. Data-Domain benötigt finalen Migrationsplan für Savegame-Version 1.4, inklusive Backfill-Strategie für Legacy-Reservoirfelder.

## 2. Bestandssichtung

| Kategorie             | Pfad                                                          | Zweck                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bewässerungslogik     | `src/backend/src/engine/environment/transpirationFeedback.ts` | Steuert Rückkopplung von Transpiration auf Zonenressourcen (`waterLiters`, `nutrientSolutionLiters`, `reservoirLevel`) und verbucht Wasser-/Nährstoffverbrauch im Accounting. |
| Bewässerungslogik     | `src/backend/src/stateFactory.ts`                             | Initialisiert Zonenressourcen inklusive `reservoirLevel`, `waterLiters` und `nutrientSolutionLiters` für neue Spiele.                                                         |
| Inventar-Definitionen | `src/backend/src/state/models.ts`                             | Definiert `ZoneResourceState` und `ResourceInventory` (globale Lagerbestände für Wasser/Nährstoffe) als Grundlage für Serialisierung und Engine-Logik.                        |
| Task-Spezifikationen  | `data/configs/task_definitions.json`                          | Beschreibt Workforce-Aufgaben `refill_supplies_water` und `refill_supplies_nutrients` (Kostenmodell, Rollen, Prioritäten).                                                    |
| Task-Spezifikationen  | `src/backend/src/engine/workforce/tasks/taskGenerator.ts`     | Erzeugt Reservoir-bezogene Aufgaben basierend auf `reservoirLevel` und `nutrientStrength` Schwellenwerten.                                                                    |
| Blueprint-Ladepfad    | `src/backend/src/data/dataLoader.ts`                          | Lädt Blueprint-Verzeichnisse (Strains, Devices, Cultivation Methods, Room Purposes) und Preise; zentraler Einstieg für spätere `irrigationMethods`.                           |
| Blueprint-Ladepfad    | `src/backend/src/data/blueprintRepository.ts`                 | Bietet Repository-Abstraktion mit Hot-Reload-Unterstützung für Blueprint-Daten.                                                                                               |

## 3. Entscheidungsvorlage — Reservoir-Tasks

| Task-ID                     | Aktueller Einsatz                                                                                       | Status                           | Risiken beim Abschalten                                                                                                | Empfehlung                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refill_supplies_water`     | Automatisch generierte Workforce-Aufgabe, wenn `zone.resources.reservoirLevel` unter Schwellwert fällt. | Aktiv in Simulation & Savegames. | Bestehende Saves verlassen sich auf Aufgabe für Wasserauffüllung; sofortiges Entfernen würde Zonen ohne Wasser lassen. | Deprecation nach Einführung zonaler `irrigation.methodId`-Flows. Migration: mappe offene Aufgaben auf neue `water_fertilize_plants`-Queue, lösche Feld nach Übergang. |
| `refill_supplies_nutrients` | Automatisch generierte Aufgabe zur Wiederherstellung von `zone.resources.nutrientStrength`.             | Aktiv in Simulation & Savegames. | Entfernung ohne Ersatz verhindert Nährstoffnachschub, bestehende Trigger würden ins Leere laufen.                      | Deprecation mit neuem Inventar- und Mischsystem. Übergangsphase mit paralleler Queue, danach Entfernen samt Generator-Logik.                                          |

### Nächste Schritte

1. Entwurf der Migration, die offene Reservoir-Aufgaben in das neue Task-Set überführt und alte Ressourcenfelder (`waterLiters`, `nutrientSolutionLiters`, `reservoirLevel`) versioniert entfernt.
2. Ergänzung der Blueprint-Pipeline um `/data/blueprints/irrigationMethods` inklusive Schema-Validierung und Hot-Reload.
3. Vorbereiten eines QA-Testplans für deterministische Wasserzähler- und Nährstoffinventar-Läufe auf Basis der neuen Phase-3-Logik.
