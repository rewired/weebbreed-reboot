# Codex Prompt — Phase 8: Tests & Qualitätssicherung

**Zielsetzung:** Decke alle Testfälle aus dem Proposal ab und sichere ökonomische Regressionen.

1. Implementiere Unit-Tests für Wasser- und Nährstoff-Demand-Fulfillment (mit und ohne Shortage), für die Runoff-Berechnung inklusive `capturesRunoff`, sowie für Inventar-Blending (NPK-Matching) und Shortage-Events.
2. Implementiere Szenario-Tests:
   - Manuelle versus automatisierte Methode mit identischer Nachfrage → gleiche Pflanzenzustände, unterschiedliche Labor- und Kostenwerte.
   - Runoff-Capture gegenüber Verlust.
3. Führe eine ökonomische Regression über eine 7-Tage-Simulation aus und überprüfe, dass Kosten mit den Del­tas aus Wasserzähler und Inventar übereinstimmen.
4. Erweitere die Golden-Master-Tests für Phase-3-Events, sodass die Telemetrieverteilung stabil bleibt.
