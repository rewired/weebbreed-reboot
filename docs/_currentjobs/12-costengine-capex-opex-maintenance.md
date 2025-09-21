# Prompt: CostEngine (CapEx/OpEx, Degeneration, Wartung)

## Aufgabe (Frage an Codex)

Implementiere ein Kostenmodell inkl. CapEx, Energie/Wasser/NPK, Wartungskurve (costIncreasePer1000Ticks) und Austausch-Trigger.

## Ziele

- Saubere Trennung Datenquelle (devicePrices) vs. Laufzeitzustand.
- KPIs pro Tick/Tag/Run.
- Deterministische Tests.

## Schritte

1. Modellklassen/Reducer in `src/economy`.
2. Integrations-Testläufe mit fixem Seed.
3. Reporting-Snippets (CSV/JSONL).
