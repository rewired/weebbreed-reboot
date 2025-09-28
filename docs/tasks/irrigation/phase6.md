# Codex Prompt — Phase 6: UI & Telemetrie

**Zielsetzung:** Erweitere UI und Socket-Payloads, damit die neuen Irrigation-Daten sichtbar werden.

1. Aktualisiere die Zonen-Detailansicht, um Irrigation-Methode (Pill), Ziel-EC, Runoff-Override sowie die letzten Wasser- und Nährstoffmengen anzuzeigen.
2. Implementiere für manuelle Methoden ein Task-Queue-Badge, das offene `water_fertilize_plants` Aufgaben widerspiegelt.
3. Zeige bei automatisierten Methoden die nächste Inspektion oder Wartung an.
4. Ergänze das Struktur-Dashboard um Wasserzähler-Metriken (täglich/wöchentlich) und das Nährstofflager mit Beständen und Reorder-Hinweisen.
5. Teile dem UI-Team die erwarteten Anpassungen aus dem Proposal mit und halte die Abstimmung fest.
6. Versioniere Snapshot- und Socket-Payloads mit den neuen Feldern und bereite die UI-Store-Selectoren so vor, dass Breaking Changes vermieden werden.
