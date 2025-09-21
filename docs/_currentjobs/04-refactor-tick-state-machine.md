# Prompt: Tick-Orchestrierung als State Machine

## Aufgabe (Frage an Codex)

Vereinheitliche die Tick-Logik in klaren Phasen (reine Funktionen) und fasse sie zu einer expliziten State Machine zusammen.

## Ziel-Phasen (Vorschlag)

1. `applyDevices` → 2) `deriveEnvironment` → 3) `irrigationAndNutrients` → 4) `updatePlants` → 5) `harvestAndInventory` → 6) `accounting` → 7) `commit`

## Schritte (selbst ableiten & ausführen)

- Extrahiere bestehende Logik je Phase in pure functions (Input-→Output, ohne I/O).
- Orchestrator-Funktion `runTick(ctx)` führt alle Phasen deterministisch aus.
- Unit-Tests pro Phase + Integrationslauf (n Ticks) mit fixem Seed.
- Docs: `/docs/sim/tick-phases.md` inkl. Sequenzdiagramm.

## Pseudocode

```js
export async function runTick(ctx) {
  ctx = applyDevices(ctx);
  ctx = deriveEnvironment(ctx);
  ctx = irrigationAndNutrients(ctx);
  ctx = updatePlants(ctx);
  ctx = harvestAndInventory(ctx);
  ctx = accounting(ctx);
  return commit(ctx);
}
```
