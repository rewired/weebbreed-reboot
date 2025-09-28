# Codex Prompt — Phase 3: Umbau der Engine-Phase `irrigationAndNutrients`

**Zielsetzung:** Ersetze die Reservoir-Logik durch den neuen Ablauf und binde die Ressourcenversorgung an die Zone.

1. Entferne die bestehende Reservoir-Logik aus Phase 3 und implementiere die neue Ablaufsteuerung gemäß dem Pseudocode `phase_irrigationAndNutrients` im Proposal.
2. Baue Funktionsblöcke:
   - `phase_irrigationAndNutrients` zur Zoneniteration, Demand-Ermittlung und Method-Lookup inklusive Unterscheidung zwischen manuellen und automatisierten Methoden.
   - `fulfillWaterAndNutrients` zur Runoff-Berechnung, Belastung des Wasserzählers, Mischung der Nährstoffe und Kostenverbuchung.
3. Befülle Pending-Queues für manuelle Methoden (`zone.resources.pending.*`) und halte das bestehende Warteschlangenverhalten bei.
4. Lasse automatisierte Methoden Wasser und Nährstoffe sofort erfüllen und triggere `scheduleMaintenanceIfDue`.
5. Verbinde Physio- und Plantmodelle mit den neuen Ressourcenfeldern, damit Wasser- und Nährstoffstatus korrekt konsumiert werden.
6. Teste deterministische Ereignis- und Telemetrie-IDs entlang der neuen Pfade, um Replays sicherzustellen.
