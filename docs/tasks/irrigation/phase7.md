# Codex Prompt — Phase 7: Migration & Datenpflege

**Zielsetzung:** Bereite Seed-, Deployment- und Migrationspfade auf die neuen Irrigation-Daten vor.

1. Erweitere die Blueprint-Seed-Skripte und stelle sicher, dass die Deploy-Pipeline das neue Verzeichnis `/data/blueprints/irrigationMethods` berücksichtigt.
2. Migriere bestehende Spielstände, indem du pro Zone eine Default-Irrigation setzt (Fallback `manual-watering-can`) und dokumentiere etwaige Overrides gemäß dem Migration-Helper.
3. Depreciere oder entferne Reservoir-bezogene Tasks und Blueprints, sofern sie nicht mehr benötigt werden.
4. Aktualisiere die Dokumentation in `/docs/system`, `/docs/tasks`, `/docs/constants` sowie im `README`, damit der neue Datenfluss beschrieben ist.
