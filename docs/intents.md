# Simulation Facade Intents

The simulation exposes a small number of validated intent domains. Each domain groups related commands that are available both through the in-process API and the Socket.IO `facade.intent` envelope. All commands return the shared `CommandResult` contract (`{ ok, data?, warnings?, errors? }`) where each error item includes `{ code, message, path?, category }` so callers can distinguish user mistakes from internal faults.【F:src/backend/src/facade/commands/commandRegistry.ts†L20-L114】【F:src/backend/src/server/socketGateway.ts†L518-L568】

## Domain Overview

| Domain      | Key actions                                                                                                   | Result data (when applicable)                        |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `time`      | `start`, `pause`, `resume`, `step`, `setSpeed`                                                                | Updated `TimeStatus` snapshot                        |
| `world`     | `rentStructure`, blueprint queries, room/zone CRUD, duplication, `renameStructure`, `newGame`, `resetSession` | IDs or catalog data depending on command             |
| `devices`   | `installDevice`, `updateDevice`, `moveDevice`, `removeDevice`, `toggleDeviceGroup`                            | Toggle returns affected device IDs                   |
| `plants`    | `addPlanting`, `cullPlanting`, `harvestPlanting`, `applyIrrigation`, `applyFertilizer`, `togglePlantingPlan`  | Toggle returns automation state                      |
| `health`    | `scheduleScouting`, `applyTreatment`, `quarantineZone`                                                        | –                                                    |
| `workforce` | `refreshCandidates`, `hire`, `fire`, `setOvertimePolicy`, `assignStructure`, `enqueueTask`                    | Candidate refresh/enqueue return contextual payloads |
| `finance`   | `sellInventory`, `setUtilityPrices`, `setMaintenancePolicy`                                                   | –                                                    |
| `config`    | `getDifficultyConfig`                                                                                         | Active difficulty configuration                      |

## Domain Details

### Time (`time.*`)

| Action     | Payload highlights                | Result data  |
| ---------- | --------------------------------- | ------------ |
| `start`    | `gameSpeed?`, `maxTicksPerFrame?` | `TimeStatus` |
| `pause`    | –                                 | `TimeStatus` |
| `resume`   | –                                 | `TimeStatus` |
| `step`     | `ticks?` (defaults to 1)          | `TimeStatus` |
| `setSpeed` | `multiplier` (positive)           | `TimeStatus` |

Definitions live in `commands/time.ts`, and the façade registers the domain automatically during construction.【F:src/backend/src/facade/commands/time.ts†L17-L67】【F:src/backend/src/facade/index.ts†L409-L463】

### World (`world.*`)

| Action                   | Payload highlights                                                           | Result data                                       |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| `rentStructure`          | `structureId`                                                                | Duplicate result with new structure identifiers   |
| `getStructureBlueprints` | –                                                                            | `StructureBlueprint[]`                            |
| `getStrainBlueprints`    | –                                                                            | `StrainBlueprintCatalogEntry[]`                   |
| `getDeviceBlueprints`    | –                                                                            | `DeviceBlueprintCatalogEntry[]`                   |
| `createRoom`             | `structureId`, `room { name, purpose, area, height? }`                       | –                                                 |
| `updateRoom`             | `roomId`, `patch` with any mutable field                                     | –                                                 |
| `deleteRoom`             | `roomId`                                                                     | –                                                 |
| `createZone`             | `roomId`, `zone { name, area, methodId, targetPlantCount? }`                 | Created zone result                               |
| `updateZone`             | `zoneId`, `patch` with name/area/method/targetPlantCount                     | –                                                 |
| `deleteZone`             | `zoneId`                                                                     | –                                                 |
| `renameStructure`        | `structureId`, `name`                                                        | –                                                 |
| `deleteStructure`        | `structureId`                                                                | –                                                 |
| `duplicateStructure`     | `structureId`, optional `name` override                                      | Duplicate structure result                        |
| `duplicateRoom`          | `roomId`, optional `name`                                                    | Duplicate room result                             |
| `duplicateZone`          | `zoneId`, optional `name`                                                    | Duplicate zone result                             |
| `resetSession`           | Optional payload (`{}` by default) to wipe current run while keeping rentals | Duplicate structure result reflecting fresh state |
| `newGame`                | Optional `{ difficulty?, seed?, modifiers? }`                                | –                                                 |

Schemas and handler bindings are defined in `commands/world.ts` and wired into the façade registry.【F:src/backend/src/facade/commands/world.ts†L24-L220】【F:src/backend/src/facade/index.ts†L439-L476】

### Devices (`devices.*`)

| Action              | Payload highlights                          | Result data               |
| ------------------- | ------------------------------------------- | ------------------------- |
| `installDevice`     | `targetId`, `deviceId`, optional `settings` | –                         |
| `updateDevice`      | `instanceId`, non-empty `settings` patch    | –                         |
| `moveDevice`        | `instanceId`, `targetZoneId`                | –                         |
| `removeDevice`      | `instanceId`                                | –                         |
| `toggleDeviceGroup` | `zoneId`, `kind`, `enabled`                 | `{ deviceIds: string[] }` |

Defined in `commands/devices.ts` and registered under the `devices` domain.【F:src/backend/src/facade/commands/devices.ts†L12-L86】【F:src/backend/src/facade/index.ts†L451-L478】

### Plants (`plants.*`)

| Action               | Payload highlights                                  | Result data                                |
| -------------------- | --------------------------------------------------- | ------------------------------------------ |
| `addPlanting`        | `zoneId`, `strainId`, `count`, optional `startTick` | –                                          |
| `cullPlanting`       | `plantingId`, optional `count`                      | –                                          |
| `harvestPlanting`    | `plantingId`                                        | –                                          |
| `harvestPlant`       | `plantId`                                           | `{ harvestBatchId, weightGrams, quality }` |
| `cullPlant`          | `plantId`                                           | `{ plantId, stage }`                       |
| `applyIrrigation`    | `zoneId`, `liters`                                  | –                                          |
| `applyFertilizer`    | `zoneId`, `nutrients { n, p, k }`                   | –                                          |
| `togglePlantingPlan` | `zoneId`, `enabled`                                 | `{ enabled: boolean }` result              |

Configured in `commands/plants.ts` and exposed through the façade registry.【F:src/backend/src/facade/commands/plants.ts†L12-L104】【F:src/backend/src/facade/index.ts†L451-L479】

### Health (`health.*`)

| Action             | Payload highlights   | Result data |
| ------------------ | -------------------- | ----------- |
| `scheduleScouting` | `zoneId`             | –           |
| `applyTreatment`   | `zoneId`, `optionId` | –           |
| `quarantineZone`   | `zoneId`, `enabled`  | –           |

Specified in `commands/health.ts` and wired into the façade registry.【F:src/backend/src/facade/commands/health.ts†L12-L72】【F:src/backend/src/facade/index.ts†L452-L480】

### Workforce (`workforce.*`)

| Action              | Payload highlights                                          | Result data |
| ------------------- | ----------------------------------------------------------- | ----------- |
| `refreshCandidates` | Optional `{ seed?, policyId?, force? }`                     | –           |
| `hire`              | `candidateId`, `role`, optional `wage`                      | –           |
| `fire`              | `employeeId`                                                | –           |
| `setOvertimePolicy` | `policy` (`"payout"` \| `"timeOff"`), optional `multiplier` | –           |
| `assignStructure`   | `employeeId`, optional `structureId`                        | –           |
| `enqueueTask`       | `taskKind`, optional `payload` (defaults to `{}`)           | –           |

Schemas live in `commands/workforce.ts`; the façade preprocesses optional payloads before routing to services.【F:src/backend/src/facade/commands/workforce.ts†L12-L112】【F:src/backend/src/facade/index.ts†L452-L481】

### Finance (`finance.*`)

| Action                 | Payload highlights                                                            | Result data |
| ---------------------- | ----------------------------------------------------------------------------- | ----------- |
| `sellInventory`        | `lotId`, `grams`                                                              | –           |
| `setUtilityPrices`     | Any subset of `electricityCostPerKWh`, `waterCostPerM3`, `nutrientsCostPerKg` | –           |
| `setMaintenancePolicy` | Optional `strategy`, optional `multiplier` (at least one)                     | –           |

Defined in `commands/finance.ts` and registered as the `finance` domain.【F:src/backend/src/facade/commands/finance.ts†L12-L78】【F:src/backend/src/facade/index.ts†L452-L482】

### Config (`config.*`)

| Action                | Payload highlights   | Result data        |
| --------------------- | -------------------- | ------------------ |
| `getDifficultyConfig` | – (defaults to `{}`) | `DifficultyConfig` |

Provided by `commands/config.ts` and exposed as `config.getDifficultyConfig` on the façade.【F:src/backend/src/facade/commands/config.ts†L12-L44】【F:src/backend/src/facade/index.ts†L452-L484】

## Accessing the Catalog at Runtime

- `SimulationFacade.listIntentDomains()` returns the available domains (useful for tooling or health checks).【F:src/backend/src/facade/index.ts†L776-L805】
- `SimulationFacade.getIntentHandler(domain, action)` resolves the runtime invoker that Socket clients ultimately call through `facade.intent`. Unknown domains/actions receive validation errors before execution.【F:src/backend/src/facade/index.ts†L776-L820】【F:src/backend/src/server/socketGateway.ts†L358-L403】

Use this document as the canonical reference for keeping UI workflows, integration tests, and documentation in sync with the currently implemented command surface.
