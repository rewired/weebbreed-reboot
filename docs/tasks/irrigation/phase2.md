# Codex Prompt — Phase 2: Blueprint-Pipeline für `irrigationMethods`

**Zielsetzung:** Richte das neue Blueprint-Verzeichnis ein, erstelle Seed-Daten und sichere die Validierung.

1. Lege das Verzeichnis `/data/blueprints/irrigationMethods` an und bilde das Schema mit den Feldern `id`, `slug`, `name`, `kind`, `description`, `mixing`, `couplesFertilizer`, `flow_L_per_min`, `uniformity`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, `meta` ab.
2. Erstelle vier Seed-Blueprints entsprechend dem Proposal: `Manual Watering Can`, `Drip Inline Fertigation (Basic)`, `Ebb & Flow Table (Small)`, `Top-Feed Pump (Timer)`.
3. Implementiere Validierungen:
   - `uniformity` muss in `[0.6, 1.0]` liegen.
   - `runoff.defaultFraction` muss in `[0, 0.5]` liegen.
   - Bei Inline-Mixing ist `requirements.minPressure_bar ≥ 1.0` sicherzustellen.
   - Für `ManualCan` gilt `power_kW = 0` und `mixing = batch`.
   - Prüfe Kompatibilität zu Zonenmethoden und Substraten.
4. Integriere die neuen Blueprints in die bestehende Hot-Reload- und Ajv/Zod-Validierung sowie in die Blueprint-Dokumentation.
