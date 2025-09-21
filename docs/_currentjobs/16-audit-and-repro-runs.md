# Prompt: Audit & Repro-Runs

## Aufgabe (Frage an Codex)

Baue ein Script `scripts/run_audit.(ts|mjs)`, das n-Tage-Runs erzeugt, KPIs als JSONL/CSV schreibt und Runs vergleicht.

## Ziele

- Reproduzierbarkeit mit Seed.
- ε-Toleranzen konfigurierbar.
- CI: nightly audit mit Fixseed.

## Schritte

1. Runner + KPI-Collector.
2. Vergleichstool (Vorher/Nachher).
3. Artifacts im CI speichern.
