# 04 Simulation Loop and Events

- The scheduler supports adjustable tick length, pause, step, and fast-forward controls, emitting `sim.tickCompleted` after each pass so the UI can react deterministically.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L68-L70】
- Every tick follows the mandated phase order: applyDevices → deriveEnvironment → irrigationAndNutrients → updatePlants → harvestAndInventory → accounting → commit.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L71-L78】
- Socket.IO payloads include compact JSON with `tick`, millisecond `ts`, zone telemetry, plant snapshots, and domain events, while clients send `simulationControl` and `config.update` commands for runtime changes.【F:docs/re-reboot/source_documents/modular-plant-growth-simulation-prd.md†L104-L191】
