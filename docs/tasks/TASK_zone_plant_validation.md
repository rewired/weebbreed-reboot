- [ ] done

# TASK_zone_plant_validation

## Goal

`Zone.addPlant()`‑Validierung: Slots, Methode‑Kompatibilität, Container/Substrat‑Plausibilität.

## Acceptance Criteria

- `plantSlots = floor(zoneArea / areaPerPlant)` geprüft.
- `requiredPerPlant = footprintArea / packingDensity` ≤ `areaPerPlant` (Warnung sonst).
- Methode/Strain‑Kompatibilität (preferred/conflicting) berücksichtigt.

## Steps

1. Daten aus `cultivation_method.json` einbeziehen (containerSpec, substrate).
2. Fehler/Warnungen mit klaren Codes (z. B. `ZONE/PLANT_CAPACITY_EXCEEDED`).
3. Tests: Grenzfälle (knapp zu groß/klein, packingDensity).
