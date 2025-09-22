- [x] done

# TASK_physio_modules

## Goal

Module `src/physio/{vpd,ppfd,co2,temp,rh,transpiration}.ts` als **pure functions** nach WB-Formeln inkl. Golden-Master-Tests.

## Acceptance Criteria

- Jede Funktion **deterministisch**, Einheiten in JSDoc dokumentiert.
- Vitest: typische Szenarien, ε‑Toleranzen.
- Integration: Tick‑Phase nutzt diese Funktionen.

## Steps

1. Gleichungen aus `docs/WB-Formeln.md` in TS abbilden (keine Außen‑Side‑Effects).
2. `__tests__/physio/*.test.ts`: Golden‑Master‑Fixtures.
3. Doku: kurze README pro Modul (Inputs/Outputs/Einheiten).

## Notes

- Einheitspolitik/Benennung strikt einhalten.
