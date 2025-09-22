- [ ] done

# TASK_tick_machine

## Goal

Tick‑Orchestrierung gemäß ADR (Phasen 1–7) als kleine State‑Machine (z. B. XState) oder klarer Sequencer.

## Acceptance Criteria

- Reihenfolge strikt: applyDevices → deriveEnv → irrigation/NPK → updatePlants → harvest/inventory → accounting → commit.
- Unit‑Tests für Reihenfolge & Commit‑Atomizität.

## Steps

1. `src/sim/tickMachine.ts` anlegen (State‑Machine oder Sequencer).
2. Schnittstellen zu Physio‑Modulen (pure functions) einhängen.
3. Events am Tick‑Ende emittieren (siehe Event‑Bus‑Task).
