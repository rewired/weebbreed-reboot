# Codex Prompt – Irrigation & Nutrient Overhaul · Phase 4 (Inventory & Cost Accounting)

You are Codex extending Weed Breed’s resource accounting layer. Honour `/AGENTS.md` constraints and the Phase 4 directives in `/docs/tasks/20250928-irrgitation-nutrient-overhaul.md`.

## Objective

Wire the new irrigation flows into structure-level water metering, nutrient inventory deduction, and financial charge pipelines.

## Required Steps

1. Update the structure utility tracking so every fulfilment call increments `utilities.lastTickWaterDraw_L` and accumulates to `utilities.waterMeter_m3` (convert litres → cubic metres during accounting).
2. Implement `pickInventoryBlend` (greedy solver) to select nutrient products matching demanded NPK grams. Handle shortages explicitly and ensure determinism (stable ordering, no random choice).
3. Add `deductInventory` helper(s) to mutate nutrient stock, supporting fractional kg consumption and preventing negative values. Emit shortage events if demand exceeds inventory.
4. Integrate cost booking via the finance service (`chargeWaterCost`, `chargeNutrientCost`) using tick-length-normalised rates. Confirm accounting occurs during the dedicated accounting phase.
5. For runoff handling, respect zone overrides or method defaults. Capture vs loss must influence water usage and possible reuse metrics.
6. Extend telemetry/snapshots to expose last tick water draw, cumulative meters, and nutrient inventory changes so the UI can surface resource consumption.
7. Add regression tests covering water usage, nutrient blending, shortage handling, and cost postings. Include at least one scenario test validating net irrigation vs runoff capture.

## Deliverables

- Inventory and accounting utilities with full TypeScript coverage and deterministic behaviour.
- Finance hooks/tests demonstrating correct cost calculations relative to tick length.
- Documentation updates detailing how nutrient blending and water metering work.

## Constraints & Reminders

- Preserve SI units (`L`, `m³`, `kg`); conversions must be explicit and tested.
- Emit structured events for shortages or anomalies using existing event bus patterns.
- Ensure the accounting phase remains idempotent when re-running the same tick (no double charges on replay).
