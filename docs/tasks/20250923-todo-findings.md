Create tasks to fix the issues:
Critical: tools/validate-data.ts imports ../src/backend/data/dataLoader.js, but the file lives at src/backend/src/data/dataLoader.ts; the relative path is wrong (breaks “pnpm validate:data” and CI).
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Completed 2025-09-24 — Snapshot/time documentation aligned with ADR 0005; protocol guide, README, and AGENTS updated.

Create tasks to fix the issues:
Event naming mismatch: backend emits SimulationEvent.level while frontend types/selectors use severity; alert counts and filters won’t work—map level->severity in useSimulationBridge or align types/selectors. Which ever comes handier and is less hardcoded.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Unsupported intents: frontend sends world.updateStructure, world.duplicateRoom, world.duplicateZone, world.deleteStructure, devices.toggleDeviceGroup, plants.togglePlantingPlan, etc., but backend facade only supports rent/create/update/delete (room/zone) and lacks these; calls will be rejected. Overhaul the messaging system used and create an open and modular one, which handles later needs.
Status: ✅ Completed 2025-09-23 — façade registry now exposes duplication, rename, and toggle intents; socket docs updated alongside ADR 0003 and AGENTS.md.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Setpoints not implemented: frontend emits config.update {type:'setpoint', ...}, but backend explicitly returns ERR_INVALID_STATE; implement setpoint handling. check for other devices, which can handle settings.
Status: ✅ Completed 2025-09-23 — façade now routes zone setpoints to device targets, clamps invalid values, and emits env.setpointUpdated events.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Snapshot shape mismatch: frontend types require snapshot.clock, backend snapshot omits it; runtime is guarded but typings are inaccurate—either add clock to snapshot or relax the type.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Version drift: socket.io-client is ^4.7.5 in frontend vs ^4.8.1 server; align to avoid subtle protocol issues.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Duplicate of snapshot/time documentation update (2025-09-24).

Create tasks to fix the issues:
Unused config: src/frontend/src/config/socket.ts isn’t used by useSimulationBridge (hardcodes '/socket.io'); wire it up so VITE_SOCKET_URL works in non-proxied deployments.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
Status: ✅ Completed 2025-09-25 — SOCKET_URL is now documented across AGENTS, READMEs, ADR 0006, and the socket protocol after wiring the shared config helper.

Create tasks to fix the issues:
Schema vs usage: deviceSchema.settings defines targetCo2 (camel) but code/JSON use targetCO2 (caps) plus other fields (targetTemperature, targetHumidity, targetCO2Range) not in schema; it’s allowed via .passthrough but consider documenting or extending zod for stronger validation.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.

Create tasks to fix the issues:
Minor ergonomics: rent/maintenance costs are per “tick” assuming 1h; if tick length changes at runtime, economic rates don’t scale—clarify or normalize per real-time.
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.

Create tasks to fix the issues:
Declutter the sourcecode: move /src/physio/_ to /src/backend/src/engine/physio/_ to match other engine subsystems; remove dead alias @/engine from vite.config.ts (points to non-existent /engine at project root).
Revise AGENTS.MD and other .md files to reflect current architecture. Document the changes and ADR-style decisions. Document every issue when it's considered as done.
