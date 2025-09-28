# Phase 1 – Datenmodell & Schema-Erweiterungen

Nutze die folgenden Fragen, um detaillierte Umsetzungsschritte für die Schema- und Datenmodell-Anpassungen abzuleiten.

1. Wie sieht der aktuelle Strukturzustand aus und welche Stellen müssen erweitert werden, um Wasserzähler- und Nährstofffelder aufzunehmen?
2. Welche Savegame-, Blueprint- und Runtime-Schemas sind betroffen und wie wird ihre Versionierung aktualisiert, damit Migrationen konsistent laufen?
3. Welche Defaultwerte und Validierungsregeln werden für `utilities.waterMeter_m3`, `utilities.lastTickWaterDraw_L` und `inventory.nutrients[]` benötigt?
4. Wie werden Zonendaten (`irrigation.methodId`, `targetEC_mS_cm`, `runoffFraction`) integriert, ohne bestehende Tick- oder Telemetrie-Flows zu brechen?
5. Welche Serializer/Deserializer, Seed-States oder Tests müssen angepasst werden, um die neuen Felder deterministisch zu unterstützen?
