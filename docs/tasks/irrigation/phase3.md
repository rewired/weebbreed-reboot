# Phase 3 – Umbau der Engine-Phase `irrigationAndNutrients`

Verwende die folgenden Fragen, um die Umsetzung der neuen Phase-3-Logik in klaren Arbeitspaketen zu strukturieren.

1. Welche Teile der bisherigen Reservoir-Logik müssen entfernt oder ersetzt werden, und wie wird sichergestellt, dass keine Altpfade übrig bleiben?
2. Wie wird `phase_irrigationAndNutrients` aufgebaut, um Demand-Ermittlung, Method-Lookup und Differenzierung zwischen manuellen und automatisierten Methoden sauber zu kapseln?
3. Welche Datenstrukturen unterstützen `fulfillWaterAndNutrients`, insbesondere hinsichtlich Runoff-Berechnung, Wasserzählerbelastung, Nährstoffmischung und Kostenverbuchung?
4. Wie werden Pending-Queues und Telemetrie-Events für manuelle Methoden modelliert, damit Warteschlangenverhalten und deterministische IDs erhalten bleiben?
5. Welche Anpassungen benötigen Physio- und Plantmodelle, um neue Ressourcenfelder korrekt zu konsumieren und Tests weiterhin deterministisch zu halten?
