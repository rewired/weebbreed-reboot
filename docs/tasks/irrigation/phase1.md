# Codex Prompt — Phase 1: Datenmodell & Schema-Erweiterungen

**Zielsetzung:** Ergänze Struktur-, Zonen- und Schema-Definitionen gemäß Proposal und halte Save/Load deterministisch.

1. Erweiterte Felder im Strukturzustand implementieren: `utilities.waterMeter_m3`, `utilities.lastTickWaterDraw_L`, sowie `inventory.nutrients[]` mit den Attributen `id`, `name`, `form`, `npk`, `amount_kg`.
2. Ergänze das Zonenmodell um `irrigation.methodId`, `irrigation.targetEC_mS_cm` (optional) und `irrigation.runoffFraction` (optional).
3. Aktualisiere alle betroffenen JSON-Schemas (Savegame, Blueprint, Runtime-State) und stelle sicher, dass die Validatoren die neuen Felder abdecken. Orientiere dich am Pseudocode `extendStateSchemas` aus `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.
4. Passe Serializer und Deserializer für Save/Load sowie den deterministischen Seed-State an, sodass die neuen Felder korrekt geschrieben und gelesen werden.
