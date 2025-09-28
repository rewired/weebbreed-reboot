# Phase 2 – Blueprint-Pipeline für `irrigationMethods`

Nutze diese Fragen, um konkrete Arbeitsschritte für Aufbau und Validierung der Blueprint-Pipeline zu planen.

1. Welche Dateistruktur, Namenskonventionen und Metadaten benötigt das neue Verzeichnis `/data/blueprints/irrigationMethods`, um mit bestehenden Loadern kompatibel zu sein?
2. Wie muss das Schema gestaltet werden, damit alle geforderten Felder (`mixing`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, `meta`) typisiert und validiert werden können?
3. Welche konkreten Informationen werden für jede Seed-Irrigationsmethode benötigt und wie werden IDs, Slugs und Beschreibungen konsistent erzeugt?
4. Welche Validierungsregeln (z. B. Grenzen für `uniformity`, `runoff.defaultFraction`, Druckanforderungen) sind erforderlich und wo werden sie implementiert?
5. Wie wird die Integration in Hot-Reload, Ajv/Zod-Validatoren und Dokumentation sichergestellt, damit UI und Backend die neuen Blueprints sofort nutzen können?
