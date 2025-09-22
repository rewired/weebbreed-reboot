- [ ] done

# TASK_json_schema_validation

## Goal

Laufzeitvalidierung für `strain.json`, `device.json`, `cultivation_method.json`, `strainPrices.json` (AJV oder Zod).

## Acceptance Criteria

- Validatoren pro Schema mit Tests.
- Build bricht bei invaliden Daten ab.
- **Keine Feldumbenennungen**, nur additive Extensions (optional).

## Steps

1. Schemas aus `/docs` übertragen (oder Zod‑Modelle ableiten).
2. Loader, der JSON lädt + validiert (pfadbasiert).
3. Fehlermeldungen mit Pfad/Grund ausgeben.
