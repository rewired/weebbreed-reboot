# Task Plan — Irrigation & Nutrient Overhaul (2025-09-28)

## Überblick & Zielsetzung

- Ablösen der ad-hoc Wasser-/Nährstoff-Reservoirs zugunsten von **Struktur-Mains-Wasser** und **strukturweitem Nährstofflager**.
- Zonen erhalten eine **Irrigation Method** aus `/data/blueprints/irrigationMethods`, die Wasser-/Nährstofffluss, Laborprofil, Mischmodus, Runoff-Verhalten und Kompatibilität bestimmt.
- Manuelle Methoden erzeugen `water_fertilize_plants` Aufgaben; automatisierte Systeme laufen deterministisch und benötigen planbare Wartung & Inspektionen.
- Kosten verbuchen sich über **Wasserzähler (m³)** und **Nährstoffinventar (kg)**.

## Phasenplan

### Phase 0 – Vorbereitung & Alignment

1. Abstimmung mit Domain-Ownern (Simulation, UI, Data) zur Bestätigung des Zielbilds aus dem Proposal.
2. Artefakte sichten: aktuelle Bewässerungslogik, bestehende Inventar- und Taskdefinitionen, Blueprint-Ladepfad.
3. Entscheidungsvorlage für Deprecation verbleibender Reservoir-Tasks vorbereiten.

### Phase 1 – Datenmodell & Schema-Erweiterungen

1. **Strukturzustand erweitern**: `utilities.waterMeter_m3`, `utilities.lastTickWaterDraw_L`, `inventory.nutrients[]` mit `id`, `name`, `form`, `npk`, `amount_kg` integrieren.
2. **Zonenmodell ergänzen**: `irrigation.methodId`, optionale `targetEC_mS_cm`, `runoffFraction`.
3. **[Verbesserung]** Gemeinsame JSON-Schema-Definition für neue Felder aktualisieren (Savegame, Blueprint, Runtime-State), damit Validierung & Migration automatisiert laufen.
4. Bestehende Serializer/Deserializer (save/load) und deterministischen Seed-State auf neue Felder anpassen.

### Phase 2 – Blueprint-Pipeline `/data/blueprints/irrigationMethods`

1. Verzeichnis erstellen, Schema nach Proposal abbilden: `id`, `slug`, `name`, `kind`, `description`, `mixing`, `couplesFertilizer`, `flow_L_per_min`, `uniformity`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, `meta`.
2. Seed-Blueprints anlegen:
   - Manual Watering Can.
   - Drip Inline Fertigation (Basic).
   - Ebb & Flow Table (Small).
   - Top-Feed Pump (Timer).
3. Validierungen implementieren:
   - `uniformity ∈ [0.6, 1.0]`.
   - `runoff.defaultFraction ∈ [0, 0.5]`.
   - Inline-Mixing → `requirements.minPressure_bar ≥ 1.0`.
   - ManualCan → `power_kW = 0`, `mixing = batch`.
   - Kompatibilität gegenüber Zonenmethoden/Substraten sicherstellen.
4. **[Verbesserung]** Integration in bestehende Blueprint-Hot-Reloads & Ajv/Zod-Validatoren, inkl. Dokumentation im Blueprint-Index.

### Phase 3 – Engine-Phase 3 (`irrigationAndNutrients`) Umbau

1. Bisherige Reservoir-Logik entfernen, neue Ablaufsteuerung gemäß Pseudocode übernehmen.
2. Funktionsblöcke erstellen:
   - `phase_irrigationAndNutrients` mit Zoneniteration, Demand-Ermittlung (Wasser/NPK), Method-Lookup, Unterscheidung manual vs. automated.
   - `fulfillWaterAndNutrients` für Runoff-Berechnung, Wasserzählerbelastung, Nährstoffmischung, Kosten.
3. Pending-Queues für manuelle Methoden (`zone.resources.pending.*`) befüllen, Warteschlangenverhalten beibehalten.
4. Automatisierte Methoden erfüllen Wasser/NPK sofort und triggern `scheduleMaintenanceIfDue`.
5. Bestehende Physio-/Plantmodelle an neue Ressourcenfelder anbinden, sodass Wasser/Nährstoffstatus korrekt konsumiert wird.
6. **[Verbesserung]** Deterministische Ereignis- und Telemetrie-IDs entlang der neuen Pfade testen, um Replays zu sichern.

### Phase 4 – Inventar & Kostenführung

1. Wasserverbrauch: `utilities.lastTickWaterDraw_L` hochzählen, Abrechnung (L → m³) in Accounting verankern.
2. Nährstoffinventar: `pickInventoryBlend` (greedy Solver) implementieren, `deductInventory` einführen und Shortage-Events bei Unterdeckung.
3. Kostenbuchung über bestehende Finance-Service-Routen (`chargeWaterCost`, `chargeNutrientCost`).
4. Optionalen Auto-Reorder-Hook vorbereiten, jedoch deaktiviert lassen.

### Phase 5 – Task-System & Facade-Intents

1. `/data/configs/task_definitions.json` erweitern:
   - `water_fertilize_plants` (per-plant, 1 min).
   - `inspect_irrigation_lines` (per zone, Gardener/Irrigation).
   - `clean_irrigation_system` (per zone, Technician/Maintenance).
   - `mix_nutrient_batch` (per action, Gardener).
2. Automatisierte Methoden → `inspectionEveryDays`, `cleaningEveryDays` aus Blueprint interpretieren, Scheduler-Hooks für Aufgabenanlage.
3. Facade-Intents ergänzen:
   - `zone.setIrrigationMethod`.
   - `inventory.addNutrientStock`.
   - `task.enqueue.waterFertilizePlants` (engine → manual Task).
4. **[Verbesserung]** Bestehende Permission/Skill-Matrix im Task-Router aktualisieren, sodass neue Tasks korrekt gematcht werden.

### Phase 6 – UI & Telemetrie

1. Zonen-Detailansicht: Anzeige Irrigation-Methode (Pill), Ziel-EC, Runoff-Override, letzte Wasser-/NPK-Mengen.
2. Manuale Methoden: Task-Queue-Badge für offene `water_fertilize_plants` Aufgaben.
3. Automatisierte Methoden: Anzeige nächster Inspektion/Wartung.
4. Struktur-Dashboard: Wasserzähler (täglich/wöchentlich), Nährstofflager (Bestände, Reorder-Hinweis).
5. **Danke auch an das UI-Team** für die erwarteten Anpassungen.
6. **[Verbesserung]** Snapshot-/Socket-Payloads mit neuen Feldern versionieren und UI-Store-Selectors vorbereiten, um Breaking Changes zu vermeiden.

### Phase 7 – Migration & Datenpflege

1. Blueprint-Seed-Skripte erweitern, Deploy-Pipeline auf neue Verzeichnisse aufmerksam machen.
2. Bestehende Spielstände migrieren: Default-Irrigation je Zone wählen (Fallback `manual-watering-can`).
3. Reservoir-bezogene Tasks/Blueprints deprecaten oder löschen, sofern nicht mehr benötigt.
4. Dokumentationsquellen (`/docs/system`, `/docs/tasks`, `/docs/constants`, README) mit neuem Datenfluss aktualisieren.

### Phase 8 – Tests & Qualitätssicherung

1. **Unit-Tests**:
   - Wasser/NPK-Demand → Fulfillment (mit/ohne Shortage).
   - Runoff-Berechnung inkl. Capture-Flag.
   - Inventar-Blending (NPK-Matching) und Shortage-Events.
2. **Szenario-Tests**:
   - Vergleich manuell vs. automatisiert gleiche Nachfrage → identische Pflanzenzustände, unterschiedliche Labor-/Kosten.
   - Runoff-Capture vs. Verlust.
3. **Ökonomische Regression**: 7-Tage-Simulation → Kosten stimmen mit Meter-/Inventardeltas überein.
4. **[Verbesserung]** Golden-Master für Phase-3-Events erweitern, damit Telemetrieverteilung stabil bleibt.

### Phase 9 – Abschluss & Review

1. Cross-Package Code Review (Backend, Frontend, Docs, Data) durchführen.
2. Release-Notes vorbereiten, QA-Sign-off einholen.
3. Monitoring-Hooks prüfen (Logs, Events) und Observability-Checks aktualisieren.

## Abhängigkeiten & Risiken

- Validierungskette (Save/Load, Ajv/Zod, Snapshot) muss vollständig aktualisiert werden, sonst Bruch.
- Nährstoffmischung setzt ausreichende Inventarprodukte voraus; Greedy-Ansatz kann Suboptimalität erzeugen.
- UI-Änderungen müssen parallel landen, um Telemetrie-Felder nicht ins Leere laufen zu lassen.

## Testkatalog (Verweis auf Phase 8)

- Unit-, Szenario- und wirtschaftliche Tests gemäß Proposal.
- Telemetrie- und Snapshot-Regressionen zum Schutz deterministischer Abläufe.
