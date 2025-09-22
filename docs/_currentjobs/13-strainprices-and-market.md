# Prompt: StrainPrices + Marktintegration

## Aufgabe (Frage an Codex)

Nutze `strainPrices.json` (seedPrice, harvestPricePerGram). Implementiere `qualityModifier` basierend auf Health/Stress.

## Ziele

- Umsatz = `harvestPricePerGram × qualityModifier × grams`.
- Tests: Qualitätsvariation wirkt sich auf Umsatz aus.

## Schritte

1. Registry `StrainPriceRegistry` + Validierung.
2. Einfaches Qualitätsmodell (0.7–1.2) dokumentieren.
   - Qualitätssignal kommt normalisiert (`0–1`) aus Health/Stress; ca. `0.6` entspricht neutraler Preisqualität (`×1.0`).
3. Abverkaufslogik im Accounting integrieren.
