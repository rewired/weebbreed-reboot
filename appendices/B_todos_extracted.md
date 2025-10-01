# Extracted TODO, OPEN, NEXT, and Numbered Action Items

## AGENTS.md

> L94: 1. **applyDevices** – apply device effects (lamp heat/PPFD, HVAC, vent, dehumid)

> L95: 2. **deriveEnvironment** – combine effects → effective zone env

> L96: 3. **irrigationAndNutrients** – watering + NPK

> L97: 4. **updatePlants** – growth, stress, disease, stage transitions

> L98: 5. **harvestAndInventory** – produce items, storage, spoilage timers

> L99: 6. **accounting** – OpEx, CapEx‑related maintenance, sales/market

> L100: 7. **commit** – snapshot, emit batched telemetry events

### Checklist

- [ ] L94: 1. **applyDevices** – apply device effects (lamp heat/PPFD, HVAC, vent, dehumid)
- [ ] L95: 2. **deriveEnvironment** – combine effects → effective zone env
- [ ] L96: 3. **irrigationAndNutrients** – watering + NPK
- [ ] L97: 4. **updatePlants** – growth, stress, disease, stage transitions
- [ ] L98: 5. **harvestAndInventory** – produce items, storage, spoilage timers
- [ ] L99: 6. **accounting** – OpEx, CapEx‑related maintenance, sales/market
- [ ] L100: 7. **commit** – snapshot, emit batched telemetry events

## CONTRIBUTING.md

> L7: 1. **Study the domain docs.** The blueprint and schema definitions in the [Data Dictionary](docs/DD.md), the extended JSON blueprint listings in [All JSON Blueprints](docs/addendum/all-json.md), and the simulation notes in the [Simulation Engine Overview](docs/system/simulation-engine.md) are the source of truth for content and engine behaviour. When working on blueprint data or engine logic, consult these first to avoid schema drift.

> L8: 2. **Understand validation expectations.** The [Blueprint Data Validation Workflow](docs/addendum/data-validation.md) explains the reporting pipeline that backs `pnpm validate:data` and documents how CI enforces data quality gates.

> L9: 3. **Install dependencies.** Use Node.js 20+ with [pnpm](https://pnpm.io/) and run `pnpm install` at the repository root to hydrate all workspace packages.

> L13: 1. Create a feature branch in your fork and sync with `main`.

> L14: 2. Make focused changes while keeping the tick engine, schema contracts, and naming conventions aligned with the docs listed above.

> L15: 3. Run targeted unit/integration tests for the packages you touched (`pnpm -r test` or package-specific scripts) and generate any necessary blueprint validation reports.

> L16: 4. Review generated artifacts (e.g., under `reports/validation`) before committing.

> L17: 5. Open a pull request that summarises the change, references the relevant docs, and links to any blueprint reports when applicable.

### Checklist

- [ ] L7: 1. **Study the domain docs.** The blueprint and schema definitions in the [Data Dictionary](docs/DD.md), the extended JSON blueprint listings in [All JSON Blueprints](docs/addendum/all-json.md), and the simulation notes in the [Simulation Engine Overview](docs/system/simulation-engine.md) are the source of truth for content and engine behaviour. When working on blueprint data or engine logic, consult these first to avoid schema drift.
- [ ] L8: 2. **Understand validation expectations.** The [Blueprint Data Validation Workflow](docs/addendum/data-validation.md) explains the reporting pipeline that backs `pnpm validate:data` and documents how CI enforces data quality gates.
- [ ] L9: 3. **Install dependencies.** Use Node.js 20+ with [pnpm](https://pnpm.io/) and run `pnpm install` at the repository root to hydrate all workspace packages.
- [ ] L13: 1. Create a feature branch in your fork and sync with `main`.
- [ ] L14: 2. Make focused changes while keeping the tick engine, schema contracts, and naming conventions aligned with the docs listed above.
- [ ] L15: 3. Run targeted unit/integration tests for the packages you touched (`pnpm -r test` or package-specific scripts) and generate any necessary blueprint validation reports.
- [ ] L16: 4. Review generated artifacts (e.g., under `reports/validation`) before committing.
- [ ] L17: 5. Open a pull request that summarises the change, references the relevant docs, and links to any blueprint reports when applicable.

## README.md

> L64: 1. Install Node.js 23 and pnpm 10 (matching CI).

> L65: 2. Install dependencies with `pnpm install`.

> L66: 3. Use `pnpm dev` for parallel backend/frontend development, or individual

> L68: 4. Run targeted checks locally before opening a pull request:

### Checklist

- [ ] L64: 1. Install Node.js 23 and pnpm 10 (matching CI).
- [ ] L65: 2. Install dependencies with `pnpm install`.
- [ ] L66: 3. Use `pnpm dev` for parallel backend/frontend development, or individual
- [ ] L68: 4. Run targeted checks locally before opening a pull request:

## WARP.md

> L7: 1. Common commands

> L43: 2. High-level architecture and structure

### Checklist

- [ ] L7: 1. Common commands
- [ ] L43: 2. High-level architecture and structure

## curated/data-schema.md

> L283: 1. **Missing roles inherit defaults.** Every default role is always present even

> L285: 2. **New roles are allowed.** Any role with an unknown `id` is accepted and will

> L287: 3. **Graceful roll handling.** Invalid or missing roll bounds are coerced to

> L289: 4. **Probability clamping.** Tertiary `chance` values are clamped to `[0, 1]`.

> L290: 5. **Salary guards.** Missing base salaries inherit the fallback role’s value,

> L469: 1. **Stay on `ts-node`.** Rejected because modern Node has native ESM support;

> L471: 2. **Keep emitting CommonJS bundles.** Rejected because the package already

> L474: 3. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds

> L578: `src/backend/src/engine/physio/` so they sit next to the engine subsystems

> L605: 1. **Leave the helpers at the repository root.** Rejected because it perpetuates

> L607: 2. **Promote the helpers to a dedicated workspace package.** Deferred until we

> L669: 1. **Allow independent version drift.** Rejected because the protocol-level

> L672: 2. **Vendor the Socket.IO client.** Deferred — bundling the client manually would

> L739: 1. **Expose direct device updates over the socket.** Rejected because it would

> L742: 2. **Store setpoints only in zone state and let devices poll it.** Rejected to

> L745: 3. **Interpret VPD in the UI.** Rejected to keep physics-derived conversions on

> L816: 1. **Add ad-hoc socket events per workflow.** Rejected because each new command

> L819: 2. **Expose engine services directly over the socket.** Rejected to avoid

> L822: 3. **Keep the legacy CRUD surface and emulate missing workflows in the UI.**

> L894: 1. **Keep React Context for global state.** Rejected because the volume of

> L897: 2. **Adopt a component library instead of Tailwind.** Deferred: Tailwind paired

> L900: 3. **Use the raw Socket.IO client per component.** Rejected to avoid duplicated

> L1165: 1. Rename the affected fields in custom blueprints and convert their values using the table above.

> L1166: 2. Update any scripts or tooling that reference the previous keys (e.g., editors, validators).

> L1167: 3. Re-run schema validation to confirm compliance with the updated device and strain Zod schemas.

> L1168: 4. Review cultivation method compatibility rules for the renamed photoperiod key.

> L1197: 1. ✅ Replace the mock facade (`src/frontend/src/facade/systemFacade.ts`) with live Socket.IO wiring once the backend exposes the

> L1200: 2. ✅ Reintegrate analytics-heavy components (Recharts time-series expansions, TanStack Table virtualisation) using live data when

> L1203: 3. ✅ Port modal workflows for rent/duplicate/delete actions to real facade intents, including optimistic UI feedback and command

> L1206: 4. ✅ Extend automated tests for navigation, modal focus trapping, and responsive sidebar behaviour once the UI stabilises. Added

> L1230: ## Create tasks to fix the issues: (docs/tasks/20250923-todo-findings.md)

> L1232: Source: [`docs/tasks/20250923-todo-findings.md`](../docs/tasks/20250923-todo-findings.md)

> L1245: Unsupported intents: frontend sends world.updateStructure, world.duplicateRoom, world.duplicateZone, world.deleteStructure, devices.toggleDeviceGroup, plants.togglePlantingPlan, etc., but backend facade only supports rent/create/update/delete (room/zone) and lacks these; calls will be rejected. Overhaul the messaging system used and create an open and modular one, which handles later needs.

### Checklist

- [ ] L283: 1. **Missing roles inherit defaults.** Every default role is always present even
- [ ] L285: 2. **New roles are allowed.** Any role with an unknown `id` is accepted and will
- [ ] L287: 3. **Graceful roll handling.** Invalid or missing roll bounds are coerced to
- [ ] L289: 4. **Probability clamping.** Tertiary `chance` values are clamped to `[0, 1]`.
- [ ] L290: 5. **Salary guards.** Missing base salaries inherit the fallback role’s value,
- [ ] L469: 1. **Stay on `ts-node`.** Rejected because modern Node has native ESM support;
- [ ] L471: 2. **Keep emitting CommonJS bundles.** Rejected because the package already
- [ ] L474: 3. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds
- [ ] L578: `src/backend/src/engine/physio/` so they sit next to the engine subsystems
- [ ] L605: 1. **Leave the helpers at the repository root.** Rejected because it perpetuates
- [ ] L607: 2. **Promote the helpers to a dedicated workspace package.** Deferred until we
- [ ] L669: 1. **Allow independent version drift.** Rejected because the protocol-level
- [ ] L672: 2. **Vendor the Socket.IO client.** Deferred — bundling the client manually would
- [ ] L739: 1. **Expose direct device updates over the socket.** Rejected because it would
- [ ] L742: 2. **Store setpoints only in zone state and let devices poll it.** Rejected to
- [ ] L745: 3. **Interpret VPD in the UI.** Rejected to keep physics-derived conversions on
- [ ] L816: 1. **Add ad-hoc socket events per workflow.** Rejected because each new command
- [ ] L819: 2. **Expose engine services directly over the socket.** Rejected to avoid
- [ ] L822: 3. **Keep the legacy CRUD surface and emulate missing workflows in the UI.**
- [ ] L894: 1. **Keep React Context for global state.** Rejected because the volume of
- [ ] L897: 2. **Adopt a component library instead of Tailwind.** Deferred: Tailwind paired
- [ ] L900: 3. **Use the raw Socket.IO client per component.** Rejected to avoid duplicated
- [ ] L1165: 1. Rename the affected fields in custom blueprints and convert their values using the table above.
- [ ] L1166: 2. Update any scripts or tooling that reference the previous keys (e.g., editors, validators).
- [ ] L1167: 3. Re-run schema validation to confirm compliance with the updated device and strain Zod schemas.
- [ ] L1168: 4. Review cultivation method compatibility rules for the renamed photoperiod key.
- [ ] L1197: 1. ✅ Replace the mock facade (`src/frontend/src/facade/systemFacade.ts`) with live Socket.IO wiring once the backend exposes the
- [ ] L1200: 2. ✅ Reintegrate analytics-heavy components (Recharts time-series expansions, TanStack Table virtualisation) using live data when
- [ ] L1203: 3. ✅ Port modal workflows for rent/duplicate/delete actions to real facade intents, including optimistic UI feedback and command
- [ ] L1206: 4. ✅ Extend automated tests for navigation, modal focus trapping, and responsive sidebar behaviour once the UI stabilises. Added
- [ ] L1230: ## Create tasks to fix the issues: (docs/tasks/20250923-todo-findings.md)
- [ ] L1232: Source: [`docs/tasks/20250923-todo-findings.md`](../docs/tasks/20250923-todo-findings.md)
- [ ] L1245: Unsupported intents: frontend sends world.updateStructure, world.duplicateRoom, world.duplicateZone, world.deleteStructure, devices.toggleDeviceGroup, plants.togglePlantingPlan, etc., but backend facade only supports rent/create/update/delete (room/zone) and lacks these; calls will be rejected. Overhaul the messaging system used and create an open and modular one, which handles later needs.

## curated/simulation-loop.md

> L15: 1. **Tick duration is described as both fixed and variable.** The simulation philosophy states that each tick is a fixed hour of game time, while the simulation engine guidance expects systems to recalculate costs when the tick length changes at runtime, implying the duration is adjustable.【F:docs/system/simulation_philosophy.md†L5-L8】【F:docs/system/simulation-engine.md†L175-L186】

> L16: 2. **Client control over tick length conflicts.** The UI building guide insists the backend keeps tick length immutable to clients, yet the socket protocol documents a `config.update` command that lets clients change `tickLength`, and the component guide still maps a tick-length slider to `time.setTickLength` intents.【F:docs/ui-building_guide.md†L366-L394】【F:docs/system/socket_protocol.md†L423-L455】【F:docs/ui/ui-components-desciption.md†L31-L34】

> L17: 3. **State management responsibilities diverge.** The UI guide prescribes a snapshot-driven Zustand store that leaves simulation state immutable in the client, but the component documentation still portrays `App.tsx` as owning mutable game data and recomputing state locally for every interaction.【F:docs/ui-building_guide.md†L364-L371】【F:docs/ui/ui-components-desciption.md†L74-L82】

> L18: 4. **Finance interactions are simultaneously required and absent.** The UI guide claims the dashboard must expose finance intents such as selling inventory and adjusting utility prices, yet the component catalogue declares the finance view read-only with no wired finance intents.【F:docs/ui-building_guide.md†L414-L417】【F:docs/ui/ui-components-desciption.md†L66-L68】

> L275: After a plant has spent the minimum required time in its current growth stage, this is the daily chance it will transition to the next stage.

> L566: - **Team roster** renders employee cards with salary, assignment, and morale/energy bars. Each card exposes a "Fire" action that opens the global confirmation modal and dispatches `workforce.fire` on approval.

> L567: - **Job market** lists applicants as cards with skill progress bars, trait badges, and a "Hire" button. Hiring opens the dedicated modal (global modal slice) and sends `workforce.hire` with the configured wage. A refresh button triggers `workforce.refreshCandidates`.

### Checklist

- [ ] L15: 1. **Tick duration is described as both fixed and variable.** The simulation philosophy states that each tick is a fixed hour of game time, while the simulation engine guidance expects systems to recalculate costs when the tick length changes at runtime, implying the duration is adjustable.【F:docs/system/simulation_philosophy.md†L5-L8】【F:docs/system/simulation-engine.md†L175-L186】
- [ ] L16: 2. **Client control over tick length conflicts.** The UI building guide insists the backend keeps tick length immutable to clients, yet the socket protocol documents a `config.update` command that lets clients change `tickLength`, and the component guide still maps a tick-length slider to `time.setTickLength` intents.【F:docs/ui-building_guide.md†L366-L394】【F:docs/system/socket_protocol.md†L423-L455】【F:docs/ui/ui-components-desciption.md†L31-L34】
- [ ] L17: 3. **State management responsibilities diverge.** The UI guide prescribes a snapshot-driven Zustand store that leaves simulation state immutable in the client, but the component documentation still portrays `App.tsx` as owning mutable game data and recomputing state locally for every interaction.【F:docs/ui-building_guide.md†L364-L371】【F:docs/ui/ui-components-desciption.md†L74-L82】
- [ ] L18: 4. **Finance interactions are simultaneously required and absent.** The UI guide claims the dashboard must expose finance intents such as selling inventory and adjusting utility prices, yet the component catalogue declares the finance view read-only with no wired finance intents.【F:docs/ui-building_guide.md†L414-L417】【F:docs/ui/ui-components-desciption.md†L66-L68】
- [ ] L275: After a plant has spent the minimum required time in its current growth stage, this is the daily chance it will transition to the next stage.
- [ ] L566: - **Team roster** renders employee cards with salary, assignment, and morale/energy bars. Each card exposes a "Fire" action that opens the global confirmation modal and dispatches `workforce.fire` on approval.
- [ ] L567: - **Job market** lists applicants as cards with skill progress bars, trait badges, and a "Hire" button. Hiring opens the dedicated modal (global modal slice) and sends `workforce.hire` with the configured wage. A refresh button triggers `workforce.refreshCandidates`.

## curated/ui.md

> L19: 1. Rebase onto the toolchain commit. Resolve path conflicts by replacing

> L21: 2. Update local scripts:

> L26: 3. If your branch added new backend files outside `src/backend/src`, move them

> L28: 4. Install workspace dependencies (`pnpm install`) to obtain `tsup`.

### Checklist

- [ ] L19: 1. Rebase onto the toolchain commit. Resolve path conflicts by replacing
- [ ] L21: 2. Update local scripts:
- [ ] L26: 3. If your branch added new backend files outside `src/backend/src`, move them
- [ ] L28: 4. Install workspace dependencies (`pnpm install`) to obtain `tsup`.

## curated/vision.md

> L100: 1. **applyDevices** – apply device effects (lamp heat/PPFD, HVAC, vent, dehumid)

> L101: 2. **deriveEnvironment** – combine effects → effective zone env

> L102: 3. **irrigationAndNutrients** – watering + NPK

> L103: 4. **updatePlants** – growth, stress, disease, stage transitions

> L104: 5. **harvestAndInventory** – produce items, storage, spoilage timers

> L105: 6. **accounting** – OpEx, CapEx‑related maintenance, sales/market

> L106: 7. **commit** – snapshot, emit batched telemetry events

> L731: 1. Install Node.js 23 and pnpm 10 (matching CI).

> L732: 2. Install dependencies with `pnpm install`.

> L733: 3. Use `pnpm dev` for parallel backend/frontend development, or individual

> L735: 4. Run targeted checks locally before opening a pull request:

> L794: 1. Common commands

> L830: 2. High-level architecture and structure

> L901: | docs/\_final/11-open-questions.md | Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ] | 2025-10-01T11:53:08.100111 | 1330 | [vision, simulation loop, devices, agents/tasks, ops] | pending |

> L951: | docs/tasks/20250923-todo-findings.md | Create tasks to fix the issues: | 2025-10-01T11:53:08.108112 | 5332 | [data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | pending |

> L952: | docs/tasks/20250924-todo-findings.md | • Critical: config.update setpoint rejects UUID zoneIds (backend socketGateway.t | 2025-10-01T11:53:08.108112 | 5896 | [vision, data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | pending |

> L985: 1. **Study the domain docs.** The blueprint and schema definitions in the [Data Dictionary](docs/DD.md), the extended JSON blueprint listings in [All JSON Blueprints](docs/addendum/all-json.md), and the simulation notes in the [Simulation Engine Overview](docs/system/simulation-engine.md) are the source of truth for content and engine behaviour. When working on blueprint data or engine logic, consult these first to avoid schema drift.

> L986: 2. **Understand validation expectations.** The [Blueprint Data Validation Workflow](docs/addendum/data-validation.md) explains the reporting pipeline that backs `pnpm validate:data` and documents how CI enforces data quality gates.

> L987: 3. **Install dependencies.** Use Node.js 20+ with [pnpm](https://pnpm.io/) and run `pnpm install` at the repository root to hydrate all workspace packages.

> L991: 1. Create a feature branch in your fork and sync with `main`.

> L992: 2. Make focused changes while keeping the tick engine, schema contracts, and naming conventions aligned with the docs listed above.

> L993: 3. Run targeted unit/integration tests for the packages you touched (`pnpm -r test` or package-specific scripts) and generate any necessary blueprint validation reports.

> L994: 4. Review generated artifacts (e.g., under `reports/validation`) before committing.

> L995: 5. Open a pull request that summarises the change, references the relevant docs, and links to any blueprint reports when applicable.

> L1032: - [Open Issues](#open-issues)

> L1041: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】

> L1060: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.

> L1089: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.

> L1124: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).

> L1163: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).

> L1186: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.

> L1222: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |

> L1227: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |

> L1424: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】

> L1434: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】

> L1436: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.

> L1475: | `notifications` | Open notifications. |

> L1476: | `settings` | Open game menu (Save/Load/Export/Reset). |

> L1483: | `tune` | Adjust settings for a device group (opens modal). |

> L1484: | `schedule` | Edit light cycle for a zone (opens modal). |

> L1486: | `arrow_forward_ios` | Navigate to next zone. |

> L1607: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】

> L1634: ## Open Issues

> L2006: **Elevator Pitch.** _Weed Breed_ is a modular, deterministic plant/grow simulation as a game. Players plan structures (Buildings → Rooms → Zones → Plants), control climate and devices, balance cost and yield, and experience complete cultivation cycles—from seeding to harvest and post-harvest. The system is open, extensible, and content-driven (blueprint JSONs) so that community, modders, and researchers can easily contribute content.

> L2012: 1. **Determinism over visuals.** Reproducible runs beat visual effects.

> L2013: 2. **Playability over realism.** Plausible rather than strictly scientific—with explicit simplifications where needed.

> L2014: 3. **Open architecture.** Data/modding first, clear interfaces, stable formats.

> L2015: 4. **Transparency.** Visible metrics, explainable decisions (logs, audits, replays).

> L2016: 5. **Tight feedback loops.** Fun comes from meaningful micro-decisions in day-to-day operations.

> L2054: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_

> L2055: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_

> L2062: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_

> L2094: **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_

> L2215: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_

> L2256: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_

> L2264: 1. **MVP:** One structure, basic climate control, 1–2 strains, 1 method, basic economy, save/load, deterministic 30-day run.

> L2265: 2. **Alpha:** Pests/diseases + treatments, device degradation/maintenance, shop/research loop, editor v1.

> L2266: 3. **Beta:** Balancing pass, golden runs (200 days), stability SLOs met, localization EN/DE.

> L2267: 4. **1.0:** Content polish, modding docs, replay exporter, performance tuning.

> L2419: - [Open Questions](#open-questions)

> L2426: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】

> L2587: ## Open Questions

> L2591: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】

> L2592: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】

> L2593: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】

> L2594: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】

> L2595: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】

> L2596: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

> L2615: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

> L2636: - [Open Questions](#open-questions)

> L2643: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】

> L2790: ## Modular Plant Growth Simulation (Open Architecture)

> L2828: 1. **Run a tick-based simulation** with configurable tick length (e.g., 1–10 minutes of sim time per tick).

> L2829: 2. **Adjust conditions at runtime** (pause/resume, tick rate, setpoints for light/temperature/CO₂).

> L2830: 3. **Visualize telemetry** (time-series charts for T, RH, VPD, PPFD; tables for plants/devices).

> L2831: 4. **Save & load** full state with schema validation and versioning.

> L2872: 1. `applyDevices` → 2) `deriveEnvironment` → 3) `irrigationAndNutrients` → 4) `updatePlants` → 5) `harvestAndInventory` → 6) `accounting` → 7) `commit`.&#x20;

> L3048: 1. **M1 – Core Loop & Bus (Backend)**

> L3052: 2. **M2 – Physics & Plant Model**

> L3055: 3. **M3 – Save/Load & Schemas**

> L3058: 4. **M4 – Dashboard (Frontend)**

> L3061: 5. **M5 – Benchmarks & Hardening**

> L3074: ## 13) Open Questions

> L3104: > This PRD is designed to be “open architecture”: physics and plant models are boxed behind a single module boundary; devices, strains, and methods are pure JSON blueprints; the loop and event bus are stable contracts for UI and future systems. &#x20;

> L3116: ## Open Questions

> L3120: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】

> L3121: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】

> L3122: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】

> L3123: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】

> L3124: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】

> L3125: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

> L3144: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

> L3169: - [Open Issues](#open-issues)

> L3178: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】

> L3197: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.

> L3228: - **Time display:** combines the in-game date/time (e.g., `Y1, D30, 14:00`) with an SVG tick-progress ring that animates toward the next tick via `stroke-dashoffset` transitions.【F:docs/ui/ui-implementation-spec.md†L59-L66】【F:docs/ui/ui_elements.md†L31-L34】

> L3234: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.

> L3269: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).

> L3281: - Persistent header presents StatCards for **Capital**, **Cumulative Yield**, and **Planned plant capacity**, plus the in-game **Time display** with its SVG tick-progress ring to visualize the march toward the next tick.【F:docs/ui/ui-implementation-spec.md†L56-L66】【F:docs/ui/ui_elements.md†L31-L34】

> L3308: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).

> L3331: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.

> L3367: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |

> L3372: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |

> L3420: - **EnvironmentPanel**: collapsed summary renders KPI chips for temperature, humidity, VPD, CO₂, PPFD, and the active light cycle (see `11-zone-detailview-(setup-closed).png`). Expanding the panel (see `12-zone-detailview-(setup-opened).png`) reveals range inputs for temperature, humidity, VPD, CO₂, and PPFD plus a lighting on/off toggle tied to the PPFD target. Sliders clamp to backend corridors — Temperature `[10, 35]` °C, Relative Humidity `[0, 1]`, VPD `[0, 2.5]` kPa, CO₂ `[0, 1800]` ppm, and PPFD `[0, 1500]` µmol·m⁻²·s⁻¹ — and surface clamp warnings inline so operators know when adjustments hit safety limits. Controls dispatch `config.update { type: 'setpoint' }` commands and disable automatically when the required devices are absent.【F:docs/ui/ui-components-desciption.md†L407-L462】

> L3424: - **ZoneView**: renders device and plant CTAs that open the install/plant modals with the active zone context, reinforcing empty-state guidance when lists are empty.【F:src/frontend/src/views/ZoneView.tsx†L286-L398】

> L3570: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】

> L3580: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】

> L3582: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.

> L3621: | `notifications` | Open notifications. |

> L3622: | `settings` | Open game menu (Save/Load/Export/Reset). |

> L3629: | `tune` | Adjust settings for a device group (opens modal). |

> L3630: | `schedule` | Edit light cycle for a zone (opens modal). |

> L3632: | `arrow_forward_ios` | Navigate to next zone. |

> L3753: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】

> L3780: ## Open Issues

> L3949: 1. Accumulate real time.

> L3950: 2. Execute ticks when `accumulated ≥ tickInterval / gameSpeed`.

> L3951: 3. **Catch-up**: Process up to `maxTicksPerFrame` to avoid long stalls.

> L3953: 1. **Device control** (evaluate setpoints, on/off, hysteresis).

> L3954: 2. **Apply device effects** (to zone environment: ΔT, ΔRH, PPFD, CO₂).

> L3955: 3. **Environment mixing/normalization** (ambient exchange scaled by airflow/enclosure).

> L3956: 4. **Irrigation/Nutrients** (compute per-tick water/N/P/K demands from phase-based curves; update stocks, log deficits).

> L3957: 5. **Plants** (growth, phenology, stress from temp/RH/CO₂/light & resource status; stage changes).

> L3958: 6. **Health** (detect → progress → spread → treatments; apply PHI/re-entry).

> L3959: 7. **Tasks & Agents** (generate tasks; employees seek/claim/execute respecting skills/tools/locks).

> L3960: 8. **Harvest/Inventory/Market** (lot creation, timestamps, quality decay).

> L3961: 9. **Accounting** (OPEX: maintenance/energy/water/nutrients/labor/rent; CapEx events).

> L3962: 10. **Commit** (snapshot + batched events).

> L3996: 1. **Detect**: Visibility increases over time; **scouting tasks** and traps add detection rolls.

> L3997: 2. **Progress**: Severity grows with favorable environment and balancing multipliers.

> L3998: 3. **Spread**: Probabilistic transmission within zone and to neighbors; influenced by airflow/sanitation/tools.

> L3999: 4. **Treatments**: Apply efficacy to severity/infection; respect `cooldownDays`, **`reentryIntervalTicks`**, **`preHarvestIntervalTicks`**.

> L4000: 5. **Events**: `pest.detected`, `disease.confirmed`, `health.spread`, `treatment.applied`, `outbreak.contained`.

> L4047: - `timeOff`: credit overtime to `leaveHours`; the next OffDuty window is extended accordingly.

> L4155: (Exact signatures/types are left open by design.)

> L4296: 1. **Load & validate.** Parse blueprints, run schema validation, and reject or migrate files that fall outside required ranges.

> L4297: 2. **Materialize instances.** Copy template values into runtime records, apply scenario overrides, derive geometric aggregates (e.g., structure volume), and attach deterministic identifiers.

> L4298: 3. **Link cross-references.** Resolve ids across maps (e.g., device prices, strain prices) before the first tick. Missing references are fatal until documented and added to the blueprint set.

> L4299: 4. **Runtime usage.** Engine subsystems read only from materialized instances, ensuring tick execution cannot mutate shared template data. Derived telemetry must include source blueprint ids for auditability.

> L4390: 1. **Wall-time accumulation**: keep `accumulatedMs += now - lastNow`.

> L4391: 2. **Tick threshold**: while `accumulatedMs ≥ tickIntervalMs / gameSpeed`, do:

> L4395: 3. **Snapshot & events**: publish a read-only snapshot and batched events after each committed tick.

> L4413: 1. **Start** from last values: `T`, `RH`, `CO2`, (optional `PPFD`).

> L4414: 2. **Device deltas**

> L4427: 3. **Plant deltas** (coarse canopy physiology)

> L4433: 4. **Normalization toward ambient**

> L4436: 5. **Clamp & commit**

> L4438: 6. **Events**

> L4458: 1. **Phenology update**

> L4460: 2. **Resource requirement**

> L4465: 3. **Stress computation (0–1)**

> L4469: 4. **Health update (0–1)**

> L4472: 5. **Potential growth**

> L4480: 6. **Quality & harvest window**

> L4500: 1. **Detect**

> L4503: 2. **Progress**

> L4508: 3. **Treat**

> L4547: - `timeOff`: credit overtime to `leaveHours`; next OffDuty extends accordingly.

> L4632: 1. **Input**: The player manages the environment.

> L4633: 2. **Problem**: The environment's deviation from the plant's ideal conditions creates `Stress`.

> L4634: 3. **State**: `Stress` negatively impacts the plant's `Health`.

> L4635: 4. **Output**: `Health` directly multiplies the plant's potential `Growth`.

> L4745: 1. **Weekly API seed.** `apiSeed = override ?? "<gameSeed>-<weekIndex>"` keeps

> L4748: 2. **Profile-specific personal seeds.**

> L4751: 3. **RNG stream isolation.** Each personal seed is hashed and fed into

> L4757: 4. **ID generation.** Applicant IDs come from the stable `job-market` RNG stream

> L4764: 1. **Profile collection.** Fetch remote profiles (or synthesize offline names)

> L4766: 2. **Normalization.** Names are trimmed and title-cased; missing entries fall

> L4768: 3. **Personal seed resolution.** Missing seeds are replaced with an offline seed

> L4770: 4. **Gender draw.** Seeded RNG selects gender with `P(other) = pDiverse` and

> L4773: 5. **Role selection.** Weighted draw using each blueprint’s `roleWeight`

> L4777: 6. **Skill roll.** Apply the blueprint `skillProfile` for primary/secondary

> L4780: 7. **Trait roll.** Sample distinct trait IDs from the personnel directory (if

> L4782: 8. **Salary computation.** Start from the role blueprint’s `salary.basePerTick`,

> L4786: 9. **Assembly.** Produce `ApplicantState` records with `id`, `name`,

> L4850: 1. Ensure the backend has network access to `randomuser.me` **or** ship the

> L4852: 2. Optionally set `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true` when running in

> L4854: 3. Monitor `hr.candidatesRefreshed` events and job market logs to confirm weekly

> L4856: 4. Use the façade command `refreshCandidates` with `force=true` or a custom

> L4885: 1. Replace imports of `../src/lib/eventBus.js` (or equivalent) for runtime telemetry with

> L4888: 2. Update `eventBus.emit({ ... })` calls to use the helper signature where convenient:

> L4894: 3. When queuing events during tick processing, prefer `collector.queue('type', payload,

> L4939: 1. `{ channel: 'simulationUpdate', payload: SimulationUpdateMessage }`

> L4940: 2. `{ channel: 'sim.tickCompleted', payload: UiSimulationTickEvent }`

> L4941: 3. `{ channel: 'domainEvents', payload: UiDomainEventsMessage }`

> L4942: 4. `{ channel: <event.type>, payload: event.payload ?? null }`

> L4948: 1. The client connects to the single Socket.IO namespace (`/`).

> L4949: 2. Immediately after the connection the gateway emits:

> L4966: next to the frontend package (see `.env.example`) to point the UI at a

> L5101: "nextDueTick": 210,

> L5681: - **Determinism guard**: disallow commands that would change RNG order within a committed tick; schedule for next tick if needed.

> L5735: 1. **Device Control** (evaluate setpoints & hysteresis)

> L5736: 2. **Apply Device Deltas** (T/RH/CO₂/PPFD)

> L5737: 3. **Normalize to Ambient** (mixing, airflow)

> L5738: 4. **Irrigation/Nutrients** (NPK g/m²/day → per‑tick, per‑plant)

> L5739: 5. **Plants** (growth, stress, health update)

> L5740: 6. **Health** (detect, progress, spread, treat; enforce re‑entry & PHI)

> L5741: 7. **Tasks & Agents** (generate, claim, execute; overtime policy)

> L5742: 8. **Inventory/Market**

> L5743: 9. **Finance**

> L5744: 10. **Commit & Emit**

> L5867: To keep the labor market dynamic and credible, the game continuously injects new, unique candidates. Rather than relying only on a fixed local name list, the game **optionally** queries a **seedable external name provider** (e.g., an API that returns first/last names) and falls back to local data if unavailable. An free and open provider is https://randomuser.me/. For detailed information about the API, check the providers documentation.

> L5930: - **`timeOff`** — credit overtime hours to the employee’s **`leaveHours`** balance. In their next **OffDuty** period, they take this extra time off. This saves immediate cash but reduces near-term availability.

> L6062: 1. **Manual documentation only.** Rejected because it burdens operators with

> L6064: 2. **Bundling static name lists in git.** Deferred to avoid shipping a bloated

> L6066: 3. **Lazy provisioning inside the job market refresh.** Rejected because the

> L6243: ## Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ] (docs/\_final/11-open-questions.md)

> L6245: Source: [`docs/_final/11-open-questions.md`](../docs/_final/11-open-questions.md)

> L6247: # Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ]

> L6249: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】

> L6250: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】

> L6251: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】

> L6252: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】

> L6253: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】

> L6254: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

> L6298: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】

> L6321: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

> L9415: "notes": "Avoid on open flowers; can harm beneficials."

> L11140: 1. **Rulekit scaffolding**

> L11145: 2. **Lexer & parser foundation**

> L11150: 3. **IR schema & validation**

> L11155: 4. **Expression compiler**

> L11160: 5. **Effect operator implementation**

> L11165: 6. **Runtime scheduler & trigger engine**

> L11170: 7. **Engine accessors & integration hooks**

> L11175: 8. **Rule loading pipeline**

> L11180: 9. **Tooling & scripts**

> L11185: 10. **Authoring starter packages**

> L11190: 11. **Testing & QA suite**

> L11195: 12. **Telemetry & observability**

> L11600: 0.6, 0.7,

> L11603: 0.6, 0.7,

> L11609: 0.5, 0.6,

> L11612: 0.5, 0.6,

> L11896: // show in table/modal; allow user to pin as new parents for next step

> L11983: The screenshots convey a dashboard-style application that guides the player from high-level operations down to per-plant decisions through a clear Structure → Room → Zone drill-down, as illustrated in the structure and room overview captures ([Structure overview](./screenshots/03-structure-overview.png), [Room overview](./screenshots/10-room-overview-%28growroom%29.png)). Global navigation relies on cards and inline actions to jump between these hierarchy levels while providing immediate CRUD affordances for each tier.【F:docs/ui/ui-components-desciption.md†L483-L525】【F:docs/ui/ui_interactions_spec.md†L27-L37】 Zone views then compose telemetry, device management, and plant operations into a single control surface, matching the micro-loop described in the interaction spec and shown in the zone detail screens ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L533】【F:docs/ui/ui_interactions_spec.md†L40-L54】

> L11987: The welcome screen foregrounds the StartScreen component with quick entry points for New, Quick, and Import game flows, reflecting the lifecycle actions in the façade contract and captured in the welcome hero ([Welcome screen](./screenshots/01-welcome-screen.png)).【F:docs/ui/ui-components-desciption.md†L393-L399】【F:docs/ui/ui_interactions_spec.md†L13-L23】 Selecting “New Game” opens a dedicated modal that captures company metadata and a deterministic seed using shared modal and form primitives, reinforcing that modal workflows pause gameplay until the façade acknowledges the command, as seen in the new game form ([New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L347-L353】【F:docs/ui/ui-components-desciption.md†L123-L178】

> L11995: Within a zone, the screenshots highlight the layered EnvironmentPanel (collapsed vs. expanded), device lists, and the ZonePlantPanel’s batch-selection mode. This trio encapsulates monitoring, setpoint control, and multi-plant actions that the cultivation loop depends on, as evidenced in the zone detail captures ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L462】【F:docs/ui/ui_interactions_spec.md†L40-L54】 Complementary strategic views such as PersonnelView and FinanceView expose their respective loops via tabbed candidate/staff management and collapsible revenue/expense reports, mirroring the hiring and finance stories from the spec and illustrated by their overview shots ([Personnel – job market](./screenshots/04-personell-overview-%28job-market%29.png), [Personnel – employees](./screenshots/05-personell-overview-%28my-employees%29.png), [Finance – cards collapsed](./screenshots/06-finances-overview-%28cards_closed%29.png), [Finance – cards expanded](./screenshots/07-finances-overview-%28cards_opened%29.png)).【F:docs/ui/ui-components-desciption.md†L490-L509】【F:docs/ui/ui_interactions_spec.md†L58-L73】

> L11999: Every modal in the screenshots—including the game menu and hiring/new game flows—reuses the shared Modal shell, Form inputs, and Primary buttons, underscoring a consistent command pattern for façade intents and visible across multiple modal captures ([Game menu modal](./screenshots/08-model-game_menu.png), [New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L123-L178】【F:docs/ui/ui-components-desciption.md†L323-L337】 The dark Tailwind-based design system (stone background, lime accents) gives all cards and panels a cohesive appearance, reinforcing that gameplay relies on high-contrast status colors for quick scanning, a theme evident in the dashboard imagery ([Structure overview cards](./screenshots/03-structure-overview.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png)).【F:docs/ui/ui-components-desciption.md†L551-L574】 Together, these patterns show that the UI concept emphasizes deterministic flows, reusable components, and a layered information hierarchy that mirrors the simulation architecture.

> L12025: - When a modal is open, the simulation content behind it is visually de‑emphasized using a blur.

> L12065: - **Tick progress ring**: an SVG circle animating to the next tick (hour). Animate stroke via `stroke-dashoffset`.

> L12092: - **Notifications** (icon: `notifications`) → opens a popover with alerts. A red badge (`.notifications-badge`) shows the count of unread alerts.

> L12145: - **+ Rent Structure** button: opens the **rent** modal.

> L12154: - **Rename** (`edit`) → opens **rename** modal.

> L12155: - **Delete** (`delete`) → opens **delete** confirmation modal.

> L12163: - **Delete** (`delete`) → opens delete modal for that room.

> L12201: - **Supplies Card**: shows water and nutrient stocks. **+ Water** and **+ Nutrients** buttons open the **addSupply** modal.

> L12224: - **Info icon** (`info`) next to strain name shows a tooltip with ideal growth conditions.

> L12267: - **Tuning** (`tune`) for climate/CO₂ devices opens **editDevice** modal for setpoints (temperature, humidity, etc.).

> L12279: - **Edit Light Cycle** (`schedule`) available for lights; opens **editLightCycle** modal to change on/off cycle for the entire zone.

> L12289: - The modal controller stores whether the simulation was running _before_ opening a modal (e.g., `wasRunningBeforeModal`).

> L12290: - On open: pause the simulation explicitly.

> L12292: - `useAppStore.openModal` applies this policy automatically: descriptors pause the sim unless `autoPause: false`, and the store

> L12371: | `notifications` | Open notifications |

> L12372: | `settings` | Open game menu (Save/Load/Export/Reset) |

> L12379: | `tune` | Adjust settings for a device group (opens modal) |

> L12380: | `schedule` | Edit light cycle for a zone (opens modal) |

> L12382: | `arrow_forward_ios` | Navigate to next zone |

> L12501: Central modal controller; manages `visibleModal` and `formState`. Optionally **pauses** sim on open and **resumes** on close.

> L12638: 1. **Render (read)**

> L12640: 2. **User Action (intent)**

> L12642: 3. **Command (through the Facade)**

> L12649: 4. **Logic (engine)**

> L12651: 5. **State Update (commit)**

> L12653: 6. **Notification (events)**

> L12655: 7. **Re‑render (subscribe)**

> L12693: **Behavior.** Maintains `{ visibleModal, formState }`. When opening a modal, it **may pause** the sim for clarity; on close, it optionally **resumes** if it was running.

> L12786: - **Modals** ≈ `useModals()` with pause/resume behavior when opening/closing.

> L12811: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | `FinanceView` shows the same sections after expansion, revealing the detailed breakdowns under each card.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Highlights the deeper inspection step of the financial reporting flow.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |

> L12818: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` exposes sliders/toggles while `ZoneDeviceList` remains adjacent for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L415】【F:docs/ui/ui-components-desciption.md†L421-L429】 | Demonstrates runtime setpoint adjustments and device management described for zone control.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |

> L12839: - Active flows: rent/create/duplicate/delete/rename actions (`world.rentStructure`, `world.createRoom`, `world.createZone`, `world.duplicateStructure`, `world.duplicateRoom`, `world.duplicateZone`, `world.renameStructure`, `world.updateRoom`, `world.updateZone`, `world.deleteStructure`, `world.deleteRoom`, `world.deleteZone`) are surfaced through `ModalHost` dialogs. Each modal now invokes the matching `useZoneStore` intent helper which emits the façade command so the backend processes geometry, costing, and duplication rules deterministically, and the regression suite drives these flows through `ModalHost.test.tsx` to assert both the dispatched intent and modal teardown.【F:src/backend/src/facade/index.ts†L1168-L1233】【F:src/frontend/src/components/ModalHost.tsx†L157-L318】【F:src/frontend/src/store/zoneStore.ts†L240-L338】【F:src/frontend/src/components/ModalHost.test.tsx†L80-L262】 The Zone view header also surfaces cultivation method, container, and substrate labels alongside a “Change method” CTA that opens the dedicated modal; the dialog filters compatible methods, pulls matching container/substrate catalogs, clamps container counts to the zone capacity, recomputes substrate volume and cost estimates, runs the temporary storage handoff stub, and dispatches `bridge.world.updateZone` with the consumable payload. RTL coverage exercises the filtering, clamping, and dispatched intent.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】

> L12846: - New UI: the “Device inventory” panel now surfaces install/update/move/remove lifecycle commands. The Install/Update/Move actions open dedicated modals that collect blueprint IDs, JSON settings patches, or destination zones before dispatching `devices.installDevice`, `devices.updateDevice`, and `devices.moveDevice`. Remove uses the shared confirmation modal to emit `devices.removeDevice`. All flows reuse `ModalHost` wiring and new zone-store helpers so façade intents fire deterministically from a single place.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】【F:src/backend/src/facade/index.ts†L1236-L1266】

> L13019: - **Purpose:** The main header bar at the top of the application. It contains game controls (play/pause, speed), primary navigation links (Structures, Personnel, Finance), key global stats, and a button to open the game menu.

> L13064: | `onOpenModal` | `(...) => void` | Yes | Callback to open modals (e.g., "Add Room"). |

> L13241: - **Props:** `zone`, `onClick`, `onOpenModal`.

> L13250: - **Props:** `devices`, `onOpenModal`, `zoneId`.

> L13260: - **Inspection:** Hovering over a plant card shows a tooltip with its basic stats. Clicking the card opens the detailed `PlantDetailModal` for a full overview and specific actions.

> L13261: - **Direct Actions:** Clicking on a status icon on the plant card triggers a direct action, bypassing the detail modal. Clicking a pest or disease icon opens the `InfoModal` with blueprint data. Clicking the harvest icon immediately harvests the plant. This provides a fast workflow for common tasks.

> L13266: - **Props:** `zone`, `onOpenModal`, `onBatchAction`, `onPlantAction`.

> L13288: - **Props:** `structures`, `onNavigate`, `onOpenModal`, `onRename`.

> L13310: - **Props:** `gameData`, `onOpenModal`, `onRefreshCandidates`, `onFireEmployee`.

> L13318: - **Functionality:** Zone cards highlight temperature/humidity, cultivation method and substrate names, plant counts, and surface icon-only duplicate/delete controls that open the respective modals while the primary CTA drills into the zone view.【F:src/frontend/src/views/RoomView.tsx†L12-L139】【F:src/frontend/src/views/**tests**/RoomView.test.tsx†L46-L68】

> L13325: - **Props:** `structure`, `onNavigate`, `onOpenModal`, `onRename`.

> L13333: - **Props:** `zone`, `onControlsChange`, `onOpenModal`, `onRename`, `onBatchAction`, `onPlantAction`.

> L13337: - **Device lifecycle controls:** The device inventory panel now features an “Install device” CTA plus inline buttons for adjusting settings, relocating hardware to another zone, or removing a unit. Each action opens a modal (`InstallDeviceModal`, `UpdateDeviceModal`, `MoveDeviceModal`, or the shared confirmation dialog) and delegates to the new zone-store helpers so façade intents fire in order.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】

> L13338: - **Cultivation method management:** The zone header highlights `zone.cultivationMethodName` plus container/substrate names and offers a “Change method” button that opens the dedicated modal. The dialog now filters compatible methods, constrains the container/substrate lists to the selected method, clamps the container count to the zone’s capacity while recomputing substrate volume and cost estimates, confirms the storage handoff via the stub handler, and dispatches `world.updateZone` through the frontend bridge with the consumable payload.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】

> L13937: - ## Open questions / risks

> L13946: - docs/tasks/20250923-todo-findings.md

> L13948: - docs/tasks/20250924-todo-findings.md

> L14169: - ## Open Issues

> L14225: 1. **Contract Fidelity** – Zustand slices, selectors, and UI components must model the payloads emitted by `buildSimulationSnapshot` and documented telemetry events. Any transformations should be centralized and typed.

> L14226: 2. **Deterministic Dev Experience** – Where offline or replay modes are required (e.g., storybook, vitest), they should replay captured Socket.IO transcripts or use shared TypeScript fixtures produced from backend snapshots.

> L14227: 3. **Incremental Migration** – Replace mocks feature-by-feature to keep the UI usable during transition and simplify QA.

> L14228: 4. Document every task at `/docs/tasks/mock-migration/`

> L14266: 1. **Mock Usage Audit Prompt**

> L14270: 2. **Store Alignment Prompt**

> L14274: 3. **Live Data Wiring Prompt**

> L14278: 4. **Replay Fixture Prompt**

> L14282: 5. **Regression Coverage Prompt**

> L14313: 1. GameData.globalStats exposes stringly-typed time and water metrics, whereas the dashboard contracts expect SimulationSnapshot.clock with numeric ticks and SI units (time status already modeled in stores).

> L14314: 2. Structure/room definitions omit required PRD fields (status, rent per tick, volumes, purpose metadata) found in StructureSnapshot/RoomSnapshot, so the migration must enrich fixtures with geometry and lifecycle attributes.

> L14315: 3. Zone records use local controls and KPI arrays with string values (e.g., humidity 52%) while the real schema expects normalized environment floats (0–1 relative humidity) and rolling metrics. Conversions and missing fields like volume, lighting, resources, health must be filled in or derived.

> L14316: 4. Plant objects rely on name/progress/harvestable while the PRD mandates strain IDs, stages, biomass, and linkage to structure/room IDs (PlantSnapshot).

> L14317: 5. Devices only expose name/type; backend contracts require blueprintId, kind, status, maintenance metrics, and settings payloads.

> L14318: 6. Personnel and candidate records lack morale/energy, salary-per-tick units, and optional seeds/gender present in PersonnelSnapshot types; salary semantics should switch from annual numbers to per-tick values.

> L14319: 7. Finance mock data summarizes “7d” figures and ad-hoc breakdowns rather than the tick-based FinanceSummarySnapshot and FinanceTickEntry history consumed by the live finance dashboard.

> L14323: 1. SeededRandom is instantiated once at module scope; repeated calls mutate internal state and the global idCounter for deterministicUuid, meaning fixture generation order changes outputs. Swap for explicit seed management tied to store hydration or shared deterministic helpers.

> L14325: 2. App.tsx keeps the entire simulation in React component state and mutates copies with JSON.parse(JSON.stringify(...)), which breaks determinism and bypasses the established Zustand slices (useGameStore, useZoneStore, etc.). Migration should funnel all state changes through the existing stores and intents to stay in sync with PRD expectations.

> L14329: 1. Define fixture-to-snapshot translator – Map initialMockData into SimulationSnapshot/store slices so clickdummy content can hydrate the Zustand stores without breaking type guarantees; normalize units and add missing PRD fields in this step.

> L14331: 2. Introduce deterministic helper module – Replace deterministicUuid/module-global RNG with a seeded helper integrated into store/utils, ensuring repeatable fixture generation and aligning with backend seeds.

> L14333: 3. Refactor layout shell – Extend App.tsx to render the real header/navigation/sidebar using existing design-system components, wiring controls to useGameStore for play/speed state and navigation slices for selections.

> L14335: 4. Port structure & room views – Implement structure/room detail pages leveraging DashboardOverview data, adding drill-down panels and breadcrumb logic derived from clickdummy while using normalized store selectors.

> L14337: 5. Enhance zone detail – Merge environment controls, plant grids, and device management into ZoneDetail, binding sliders/toggles to setpoint dispatch and using real telemetry values.

> L14339: 6. Integrate modal workflows – Register modal descriptors for CRUD/treatment flows in the modal slice and reimplement modal bodies with shared Modal while ensuring actions dispatch facade intents or update fixtures deterministically.

> L14341: 7. Rebuild personnel dashboard – Adapt hiring/roster UI to the live usePersonnelStore, translating morale/energy displays and hooking up modal-driven hires/fires using deterministic fixtures when backend data is absent.

> L14343: 8. Align finance UX – Incorporate clickdummy time-range controls and breakdown lists into FinancesView, ensuring metrics and charts consume normalized finance history from the store.

> L14345: 9. Finalize shared primitives & tests – Replace bespoke form/button/icon components with project-standard equivalents, add unit tests for new helpers/selectors, and verify seeded fixture snapshots remain stable.

> L14347: ## Open questions / risks

> L14349: 1. ✅ Do we continue using Material Icons from the clickdummy or switch to the project’s preferred icon set to stay consistent with the design system?

> L14352: 2. ✅ How should setpoint controls interact with the simulation facade—are sendConfigUpdate/sendFacadeIntent handlers already available for temperature, humidity, PPFD, etc., or do we need to extend store slices?

> L14355: 3. ✅ What navigation model should drive structure/room/zone selection—expand the existing navigation slice or introduce a dedicated world-browser slice? Clarifying avoids duplicating state between sidebar and top-level navigation.

> L14358: 4. ✅ Should personnel and finance fixtures represent per-tick values (per PRD) or retain aggregated “7d” placeholders until backend feeds real snapshots? Aligning units is critical for determinism and SI compliance.

> L14361: 5. ✅ Are duplicate/clone flows (rooms/zones) still required in the MVP, and if so, which backend intents will back them? Current clickdummy logic assumes immediate balance adjustments and device cost tables that may not exist yet.

> L14370: 1. Fixture-Übersetzer aufsetzen: Implementiere ein Modul, das initialMockData und verwandte Datenquellen in SimulationSnapshot-kompatible Strukturen überführt, dabei fehlende PRD-Felder ergänzt (z. B. Volumen, Status) und Einheiten normalisiert.

> L14373: 2. Zone-Daten konvertieren: Rechne alle zonalen Kennzahlen (RH, KPIs, Ressourcen) in die erwarteten numerischen SI-Einheiten um und fülle fehlende Telemetrie-/Gesundheitsfelder auf, bevor sie die Stores hydratisieren.

> L14378: 3. ✅ Pflanzen-, Geräte-, Personal- und Finanzobjekte anreichern: Fixtures liefern jetzt konsistente strain-IDs/Stadien, Geräte-Blueprint-Metadaten sowie per-Tick-Kosten mitsamt `financeHistory`. Die Umsetzung lebt in `src/frontend/src/fixtures/translator.ts` und den zugehörigen Tests.

> L14380: 4. ✅ Deterministische Hilfsfunktionen zentralisieren: `store/utils/deterministic.ts` stellt jetzt einen seeded Helper bereit (`createDeterministicManager`, `createDeterministicSequence`, `nextDeterministicId`), der von Fixtures (`data/mockData.ts`) und App-Workflows genutzt wird. Globale `SeededRandom`-Instanzen und `deterministicUuid` wurden entfernt, sodass IDs und Zufallsdaten aus der gemeinsamen Utility stammen.

> L14382: 5. ✅ State-Management auf Stores umstellen: Refaktoriere App.tsx, sodass sämtliche Simulationzustände über useGameStore, useZoneStore etc. laufen und lokale JSON-Mutationen entfallen.

> L14390: 6. ✅ Layout-Shell refaktorieren: Kombiniere die Klickdummy-Header-/Sidebar-Elemente mit den vorhandenen Komponenten (DashboardHeader, Navigation, TimeDisplay) und verdrahte sie mit den Spiel- und Navigationsslices.

> L14395: 7. ✅ Breadcrumbs und Event-Ticker anbinden: Implementiere Breadcrumbs und Event-Log auf Basis der bestehenden Navigations- und Game-Store-Selektoren, um Auswahlzustand und Telemetrie zu spiegeln.

> L14399: 8. ✅ Navigation-Slice erweitern: Ergänze den bestehenden Slice um Struktur-/Raum-Hierarchie und wende ihn sowohl für Sidebar als auch Kopfzeilen-Navigation an, um Doppelstaat zu vermeiden.

> L14406: 9. ✅ Struktur- und Raumansichten integrieren: Portiere Karten und Detailpanels in DashboardOverview/ZoneDetail, erstelle gemeinsame Kartenkomponenten unter components/cards und implementiere Drilldown-Logik plus Breadcrumbs.

> L14411: 10. ✅ Zonenansicht erweitern: Ergänze ZoneDetail um Steuer-Widgets, Pflanzenaktionen und Gerätelisten; nutze useZoneStore().sendSetpoint für Setpoint-Dispatch und extrahiere Form-Controls in components/forms.

> L14417: 11. ✅ Personalbereich neu aufbauen: Spiegle Bewerber- und Mitarbeiterdarstellungen im PersonnelView, verdrahte Hire/Fire-Intents und verlagere Modale in den globalen Modal-Slice.

> L14422: 12. ✅ Finanzdashboard abstimmen: Übertrage Zeitbereichs-Umschalter und Aufschlüsselungslisten in FinancesView und stelle sicher, dass sie tickbasierte financeHistory-Daten konsumieren.

> L14428: 13. ✅ Modal-Descriptoren registrieren: Der Modal-Slice exportiert jetzt eine strikt typisierte `ModalDescriptor`-Union mit eigenen Payloads für Anlegen-, Umbenennen-, Duplizier-, Detail- und Löschflows. `ModalHost` rendert die neuen Inhaltskomponenten (`views/world/modals` sowie `views/zone/modals`) für Räume/Zonen/Strukturen und Pflanzen-Details und pausiert weiterhin deterministisch bei aktiven Dialogen.

> L14430: 14. ✅ Fassade-Intents anbinden: Die Duplizieren-Dialoge leiten ihre Bestätigungen jetzt an die Store-Helfer weiter, die getrimmte Namen und Options-Payloads an `facade.world.duplicateRoom` bzw. `facade.world.duplicateZone` senden. Geräte- und Methodenklone entstehen damit ausschließlich im Backend, wodurch CapEx-/Inventarereignisse deterministisch über die Facade-Finanzereignisse in den Stores landen (`src/frontend/src/components/ModalHost.tsx`, `src/frontend/src/store/zoneStore.ts`, `src/frontend/src/store/types.ts`).

> L14434: 15. ✅ UI-Primitiven angleichen: Schaltflächen, Formularfelder und Icon-Hüllen nutzen jetzt die neuen Design-System-Komponenten unter `components/inputs` (`Button`, `IconButton`, `TextInput`, `Select`, `RangeInput`, `InlineEdit`). Bestehende Klickdummy-Markup-Styles wurden entfernt.

> L14436: 16. ✅ Fixtures/Mocks modularisieren: Verschiebe deterministische Mock-Fabriken und Rollen-/Kostenkonstanten in src/frontend/fixtures und stelle sicher, dass sie die Store-Hydration bedienen.

> L14441: 17. ✅ Selektor-Helper neu platzieren: Portiere Struktur-/Raum-/Zonen-Helper als testbare Selektoren in store/selectors.ts oder modulnahe Utilities.

> L14447: 19. ✅ Unit- und Snapshot-Tests ergänzen: Schreibe Tests für neue Selektoren, deterministische Fixtures und UI-Komponenten, um die Stabilität der migrierten Oberflächen sicherzustellen.

> L14449: - Neue fixturespezifische Tests (`src/frontend/src/fixtures/deterministic.test.ts`) prüfen Sequenz- und Manager-Funktionalität, Clones, Scope-Reset sowie die globalen Helper (`getSharedSequence`, `nextSharedId`).

> L14452: 20. ✅ Determinismus verifizieren: Wiederholte Hydrationen mit identischem Seed liefern jetzt bytegleiche Ergebnisse.

> L14486: 1. Load the difficulty config once during bootstrap and inject it into both the initial state factory and the world service.

> L14487: 2. Remove the duplicated `DIFFICULTY_ECONOMICS` tables and derive defaults from the loaded config instead.

> L14488: 3. Extend the tests to cover the easy/normal/hard presets so that future edits to `difficulty.json` must be reflected in the engine.

> L14510: 1. **Inject Config**

> L14512: 2. **Refactor State Factory**

> L14515: 3. **Refactor World Service**

> L14518: 4. **Add Tests**

> L14520: 5. **Docs & Changelog**

> L14528: ## • Critical: config.update setpoint rejects UUID zoneIds (backend socketGateway.t (docs/tasks/20250924-todo-findings.md)

> L14530: Source: [`docs/tasks/20250924-todo-findings.md`](../docs/tasks/20250924-todo-findings.md)

> L14540: • Medium: Modal pause/resume policy not implemented (frontend) — spec requires auto-pause on open and restore prior state on close, but modalSlice only stores flags; implement wiring (read time status, pause on open if running, resume on close if wasRunningBeforeModal). Files: docs/system/ui-mplementation-spec.md §4, src/frontend/src/store/slices/modalSlice.ts, useSimulationBridge + stores

> L14541: Status: ✅ Completed 2025-09-24 — Modal store now pauses via `openModal` (autoPause by default) and issues a resume on close when the sim was running beforehand, with docs updated.

> L14551: • Low: Optional telemetry not surfaced yet in UI — dashboard reads zone.lighting/plantingPlan but backend snapshot lacks these aggregates; either add derived fields (backend) or guard UI (already guarded) and open an enhancement task. Files: src/backend/src/lib/uiSnapshot.ts, src/frontend/src/views/DashboardOverview.tsx, docs/system/ui-mplementation-spec.md

> L14613: 1. Abstimmung mit Domain-Ownern (Simulation, UI, Data) zur Bestätigung des Zielbilds aus dem Proposal.

> L14614: 2. Artefakte sichten: aktuelle Bewässerungslogik, bestehende Inventar- und Taskdefinitionen, Blueprint-Ladepfad.

> L14615: 3. Entscheidungsvorlage für Deprecation verbleibender Reservoir-Tasks vorbereiten.

> L14619: 1. **Strukturzustand erweitern**: `utilities.waterMeter_m3`, `utilities.lastTickWaterDraw_L`, `inventory.nutrients[]` mit `id`, `name`, `form`, `npk`, `amount_kg` integrieren.

> L14620: 2. **Zonenmodell ergänzen**: `irrigation.methodId`, optionale `targetEC_mS_cm`, `runoffFraction`.

> L14621: 3. **[Verbesserung]** Gemeinsame JSON-Schema-Definition für neue Felder aktualisieren (Savegame, Blueprint, Runtime-State), damit Validierung & Migration automatisiert laufen.

> L14622: 4. Bestehende Serializer/Deserializer (save/load) und deterministischen Seed-State auf neue Felder anpassen.

> L14666: 1. Verzeichnis erstellen, Schema nach Proposal abbilden: `id`, `slug`, `name`, `kind`, `description`, `mixing`, `couplesFertilizer`, `flow_L_per_min`, `uniformity`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, `meta`.

> L14667: 2. Seed-Blueprints anlegen:

> L14672: 3. Validierungen implementieren:

> L14678: 4. **[Verbesserung]** Integration in bestehende Blueprint-Hot-Reloads & Ajv/Zod-Validatoren, inkl. Dokumentation im Blueprint-Index.

> L14704: 1. Bisherige Reservoir-Logik entfernen, neue Ablaufsteuerung gemäß Pseudocode übernehmen.

> L14705: 2. Funktionsblöcke erstellen:

> L14708: 3. Pending-Queues für manuelle Methoden (`zone.resources.pending.*`) befüllen, Warteschlangenverhalten beibehalten.

> L14709: 4. Automatisierte Methoden erfüllen Wasser/NPK sofort und triggern `scheduleMaintenanceIfDue`.

> L14710: 5. Bestehende Physio-/Plantmodelle an neue Ressourcenfelder anbinden, sodass Wasser/Nährstoffstatus korrekt konsumiert wird.

> L14711: 6. **[Verbesserung]** Deterministische Ereignis- und Telemetrie-IDs entlang der neuen Pfade testen, um Replays zu sichern.

> L14747: 1. Wasserverbrauch: `utilities.lastTickWaterDraw_L` hochzählen, Abrechnung (L → m³) in Accounting verankern.

> L14748: 2. Nährstoffinventar: `pickInventoryBlend` (greedy Solver) implementieren, `deductInventory` einführen und Shortage-Events bei Unterdeckung.

> L14749: 3. Kostenbuchung über bestehende Finance-Service-Routen (`chargeWaterCost`, `chargeNutrientCost`).

> L14750: 4. Optionalen Auto-Reorder-Hook vorbereiten, jedoch deaktiviert lassen.

> L14778: 1. `/data/configs/task_definitions.json` erweitern:

> L14783: 2. Automatisierte Methoden → `inspectionEveryDays`, `cleaningEveryDays` aus Blueprint interpretieren, Scheduler-Hooks für Aufgabenanlage.

> L14784: 3. Facade-Intents ergänzen:

> L14788: 4. **[Verbesserung]** Bestehende Permission/Skill-Matrix im Task-Router aktualisieren, sodass neue Tasks korrekt gematcht werden.

> L14830: 1. Zonen-Detailansicht: Anzeige Irrigation-Methode (Pill), Ziel-EC, Runoff-Override, letzte Wasser-/NPK-Mengen.

> L14831: 2. Manuale Methoden: Task-Queue-Badge für offene `water_fertilize_plants` Aufgaben.

> L14832: 3. Automatisierte Methoden: Anzeige nächster Inspektion/Wartung.

> L14833: 4. Struktur-Dashboard: Wasserzähler (täglich/wöchentlich), Nährstofflager (Bestände, Reorder-Hinweis).

> L14834: 5. **Danke auch an das UI-Team** für die erwarteten Anpassungen.

> L14835: 6. **[Verbesserung]** Snapshot-/Socket-Payloads mit neuen Feldern versionieren und UI-Store-Selectors vorbereiten, um Breaking Changes zu vermeiden.

> L14839: 1. Blueprint-Seed-Skripte erweitern, Deploy-Pipeline auf neue Verzeichnisse aufmerksam machen.

> L14840: 2. Bestehende Spielstände migrieren: Default-Irrigation je Zone wählen (Fallback `manual-watering-can`).

> L14841: 3. Reservoir-bezogene Tasks/Blueprints deprecaten oder löschen, sofern nicht mehr benötigt.

> L14842: 4. Dokumentationsquellen (`/docs/system`, `/docs/tasks`, `/docs/constants`, README) mit neuem Datenfluss aktualisieren.

> L14846: 1. **Unit-Tests**:

> L14850: 2. **Szenario-Tests**:

> L14853: 3. **Ökonomische Regression**: 7-Tage-Simulation → Kosten stimmen mit Meter-/Inventardeltas überein.

> L14854: 4. **[Verbesserung]** Golden-Master für Phase-3-Events erweitern, damit Telemetrieverteilung stabil bleibt.

> L14858: 1. Cross-Package Code Review (Backend, Frontend, Docs, Data) durchführen.

> L14859: 2. Release-Notes vorbereiten, QA-Sign-off einholen.

> L14860: 3. Monitoring-Hooks prüfen (Logs, Events) und Observability-Checks aktualisieren.

> L14875: **Zonen- und Strukturzustand (Auszug Savegame vNext)**

> L14951: 1. Extract defaulting/helpers into `worldDefaults.ts` with deterministic cloning utilities.

> L14952: 2. Add `structureService.ts`, `roomService.ts`, and `zoneService.ts` under `src/backend/src/engine/world/`, each accepting explicit dependencies and returning typed results.

> L14953: 3. Refactor existing command handlers to depend on the new services and update unit tests for the delegated behaviour.

> L14960: 1. Move pure interfaces into `src/backend/src/state/types.ts` (and sub-folders as needed).

> L14961: 2. Relocate blueprint defaults and loaders into dedicated modules (e.g., `state/personnel/skillBlueprints.ts`).

> L14962: 3. Update imports across the backend and adjust tests to reference the new modules.

> L14969: 1. Create `src/frontend/src/components/modals/registry/` with one component per modal.

> L14970: 2. Introduce a `modalRegistry.ts` mapping descriptors to the extracted components.

> L14971: 3. Slim `ModalHost` down to a lookup/render shell and refresh the associated tests to target individual modals plus the registry contract.

> L14975: 1. ✅ Backend world service extraction completed — `worldService` now delegates to defaults, structure, room, and zone services while keeping the façade stable for command handlers.

> L14976: 2. ✅ Model modularisation finalised — shared interfaces moved into `state/types.ts` with blueprint loaders split into focused initialization and personnel modules.

> L14977: 3. ✅ Frontend modal split delivered — `modalRegistry.tsx` orchestrates feature-scoped modal components, slimming `ModalHost` to a declarative shell.

> L15110: 1.0 = neutral

### Checklist

- [ ] L100: 1. **applyDevices** – apply device effects (lamp heat/PPFD, HVAC, vent, dehumid)
- [ ] L101: 2. **deriveEnvironment** – combine effects → effective zone env
- [ ] L102: 3. **irrigationAndNutrients** – watering + NPK
- [ ] L103: 4. **updatePlants** – growth, stress, disease, stage transitions
- [ ] L104: 5. **harvestAndInventory** – produce items, storage, spoilage timers
- [ ] L105: 6. **accounting** – OpEx, CapEx‑related maintenance, sales/market
- [ ] L106: 7. **commit** – snapshot, emit batched telemetry events
- [ ] L731: 1. Install Node.js 23 and pnpm 10 (matching CI).
- [ ] L732: 2. Install dependencies with `pnpm install`.
- [ ] L733: 3. Use `pnpm dev` for parallel backend/frontend development, or individual
- [ ] L735: 4. Run targeted checks locally before opening a pull request:
- [ ] L794: 1. Common commands
- [ ] L830: 2. High-level architecture and structure
- [ ] L901: | docs/\_final/11-open-questions.md | Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ] | 2025-10-01T11:53:08.100111 | 1330 | [vision, simulation loop, devices, agents/tasks, ops] | pending |
- [ ] L951: | docs/tasks/20250923-todo-findings.md | Create tasks to fix the issues: | 2025-10-01T11:53:08.108112 | 5332 | [data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | pending |
- [ ] L952: | docs/tasks/20250924-todo-findings.md | • Critical: config.update setpoint rejects UUID zoneIds (backend socketGateway.t | 2025-10-01T11:53:08.108112 | 5896 | [vision, data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | pending |
- [ ] L985: 1. **Study the domain docs.** The blueprint and schema definitions in the [Data Dictionary](docs/DD.md), the extended JSON blueprint listings in [All JSON Blueprints](docs/addendum/all-json.md), and the simulation notes in the [Simulation Engine Overview](docs/system/simulation-engine.md) are the source of truth for content and engine behaviour. When working on blueprint data or engine logic, consult these first to avoid schema drift.
- [ ] L986: 2. **Understand validation expectations.** The [Blueprint Data Validation Workflow](docs/addendum/data-validation.md) explains the reporting pipeline that backs `pnpm validate:data` and documents how CI enforces data quality gates.
- [ ] L987: 3. **Install dependencies.** Use Node.js 20+ with [pnpm](https://pnpm.io/) and run `pnpm install` at the repository root to hydrate all workspace packages.
- [ ] L991: 1. Create a feature branch in your fork and sync with `main`.
- [ ] L992: 2. Make focused changes while keeping the tick engine, schema contracts, and naming conventions aligned with the docs listed above.
- [ ] L993: 3. Run targeted unit/integration tests for the packages you touched (`pnpm -r test` or package-specific scripts) and generate any necessary blueprint validation reports.
- [ ] L994: 4. Review generated artifacts (e.g., under `reports/validation`) before committing.
- [ ] L995: 5. Open a pull request that summarises the change, references the relevant docs, and links to any blueprint reports when applicable.
- [ ] L1032: - [Open Issues](#open-issues)
- [ ] L1041: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】
- [ ] L1060: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.
- [ ] L1089: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.
- [ ] L1124: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).
- [ ] L1163: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).
- [ ] L1186: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.
- [ ] L1222: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |
- [ ] L1227: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |
- [ ] L1424: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- [ ] L1434: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】
- [ ] L1436: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.
- [ ] L1475: | `notifications` | Open notifications. |
- [ ] L1476: | `settings` | Open game menu (Save/Load/Export/Reset). |
- [ ] L1483: | `tune` | Adjust settings for a device group (opens modal). |
- [ ] L1484: | `schedule` | Edit light cycle for a zone (opens modal). |
- [ ] L1486: | `arrow_forward_ios` | Navigate to next zone. |
- [ ] L1607: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】
- [ ] L1634: ## Open Issues
- [ ] L2006: **Elevator Pitch.** _Weed Breed_ is a modular, deterministic plant/grow simulation as a game. Players plan structures (Buildings → Rooms → Zones → Plants), control climate and devices, balance cost and yield, and experience complete cultivation cycles—from seeding to harvest and post-harvest. The system is open, extensible, and content-driven (blueprint JSONs) so that community, modders, and researchers can easily contribute content.
- [ ] L2012: 1. **Determinism over visuals.** Reproducible runs beat visual effects.
- [ ] L2013: 2. **Playability over realism.** Plausible rather than strictly scientific—with explicit simplifications where needed.
- [ ] L2014: 3. **Open architecture.** Data/modding first, clear interfaces, stable formats.
- [ ] L2015: 4. **Transparency.** Visible metrics, explainable decisions (logs, audits, replays).
- [ ] L2016: 5. **Tight feedback loops.** Fun comes from meaningful micro-decisions in day-to-day operations.
- [ ] L2054: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_
- [ ] L2055: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_
- [ ] L2062: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_
- [ ] L2094: **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_
- [ ] L2215: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_
- [ ] L2256: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_
- [ ] L2264: 1. **MVP:** One structure, basic climate control, 1–2 strains, 1 method, basic economy, save/load, deterministic 30-day run.
- [ ] L2265: 2. **Alpha:** Pests/diseases + treatments, device degradation/maintenance, shop/research loop, editor v1.
- [ ] L2266: 3. **Beta:** Balancing pass, golden runs (200 days), stability SLOs met, localization EN/DE.
- [ ] L2267: 4. **1.0:** Content polish, modding docs, replay exporter, performance tuning.
- [ ] L2419: - [Open Questions](#open-questions)
- [ ] L2426: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】
- [ ] L2587: ## Open Questions
- [ ] L2591: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】
- [ ] L2592: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】
- [ ] L2593: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】
- [ ] L2594: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】
- [ ] L2595: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】
- [ ] L2596: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】
- [ ] L2615: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |
- [ ] L2636: - [Open Questions](#open-questions)
- [ ] L2643: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】
- [ ] L2790: ## Modular Plant Growth Simulation (Open Architecture)
- [ ] L2828: 1. **Run a tick-based simulation** with configurable tick length (e.g., 1–10 minutes of sim time per tick).
- [ ] L2829: 2. **Adjust conditions at runtime** (pause/resume, tick rate, setpoints for light/temperature/CO₂).
- [ ] L2830: 3. **Visualize telemetry** (time-series charts for T, RH, VPD, PPFD; tables for plants/devices).
- [ ] L2831: 4. **Save & load** full state with schema validation and versioning.
- [ ] L2872: 1. `applyDevices` → 2) `deriveEnvironment` → 3) `irrigationAndNutrients` → 4) `updatePlants` → 5) `harvestAndInventory` → 6) `accounting` → 7) `commit`.&#x20;
- [ ] L3048: 1. **M1 – Core Loop & Bus (Backend)**
- [ ] L3052: 2. **M2 – Physics & Plant Model**
- [ ] L3055: 3. **M3 – Save/Load & Schemas**
- [ ] L3058: 4. **M4 – Dashboard (Frontend)**
- [ ] L3061: 5. **M5 – Benchmarks & Hardening**
- [ ] L3074: ## 13) Open Questions
- [ ] L3104: > This PRD is designed to be “open architecture”: physics and plant models are boxed behind a single module boundary; devices, strains, and methods are pure JSON blueprints; the loop and event bus are stable contracts for UI and future systems. &#x20;
- [ ] L3116: ## Open Questions
- [ ] L3120: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】
- [ ] L3121: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】
- [ ] L3122: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】
- [ ] L3123: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】
- [ ] L3124: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】
- [ ] L3125: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】
- [ ] L3144: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |
- [ ] L3169: - [Open Issues](#open-issues)
- [ ] L3178: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】
- [ ] L3197: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.
- [ ] L3228: - **Time display:** combines the in-game date/time (e.g., `Y1, D30, 14:00`) with an SVG tick-progress ring that animates toward the next tick via `stroke-dashoffset` transitions.【F:docs/ui/ui-implementation-spec.md†L59-L66】【F:docs/ui/ui_elements.md†L31-L34】
- [ ] L3234: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.
- [ ] L3269: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).
- [ ] L3281: - Persistent header presents StatCards for **Capital**, **Cumulative Yield**, and **Planned plant capacity**, plus the in-game **Time display** with its SVG tick-progress ring to visualize the march toward the next tick.【F:docs/ui/ui-implementation-spec.md†L56-L66】【F:docs/ui/ui_elements.md†L31-L34】
- [ ] L3308: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).
- [ ] L3331: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.
- [ ] L3367: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |
- [ ] L3372: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |
- [ ] L3420: - **EnvironmentPanel**: collapsed summary renders KPI chips for temperature, humidity, VPD, CO₂, PPFD, and the active light cycle (see `11-zone-detailview-(setup-closed).png`). Expanding the panel (see `12-zone-detailview-(setup-opened).png`) reveals range inputs for temperature, humidity, VPD, CO₂, and PPFD plus a lighting on/off toggle tied to the PPFD target. Sliders clamp to backend corridors — Temperature `[10, 35]` °C, Relative Humidity `[0, 1]`, VPD `[0, 2.5]` kPa, CO₂ `[0, 1800]` ppm, and PPFD `[0, 1500]` µmol·m⁻²·s⁻¹ — and surface clamp warnings inline so operators know when adjustments hit safety limits. Controls dispatch `config.update { type: 'setpoint' }` commands and disable automatically when the required devices are absent.【F:docs/ui/ui-components-desciption.md†L407-L462】
- [ ] L3424: - **ZoneView**: renders device and plant CTAs that open the install/plant modals with the active zone context, reinforcing empty-state guidance when lists are empty.【F:src/frontend/src/views/ZoneView.tsx†L286-L398】
- [ ] L3570: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- [ ] L3580: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】
- [ ] L3582: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.
- [ ] L3621: | `notifications` | Open notifications. |
- [ ] L3622: | `settings` | Open game menu (Save/Load/Export/Reset). |
- [ ] L3629: | `tune` | Adjust settings for a device group (opens modal). |
- [ ] L3630: | `schedule` | Edit light cycle for a zone (opens modal). |
- [ ] L3632: | `arrow_forward_ios` | Navigate to next zone. |
- [ ] L3753: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】
- [ ] L3780: ## Open Issues
- [ ] L3949: 1. Accumulate real time.
- [ ] L3950: 2. Execute ticks when `accumulated ≥ tickInterval / gameSpeed`.
- [ ] L3951: 3. **Catch-up**: Process up to `maxTicksPerFrame` to avoid long stalls.
- [ ] L3953: 1. **Device control** (evaluate setpoints, on/off, hysteresis).
- [ ] L3954: 2. **Apply device effects** (to zone environment: ΔT, ΔRH, PPFD, CO₂).
- [ ] L3955: 3. **Environment mixing/normalization** (ambient exchange scaled by airflow/enclosure).
- [ ] L3956: 4. **Irrigation/Nutrients** (compute per-tick water/N/P/K demands from phase-based curves; update stocks, log deficits).
- [ ] L3957: 5. **Plants** (growth, phenology, stress from temp/RH/CO₂/light & resource status; stage changes).
- [ ] L3958: 6. **Health** (detect → progress → spread → treatments; apply PHI/re-entry).
- [ ] L3959: 7. **Tasks & Agents** (generate tasks; employees seek/claim/execute respecting skills/tools/locks).
- [ ] L3960: 8. **Harvest/Inventory/Market** (lot creation, timestamps, quality decay).
- [ ] L3961: 9. **Accounting** (OPEX: maintenance/energy/water/nutrients/labor/rent; CapEx events).
- [ ] L3962: 10. **Commit** (snapshot + batched events).
- [ ] L3996: 1. **Detect**: Visibility increases over time; **scouting tasks** and traps add detection rolls.
- [ ] L3997: 2. **Progress**: Severity grows with favorable environment and balancing multipliers.
- [ ] L3998: 3. **Spread**: Probabilistic transmission within zone and to neighbors; influenced by airflow/sanitation/tools.
- [ ] L3999: 4. **Treatments**: Apply efficacy to severity/infection; respect `cooldownDays`, **`reentryIntervalTicks`**, **`preHarvestIntervalTicks`**.
- [ ] L4000: 5. **Events**: `pest.detected`, `disease.confirmed`, `health.spread`, `treatment.applied`, `outbreak.contained`.
- [ ] L4047: - `timeOff`: credit overtime to `leaveHours`; the next OffDuty window is extended accordingly.
- [ ] L4155: (Exact signatures/types are left open by design.)
- [ ] L4296: 1. **Load & validate.** Parse blueprints, run schema validation, and reject or migrate files that fall outside required ranges.
- [ ] L4297: 2. **Materialize instances.** Copy template values into runtime records, apply scenario overrides, derive geometric aggregates (e.g., structure volume), and attach deterministic identifiers.
- [ ] L4298: 3. **Link cross-references.** Resolve ids across maps (e.g., device prices, strain prices) before the first tick. Missing references are fatal until documented and added to the blueprint set.
- [ ] L4299: 4. **Runtime usage.** Engine subsystems read only from materialized instances, ensuring tick execution cannot mutate shared template data. Derived telemetry must include source blueprint ids for auditability.
- [ ] L4390: 1. **Wall-time accumulation**: keep `accumulatedMs += now - lastNow`.
- [ ] L4391: 2. **Tick threshold**: while `accumulatedMs ≥ tickIntervalMs / gameSpeed`, do:
- [ ] L4395: 3. **Snapshot & events**: publish a read-only snapshot and batched events after each committed tick.
- [ ] L4413: 1. **Start** from last values: `T`, `RH`, `CO2`, (optional `PPFD`).
- [ ] L4414: 2. **Device deltas**
- [ ] L4427: 3. **Plant deltas** (coarse canopy physiology)
- [ ] L4433: 4. **Normalization toward ambient**
- [ ] L4436: 5. **Clamp & commit**
- [ ] L4438: 6. **Events**
- [ ] L4458: 1. **Phenology update**
- [ ] L4460: 2. **Resource requirement**
- [ ] L4465: 3. **Stress computation (0–1)**
- [ ] L4469: 4. **Health update (0–1)**
- [ ] L4472: 5. **Potential growth**
- [ ] L4480: 6. **Quality & harvest window**
- [ ] L4500: 1. **Detect**
- [ ] L4503: 2. **Progress**
- [ ] L4508: 3. **Treat**
- [ ] L4547: - `timeOff`: credit overtime to `leaveHours`; next OffDuty extends accordingly.
- [ ] L4632: 1. **Input**: The player manages the environment.
- [ ] L4633: 2. **Problem**: The environment's deviation from the plant's ideal conditions creates `Stress`.
- [ ] L4634: 3. **State**: `Stress` negatively impacts the plant's `Health`.
- [ ] L4635: 4. **Output**: `Health` directly multiplies the plant's potential `Growth`.
- [ ] L4745: 1. **Weekly API seed.** `apiSeed = override ?? "<gameSeed>-<weekIndex>"` keeps
- [ ] L4748: 2. **Profile-specific personal seeds.**
- [ ] L4751: 3. **RNG stream isolation.** Each personal seed is hashed and fed into
- [ ] L4757: 4. **ID generation.** Applicant IDs come from the stable `job-market` RNG stream
- [ ] L4764: 1. **Profile collection.** Fetch remote profiles (or synthesize offline names)
- [ ] L4766: 2. **Normalization.** Names are trimmed and title-cased; missing entries fall
- [ ] L4768: 3. **Personal seed resolution.** Missing seeds are replaced with an offline seed
- [ ] L4770: 4. **Gender draw.** Seeded RNG selects gender with `P(other) = pDiverse` and
- [ ] L4773: 5. **Role selection.** Weighted draw using each blueprint’s `roleWeight`
- [ ] L4777: 6. **Skill roll.** Apply the blueprint `skillProfile` for primary/secondary
- [ ] L4780: 7. **Trait roll.** Sample distinct trait IDs from the personnel directory (if
- [ ] L4782: 8. **Salary computation.** Start from the role blueprint’s `salary.basePerTick`,
- [ ] L4786: 9. **Assembly.** Produce `ApplicantState` records with `id`, `name`,
- [ ] L4850: 1. Ensure the backend has network access to `randomuser.me` **or** ship the
- [ ] L4852: 2. Optionally set `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true` when running in
- [ ] L4854: 3. Monitor `hr.candidatesRefreshed` events and job market logs to confirm weekly
- [ ] L4856: 4. Use the façade command `refreshCandidates` with `force=true` or a custom
- [ ] L4885: 1. Replace imports of `../src/lib/eventBus.js` (or equivalent) for runtime telemetry with
- [ ] L4888: 2. Update `eventBus.emit({ ... })` calls to use the helper signature where convenient:
- [ ] L4894: 3. When queuing events during tick processing, prefer `collector.queue('type', payload,
- [ ] L4939: 1. `{ channel: 'simulationUpdate', payload: SimulationUpdateMessage }`
- [ ] L4940: 2. `{ channel: 'sim.tickCompleted', payload: UiSimulationTickEvent }`
- [ ] L4941: 3. `{ channel: 'domainEvents', payload: UiDomainEventsMessage }`
- [ ] L4942: 4. `{ channel: <event.type>, payload: event.payload ?? null }`
- [ ] L4948: 1. The client connects to the single Socket.IO namespace (`/`).
- [ ] L4949: 2. Immediately after the connection the gateway emits:
- [ ] L4966: next to the frontend package (see `.env.example`) to point the UI at a
- [ ] L5101: "nextDueTick": 210,
- [ ] L5681: - **Determinism guard**: disallow commands that would change RNG order within a committed tick; schedule for next tick if needed.
- [ ] L5735: 1. **Device Control** (evaluate setpoints & hysteresis)
- [ ] L5736: 2. **Apply Device Deltas** (T/RH/CO₂/PPFD)
- [ ] L5737: 3. **Normalize to Ambient** (mixing, airflow)
- [ ] L5738: 4. **Irrigation/Nutrients** (NPK g/m²/day → per‑tick, per‑plant)
- [ ] L5739: 5. **Plants** (growth, stress, health update)
- [ ] L5740: 6. **Health** (detect, progress, spread, treat; enforce re‑entry & PHI)
- [ ] L5741: 7. **Tasks & Agents** (generate, claim, execute; overtime policy)
- [ ] L5742: 8. **Inventory/Market**
- [ ] L5743: 9. **Finance**
- [ ] L5744: 10. **Commit & Emit**
- [ ] L5867: To keep the labor market dynamic and credible, the game continuously injects new, unique candidates. Rather than relying only on a fixed local name list, the game **optionally** queries a **seedable external name provider** (e.g., an API that returns first/last names) and falls back to local data if unavailable. An free and open provider is https://randomuser.me/. For detailed information about the API, check the providers documentation.
- [ ] L5930: - **`timeOff`** — credit overtime hours to the employee’s **`leaveHours`** balance. In their next **OffDuty** period, they take this extra time off. This saves immediate cash but reduces near-term availability.
- [ ] L6062: 1. **Manual documentation only.** Rejected because it burdens operators with
- [ ] L6064: 2. **Bundling static name lists in git.** Deferred to avoid shipping a bloated
- [ ] L6066: 3. **Lazy provisioning inside the job market refresh.** Rejected because the
- [ ] L6243: ## Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ] (docs/\_final/11-open-questions.md)
- [ ] L6245: Source: [`docs/_final/11-open-questions.md`](../docs/_final/11-open-questions.md)
- [ ] L6247: # Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ]
- [ ] L6249: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】
- [ ] L6250: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】
- [ ] L6251: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】
- [ ] L6252: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】
- [ ] L6253: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】
- [ ] L6254: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】
- [ ] L6298: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】
- [ ] L6321: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |
- [ ] L9415: "notes": "Avoid on open flowers; can harm beneficials."
- [ ] L11140: 1. **Rulekit scaffolding**
- [ ] L11145: 2. **Lexer & parser foundation**
- [ ] L11150: 3. **IR schema & validation**
- [ ] L11155: 4. **Expression compiler**
- [ ] L11160: 5. **Effect operator implementation**
- [ ] L11165: 6. **Runtime scheduler & trigger engine**
- [ ] L11170: 7. **Engine accessors & integration hooks**
- [ ] L11175: 8. **Rule loading pipeline**
- [ ] L11180: 9. **Tooling & scripts**
- [ ] L11185: 10. **Authoring starter packages**
- [ ] L11190: 11. **Testing & QA suite**
- [ ] L11195: 12. **Telemetry & observability**
- [ ] L11600: 0.6, 0.7,
- [ ] L11603: 0.6, 0.7,
- [ ] L11609: 0.5, 0.6,
- [ ] L11612: 0.5, 0.6,
- [ ] L11896: // show in table/modal; allow user to pin as new parents for next step
- [ ] L11983: The screenshots convey a dashboard-style application that guides the player from high-level operations down to per-plant decisions through a clear Structure → Room → Zone drill-down, as illustrated in the structure and room overview captures ([Structure overview](./screenshots/03-structure-overview.png), [Room overview](./screenshots/10-room-overview-%28growroom%29.png)). Global navigation relies on cards and inline actions to jump between these hierarchy levels while providing immediate CRUD affordances for each tier.【F:docs/ui/ui-components-desciption.md†L483-L525】【F:docs/ui/ui_interactions_spec.md†L27-L37】 Zone views then compose telemetry, device management, and plant operations into a single control surface, matching the micro-loop described in the interaction spec and shown in the zone detail screens ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L533】【F:docs/ui/ui_interactions_spec.md†L40-L54】
- [ ] L11987: The welcome screen foregrounds the StartScreen component with quick entry points for New, Quick, and Import game flows, reflecting the lifecycle actions in the façade contract and captured in the welcome hero ([Welcome screen](./screenshots/01-welcome-screen.png)).【F:docs/ui/ui-components-desciption.md†L393-L399】【F:docs/ui/ui_interactions_spec.md†L13-L23】 Selecting “New Game” opens a dedicated modal that captures company metadata and a deterministic seed using shared modal and form primitives, reinforcing that modal workflows pause gameplay until the façade acknowledges the command, as seen in the new game form ([New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L347-L353】【F:docs/ui/ui-components-desciption.md†L123-L178】
- [ ] L11995: Within a zone, the screenshots highlight the layered EnvironmentPanel (collapsed vs. expanded), device lists, and the ZonePlantPanel’s batch-selection mode. This trio encapsulates monitoring, setpoint control, and multi-plant actions that the cultivation loop depends on, as evidenced in the zone detail captures ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L462】【F:docs/ui/ui_interactions_spec.md†L40-L54】 Complementary strategic views such as PersonnelView and FinanceView expose their respective loops via tabbed candidate/staff management and collapsible revenue/expense reports, mirroring the hiring and finance stories from the spec and illustrated by their overview shots ([Personnel – job market](./screenshots/04-personell-overview-%28job-market%29.png), [Personnel – employees](./screenshots/05-personell-overview-%28my-employees%29.png), [Finance – cards collapsed](./screenshots/06-finances-overview-%28cards_closed%29.png), [Finance – cards expanded](./screenshots/07-finances-overview-%28cards_opened%29.png)).【F:docs/ui/ui-components-desciption.md†L490-L509】【F:docs/ui/ui_interactions_spec.md†L58-L73】
- [ ] L11999: Every modal in the screenshots—including the game menu and hiring/new game flows—reuses the shared Modal shell, Form inputs, and Primary buttons, underscoring a consistent command pattern for façade intents and visible across multiple modal captures ([Game menu modal](./screenshots/08-model-game_menu.png), [New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L123-L178】【F:docs/ui/ui-components-desciption.md†L323-L337】 The dark Tailwind-based design system (stone background, lime accents) gives all cards and panels a cohesive appearance, reinforcing that gameplay relies on high-contrast status colors for quick scanning, a theme evident in the dashboard imagery ([Structure overview cards](./screenshots/03-structure-overview.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png)).【F:docs/ui/ui-components-desciption.md†L551-L574】 Together, these patterns show that the UI concept emphasizes deterministic flows, reusable components, and a layered information hierarchy that mirrors the simulation architecture.
- [ ] L12025: - When a modal is open, the simulation content behind it is visually de‑emphasized using a blur.
- [ ] L12065: - **Tick progress ring**: an SVG circle animating to the next tick (hour). Animate stroke via `stroke-dashoffset`.
- [ ] L12092: - **Notifications** (icon: `notifications`) → opens a popover with alerts. A red badge (`.notifications-badge`) shows the count of unread alerts.
- [ ] L12145: - **+ Rent Structure** button: opens the **rent** modal.
- [ ] L12154: - **Rename** (`edit`) → opens **rename** modal.
- [ ] L12155: - **Delete** (`delete`) → opens **delete** confirmation modal.
- [ ] L12163: - **Delete** (`delete`) → opens delete modal for that room.
- [ ] L12201: - **Supplies Card**: shows water and nutrient stocks. **+ Water** and **+ Nutrients** buttons open the **addSupply** modal.
- [ ] L12224: - **Info icon** (`info`) next to strain name shows a tooltip with ideal growth conditions.
- [ ] L12267: - **Tuning** (`tune`) for climate/CO₂ devices opens **editDevice** modal for setpoints (temperature, humidity, etc.).
- [ ] L12279: - **Edit Light Cycle** (`schedule`) available for lights; opens **editLightCycle** modal to change on/off cycle for the entire zone.
- [ ] L12289: - The modal controller stores whether the simulation was running _before_ opening a modal (e.g., `wasRunningBeforeModal`).
- [ ] L12290: - On open: pause the simulation explicitly.
- [ ] L12292: - `useAppStore.openModal` applies this policy automatically: descriptors pause the sim unless `autoPause: false`, and the store
- [ ] L12371: | `notifications` | Open notifications |
- [ ] L12372: | `settings` | Open game menu (Save/Load/Export/Reset) |
- [ ] L12379: | `tune` | Adjust settings for a device group (opens modal) |
- [ ] L12380: | `schedule` | Edit light cycle for a zone (opens modal) |
- [ ] L12382: | `arrow_forward_ios` | Navigate to next zone |
- [ ] L12501: Central modal controller; manages `visibleModal` and `formState`. Optionally **pauses** sim on open and **resumes** on close.
- [ ] L12638: 1. **Render (read)**
- [ ] L12640: 2. **User Action (intent)**
- [ ] L12642: 3. **Command (through the Facade)**
- [ ] L12649: 4. **Logic (engine)**
- [ ] L12651: 5. **State Update (commit)**
- [ ] L12653: 6. **Notification (events)**
- [ ] L12655: 7. **Re‑render (subscribe)**
- [ ] L12693: **Behavior.** Maintains `{ visibleModal, formState }`. When opening a modal, it **may pause** the sim for clarity; on close, it optionally **resumes** if it was running.
- [ ] L12786: - **Modals** ≈ `useModals()` with pause/resume behavior when opening/closing.
- [ ] L12811: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | `FinanceView` shows the same sections after expansion, revealing the detailed breakdowns under each card.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Highlights the deeper inspection step of the financial reporting flow.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |
- [ ] L12818: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` exposes sliders/toggles while `ZoneDeviceList` remains adjacent for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L415】【F:docs/ui/ui-components-desciption.md†L421-L429】 | Demonstrates runtime setpoint adjustments and device management described for zone control.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |
- [ ] L12839: - Active flows: rent/create/duplicate/delete/rename actions (`world.rentStructure`, `world.createRoom`, `world.createZone`, `world.duplicateStructure`, `world.duplicateRoom`, `world.duplicateZone`, `world.renameStructure`, `world.updateRoom`, `world.updateZone`, `world.deleteStructure`, `world.deleteRoom`, `world.deleteZone`) are surfaced through `ModalHost` dialogs. Each modal now invokes the matching `useZoneStore` intent helper which emits the façade command so the backend processes geometry, costing, and duplication rules deterministically, and the regression suite drives these flows through `ModalHost.test.tsx` to assert both the dispatched intent and modal teardown.【F:src/backend/src/facade/index.ts†L1168-L1233】【F:src/frontend/src/components/ModalHost.tsx†L157-L318】【F:src/frontend/src/store/zoneStore.ts†L240-L338】【F:src/frontend/src/components/ModalHost.test.tsx†L80-L262】 The Zone view header also surfaces cultivation method, container, and substrate labels alongside a “Change method” CTA that opens the dedicated modal; the dialog filters compatible methods, pulls matching container/substrate catalogs, clamps container counts to the zone capacity, recomputes substrate volume and cost estimates, runs the temporary storage handoff stub, and dispatches `bridge.world.updateZone` with the consumable payload. RTL coverage exercises the filtering, clamping, and dispatched intent.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】
- [ ] L12846: - New UI: the “Device inventory” panel now surfaces install/update/move/remove lifecycle commands. The Install/Update/Move actions open dedicated modals that collect blueprint IDs, JSON settings patches, or destination zones before dispatching `devices.installDevice`, `devices.updateDevice`, and `devices.moveDevice`. Remove uses the shared confirmation modal to emit `devices.removeDevice`. All flows reuse `ModalHost` wiring and new zone-store helpers so façade intents fire deterministically from a single place.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】【F:src/backend/src/facade/index.ts†L1236-L1266】
- [ ] L13019: - **Purpose:** The main header bar at the top of the application. It contains game controls (play/pause, speed), primary navigation links (Structures, Personnel, Finance), key global stats, and a button to open the game menu.
- [ ] L13064: | `onOpenModal` | `(...) => void` | Yes | Callback to open modals (e.g., "Add Room"). |
- [ ] L13241: - **Props:** `zone`, `onClick`, `onOpenModal`.
- [ ] L13250: - **Props:** `devices`, `onOpenModal`, `zoneId`.
- [ ] L13260: - **Inspection:** Hovering over a plant card shows a tooltip with its basic stats. Clicking the card opens the detailed `PlantDetailModal` for a full overview and specific actions.
- [ ] L13261: - **Direct Actions:** Clicking on a status icon on the plant card triggers a direct action, bypassing the detail modal. Clicking a pest or disease icon opens the `InfoModal` with blueprint data. Clicking the harvest icon immediately harvests the plant. This provides a fast workflow for common tasks.
- [ ] L13266: - **Props:** `zone`, `onOpenModal`, `onBatchAction`, `onPlantAction`.
- [ ] L13288: - **Props:** `structures`, `onNavigate`, `onOpenModal`, `onRename`.
- [ ] L13310: - **Props:** `gameData`, `onOpenModal`, `onRefreshCandidates`, `onFireEmployee`.
- [ ] L13318: - **Functionality:** Zone cards highlight temperature/humidity, cultivation method and substrate names, plant counts, and surface icon-only duplicate/delete controls that open the respective modals while the primary CTA drills into the zone view.【F:src/frontend/src/views/RoomView.tsx†L12-L139】【F:src/frontend/src/views/**tests**/RoomView.test.tsx†L46-L68】
- [ ] L13325: - **Props:** `structure`, `onNavigate`, `onOpenModal`, `onRename`.
- [ ] L13333: - **Props:** `zone`, `onControlsChange`, `onOpenModal`, `onRename`, `onBatchAction`, `onPlantAction`.
- [ ] L13337: - **Device lifecycle controls:** The device inventory panel now features an “Install device” CTA plus inline buttons for adjusting settings, relocating hardware to another zone, or removing a unit. Each action opens a modal (`InstallDeviceModal`, `UpdateDeviceModal`, `MoveDeviceModal`, or the shared confirmation dialog) and delegates to the new zone-store helpers so façade intents fire in order.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】
- [ ] L13338: - **Cultivation method management:** The zone header highlights `zone.cultivationMethodName` plus container/substrate names and offers a “Change method” button that opens the dedicated modal. The dialog now filters compatible methods, constrains the container/substrate lists to the selected method, clamps the container count to the zone’s capacity while recomputing substrate volume and cost estimates, confirms the storage handoff via the stub handler, and dispatches `world.updateZone` through the frontend bridge with the consumable payload.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】
- [ ] L13937: - ## Open questions / risks
- [ ] L13946: - docs/tasks/20250923-todo-findings.md
- [ ] L13948: - docs/tasks/20250924-todo-findings.md
- [ ] L14169: - ## Open Issues
- [ ] L14225: 1. **Contract Fidelity** – Zustand slices, selectors, and UI components must model the payloads emitted by `buildSimulationSnapshot` and documented telemetry events. Any transformations should be centralized and typed.
- [ ] L14226: 2. **Deterministic Dev Experience** – Where offline or replay modes are required (e.g., storybook, vitest), they should replay captured Socket.IO transcripts or use shared TypeScript fixtures produced from backend snapshots.
- [ ] L14227: 3. **Incremental Migration** – Replace mocks feature-by-feature to keep the UI usable during transition and simplify QA.
- [ ] L14228: 4. Document every task at `/docs/tasks/mock-migration/`
- [ ] L14266: 1. **Mock Usage Audit Prompt**
- [ ] L14270: 2. **Store Alignment Prompt**
- [ ] L14274: 3. **Live Data Wiring Prompt**
- [ ] L14278: 4. **Replay Fixture Prompt**
- [ ] L14282: 5. **Regression Coverage Prompt**
- [ ] L14313: 1. GameData.globalStats exposes stringly-typed time and water metrics, whereas the dashboard contracts expect SimulationSnapshot.clock with numeric ticks and SI units (time status already modeled in stores).
- [ ] L14314: 2. Structure/room definitions omit required PRD fields (status, rent per tick, volumes, purpose metadata) found in StructureSnapshot/RoomSnapshot, so the migration must enrich fixtures with geometry and lifecycle attributes.
- [ ] L14315: 3. Zone records use local controls and KPI arrays with string values (e.g., humidity 52%) while the real schema expects normalized environment floats (0–1 relative humidity) and rolling metrics. Conversions and missing fields like volume, lighting, resources, health must be filled in or derived.
- [ ] L14316: 4. Plant objects rely on name/progress/harvestable while the PRD mandates strain IDs, stages, biomass, and linkage to structure/room IDs (PlantSnapshot).
- [ ] L14317: 5. Devices only expose name/type; backend contracts require blueprintId, kind, status, maintenance metrics, and settings payloads.
- [ ] L14318: 6. Personnel and candidate records lack morale/energy, salary-per-tick units, and optional seeds/gender present in PersonnelSnapshot types; salary semantics should switch from annual numbers to per-tick values.
- [ ] L14319: 7. Finance mock data summarizes “7d” figures and ad-hoc breakdowns rather than the tick-based FinanceSummarySnapshot and FinanceTickEntry history consumed by the live finance dashboard.
- [ ] L14323: 1. SeededRandom is instantiated once at module scope; repeated calls mutate internal state and the global idCounter for deterministicUuid, meaning fixture generation order changes outputs. Swap for explicit seed management tied to store hydration or shared deterministic helpers.
- [ ] L14325: 2. App.tsx keeps the entire simulation in React component state and mutates copies with JSON.parse(JSON.stringify(...)), which breaks determinism and bypasses the established Zustand slices (useGameStore, useZoneStore, etc.). Migration should funnel all state changes through the existing stores and intents to stay in sync with PRD expectations.
- [ ] L14329: 1. Define fixture-to-snapshot translator – Map initialMockData into SimulationSnapshot/store slices so clickdummy content can hydrate the Zustand stores without breaking type guarantees; normalize units and add missing PRD fields in this step.
- [ ] L14331: 2. Introduce deterministic helper module – Replace deterministicUuid/module-global RNG with a seeded helper integrated into store/utils, ensuring repeatable fixture generation and aligning with backend seeds.
- [ ] L14333: 3. Refactor layout shell – Extend App.tsx to render the real header/navigation/sidebar using existing design-system components, wiring controls to useGameStore for play/speed state and navigation slices for selections.
- [ ] L14335: 4. Port structure & room views – Implement structure/room detail pages leveraging DashboardOverview data, adding drill-down panels and breadcrumb logic derived from clickdummy while using normalized store selectors.
- [ ] L14337: 5. Enhance zone detail – Merge environment controls, plant grids, and device management into ZoneDetail, binding sliders/toggles to setpoint dispatch and using real telemetry values.
- [ ] L14339: 6. Integrate modal workflows – Register modal descriptors for CRUD/treatment flows in the modal slice and reimplement modal bodies with shared Modal while ensuring actions dispatch facade intents or update fixtures deterministically.
- [ ] L14341: 7. Rebuild personnel dashboard – Adapt hiring/roster UI to the live usePersonnelStore, translating morale/energy displays and hooking up modal-driven hires/fires using deterministic fixtures when backend data is absent.
- [ ] L14343: 8. Align finance UX – Incorporate clickdummy time-range controls and breakdown lists into FinancesView, ensuring metrics and charts consume normalized finance history from the store.
- [ ] L14345: 9. Finalize shared primitives & tests – Replace bespoke form/button/icon components with project-standard equivalents, add unit tests for new helpers/selectors, and verify seeded fixture snapshots remain stable.
- [ ] L14347: ## Open questions / risks
- [ ] L14349: 1. ✅ Do we continue using Material Icons from the clickdummy or switch to the project’s preferred icon set to stay consistent with the design system?
- [ ] L14352: 2. ✅ How should setpoint controls interact with the simulation facade—are sendConfigUpdate/sendFacadeIntent handlers already available for temperature, humidity, PPFD, etc., or do we need to extend store slices?
- [ ] L14355: 3. ✅ What navigation model should drive structure/room/zone selection—expand the existing navigation slice or introduce a dedicated world-browser slice? Clarifying avoids duplicating state between sidebar and top-level navigation.
- [ ] L14358: 4. ✅ Should personnel and finance fixtures represent per-tick values (per PRD) or retain aggregated “7d” placeholders until backend feeds real snapshots? Aligning units is critical for determinism and SI compliance.
- [ ] L14361: 5. ✅ Are duplicate/clone flows (rooms/zones) still required in the MVP, and if so, which backend intents will back them? Current clickdummy logic assumes immediate balance adjustments and device cost tables that may not exist yet.
- [ ] L14370: 1. Fixture-Übersetzer aufsetzen: Implementiere ein Modul, das initialMockData und verwandte Datenquellen in SimulationSnapshot-kompatible Strukturen überführt, dabei fehlende PRD-Felder ergänzt (z. B. Volumen, Status) und Einheiten normalisiert.
- [ ] L14373: 2. Zone-Daten konvertieren: Rechne alle zonalen Kennzahlen (RH, KPIs, Ressourcen) in die erwarteten numerischen SI-Einheiten um und fülle fehlende Telemetrie-/Gesundheitsfelder auf, bevor sie die Stores hydratisieren.
- [ ] L14378: 3. ✅ Pflanzen-, Geräte-, Personal- und Finanzobjekte anreichern: Fixtures liefern jetzt konsistente strain-IDs/Stadien, Geräte-Blueprint-Metadaten sowie per-Tick-Kosten mitsamt `financeHistory`. Die Umsetzung lebt in `src/frontend/src/fixtures/translator.ts` und den zugehörigen Tests.
- [ ] L14380: 4. ✅ Deterministische Hilfsfunktionen zentralisieren: `store/utils/deterministic.ts` stellt jetzt einen seeded Helper bereit (`createDeterministicManager`, `createDeterministicSequence`, `nextDeterministicId`), der von Fixtures (`data/mockData.ts`) und App-Workflows genutzt wird. Globale `SeededRandom`-Instanzen und `deterministicUuid` wurden entfernt, sodass IDs und Zufallsdaten aus der gemeinsamen Utility stammen.
- [ ] L14382: 5. ✅ State-Management auf Stores umstellen: Refaktoriere App.tsx, sodass sämtliche Simulationzustände über useGameStore, useZoneStore etc. laufen und lokale JSON-Mutationen entfallen.
- [ ] L14390: 6. ✅ Layout-Shell refaktorieren: Kombiniere die Klickdummy-Header-/Sidebar-Elemente mit den vorhandenen Komponenten (DashboardHeader, Navigation, TimeDisplay) und verdrahte sie mit den Spiel- und Navigationsslices.
- [ ] L14395: 7. ✅ Breadcrumbs und Event-Ticker anbinden: Implementiere Breadcrumbs und Event-Log auf Basis der bestehenden Navigations- und Game-Store-Selektoren, um Auswahlzustand und Telemetrie zu spiegeln.
- [ ] L14399: 8. ✅ Navigation-Slice erweitern: Ergänze den bestehenden Slice um Struktur-/Raum-Hierarchie und wende ihn sowohl für Sidebar als auch Kopfzeilen-Navigation an, um Doppelstaat zu vermeiden.
- [ ] L14406: 9. ✅ Struktur- und Raumansichten integrieren: Portiere Karten und Detailpanels in DashboardOverview/ZoneDetail, erstelle gemeinsame Kartenkomponenten unter components/cards und implementiere Drilldown-Logik plus Breadcrumbs.
- [ ] L14411: 10. ✅ Zonenansicht erweitern: Ergänze ZoneDetail um Steuer-Widgets, Pflanzenaktionen und Gerätelisten; nutze useZoneStore().sendSetpoint für Setpoint-Dispatch und extrahiere Form-Controls in components/forms.
- [ ] L14417: 11. ✅ Personalbereich neu aufbauen: Spiegle Bewerber- und Mitarbeiterdarstellungen im PersonnelView, verdrahte Hire/Fire-Intents und verlagere Modale in den globalen Modal-Slice.
- [ ] L14422: 12. ✅ Finanzdashboard abstimmen: Übertrage Zeitbereichs-Umschalter und Aufschlüsselungslisten in FinancesView und stelle sicher, dass sie tickbasierte financeHistory-Daten konsumieren.
- [ ] L14428: 13. ✅ Modal-Descriptoren registrieren: Der Modal-Slice exportiert jetzt eine strikt typisierte `ModalDescriptor`-Union mit eigenen Payloads für Anlegen-, Umbenennen-, Duplizier-, Detail- und Löschflows. `ModalHost` rendert die neuen Inhaltskomponenten (`views/world/modals` sowie `views/zone/modals`) für Räume/Zonen/Strukturen und Pflanzen-Details und pausiert weiterhin deterministisch bei aktiven Dialogen.
- [ ] L14430: 14. ✅ Fassade-Intents anbinden: Die Duplizieren-Dialoge leiten ihre Bestätigungen jetzt an die Store-Helfer weiter, die getrimmte Namen und Options-Payloads an `facade.world.duplicateRoom` bzw. `facade.world.duplicateZone` senden. Geräte- und Methodenklone entstehen damit ausschließlich im Backend, wodurch CapEx-/Inventarereignisse deterministisch über die Facade-Finanzereignisse in den Stores landen (`src/frontend/src/components/ModalHost.tsx`, `src/frontend/src/store/zoneStore.ts`, `src/frontend/src/store/types.ts`).
- [ ] L14434: 15. ✅ UI-Primitiven angleichen: Schaltflächen, Formularfelder und Icon-Hüllen nutzen jetzt die neuen Design-System-Komponenten unter `components/inputs` (`Button`, `IconButton`, `TextInput`, `Select`, `RangeInput`, `InlineEdit`). Bestehende Klickdummy-Markup-Styles wurden entfernt.
- [ ] L14436: 16. ✅ Fixtures/Mocks modularisieren: Verschiebe deterministische Mock-Fabriken und Rollen-/Kostenkonstanten in src/frontend/fixtures und stelle sicher, dass sie die Store-Hydration bedienen.
- [ ] L14441: 17. ✅ Selektor-Helper neu platzieren: Portiere Struktur-/Raum-/Zonen-Helper als testbare Selektoren in store/selectors.ts oder modulnahe Utilities.
- [ ] L14447: 19. ✅ Unit- und Snapshot-Tests ergänzen: Schreibe Tests für neue Selektoren, deterministische Fixtures und UI-Komponenten, um die Stabilität der migrierten Oberflächen sicherzustellen.
- [ ] L14449: - Neue fixturespezifische Tests (`src/frontend/src/fixtures/deterministic.test.ts`) prüfen Sequenz- und Manager-Funktionalität, Clones, Scope-Reset sowie die globalen Helper (`getSharedSequence`, `nextSharedId`).
- [ ] L14452: 20. ✅ Determinismus verifizieren: Wiederholte Hydrationen mit identischem Seed liefern jetzt bytegleiche Ergebnisse.
- [ ] L14486: 1. Load the difficulty config once during bootstrap and inject it into both the initial state factory and the world service.
- [ ] L14487: 2. Remove the duplicated `DIFFICULTY_ECONOMICS` tables and derive defaults from the loaded config instead.
- [ ] L14488: 3. Extend the tests to cover the easy/normal/hard presets so that future edits to `difficulty.json` must be reflected in the engine.
- [ ] L14510: 1. **Inject Config**
- [ ] L14512: 2. **Refactor State Factory**
- [ ] L14515: 3. **Refactor World Service**
- [ ] L14518: 4. **Add Tests**
- [ ] L14520: 5. **Docs & Changelog**
- [ ] L14528: ## • Critical: config.update setpoint rejects UUID zoneIds (backend socketGateway.t (docs/tasks/20250924-todo-findings.md)
- [ ] L14530: Source: [`docs/tasks/20250924-todo-findings.md`](../docs/tasks/20250924-todo-findings.md)
- [ ] L14540: • Medium: Modal pause/resume policy not implemented (frontend) — spec requires auto-pause on open and restore prior state on close, but modalSlice only stores flags; implement wiring (read time status, pause on open if running, resume on close if wasRunningBeforeModal). Files: docs/system/ui-mplementation-spec.md §4, src/frontend/src/store/slices/modalSlice.ts, useSimulationBridge + stores
- [ ] L14541: Status: ✅ Completed 2025-09-24 — Modal store now pauses via `openModal` (autoPause by default) and issues a resume on close when the sim was running beforehand, with docs updated.
- [ ] L14551: • Low: Optional telemetry not surfaced yet in UI — dashboard reads zone.lighting/plantingPlan but backend snapshot lacks these aggregates; either add derived fields (backend) or guard UI (already guarded) and open an enhancement task. Files: src/backend/src/lib/uiSnapshot.ts, src/frontend/src/views/DashboardOverview.tsx, docs/system/ui-mplementation-spec.md
- [ ] L14613: 1. Abstimmung mit Domain-Ownern (Simulation, UI, Data) zur Bestätigung des Zielbilds aus dem Proposal.
- [ ] L14614: 2. Artefakte sichten: aktuelle Bewässerungslogik, bestehende Inventar- und Taskdefinitionen, Blueprint-Ladepfad.
- [ ] L14615: 3. Entscheidungsvorlage für Deprecation verbleibender Reservoir-Tasks vorbereiten.
- [ ] L14619: 1. **Strukturzustand erweitern**: `utilities.waterMeter_m3`, `utilities.lastTickWaterDraw_L`, `inventory.nutrients[]` mit `id`, `name`, `form`, `npk`, `amount_kg` integrieren.
- [ ] L14620: 2. **Zonenmodell ergänzen**: `irrigation.methodId`, optionale `targetEC_mS_cm`, `runoffFraction`.
- [ ] L14621: 3. **[Verbesserung]** Gemeinsame JSON-Schema-Definition für neue Felder aktualisieren (Savegame, Blueprint, Runtime-State), damit Validierung & Migration automatisiert laufen.
- [ ] L14622: 4. Bestehende Serializer/Deserializer (save/load) und deterministischen Seed-State auf neue Felder anpassen.
- [ ] L14666: 1. Verzeichnis erstellen, Schema nach Proposal abbilden: `id`, `slug`, `name`, `kind`, `description`, `mixing`, `couplesFertilizer`, `flow_L_per_min`, `uniformity`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, `meta`.
- [ ] L14667: 2. Seed-Blueprints anlegen:
- [ ] L14672: 3. Validierungen implementieren:
- [ ] L14678: 4. **[Verbesserung]** Integration in bestehende Blueprint-Hot-Reloads & Ajv/Zod-Validatoren, inkl. Dokumentation im Blueprint-Index.
- [ ] L14704: 1. Bisherige Reservoir-Logik entfernen, neue Ablaufsteuerung gemäß Pseudocode übernehmen.
- [ ] L14705: 2. Funktionsblöcke erstellen:
- [ ] L14708: 3. Pending-Queues für manuelle Methoden (`zone.resources.pending.*`) befüllen, Warteschlangenverhalten beibehalten.
- [ ] L14709: 4. Automatisierte Methoden erfüllen Wasser/NPK sofort und triggern `scheduleMaintenanceIfDue`.
- [ ] L14710: 5. Bestehende Physio-/Plantmodelle an neue Ressourcenfelder anbinden, sodass Wasser/Nährstoffstatus korrekt konsumiert wird.
- [ ] L14711: 6. **[Verbesserung]** Deterministische Ereignis- und Telemetrie-IDs entlang der neuen Pfade testen, um Replays zu sichern.
- [ ] L14747: 1. Wasserverbrauch: `utilities.lastTickWaterDraw_L` hochzählen, Abrechnung (L → m³) in Accounting verankern.
- [ ] L14748: 2. Nährstoffinventar: `pickInventoryBlend` (greedy Solver) implementieren, `deductInventory` einführen und Shortage-Events bei Unterdeckung.
- [ ] L14749: 3. Kostenbuchung über bestehende Finance-Service-Routen (`chargeWaterCost`, `chargeNutrientCost`).
- [ ] L14750: 4. Optionalen Auto-Reorder-Hook vorbereiten, jedoch deaktiviert lassen.
- [ ] L14778: 1. `/data/configs/task_definitions.json` erweitern:
- [ ] L14783: 2. Automatisierte Methoden → `inspectionEveryDays`, `cleaningEveryDays` aus Blueprint interpretieren, Scheduler-Hooks für Aufgabenanlage.
- [ ] L14784: 3. Facade-Intents ergänzen:
- [ ] L14788: 4. **[Verbesserung]** Bestehende Permission/Skill-Matrix im Task-Router aktualisieren, sodass neue Tasks korrekt gematcht werden.
- [ ] L14830: 1. Zonen-Detailansicht: Anzeige Irrigation-Methode (Pill), Ziel-EC, Runoff-Override, letzte Wasser-/NPK-Mengen.
- [ ] L14831: 2. Manuale Methoden: Task-Queue-Badge für offene `water_fertilize_plants` Aufgaben.
- [ ] L14832: 3. Automatisierte Methoden: Anzeige nächster Inspektion/Wartung.
- [ ] L14833: 4. Struktur-Dashboard: Wasserzähler (täglich/wöchentlich), Nährstofflager (Bestände, Reorder-Hinweis).
- [ ] L14834: 5. **Danke auch an das UI-Team** für die erwarteten Anpassungen.
- [ ] L14835: 6. **[Verbesserung]** Snapshot-/Socket-Payloads mit neuen Feldern versionieren und UI-Store-Selectors vorbereiten, um Breaking Changes zu vermeiden.
- [ ] L14839: 1. Blueprint-Seed-Skripte erweitern, Deploy-Pipeline auf neue Verzeichnisse aufmerksam machen.
- [ ] L14840: 2. Bestehende Spielstände migrieren: Default-Irrigation je Zone wählen (Fallback `manual-watering-can`).
- [ ] L14841: 3. Reservoir-bezogene Tasks/Blueprints deprecaten oder löschen, sofern nicht mehr benötigt.
- [ ] L14842: 4. Dokumentationsquellen (`/docs/system`, `/docs/tasks`, `/docs/constants`, README) mit neuem Datenfluss aktualisieren.
- [ ] L14846: 1. **Unit-Tests**:
- [ ] L14850: 2. **Szenario-Tests**:
- [ ] L14853: 3. **Ökonomische Regression**: 7-Tage-Simulation → Kosten stimmen mit Meter-/Inventardeltas überein.
- [ ] L14854: 4. **[Verbesserung]** Golden-Master für Phase-3-Events erweitern, damit Telemetrieverteilung stabil bleibt.
- [ ] L14858: 1. Cross-Package Code Review (Backend, Frontend, Docs, Data) durchführen.
- [ ] L14859: 2. Release-Notes vorbereiten, QA-Sign-off einholen.
- [ ] L14860: 3. Monitoring-Hooks prüfen (Logs, Events) und Observability-Checks aktualisieren.
- [ ] L14875: **Zonen- und Strukturzustand (Auszug Savegame vNext)**
- [ ] L14951: 1. Extract defaulting/helpers into `worldDefaults.ts` with deterministic cloning utilities.
- [ ] L14952: 2. Add `structureService.ts`, `roomService.ts`, and `zoneService.ts` under `src/backend/src/engine/world/`, each accepting explicit dependencies and returning typed results.
- [ ] L14953: 3. Refactor existing command handlers to depend on the new services and update unit tests for the delegated behaviour.
- [ ] L14960: 1. Move pure interfaces into `src/backend/src/state/types.ts` (and sub-folders as needed).
- [ ] L14961: 2. Relocate blueprint defaults and loaders into dedicated modules (e.g., `state/personnel/skillBlueprints.ts`).
- [ ] L14962: 3. Update imports across the backend and adjust tests to reference the new modules.
- [ ] L14969: 1. Create `src/frontend/src/components/modals/registry/` with one component per modal.
- [ ] L14970: 2. Introduce a `modalRegistry.ts` mapping descriptors to the extracted components.
- [ ] L14971: 3. Slim `ModalHost` down to a lookup/render shell and refresh the associated tests to target individual modals plus the registry contract.
- [ ] L14975: 1. ✅ Backend world service extraction completed — `worldService` now delegates to defaults, structure, room, and zone services while keeping the façade stable for command handlers.
- [ ] L14976: 2. ✅ Model modularisation finalised — shared interfaces moved into `state/types.ts` with blueprint loaders split into focused initialization and personnel modules.
- [ ] L14977: 3. ✅ Frontend modal split delivered — `modalRegistry.tsx` orchestrates feature-scoped modal components, slimming `ModalHost` to a declarative shell.
- [ ] L15110: 1.0 = neutral

## docs/TDD.md

> L26: 1. Accumulate real time.

> L27: 2. Execute ticks when `accumulated ≥ tickInterval / gameSpeed`.

> L28: 3. **Catch-up**: Process up to `maxTicksPerFrame` to avoid long stalls.

> L30: 1. **Device control** (evaluate setpoints, on/off, hysteresis).

> L31: 2. **Apply device effects** (to zone environment: ΔT, ΔRH, PPFD, CO₂).

> L32: 3. **Environment mixing/normalization** (ambient exchange scaled by airflow/enclosure).

> L33: 4. **Irrigation/Nutrients** (compute per-tick water/N/P/K demands from phase-based curves; update stocks, log deficits).

> L34: 5. **Plants** (growth, phenology, stress from temp/RH/CO₂/light & resource status; stage changes).

> L35: 6. **Health** (detect → progress → spread → treatments; apply PHI/re-entry).

> L36: 7. **Tasks & Agents** (generate tasks; employees seek/claim/execute respecting skills/tools/locks).

> L37: 8. **Harvest/Inventory/Market** (lot creation, timestamps, quality decay).

> L38: 9. **Accounting** (OPEX: maintenance/energy/water/nutrients/labor/rent; CapEx events).

> L39: 10. **Commit** (snapshot + batched events).

> L73: 1. **Detect**: Visibility increases over time; **scouting tasks** and traps add detection rolls.

> L74: 2. **Progress**: Severity grows with favorable environment and balancing multipliers.

> L75: 3. **Spread**: Probabilistic transmission within zone and to neighbors; influenced by airflow/sanitation/tools.

> L76: 4. **Treatments**: Apply efficacy to severity/infection; respect `cooldownDays`, **`reentryIntervalTicks`**, **`preHarvestIntervalTicks`**.

> L77: 5. **Events**: `pest.detected`, `disease.confirmed`, `health.spread`, `treatment.applied`, `outbreak.contained`.

> L124: - `timeOff`: credit overtime to `leaveHours`; the next OffDuty window is extended accordingly.

> L232: (Exact signatures/types are left open by design.)

### Checklist

- [ ] L26: 1. Accumulate real time.
- [ ] L27: 2. Execute ticks when `accumulated ≥ tickInterval / gameSpeed`.
- [ ] L28: 3. **Catch-up**: Process up to `maxTicksPerFrame` to avoid long stalls.
- [ ] L30: 1. **Device control** (evaluate setpoints, on/off, hysteresis).
- [ ] L31: 2. **Apply device effects** (to zone environment: ΔT, ΔRH, PPFD, CO₂).
- [ ] L32: 3. **Environment mixing/normalization** (ambient exchange scaled by airflow/enclosure).
- [ ] L33: 4. **Irrigation/Nutrients** (compute per-tick water/N/P/K demands from phase-based curves; update stocks, log deficits).
- [ ] L34: 5. **Plants** (growth, phenology, stress from temp/RH/CO₂/light & resource status; stage changes).
- [ ] L35: 6. **Health** (detect → progress → spread → treatments; apply PHI/re-entry).
- [ ] L36: 7. **Tasks & Agents** (generate tasks; employees seek/claim/execute respecting skills/tools/locks).
- [ ] L37: 8. **Harvest/Inventory/Market** (lot creation, timestamps, quality decay).
- [ ] L38: 9. **Accounting** (OPEX: maintenance/energy/water/nutrients/labor/rent; CapEx events).
- [ ] L39: 10. **Commit** (snapshot + batched events).
- [ ] L73: 1. **Detect**: Visibility increases over time; **scouting tasks** and traps add detection rolls.
- [ ] L74: 2. **Progress**: Severity grows with favorable environment and balancing multipliers.
- [ ] L75: 3. **Spread**: Probabilistic transmission within zone and to neighbors; influenced by airflow/sanitation/tools.
- [ ] L76: 4. **Treatments**: Apply efficacy to severity/infection; respect `cooldownDays`, **`reentryIntervalTicks`**, **`preHarvestIntervalTicks`**.
- [ ] L77: 5. **Events**: `pest.detected`, `disease.confirmed`, `health.spread`, `treatment.applied`, `outbreak.contained`.
- [ ] L124: - `timeOff`: credit overtime to `leaveHours`; the next OffDuty window is extended accordingly.
- [ ] L232: (Exact signatures/types are left open by design.)

## docs/\_extraction/formulas.md

> L110: 1.0 = neutral

### Checklist

- [ ] L110: 1.0 = neutral

## docs/\_final/01-title-scope.md

> L3: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】

### Checklist

- [ ] L3: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】

## docs/\_final/11-open-questions.md

> L1: # Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ]

> L3: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】

> L4: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】

> L5: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】

> L6: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】

> L7: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】

> L8: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

### Checklist

- [ ] L1: # Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ]
- [ ] L3: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】
- [ ] L4: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】
- [ ] L5: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】
- [ ] L6: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】
- [ ] L7: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】
- [ ] L8: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

## docs/\_final/12-provenance-index.md

> L15: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

### Checklist

- [ ] L15: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

## docs/\_inventory/outline.md

> L452: - ## Open questions / risks

> L461: - docs/tasks/20250923-todo-findings.md

> L463: - docs/tasks/20250924-todo-findings.md

> L684: - ## Open Issues

### Checklist

- [ ] L452: - ## Open questions / risks
- [ ] L461: - docs/tasks/20250923-todo-findings.md
- [ ] L463: - docs/tasks/20250924-todo-findings.md
- [ ] L684: - ## Open Issues

## docs/addendum/all-json.md

> L2996: "notes": "Avoid on open flowers; can harm beneficials."

### Checklist

- [ ] L2996: "notes": "Avoid on open flowers; can harm beneficials."

## docs/addendum/ideas/breeding_module.md

> L321: 0.6, 0.7,

> L324: 0.6, 0.7,

> L330: 0.5, 0.6,

> L333: 0.5, 0.6,

> L617: // show in table/modal; allow user to pin as new parents for next step

### Checklist

- [ ] L321: 0.6, 0.7,
- [ ] L324: 0.6, 0.7,
- [ ] L330: 0.5, 0.6,
- [ ] L333: 0.5, 0.6,
- [ ] L617: // show in table/modal; allow user to pin as new parents for next step

## docs/addendum/ideas/kief_dsl.md

> L241: 1. **Rulekit scaffolding**

> L246: 2. **Lexer & parser foundation**

> L251: 3. **IR schema & validation**

> L256: 4. **Expression compiler**

> L261: 5. **Effect operator implementation**

> L266: 6. **Runtime scheduler & trigger engine**

> L271: 7. **Engine accessors & integration hooks**

> L276: 8. **Rule loading pipeline**

> L281: 9. **Tooling & scripts**

> L286: 10. **Authoring starter packages**

> L291: 11. **Testing & QA suite**

> L296: 12. **Telemetry & observability**

### Checklist

- [ ] L241: 1. **Rulekit scaffolding**
- [ ] L246: 2. **Lexer & parser foundation**
- [ ] L251: 3. **IR schema & validation**
- [ ] L256: 4. **Expression compiler**
- [ ] L261: 5. **Effect operator implementation**
- [ ] L266: 6. **Runtime scheduler & trigger engine**
- [ ] L271: 7. **Engine accessors & integration hooks**
- [ ] L276: 8. **Rule loading pipeline**
- [ ] L281: 9. **Tooling & scripts**
- [ ] L286: 10. **Authoring starter packages**
- [ ] L291: 11. **Testing & QA suite**
- [ ] L296: 12. **Telemetry & observability**

## docs/addendum/migrations/2025-01-22-typescript-toolchain.md

> L13: 1. Rebase onto the toolchain commit. Resolve path conflicts by replacing

> L15: 2. Update local scripts:

> L20: 3. If your branch added new backend files outside `src/backend/src`, move them

> L22: 4. Install workspace dependencies (`pnpm install`) to obtain `tsup`.

### Checklist

- [ ] L13: 1. Rebase onto the toolchain commit. Resolve path conflicts by replacing
- [ ] L15: 2. Update local scripts:
- [ ] L20: 3. If your branch added new backend files outside `src/backend/src`, move them
- [ ] L22: 4. Install workspace dependencies (`pnpm install`) to obtain `tsup`.

## docs/backend-overview.md

> L136: 1. **Load & validate.** Parse blueprints, run schema validation, and reject or migrate files that fall outside required ranges.

> L137: 2. **Materialize instances.** Copy template values into runtime records, apply scenario overrides, derive geometric aggregates (e.g., structure volume), and attach deterministic identifiers.

> L138: 3. **Link cross-references.** Resolve ids across maps (e.g., device prices, strain prices) before the first tick. Missing references are fatal until documented and added to the blueprint set.

> L139: 4. **Runtime usage.** Engine subsystems read only from materialized instances, ensuring tick execution cannot mutate shared template data. Derived telemetry must include source blueprint ids for auditability.

### Checklist

- [ ] L136: 1. **Load & validate.** Parse blueprints, run schema validation, and reject or migrate files that fall outside required ranges.
- [ ] L137: 2. **Materialize instances.** Copy template values into runtime records, apply scenario overrides, derive geometric aggregates (e.g., structure volume), and attach deterministic identifiers.
- [ ] L138: 3. **Link cross-references.** Resolve ids across maps (e.g., device prices, strain prices) before the first tick. Missing references are fatal until documented and added to the blueprint set.
- [ ] L139: 4. **Runtime usage.** Engine subsystems read only from materialized instances, ensuring tick execution cannot mutate shared template data. Derived telemetry must include source blueprint ids for auditability.

## docs/constants/balance.md

> L78: After a plant has spent the minimum required time in its current growth stage, this is the daily chance it will transition to the next stage.

### Checklist

- [ ] L78: After a plant has spent the minimum required time in its current growth stage, this is the daily chance it will transition to the next stage.

## docs/contradictions.md

> L9: 1. **Tick duration is described as both fixed and variable.** The simulation philosophy states that each tick is a fixed hour of game time, while the simulation engine guidance expects systems to recalculate costs when the tick length changes at runtime, implying the duration is adjustable.【F:docs/system/simulation_philosophy.md†L5-L8】【F:docs/system/simulation-engine.md†L175-L186】

> L10: 2. **Client control over tick length conflicts.** The UI building guide insists the backend keeps tick length immutable to clients, yet the socket protocol documents a `config.update` command that lets clients change `tickLength`, and the component guide still maps a tick-length slider to `time.setTickLength` intents.【F:docs/ui-building_guide.md†L366-L394】【F:docs/system/socket_protocol.md†L423-L455】【F:docs/ui/ui-components-desciption.md†L31-L34】

> L11: 3. **State management responsibilities diverge.** The UI guide prescribes a snapshot-driven Zustand store that leaves simulation state immutable in the client, but the component documentation still portrays `App.tsx` as owning mutable game data and recomputing state locally for every interaction.【F:docs/ui-building_guide.md†L364-L371】【F:docs/ui/ui-components-desciption.md†L74-L82】

> L12: 4. **Finance interactions are simultaneously required and absent.** The UI guide claims the dashboard must expose finance intents such as selling inventory and adjusting utility prices, yet the component catalogue declares the finance view read-only with no wired finance intents.【F:docs/ui-building_guide.md†L414-L417】【F:docs/ui/ui-components-desciption.md†L66-L68】

### Checklist

- [ ] L9: 1. **Tick duration is described as both fixed and variable.** The simulation philosophy states that each tick is a fixed hour of game time, while the simulation engine guidance expects systems to recalculate costs when the tick length changes at runtime, implying the duration is adjustable.【F:docs/system/simulation_philosophy.md†L5-L8】【F:docs/system/simulation-engine.md†L175-L186】
- [ ] L10: 2. **Client control over tick length conflicts.** The UI building guide insists the backend keeps tick length immutable to clients, yet the socket protocol documents a `config.update` command that lets clients change `tickLength`, and the component guide still maps a tick-length slider to `time.setTickLength` intents.【F:docs/ui-building_guide.md†L366-L394】【F:docs/system/socket_protocol.md†L423-L455】【F:docs/ui/ui-components-desciption.md†L31-L34】
- [ ] L11: 3. **State management responsibilities diverge.** The UI guide prescribes a snapshot-driven Zustand store that leaves simulation state immutable in the client, but the component documentation still portrays `App.tsx` as owning mutable game data and recomputing state locally for every interaction.【F:docs/ui-building_guide.md†L364-L371】【F:docs/ui/ui-components-desciption.md†L74-L82】
- [ ] L12: 4. **Finance interactions are simultaneously required and absent.** The UI guide claims the dashboard must expose finance intents such as selling inventory and adjusting utility prices, yet the component catalogue declares the finance view read-only with no wired finance intents.【F:docs/ui-building_guide.md†L414-L417】【F:docs/ui/ui-components-desciption.md†L66-L68】

## docs/releases/2025-02-si-blueprint-migration.md

> L41: 1. Rename the affected fields in custom blueprints and convert their values using the table above.

> L42: 2. Update any scripts or tooling that reference the previous keys (e.g., editors, validators).

> L43: 3. Re-run schema validation to confirm compliance with the updated device and strain Zod schemas.

> L44: 4. Review cultivation method compatibility rules for the renamed photoperiod key.

### Checklist

- [ ] L41: 1. Rename the affected fields in custom blueprints and convert their values using the table above.
- [ ] L42: 2. Update any scripts or tooling that reference the previous keys (e.g., editors, validators).
- [ ] L43: 3. Re-run schema validation to confirm compliance with the updated device and strain Zod schemas.
- [ ] L44: 4. Review cultivation method compatibility rules for the renamed photoperiod key.

## docs/system/adr/0001-typescript-toolchain.md

> L63: 1. **Stay on `ts-node`.** Rejected because modern Node has native ESM support;

> L65: 2. **Keep emitting CommonJS bundles.** Rejected because the package already

> L68: 3. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds

### Checklist

- [ ] L63: 1. **Stay on `ts-node`.** Rejected because modern Node has native ESM support;
- [ ] L65: 2. **Keep emitting CommonJS bundles.** Rejected because the package already
- [ ] L68: 3. **Use `esbuild` CLI instead of `tsup`.** `tsup` wraps `esbuild` but adds

## docs/system/adr/0002-frontend-realtime-stack.md

> L53: 1. **Keep React Context for global state.** Rejected because the volume of

> L56: 2. **Adopt a component library instead of Tailwind.** Deferred: Tailwind paired

> L59: 3. **Use the raw Socket.IO client per component.** Rejected to avoid duplicated

### Checklist

- [ ] L53: 1. **Keep React Context for global state.** Rejected because the volume of
- [ ] L56: 2. **Adopt a component library instead of Tailwind.** Deferred: Tailwind paired
- [ ] L59: 3. **Use the raw Socket.IO client per component.** Rejected to avoid duplicated

## docs/system/adr/0003-facade-messaging-overhaul.md

> L58: 1. **Add ad-hoc socket events per workflow.** Rejected because each new command

> L61: 2. **Expose engine services directly over the socket.** Rejected to avoid

> L64: 3. **Keep the legacy CRUD surface and emulate missing workflows in the UI.**

### Checklist

- [ ] L58: 1. **Add ad-hoc socket events per workflow.** Rejected because each new command
- [ ] L61: 2. **Expose engine services directly over the socket.** Rejected to avoid
- [ ] L64: 3. **Keep the legacy CRUD surface and emulate missing workflows in the UI.**

## docs/system/adr/0004-zone-setpoint-routing.md

> L52: 1. **Expose direct device updates over the socket.** Rejected because it would

> L55: 2. **Store setpoints only in zone state and let devices poll it.** Rejected to

> L58: 3. **Interpret VPD in the UI.** Rejected to keep physics-derived conversions on

### Checklist

- [ ] L52: 1. **Expose direct device updates over the socket.** Rejected because it would
- [ ] L55: 2. **Store setpoints only in zone state and let devices poll it.** Rejected to
- [ ] L58: 3. **Interpret VPD in the UI.** Rejected to keep physics-derived conversions on

## docs/system/adr/0006-socket-transport-parity.md

> L42: 1. **Allow independent version drift.** Rejected because the protocol-level

> L45: 2. **Vendor the Socket.IO client.** Deferred — bundling the client manually would

### Checklist

- [ ] L42: 1. **Allow independent version drift.** Rejected because the protocol-level
- [ ] L45: 2. **Vendor the Socket.IO client.** Deferred — bundling the client manually would

## docs/system/adr/0007-physio-module-relocation.md

> L28: `src/backend/src/engine/physio/` so they sit next to the engine subsystems

> L55: 1. **Leave the helpers at the repository root.** Rejected because it perpetuates

> L57: 2. **Promote the helpers to a dedicated workspace package.** Deferred until we

### Checklist

- [ ] L28: `src/backend/src/engine/physio/` so they sit next to the engine subsystems
- [ ] L55: 1. **Leave the helpers at the repository root.** Rejected because it perpetuates
- [ ] L57: 2. **Promote the helpers to a dedicated workspace package.** Deferred until we

## docs/system/adr/0008-randomuser-provisioning.md

> L74: 1. **Manual documentation only.** Rejected because it burdens operators with

> L76: 2. **Bundling static name lists in git.** Deferred to avoid shipping a bloated

> L78: 3. **Lazy provisioning inside the job market refresh.** Rejected because the

### Checklist

- [ ] L74: 1. **Manual documentation only.** Rejected because it burdens operators with
- [ ] L76: 2. **Bundling static name lists in git.** Deferred to avoid shipping a bloated
- [ ] L78: 3. **Lazy provisioning inside the job market refresh.** Rejected because the

## docs/system/employees.md

> L16: To keep the labor market dynamic and credible, the game continuously injects new, unique candidates. Rather than relying only on a fixed local name list, the game **optionally** queries a **seedable external name provider** (e.g., an API that returns first/last names) and falls back to local data if unavailable. An free and open provider is https://randomuser.me/. For detailed information about the API, check the providers documentation.

> L79: - **`timeOff`** — credit overtime hours to the employee’s **`leaveHours`** balance. In their next **OffDuty** period, they take this extra time off. This saves immediate cash but reduces near-term availability.

### Checklist

- [ ] L16: To keep the labor market dynamic and credible, the game continuously injects new, unique candidates. Rather than relying only on a fixed local name list, the game **optionally** queries a **seedable external name provider** (e.g., an API that returns first/last names) and falls back to local data if unavailable. An free and open provider is https://randomuser.me/. For detailed information about the API, check the providers documentation.
- [ ] L79: - **`timeOff`** — credit overtime hours to the employee’s **`leaveHours`** balance. In their next **OffDuty** period, they take this extra time off. This saves immediate cash but reduces near-term availability.

## docs/system/facade.md

> L153: - **Determinism guard**: disallow commands that would change RNG order within a committed tick; schedule for next tick if needed.

> L207: 1. **Device Control** (evaluate setpoints & hysteresis)

> L208: 2. **Apply Device Deltas** (T/RH/CO₂/PPFD)

> L209: 3. **Normalize to Ambient** (mixing, airflow)

> L210: 4. **Irrigation/Nutrients** (NPK g/m²/day → per‑tick, per‑plant)

> L211: 5. **Plants** (growth, stress, health update)

> L212: 6. **Health** (detect, progress, spread, treat; enforce re‑entry & PHI)

> L213: 7. **Tasks & Agents** (generate, claim, execute; overtime policy)

> L214: 8. **Inventory/Market**

> L215: 9. **Finance**

> L216: 10. **Commit & Emit**

### Checklist

- [ ] L153: - **Determinism guard**: disallow commands that would change RNG order within a committed tick; schedule for next tick if needed.
- [ ] L207: 1. **Device Control** (evaluate setpoints & hysteresis)
- [ ] L208: 2. **Apply Device Deltas** (T/RH/CO₂/PPFD)
- [ ] L209: 3. **Normalize to Ambient** (mixing, airflow)
- [ ] L210: 4. **Irrigation/Nutrients** (NPK g/m²/day → per‑tick, per‑plant)
- [ ] L211: 5. **Plants** (growth, stress, health update)
- [ ] L212: 6. **Health** (detect, progress, spread, treat; enforce re‑entry & PHI)
- [ ] L213: 7. **Tasks & Agents** (generate, claim, execute; overtime policy)
- [ ] L214: 8. **Inventory/Market**
- [ ] L215: 9. **Finance**
- [ ] L216: 10. **Commit & Emit**

## docs/system/job_market_population.md

> L87: 1. **Weekly API seed.** `apiSeed = override ?? "<gameSeed>-<weekIndex>"` keeps

> L90: 2. **Profile-specific personal seeds.**

> L93: 3. **RNG stream isolation.** Each personal seed is hashed and fed into

> L99: 4. **ID generation.** Applicant IDs come from the stable `job-market` RNG stream

> L106: 1. **Profile collection.** Fetch remote profiles (or synthesize offline names)

> L108: 2. **Normalization.** Names are trimmed and title-cased; missing entries fall

> L110: 3. **Personal seed resolution.** Missing seeds are replaced with an offline seed

> L112: 4. **Gender draw.** Seeded RNG selects gender with `P(other) = pDiverse` and

> L115: 5. **Role selection.** Weighted draw using each blueprint’s `roleWeight`

> L119: 6. **Skill roll.** Apply the blueprint `skillProfile` for primary/secondary

> L122: 7. **Trait roll.** Sample distinct trait IDs from the personnel directory (if

> L124: 8. **Salary computation.** Start from the role blueprint’s `salary.basePerTick`,

> L128: 9. **Assembly.** Produce `ApplicantState` records with `id`, `name`,

> L192: 1. Ensure the backend has network access to `randomuser.me` **or** ship the

> L194: 2. Optionally set `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true` when running in

> L196: 3. Monitor `hr.candidatesRefreshed` events and job market logs to confirm weekly

> L198: 4. Use the façade command `refreshCandidates` with `force=true` or a custom

### Checklist

- [ ] L87: 1. **Weekly API seed.** `apiSeed = override ?? "<gameSeed>-<weekIndex>"` keeps
- [ ] L90: 2. **Profile-specific personal seeds.**
- [ ] L93: 3. **RNG stream isolation.** Each personal seed is hashed and fed into
- [ ] L99: 4. **ID generation.** Applicant IDs come from the stable `job-market` RNG stream
- [ ] L106: 1. **Profile collection.** Fetch remote profiles (or synthesize offline names)
- [ ] L108: 2. **Normalization.** Names are trimmed and title-cased; missing entries fall
- [ ] L110: 3. **Personal seed resolution.** Missing seeds are replaced with an offline seed
- [ ] L112: 4. **Gender draw.** Seeded RNG selects gender with `P(other) = pDiverse` and
- [ ] L115: 5. **Role selection.** Weighted draw using each blueprint’s `roleWeight`
- [ ] L119: 6. **Skill roll.** Apply the blueprint `skillProfile` for primary/secondary
- [ ] L122: 7. **Trait roll.** Sample distinct trait IDs from the personnel directory (if
- [ ] L124: 8. **Salary computation.** Start from the role blueprint’s `salary.basePerTick`,
- [ ] L128: 9. **Assembly.** Produce `ApplicantState` records with `id`, `name`,
- [ ] L192: 1. Ensure the backend has network access to `randomuser.me` **or** ship the
- [ ] L194: 2. Optionally set `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true` when running in
- [ ] L196: 3. Monitor `hr.candidatesRefreshed` events and job market logs to confirm weekly
- [ ] L198: 4. Use the façade command `refreshCandidates` with `force=true` or a custom

## docs/system/personnel_roles_blueprint.md

> L123: 1. **Missing roles inherit defaults.** Every default role is always present even

> L125: 2. **New roles are allowed.** Any role with an unknown `id` is accepted and will

> L127: 3. **Graceful roll handling.** Invalid or missing roll bounds are coerced to

> L129: 4. **Probability clamping.** Tertiary `chance` values are clamped to `[0, 1]`.

> L130: 5. **Salary guards.** Missing base salaries inherit the fallback role’s value,

### Checklist

- [ ] L123: 1. **Missing roles inherit defaults.** Every default role is always present even
- [ ] L125: 2. **New roles are allowed.** Any role with an unknown `id` is accepted and will
- [ ] L127: 3. **Graceful roll handling.** Invalid or missing roll bounds are coerced to
- [ ] L129: 4. **Probability clamping.** Tertiary `chance` values are clamped to `[0, 1]`.
- [ ] L130: 5. **Salary guards.** Missing base salaries inherit the fallback role’s value,

## docs/system/runtime-event-bus-migration.md

> L23: 1. Replace imports of `../src/lib/eventBus.js` (or equivalent) for runtime telemetry with

> L26: 2. Update `eventBus.emit({ ... })` calls to use the helper signature where convenient:

> L32: 3. When queuing events during tick processing, prefer `collector.queue('type', payload,

### Checklist

- [ ] L23: 1. Replace imports of `../src/lib/eventBus.js` (or equivalent) for runtime telemetry with
- [ ] L26: 2. Update `eventBus.emit({ ... })` calls to use the helper signature where convenient:
- [ ] L32: 3. When queuing events during tick processing, prefer `collector.queue('type', payload,

## docs/system/simulation-engine.md

> L14: 1. **Wall-time accumulation**: keep `accumulatedMs += now - lastNow`.

> L15: 2. **Tick threshold**: while `accumulatedMs ≥ tickIntervalMs / gameSpeed`, do:

> L19: 3. **Snapshot & events**: publish a read-only snapshot and batched events after each committed tick.

> L37: 1. **Start** from last values: `T`, `RH`, `CO2`, (optional `PPFD`).

> L38: 2. **Device deltas**

> L51: 3. **Plant deltas** (coarse canopy physiology)

> L57: 4. **Normalization toward ambient**

> L60: 5. **Clamp & commit**

> L62: 6. **Events**

> L82: 1. **Phenology update**

> L84: 2. **Resource requirement**

> L89: 3. **Stress computation (0–1)**

> L93: 4. **Health update (0–1)**

> L96: 5. **Potential growth**

> L104: 6. **Quality & harvest window**

> L124: 1. **Detect**

> L127: 2. **Progress**

> L132: 3. **Treat**

> L171: - `timeOff`: credit overtime to `leaveHours`; next OffDuty extends accordingly.

### Checklist

- [ ] L14: 1. **Wall-time accumulation**: keep `accumulatedMs += now - lastNow`.
- [ ] L15: 2. **Tick threshold**: while `accumulatedMs ≥ tickIntervalMs / gameSpeed`, do:
- [ ] L19: 3. **Snapshot & events**: publish a read-only snapshot and batched events after each committed tick.
- [ ] L37: 1. **Start** from last values: `T`, `RH`, `CO2`, (optional `PPFD`).
- [ ] L38: 2. **Device deltas**
- [ ] L51: 3. **Plant deltas** (coarse canopy physiology)
- [ ] L57: 4. **Normalization toward ambient**
- [ ] L60: 5. **Clamp & commit**
- [ ] L62: 6. **Events**
- [ ] L82: 1. **Phenology update**
- [ ] L84: 2. **Resource requirement**
- [ ] L89: 3. **Stress computation (0–1)**
- [ ] L93: 4. **Health update (0–1)**
- [ ] L96: 5. **Potential growth**
- [ ] L104: 6. **Quality & harvest window**
- [ ] L124: 1. **Detect**
- [ ] L127: 2. **Progress**
- [ ] L132: 3. **Treat**
- [ ] L171: - `timeOff`: credit overtime to `leaveHours`; next OffDuty extends accordingly.

## docs/system/simulation_philosophy.md

> L20: 1. **Input**: The player manages the environment.

> L21: 2. **Problem**: The environment's deviation from the plant's ideal conditions creates `Stress`.

> L22: 3. **State**: `Stress` negatively impacts the plant's `Health`.

> L23: 4. **Output**: `Health` directly multiplies the plant's potential `Growth`.

### Checklist

- [ ] L20: 1. **Input**: The player manages the environment.
- [ ] L21: 2. **Problem**: The environment's deviation from the plant's ideal conditions creates `Stress`.
- [ ] L22: 3. **State**: `Stress` negatively impacts the plant's `Health`.
- [ ] L23: 4. **Output**: `Health` directly multiplies the plant's potential `Growth`.

## docs/system/socket_protocol.md

> L26: 1. `{ channel: 'simulationUpdate', payload: SimulationUpdateMessage }`

> L27: 2. `{ channel: 'sim.tickCompleted', payload: UiSimulationTickEvent }`

> L28: 3. `{ channel: 'domainEvents', payload: UiDomainEventsMessage }`

> L29: 4. `{ channel: <event.type>, payload: event.payload ?? null }`

> L35: 1. The client connects to the single Socket.IO namespace (`/`).

> L36: 2. Immediately after the connection the gateway emits:

> L53: next to the frontend package (see `.env.example`) to point the UI at a

> L188: "nextDueTick": 210,

### Checklist

- [ ] L26: 1. `{ channel: 'simulationUpdate', payload: SimulationUpdateMessage }`
- [ ] L27: 2. `{ channel: 'sim.tickCompleted', payload: UiSimulationTickEvent }`
- [ ] L28: 3. `{ channel: 'domainEvents', payload: UiDomainEventsMessage }`
- [ ] L29: 4. `{ channel: <event.type>, payload: event.payload ?? null }`
- [ ] L35: 1. The client connects to the single Socket.IO namespace (`/`).
- [ ] L36: 2. Immediately after the connection the gateway emits:
- [ ] L53: next to the frontend package (see `.env.example`) to point the UI at a
- [ ] L188: "nextDueTick": 210,

## docs/tasks/20250923-clickdummy-migration_steps.md

> L17: 1. GameData.globalStats exposes stringly-typed time and water metrics, whereas the dashboard contracts expect SimulationSnapshot.clock with numeric ticks and SI units (time status already modeled in stores).

> L18: 2. Structure/room definitions omit required PRD fields (status, rent per tick, volumes, purpose metadata) found in StructureSnapshot/RoomSnapshot, so the migration must enrich fixtures with geometry and lifecycle attributes.

> L19: 3. Zone records use local controls and KPI arrays with string values (e.g., humidity 52%) while the real schema expects normalized environment floats (0–1 relative humidity) and rolling metrics. Conversions and missing fields like volume, lighting, resources, health must be filled in or derived.

> L20: 4. Plant objects rely on name/progress/harvestable while the PRD mandates strain IDs, stages, biomass, and linkage to structure/room IDs (PlantSnapshot).

> L21: 5. Devices only expose name/type; backend contracts require blueprintId, kind, status, maintenance metrics, and settings payloads.

> L22: 6. Personnel and candidate records lack morale/energy, salary-per-tick units, and optional seeds/gender present in PersonnelSnapshot types; salary semantics should switch from annual numbers to per-tick values.

> L23: 7. Finance mock data summarizes “7d” figures and ad-hoc breakdowns rather than the tick-based FinanceSummarySnapshot and FinanceTickEntry history consumed by the live finance dashboard.

> L27: 1. SeededRandom is instantiated once at module scope; repeated calls mutate internal state and the global idCounter for deterministicUuid, meaning fixture generation order changes outputs. Swap for explicit seed management tied to store hydration or shared deterministic helpers.

> L29: 2. App.tsx keeps the entire simulation in React component state and mutates copies with JSON.parse(JSON.stringify(...)), which breaks determinism and bypasses the established Zustand slices (useGameStore, useZoneStore, etc.). Migration should funnel all state changes through the existing stores and intents to stay in sync with PRD expectations.

> L33: 1. Define fixture-to-snapshot translator – Map initialMockData into SimulationSnapshot/store slices so clickdummy content can hydrate the Zustand stores without breaking type guarantees; normalize units and add missing PRD fields in this step.

> L35: 2. Introduce deterministic helper module – Replace deterministicUuid/module-global RNG with a seeded helper integrated into store/utils, ensuring repeatable fixture generation and aligning with backend seeds.

> L37: 3. Refactor layout shell – Extend App.tsx to render the real header/navigation/sidebar using existing design-system components, wiring controls to useGameStore for play/speed state and navigation slices for selections.

> L39: 4. Port structure & room views – Implement structure/room detail pages leveraging DashboardOverview data, adding drill-down panels and breadcrumb logic derived from clickdummy while using normalized store selectors.

> L41: 5. Enhance zone detail – Merge environment controls, plant grids, and device management into ZoneDetail, binding sliders/toggles to setpoint dispatch and using real telemetry values.

> L43: 6. Integrate modal workflows – Register modal descriptors for CRUD/treatment flows in the modal slice and reimplement modal bodies with shared Modal while ensuring actions dispatch facade intents or update fixtures deterministically.

> L45: 7. Rebuild personnel dashboard – Adapt hiring/roster UI to the live usePersonnelStore, translating morale/energy displays and hooking up modal-driven hires/fires using deterministic fixtures when backend data is absent.

> L47: 8. Align finance UX – Incorporate clickdummy time-range controls and breakdown lists into FinancesView, ensuring metrics and charts consume normalized finance history from the store.

> L49: 9. Finalize shared primitives & tests – Replace bespoke form/button/icon components with project-standard equivalents, add unit tests for new helpers/selectors, and verify seeded fixture snapshots remain stable.

> L51: ## Open questions / risks

> L53: 1. ✅ Do we continue using Material Icons from the clickdummy or switch to the project’s preferred icon set to stay consistent with the design system?

> L56: 2. ✅ How should setpoint controls interact with the simulation facade—are sendConfigUpdate/sendFacadeIntent handlers already available for temperature, humidity, PPFD, etc., or do we need to extend store slices?

> L59: 3. ✅ What navigation model should drive structure/room/zone selection—expand the existing navigation slice or introduce a dedicated world-browser slice? Clarifying avoids duplicating state between sidebar and top-level navigation.

> L62: 4. ✅ Should personnel and finance fixtures represent per-tick values (per PRD) or retain aggregated “7d” placeholders until backend feeds real snapshots? Aligning units is critical for determinism and SI compliance.

> L65: 5. ✅ Are duplicate/clone flows (rooms/zones) still required in the MVP, and if so, which backend intents will back them? Current clickdummy logic assumes immediate balance adjustments and device cost tables that may not exist yet.

> L74: 1. Fixture-Übersetzer aufsetzen: Implementiere ein Modul, das initialMockData und verwandte Datenquellen in SimulationSnapshot-kompatible Strukturen überführt, dabei fehlende PRD-Felder ergänzt (z. B. Volumen, Status) und Einheiten normalisiert.

> L77: 2. Zone-Daten konvertieren: Rechne alle zonalen Kennzahlen (RH, KPIs, Ressourcen) in die erwarteten numerischen SI-Einheiten um und fülle fehlende Telemetrie-/Gesundheitsfelder auf, bevor sie die Stores hydratisieren.

> L82: 3. ✅ Pflanzen-, Geräte-, Personal- und Finanzobjekte anreichern: Fixtures liefern jetzt konsistente strain-IDs/Stadien, Geräte-Blueprint-Metadaten sowie per-Tick-Kosten mitsamt `financeHistory`. Die Umsetzung lebt in `src/frontend/src/fixtures/translator.ts` und den zugehörigen Tests.

> L84: 4. ✅ Deterministische Hilfsfunktionen zentralisieren: `store/utils/deterministic.ts` stellt jetzt einen seeded Helper bereit (`createDeterministicManager`, `createDeterministicSequence`, `nextDeterministicId`), der von Fixtures (`data/mockData.ts`) und App-Workflows genutzt wird. Globale `SeededRandom`-Instanzen und `deterministicUuid` wurden entfernt, sodass IDs und Zufallsdaten aus der gemeinsamen Utility stammen.

> L86: 5. ✅ State-Management auf Stores umstellen: Refaktoriere App.tsx, sodass sämtliche Simulationzustände über useGameStore, useZoneStore etc. laufen und lokale JSON-Mutationen entfallen.

> L94: 6. ✅ Layout-Shell refaktorieren: Kombiniere die Klickdummy-Header-/Sidebar-Elemente mit den vorhandenen Komponenten (DashboardHeader, Navigation, TimeDisplay) und verdrahte sie mit den Spiel- und Navigationsslices.

> L99: 7. ✅ Breadcrumbs und Event-Ticker anbinden: Implementiere Breadcrumbs und Event-Log auf Basis der bestehenden Navigations- und Game-Store-Selektoren, um Auswahlzustand und Telemetrie zu spiegeln.

> L103: 8. ✅ Navigation-Slice erweitern: Ergänze den bestehenden Slice um Struktur-/Raum-Hierarchie und wende ihn sowohl für Sidebar als auch Kopfzeilen-Navigation an, um Doppelstaat zu vermeiden.

> L110: 9. ✅ Struktur- und Raumansichten integrieren: Portiere Karten und Detailpanels in DashboardOverview/ZoneDetail, erstelle gemeinsame Kartenkomponenten unter components/cards und implementiere Drilldown-Logik plus Breadcrumbs.

> L115: 10. ✅ Zonenansicht erweitern: Ergänze ZoneDetail um Steuer-Widgets, Pflanzenaktionen und Gerätelisten; nutze useZoneStore().sendSetpoint für Setpoint-Dispatch und extrahiere Form-Controls in components/forms.

> L121: 11. ✅ Personalbereich neu aufbauen: Spiegle Bewerber- und Mitarbeiterdarstellungen im PersonnelView, verdrahte Hire/Fire-Intents und verlagere Modale in den globalen Modal-Slice.

> L126: 12. ✅ Finanzdashboard abstimmen: Übertrage Zeitbereichs-Umschalter und Aufschlüsselungslisten in FinancesView und stelle sicher, dass sie tickbasierte financeHistory-Daten konsumieren.

> L132: 13. ✅ Modal-Descriptoren registrieren: Der Modal-Slice exportiert jetzt eine strikt typisierte `ModalDescriptor`-Union mit eigenen Payloads für Anlegen-, Umbenennen-, Duplizier-, Detail- und Löschflows. `ModalHost` rendert die neuen Inhaltskomponenten (`views/world/modals` sowie `views/zone/modals`) für Räume/Zonen/Strukturen und Pflanzen-Details und pausiert weiterhin deterministisch bei aktiven Dialogen.

> L134: 14. ✅ Fassade-Intents anbinden: Die Duplizieren-Dialoge leiten ihre Bestätigungen jetzt an die Store-Helfer weiter, die getrimmte Namen und Options-Payloads an `facade.world.duplicateRoom` bzw. `facade.world.duplicateZone` senden. Geräte- und Methodenklone entstehen damit ausschließlich im Backend, wodurch CapEx-/Inventarereignisse deterministisch über die Facade-Finanzereignisse in den Stores landen (`src/frontend/src/components/ModalHost.tsx`, `src/frontend/src/store/zoneStore.ts`, `src/frontend/src/store/types.ts`).

> L138: 15. ✅ UI-Primitiven angleichen: Schaltflächen, Formularfelder und Icon-Hüllen nutzen jetzt die neuen Design-System-Komponenten unter `components/inputs` (`Button`, `IconButton`, `TextInput`, `Select`, `RangeInput`, `InlineEdit`). Bestehende Klickdummy-Markup-Styles wurden entfernt.

> L140: 16. ✅ Fixtures/Mocks modularisieren: Verschiebe deterministische Mock-Fabriken und Rollen-/Kostenkonstanten in src/frontend/fixtures und stelle sicher, dass sie die Store-Hydration bedienen.

> L145: 17. ✅ Selektor-Helper neu platzieren: Portiere Struktur-/Raum-/Zonen-Helper als testbare Selektoren in store/selectors.ts oder modulnahe Utilities.

> L151: 19. ✅ Unit- und Snapshot-Tests ergänzen: Schreibe Tests für neue Selektoren, deterministische Fixtures und UI-Komponenten, um die Stabilität der migrierten Oberflächen sicherzustellen.

> L153: - Neue fixturespezifische Tests (`src/frontend/src/fixtures/deterministic.test.ts`) prüfen Sequenz- und Manager-Funktionalität, Clones, Scope-Reset sowie die globalen Helper (`getSharedSequence`, `nextSharedId`).

> L156: 20. ✅ Determinismus verifizieren: Wiederholte Hydrationen mit identischem Seed liefern jetzt bytegleiche Ergebnisse.

### Checklist

- [ ] L17: 1. GameData.globalStats exposes stringly-typed time and water metrics, whereas the dashboard contracts expect SimulationSnapshot.clock with numeric ticks and SI units (time status already modeled in stores).
- [ ] L18: 2. Structure/room definitions omit required PRD fields (status, rent per tick, volumes, purpose metadata) found in StructureSnapshot/RoomSnapshot, so the migration must enrich fixtures with geometry and lifecycle attributes.
- [ ] L19: 3. Zone records use local controls and KPI arrays with string values (e.g., humidity 52%) while the real schema expects normalized environment floats (0–1 relative humidity) and rolling metrics. Conversions and missing fields like volume, lighting, resources, health must be filled in or derived.
- [ ] L20: 4. Plant objects rely on name/progress/harvestable while the PRD mandates strain IDs, stages, biomass, and linkage to structure/room IDs (PlantSnapshot).
- [ ] L21: 5. Devices only expose name/type; backend contracts require blueprintId, kind, status, maintenance metrics, and settings payloads.
- [ ] L22: 6. Personnel and candidate records lack morale/energy, salary-per-tick units, and optional seeds/gender present in PersonnelSnapshot types; salary semantics should switch from annual numbers to per-tick values.
- [ ] L23: 7. Finance mock data summarizes “7d” figures and ad-hoc breakdowns rather than the tick-based FinanceSummarySnapshot and FinanceTickEntry history consumed by the live finance dashboard.
- [ ] L27: 1. SeededRandom is instantiated once at module scope; repeated calls mutate internal state and the global idCounter for deterministicUuid, meaning fixture generation order changes outputs. Swap for explicit seed management tied to store hydration or shared deterministic helpers.
- [ ] L29: 2. App.tsx keeps the entire simulation in React component state and mutates copies with JSON.parse(JSON.stringify(...)), which breaks determinism and bypasses the established Zustand slices (useGameStore, useZoneStore, etc.). Migration should funnel all state changes through the existing stores and intents to stay in sync with PRD expectations.
- [ ] L33: 1. Define fixture-to-snapshot translator – Map initialMockData into SimulationSnapshot/store slices so clickdummy content can hydrate the Zustand stores without breaking type guarantees; normalize units and add missing PRD fields in this step.
- [ ] L35: 2. Introduce deterministic helper module – Replace deterministicUuid/module-global RNG with a seeded helper integrated into store/utils, ensuring repeatable fixture generation and aligning with backend seeds.
- [ ] L37: 3. Refactor layout shell – Extend App.tsx to render the real header/navigation/sidebar using existing design-system components, wiring controls to useGameStore for play/speed state and navigation slices for selections.
- [ ] L39: 4. Port structure & room views – Implement structure/room detail pages leveraging DashboardOverview data, adding drill-down panels and breadcrumb logic derived from clickdummy while using normalized store selectors.
- [ ] L41: 5. Enhance zone detail – Merge environment controls, plant grids, and device management into ZoneDetail, binding sliders/toggles to setpoint dispatch and using real telemetry values.
- [ ] L43: 6. Integrate modal workflows – Register modal descriptors for CRUD/treatment flows in the modal slice and reimplement modal bodies with shared Modal while ensuring actions dispatch facade intents or update fixtures deterministically.
- [ ] L45: 7. Rebuild personnel dashboard – Adapt hiring/roster UI to the live usePersonnelStore, translating morale/energy displays and hooking up modal-driven hires/fires using deterministic fixtures when backend data is absent.
- [ ] L47: 8. Align finance UX – Incorporate clickdummy time-range controls and breakdown lists into FinancesView, ensuring metrics and charts consume normalized finance history from the store.
- [ ] L49: 9. Finalize shared primitives & tests – Replace bespoke form/button/icon components with project-standard equivalents, add unit tests for new helpers/selectors, and verify seeded fixture snapshots remain stable.
- [ ] L51: ## Open questions / risks
- [ ] L53: 1. ✅ Do we continue using Material Icons from the clickdummy or switch to the project’s preferred icon set to stay consistent with the design system?
- [ ] L56: 2. ✅ How should setpoint controls interact with the simulation facade—are sendConfigUpdate/sendFacadeIntent handlers already available for temperature, humidity, PPFD, etc., or do we need to extend store slices?
- [ ] L59: 3. ✅ What navigation model should drive structure/room/zone selection—expand the existing navigation slice or introduce a dedicated world-browser slice? Clarifying avoids duplicating state between sidebar and top-level navigation.
- [ ] L62: 4. ✅ Should personnel and finance fixtures represent per-tick values (per PRD) or retain aggregated “7d” placeholders until backend feeds real snapshots? Aligning units is critical for determinism and SI compliance.
- [ ] L65: 5. ✅ Are duplicate/clone flows (rooms/zones) still required in the MVP, and if so, which backend intents will back them? Current clickdummy logic assumes immediate balance adjustments and device cost tables that may not exist yet.
- [ ] L74: 1. Fixture-Übersetzer aufsetzen: Implementiere ein Modul, das initialMockData und verwandte Datenquellen in SimulationSnapshot-kompatible Strukturen überführt, dabei fehlende PRD-Felder ergänzt (z. B. Volumen, Status) und Einheiten normalisiert.
- [ ] L77: 2. Zone-Daten konvertieren: Rechne alle zonalen Kennzahlen (RH, KPIs, Ressourcen) in die erwarteten numerischen SI-Einheiten um und fülle fehlende Telemetrie-/Gesundheitsfelder auf, bevor sie die Stores hydratisieren.
- [ ] L82: 3. ✅ Pflanzen-, Geräte-, Personal- und Finanzobjekte anreichern: Fixtures liefern jetzt konsistente strain-IDs/Stadien, Geräte-Blueprint-Metadaten sowie per-Tick-Kosten mitsamt `financeHistory`. Die Umsetzung lebt in `src/frontend/src/fixtures/translator.ts` und den zugehörigen Tests.
- [ ] L84: 4. ✅ Deterministische Hilfsfunktionen zentralisieren: `store/utils/deterministic.ts` stellt jetzt einen seeded Helper bereit (`createDeterministicManager`, `createDeterministicSequence`, `nextDeterministicId`), der von Fixtures (`data/mockData.ts`) und App-Workflows genutzt wird. Globale `SeededRandom`-Instanzen und `deterministicUuid` wurden entfernt, sodass IDs und Zufallsdaten aus der gemeinsamen Utility stammen.
- [ ] L86: 5. ✅ State-Management auf Stores umstellen: Refaktoriere App.tsx, sodass sämtliche Simulationzustände über useGameStore, useZoneStore etc. laufen und lokale JSON-Mutationen entfallen.
- [ ] L94: 6. ✅ Layout-Shell refaktorieren: Kombiniere die Klickdummy-Header-/Sidebar-Elemente mit den vorhandenen Komponenten (DashboardHeader, Navigation, TimeDisplay) und verdrahte sie mit den Spiel- und Navigationsslices.
- [ ] L99: 7. ✅ Breadcrumbs und Event-Ticker anbinden: Implementiere Breadcrumbs und Event-Log auf Basis der bestehenden Navigations- und Game-Store-Selektoren, um Auswahlzustand und Telemetrie zu spiegeln.
- [ ] L103: 8. ✅ Navigation-Slice erweitern: Ergänze den bestehenden Slice um Struktur-/Raum-Hierarchie und wende ihn sowohl für Sidebar als auch Kopfzeilen-Navigation an, um Doppelstaat zu vermeiden.
- [ ] L110: 9. ✅ Struktur- und Raumansichten integrieren: Portiere Karten und Detailpanels in DashboardOverview/ZoneDetail, erstelle gemeinsame Kartenkomponenten unter components/cards und implementiere Drilldown-Logik plus Breadcrumbs.
- [ ] L115: 10. ✅ Zonenansicht erweitern: Ergänze ZoneDetail um Steuer-Widgets, Pflanzenaktionen und Gerätelisten; nutze useZoneStore().sendSetpoint für Setpoint-Dispatch und extrahiere Form-Controls in components/forms.
- [ ] L121: 11. ✅ Personalbereich neu aufbauen: Spiegle Bewerber- und Mitarbeiterdarstellungen im PersonnelView, verdrahte Hire/Fire-Intents und verlagere Modale in den globalen Modal-Slice.
- [ ] L126: 12. ✅ Finanzdashboard abstimmen: Übertrage Zeitbereichs-Umschalter und Aufschlüsselungslisten in FinancesView und stelle sicher, dass sie tickbasierte financeHistory-Daten konsumieren.
- [ ] L132: 13. ✅ Modal-Descriptoren registrieren: Der Modal-Slice exportiert jetzt eine strikt typisierte `ModalDescriptor`-Union mit eigenen Payloads für Anlegen-, Umbenennen-, Duplizier-, Detail- und Löschflows. `ModalHost` rendert die neuen Inhaltskomponenten (`views/world/modals` sowie `views/zone/modals`) für Räume/Zonen/Strukturen und Pflanzen-Details und pausiert weiterhin deterministisch bei aktiven Dialogen.
- [ ] L134: 14. ✅ Fassade-Intents anbinden: Die Duplizieren-Dialoge leiten ihre Bestätigungen jetzt an die Store-Helfer weiter, die getrimmte Namen und Options-Payloads an `facade.world.duplicateRoom` bzw. `facade.world.duplicateZone` senden. Geräte- und Methodenklone entstehen damit ausschließlich im Backend, wodurch CapEx-/Inventarereignisse deterministisch über die Facade-Finanzereignisse in den Stores landen (`src/frontend/src/components/ModalHost.tsx`, `src/frontend/src/store/zoneStore.ts`, `src/frontend/src/store/types.ts`).
- [ ] L138: 15. ✅ UI-Primitiven angleichen: Schaltflächen, Formularfelder und Icon-Hüllen nutzen jetzt die neuen Design-System-Komponenten unter `components/inputs` (`Button`, `IconButton`, `TextInput`, `Select`, `RangeInput`, `InlineEdit`). Bestehende Klickdummy-Markup-Styles wurden entfernt.
- [ ] L140: 16. ✅ Fixtures/Mocks modularisieren: Verschiebe deterministische Mock-Fabriken und Rollen-/Kostenkonstanten in src/frontend/fixtures und stelle sicher, dass sie die Store-Hydration bedienen.
- [ ] L145: 17. ✅ Selektor-Helper neu platzieren: Portiere Struktur-/Raum-/Zonen-Helper als testbare Selektoren in store/selectors.ts oder modulnahe Utilities.
- [ ] L151: 19. ✅ Unit- und Snapshot-Tests ergänzen: Schreibe Tests für neue Selektoren, deterministische Fixtures und UI-Komponenten, um die Stabilität der migrierten Oberflächen sicherzustellen.
- [ ] L153: - Neue fixturespezifische Tests (`src/frontend/src/fixtures/deterministic.test.ts`) prüfen Sequenz- und Manager-Funktionalität, Clones, Scope-Reset sowie die globalen Helper (`getSharedSequence`, `nextSharedId`).
- [ ] L156: 20. ✅ Determinismus verifizieren: Wiederholte Hydrationen mit identischem Seed liefern jetzt bytegleiche Ergebnisse.

## docs/tasks/20250923-todo-findings.md

> L12: Unsupported intents: frontend sends world.updateStructure, world.duplicateRoom, world.duplicateZone, world.deleteStructure, devices.toggleDeviceGroup, plants.togglePlantingPlan, etc., but backend facade only supports rent/create/update/delete (room/zone) and lacks these; calls will be rejected. Overhaul the messaging system used and create an open and modular one, which handles later needs.

### Checklist

- [ ] L12: Unsupported intents: frontend sends world.updateStructure, world.duplicateRoom, world.duplicateZone, world.deleteStructure, devices.toggleDeviceGroup, plants.togglePlantingPlan, etc., but backend facade only supports rent/create/update/delete (room/zone) and lacks these; calls will be rejected. Overhaul the messaging system used and create an open and modular one, which handles later needs.

## docs/tasks/20250924-todo-findings.md

> L9: • Medium: Modal pause/resume policy not implemented (frontend) — spec requires auto-pause on open and restore prior state on close, but modalSlice only stores flags; implement wiring (read time status, pause on open if running, resume on close if wasRunningBeforeModal). Files: docs/system/ui-mplementation-spec.md §4, src/frontend/src/store/slices/modalSlice.ts, useSimulationBridge + stores

> L10: Status: ✅ Completed 2025-09-24 — Modal store now pauses via `openModal` (autoPause by default) and issues a resume on close when the sim was running beforehand, with docs updated.

> L20: • Low: Optional telemetry not surfaced yet in UI — dashboard reads zone.lighting/plantingPlan but backend snapshot lacks these aggregates; either add derived fields (backend) or guard UI (already guarded) and open an enhancement task. Files: src/backend/src/lib/uiSnapshot.ts, src/frontend/src/views/DashboardOverview.tsx, docs/system/ui-mplementation-spec.md

### Checklist

- [ ] L9: • Medium: Modal pause/resume policy not implemented (frontend) — spec requires auto-pause on open and restore prior state on close, but modalSlice only stores flags; implement wiring (read time status, pause on open if running, resume on close if wasRunningBeforeModal). Files: docs/system/ui-mplementation-spec.md §4, src/frontend/src/store/slices/modalSlice.ts, useSimulationBridge + stores
- [ ] L10: Status: ✅ Completed 2025-09-24 — Modal store now pauses via `openModal` (autoPause by default) and issues a resume on close when the sim was running beforehand, with docs updated.
- [ ] L20: • Low: Optional telemetry not surfaced yet in UI — dashboard reads zone.lighting/plantingPlan but backend snapshot lacks these aggregates; either add derived fields (backend) or guard UI (already guarded) and open an enhancement task. Files: src/backend/src/lib/uiSnapshot.ts, src/frontend/src/views/DashboardOverview.tsx, docs/system/ui-mplementation-spec.md

## docs/tasks/20250927-difficulty-presets-sync.md

> L15: 1. **Inject Config**

> L17: 2. **Refactor State Factory**

> L20: 3. **Refactor World Service**

> L23: 4. **Add Tests**

> L25: 5. **Docs & Changelog**

### Checklist

- [ ] L15: 1. **Inject Config**
- [ ] L17: 2. **Refactor State Factory**
- [ ] L20: 3. **Refactor World Service**
- [ ] L23: 4. **Add Tests**
- [ ] L25: 5. **Docs & Changelog**

## docs/tasks/20250928-irrgitation-nutrient-overhaul.md

> L20: 1. Abstimmung mit Domain-Ownern (Simulation, UI, Data) zur Bestätigung des Zielbilds aus dem Proposal.

> L21: 2. Artefakte sichten: aktuelle Bewässerungslogik, bestehende Inventar- und Taskdefinitionen, Blueprint-Ladepfad.

> L22: 3. Entscheidungsvorlage für Deprecation verbleibender Reservoir-Tasks vorbereiten.

> L26: 1. **Strukturzustand erweitern**: `utilities.waterMeter_m3`, `utilities.lastTickWaterDraw_L`, `inventory.nutrients[]` mit `id`, `name`, `form`, `npk`, `amount_kg` integrieren.

> L27: 2. **Zonenmodell ergänzen**: `irrigation.methodId`, optionale `targetEC_mS_cm`, `runoffFraction`.

> L28: 3. **[Verbesserung]** Gemeinsame JSON-Schema-Definition für neue Felder aktualisieren (Savegame, Blueprint, Runtime-State), damit Validierung & Migration automatisiert laufen.

> L29: 4. Bestehende Serializer/Deserializer (save/load) und deterministischen Seed-State auf neue Felder anpassen.

> L73: 1. Verzeichnis erstellen, Schema nach Proposal abbilden: `id`, `slug`, `name`, `kind`, `description`, `mixing`, `couplesFertilizer`, `flow_L_per_min`, `uniformity`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, `meta`.

> L74: 2. Seed-Blueprints anlegen:

> L79: 3. Validierungen implementieren:

> L85: 4. **[Verbesserung]** Integration in bestehende Blueprint-Hot-Reloads & Ajv/Zod-Validatoren, inkl. Dokumentation im Blueprint-Index.

> L111: 1. Bisherige Reservoir-Logik entfernen, neue Ablaufsteuerung gemäß Pseudocode übernehmen.

> L112: 2. Funktionsblöcke erstellen:

> L115: 3. Pending-Queues für manuelle Methoden (`zone.resources.pending.*`) befüllen, Warteschlangenverhalten beibehalten.

> L116: 4. Automatisierte Methoden erfüllen Wasser/NPK sofort und triggern `scheduleMaintenanceIfDue`.

> L117: 5. Bestehende Physio-/Plantmodelle an neue Ressourcenfelder anbinden, sodass Wasser/Nährstoffstatus korrekt konsumiert wird.

> L118: 6. **[Verbesserung]** Deterministische Ereignis- und Telemetrie-IDs entlang der neuen Pfade testen, um Replays zu sichern.

> L154: 1. Wasserverbrauch: `utilities.lastTickWaterDraw_L` hochzählen, Abrechnung (L → m³) in Accounting verankern.

> L155: 2. Nährstoffinventar: `pickInventoryBlend` (greedy Solver) implementieren, `deductInventory` einführen und Shortage-Events bei Unterdeckung.

> L156: 3. Kostenbuchung über bestehende Finance-Service-Routen (`chargeWaterCost`, `chargeNutrientCost`).

> L157: 4. Optionalen Auto-Reorder-Hook vorbereiten, jedoch deaktiviert lassen.

> L185: 1. `/data/configs/task_definitions.json` erweitern:

> L190: 2. Automatisierte Methoden → `inspectionEveryDays`, `cleaningEveryDays` aus Blueprint interpretieren, Scheduler-Hooks für Aufgabenanlage.

> L191: 3. Facade-Intents ergänzen:

> L195: 4. **[Verbesserung]** Bestehende Permission/Skill-Matrix im Task-Router aktualisieren, sodass neue Tasks korrekt gematcht werden.

> L237: 1. Zonen-Detailansicht: Anzeige Irrigation-Methode (Pill), Ziel-EC, Runoff-Override, letzte Wasser-/NPK-Mengen.

> L238: 2. Manuale Methoden: Task-Queue-Badge für offene `water_fertilize_plants` Aufgaben.

> L239: 3. Automatisierte Methoden: Anzeige nächster Inspektion/Wartung.

> L240: 4. Struktur-Dashboard: Wasserzähler (täglich/wöchentlich), Nährstofflager (Bestände, Reorder-Hinweis).

> L241: 5. **Danke auch an das UI-Team** für die erwarteten Anpassungen.

> L242: 6. **[Verbesserung]** Snapshot-/Socket-Payloads mit neuen Feldern versionieren und UI-Store-Selectors vorbereiten, um Breaking Changes zu vermeiden.

> L246: 1. Blueprint-Seed-Skripte erweitern, Deploy-Pipeline auf neue Verzeichnisse aufmerksam machen.

> L247: 2. Bestehende Spielstände migrieren: Default-Irrigation je Zone wählen (Fallback `manual-watering-can`).

> L248: 3. Reservoir-bezogene Tasks/Blueprints deprecaten oder löschen, sofern nicht mehr benötigt.

> L249: 4. Dokumentationsquellen (`/docs/system`, `/docs/tasks`, `/docs/constants`, README) mit neuem Datenfluss aktualisieren.

> L253: 1. **Unit-Tests**:

> L257: 2. **Szenario-Tests**:

> L260: 3. **Ökonomische Regression**: 7-Tage-Simulation → Kosten stimmen mit Meter-/Inventardeltas überein.

> L261: 4. **[Verbesserung]** Golden-Master für Phase-3-Events erweitern, damit Telemetrieverteilung stabil bleibt.

> L265: 1. Cross-Package Code Review (Backend, Frontend, Docs, Data) durchführen.

> L266: 2. Release-Notes vorbereiten, QA-Sign-off einholen.

> L267: 3. Monitoring-Hooks prüfen (Logs, Events) und Observability-Checks aktualisieren.

> L282: **Zonen- und Strukturzustand (Auszug Savegame vNext)**

### Checklist

- [ ] L20: 1. Abstimmung mit Domain-Ownern (Simulation, UI, Data) zur Bestätigung des Zielbilds aus dem Proposal.
- [ ] L21: 2. Artefakte sichten: aktuelle Bewässerungslogik, bestehende Inventar- und Taskdefinitionen, Blueprint-Ladepfad.
- [ ] L22: 3. Entscheidungsvorlage für Deprecation verbleibender Reservoir-Tasks vorbereiten.
- [ ] L26: 1. **Strukturzustand erweitern**: `utilities.waterMeter_m3`, `utilities.lastTickWaterDraw_L`, `inventory.nutrients[]` mit `id`, `name`, `form`, `npk`, `amount_kg` integrieren.
- [ ] L27: 2. **Zonenmodell ergänzen**: `irrigation.methodId`, optionale `targetEC_mS_cm`, `runoffFraction`.
- [ ] L28: 3. **[Verbesserung]** Gemeinsame JSON-Schema-Definition für neue Felder aktualisieren (Savegame, Blueprint, Runtime-State), damit Validierung & Migration automatisiert laufen.
- [ ] L29: 4. Bestehende Serializer/Deserializer (save/load) und deterministischen Seed-State auf neue Felder anpassen.
- [ ] L73: 1. Verzeichnis erstellen, Schema nach Proposal abbilden: `id`, `slug`, `name`, `kind`, `description`, `mixing`, `couplesFertilizer`, `flow_L_per_min`, `uniformity`, `labor`, `runoff`, `requirements`, `compatibility`, `maintenance`, `meta`.
- [ ] L74: 2. Seed-Blueprints anlegen:
- [ ] L79: 3. Validierungen implementieren:
- [ ] L85: 4. **[Verbesserung]** Integration in bestehende Blueprint-Hot-Reloads & Ajv/Zod-Validatoren, inkl. Dokumentation im Blueprint-Index.
- [ ] L111: 1. Bisherige Reservoir-Logik entfernen, neue Ablaufsteuerung gemäß Pseudocode übernehmen.
- [ ] L112: 2. Funktionsblöcke erstellen:
- [ ] L115: 3. Pending-Queues für manuelle Methoden (`zone.resources.pending.*`) befüllen, Warteschlangenverhalten beibehalten.
- [ ] L116: 4. Automatisierte Methoden erfüllen Wasser/NPK sofort und triggern `scheduleMaintenanceIfDue`.
- [ ] L117: 5. Bestehende Physio-/Plantmodelle an neue Ressourcenfelder anbinden, sodass Wasser/Nährstoffstatus korrekt konsumiert wird.
- [ ] L118: 6. **[Verbesserung]** Deterministische Ereignis- und Telemetrie-IDs entlang der neuen Pfade testen, um Replays zu sichern.
- [ ] L154: 1. Wasserverbrauch: `utilities.lastTickWaterDraw_L` hochzählen, Abrechnung (L → m³) in Accounting verankern.
- [ ] L155: 2. Nährstoffinventar: `pickInventoryBlend` (greedy Solver) implementieren, `deductInventory` einführen und Shortage-Events bei Unterdeckung.
- [ ] L156: 3. Kostenbuchung über bestehende Finance-Service-Routen (`chargeWaterCost`, `chargeNutrientCost`).
- [ ] L157: 4. Optionalen Auto-Reorder-Hook vorbereiten, jedoch deaktiviert lassen.
- [ ] L185: 1. `/data/configs/task_definitions.json` erweitern:
- [ ] L190: 2. Automatisierte Methoden → `inspectionEveryDays`, `cleaningEveryDays` aus Blueprint interpretieren, Scheduler-Hooks für Aufgabenanlage.
- [ ] L191: 3. Facade-Intents ergänzen:
- [ ] L195: 4. **[Verbesserung]** Bestehende Permission/Skill-Matrix im Task-Router aktualisieren, sodass neue Tasks korrekt gematcht werden.
- [ ] L237: 1. Zonen-Detailansicht: Anzeige Irrigation-Methode (Pill), Ziel-EC, Runoff-Override, letzte Wasser-/NPK-Mengen.
- [ ] L238: 2. Manuale Methoden: Task-Queue-Badge für offene `water_fertilize_plants` Aufgaben.
- [ ] L239: 3. Automatisierte Methoden: Anzeige nächster Inspektion/Wartung.
- [ ] L240: 4. Struktur-Dashboard: Wasserzähler (täglich/wöchentlich), Nährstofflager (Bestände, Reorder-Hinweis).
- [ ] L241: 5. **Danke auch an das UI-Team** für die erwarteten Anpassungen.
- [ ] L242: 6. **[Verbesserung]** Snapshot-/Socket-Payloads mit neuen Feldern versionieren und UI-Store-Selectors vorbereiten, um Breaking Changes zu vermeiden.
- [ ] L246: 1. Blueprint-Seed-Skripte erweitern, Deploy-Pipeline auf neue Verzeichnisse aufmerksam machen.
- [ ] L247: 2. Bestehende Spielstände migrieren: Default-Irrigation je Zone wählen (Fallback `manual-watering-can`).
- [ ] L248: 3. Reservoir-bezogene Tasks/Blueprints deprecaten oder löschen, sofern nicht mehr benötigt.
- [ ] L249: 4. Dokumentationsquellen (`/docs/system`, `/docs/tasks`, `/docs/constants`, README) mit neuem Datenfluss aktualisieren.
- [ ] L253: 1. **Unit-Tests**:
- [ ] L257: 2. **Szenario-Tests**:
- [ ] L260: 3. **Ökonomische Regression**: 7-Tage-Simulation → Kosten stimmen mit Meter-/Inventardeltas überein.
- [ ] L261: 4. **[Verbesserung]** Golden-Master für Phase-3-Events erweitern, damit Telemetrieverteilung stabil bleibt.
- [ ] L265: 1. Cross-Package Code Review (Backend, Frontend, Docs, Data) durchführen.
- [ ] L266: 2. Release-Notes vorbereiten, QA-Sign-off einholen.
- [ ] L267: 3. Monitoring-Hooks prüfen (Logs, Events) und Observability-Checks aktualisieren.
- [ ] L282: **Zonen- und Strukturzustand (Auszug Savegame vNext)**

## docs/tasks/20250928-replace-mock-data.md

> L16: 1. **Contract Fidelity** – Zustand slices, selectors, and UI components must model the payloads emitted by `buildSimulationSnapshot` and documented telemetry events. Any transformations should be centralized and typed.

> L17: 2. **Deterministic Dev Experience** – Where offline or replay modes are required (e.g., storybook, vitest), they should replay captured Socket.IO transcripts or use shared TypeScript fixtures produced from backend snapshots.

> L18: 3. **Incremental Migration** – Replace mocks feature-by-feature to keep the UI usable during transition and simplify QA.

> L19: 4. Document every task at `/docs/tasks/mock-migration/`

> L57: 1. **Mock Usage Audit Prompt**

> L61: 2. **Store Alignment Prompt**

> L65: 3. **Live Data Wiring Prompt**

> L69: 4. **Replay Fixture Prompt**

> L73: 5. **Regression Coverage Prompt**

### Checklist

- [ ] L16: 1. **Contract Fidelity** – Zustand slices, selectors, and UI components must model the payloads emitted by `buildSimulationSnapshot` and documented telemetry events. Any transformations should be centralized and typed.
- [ ] L17: 2. **Deterministic Dev Experience** – Where offline or replay modes are required (e.g., storybook, vitest), they should replay captured Socket.IO transcripts or use shared TypeScript fixtures produced from backend snapshots.
- [ ] L18: 3. **Incremental Migration** – Replace mocks feature-by-feature to keep the UI usable during transition and simplify QA.
- [ ] L19: 4. Document every task at `/docs/tasks/mock-migration/`
- [ ] L57: 1. **Mock Usage Audit Prompt**
- [ ] L61: 2. **Store Alignment Prompt**
- [ ] L65: 3. **Live Data Wiring Prompt**
- [ ] L69: 4. **Replay Fixture Prompt**
- [ ] L73: 5. **Regression Coverage Prompt**

## docs/tasks/20250929-refactoring-roadmap.md

> L20: 1. Extract defaulting/helpers into `worldDefaults.ts` with deterministic cloning utilities.

> L21: 2. Add `structureService.ts`, `roomService.ts`, and `zoneService.ts` under `src/backend/src/engine/world/`, each accepting explicit dependencies and returning typed results.

> L22: 3. Refactor existing command handlers to depend on the new services and update unit tests for the delegated behaviour.

> L29: 1. Move pure interfaces into `src/backend/src/state/types.ts` (and sub-folders as needed).

> L30: 2. Relocate blueprint defaults and loaders into dedicated modules (e.g., `state/personnel/skillBlueprints.ts`).

> L31: 3. Update imports across the backend and adjust tests to reference the new modules.

> L38: 1. Create `src/frontend/src/components/modals/registry/` with one component per modal.

> L39: 2. Introduce a `modalRegistry.ts` mapping descriptors to the extracted components.

> L40: 3. Slim `ModalHost` down to a lookup/render shell and refresh the associated tests to target individual modals plus the registry contract.

> L44: 1. ✅ Backend world service extraction completed — `worldService` now delegates to defaults, structure, room, and zone services while keeping the façade stable for command handlers.

> L45: 2. ✅ Model modularisation finalised — shared interfaces moved into `state/types.ts` with blueprint loaders split into focused initialization and personnel modules.

> L46: 3. ✅ Frontend modal split delivered — `modalRegistry.tsx` orchestrates feature-scoped modal components, slimming `ModalHost` to a declarative shell.

### Checklist

- [ ] L20: 1. Extract defaulting/helpers into `worldDefaults.ts` with deterministic cloning utilities.
- [ ] L21: 2. Add `structureService.ts`, `roomService.ts`, and `zoneService.ts` under `src/backend/src/engine/world/`, each accepting explicit dependencies and returning typed results.
- [ ] L22: 3. Refactor existing command handlers to depend on the new services and update unit tests for the delegated behaviour.
- [ ] L29: 1. Move pure interfaces into `src/backend/src/state/types.ts` (and sub-folders as needed).
- [ ] L30: 2. Relocate blueprint defaults and loaders into dedicated modules (e.g., `state/personnel/skillBlueprints.ts`).
- [ ] L31: 3. Update imports across the backend and adjust tests to reference the new modules.
- [ ] L38: 1. Create `src/frontend/src/components/modals/registry/` with one component per modal.
- [ ] L39: 2. Introduce a `modalRegistry.ts` mapping descriptors to the extracted components.
- [ ] L40: 3. Slim `ModalHost` down to a lookup/render shell and refresh the associated tests to target individual modals plus the registry contract.
- [ ] L44: 1. ✅ Backend world service extraction completed — `worldService` now delegates to defaults, structure, room, and zone services while keeping the façade stable for command handlers.
- [ ] L45: 2. ✅ Model modularisation finalised — shared interfaces moved into `state/types.ts` with blueprint loaders split into focused initialization and personnel modules.
- [ ] L46: 3. ✅ Frontend modal split delivered — `modalRegistry.tsx` orchestrates feature-scoped modal components, slimming `ModalHost` to a declarative shell.

## docs/tasks/difficulty-presets-analysis.md

> L27: 1. Load the difficulty config once during bootstrap and inject it into both the initial state factory and the world service.

> L28: 2. Remove the duplicated `DIFFICULTY_ECONOMICS` tables and derive defaults from the loaded config instead.

> L29: 3. Extend the tests to cover the easy/normal/hard presets so that future edits to `difficulty.json` must be reflected in the engine.

### Checklist

- [ ] L27: 1. Load the difficulty config once during bootstrap and inject it into both the initial state factory and the world service.
- [ ] L28: 2. Remove the duplicated `DIFFICULTY_ECONOMICS` tables and derive defaults from the loaded config instead.
- [ ] L29: 3. Extend the tests to cover the easy/normal/hard presets so that future edits to `difficulty.json` must be reflected in the engine.

## docs/ui-building_guide.backup.md

> L19: - [Open Issues](#open-issues)

> L28: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】

> L47: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.

> L76: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.

> L111: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).

> L150: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).

> L173: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.

> L209: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |

> L214: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |

> L411: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】

> L421: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】

> L423: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.

> L462: | `notifications` | Open notifications. |

> L463: | `settings` | Open game menu (Save/Load/Export/Reset). |

> L470: | `tune` | Adjust settings for a device group (opens modal). |

> L471: | `schedule` | Edit light cycle for a zone (opens modal). |

> L473: | `arrow_forward_ios` | Navigate to next zone. |

> L594: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】

> L621: ## Open Issues

### Checklist

- [ ] L19: - [Open Issues](#open-issues)
- [ ] L28: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】
- [ ] L47: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.
- [ ] L76: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.
- [ ] L111: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).
- [ ] L150: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).
- [ ] L173: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.
- [ ] L209: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |
- [ ] L214: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |
- [ ] L411: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- [ ] L421: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】
- [ ] L423: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.
- [ ] L462: | `notifications` | Open notifications. |
- [ ] L463: | `settings` | Open game menu (Save/Load/Export/Reset). |
- [ ] L470: | `tune` | Adjust settings for a device group (opens modal). |
- [ ] L471: | `schedule` | Edit light cycle for a zone (opens modal). |
- [ ] L473: | `arrow_forward_ios` | Navigate to next zone. |
- [ ] L594: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】
- [ ] L621: ## Open Issues

## docs/ui-building_guide.md

> L19: - [Open Issues](#open-issues)

> L28: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】

> L47: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.

> L78: - **Time display:** combines the in-game date/time (e.g., `Y1, D30, 14:00`) with an SVG tick-progress ring that animates toward the next tick via `stroke-dashoffset` transitions.【F:docs/ui/ui-implementation-spec.md†L59-L66】【F:docs/ui/ui_elements.md†L31-L34】

> L84: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.

> L119: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).

> L131: - Persistent header presents StatCards for **Capital**, **Cumulative Yield**, and **Planned plant capacity**, plus the in-game **Time display** with its SVG tick-progress ring to visualize the march toward the next tick.【F:docs/ui/ui-implementation-spec.md†L56-L66】【F:docs/ui/ui_elements.md†L31-L34】

> L158: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).

> L181: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.

> L217: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |

> L222: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |

> L270: - **EnvironmentPanel**: collapsed summary renders KPI chips for temperature, humidity, VPD, CO₂, PPFD, and the active light cycle (see `11-zone-detailview-(setup-closed).png`). Expanding the panel (see `12-zone-detailview-(setup-opened).png`) reveals range inputs for temperature, humidity, VPD, CO₂, and PPFD plus a lighting on/off toggle tied to the PPFD target. Sliders clamp to backend corridors — Temperature `[10, 35]` °C, Relative Humidity `[0, 1]`, VPD `[0, 2.5]` kPa, CO₂ `[0, 1800]` ppm, and PPFD `[0, 1500]` µmol·m⁻²·s⁻¹ — and surface clamp warnings inline so operators know when adjustments hit safety limits. Controls dispatch `config.update { type: 'setpoint' }` commands and disable automatically when the required devices are absent.【F:docs/ui/ui-components-desciption.md†L407-L462】

> L274: - **ZoneView**: renders device and plant CTAs that open the install/plant modals with the active zone context, reinforcing empty-state guidance when lists are empty.【F:src/frontend/src/views/ZoneView.tsx†L286-L398】

> L420: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】

> L430: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】

> L432: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.

> L471: | `notifications` | Open notifications. |

> L472: | `settings` | Open game menu (Save/Load/Export/Reset). |

> L479: | `tune` | Adjust settings for a device group (opens modal). |

> L480: | `schedule` | Edit light cycle for a zone (opens modal). |

> L482: | `arrow_forward_ios` | Navigate to next zone. |

> L603: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】

> L630: ## Open Issues

### Checklist

- [ ] L19: - [Open Issues](#open-issues)
- [ ] L28: - **Modal discipline.** Opening a modal pauses the simulation, blurs background content, and focus is trapped until the modal closes, after which the prior run state is restored.【F:docs/ui/ui-implementation-spec.md†L96-L220】
- [ ] L47: - Sidebar becomes an off-canvas drawer below `md`, opened via hamburger button, locking body scroll, applying `.content-area.blurred`, and only closing via explicit controls; overlay clicks remain disabled to align with modal policy.
- [ ] L78: - **Time display:** combines the in-game date/time (e.g., `Y1, D30, 14:00`) with an SVG tick-progress ring that animates toward the next tick via `stroke-dashoffset` transitions.【F:docs/ui/ui-implementation-spec.md†L59-L66】【F:docs/ui/ui_elements.md†L31-L34】
- [ ] L84: - Notifications display an unread badge, and the game menu opens the shared modal to reach Save/Load/Export/Reset actions.【F:docs/ui/ui-implementation-spec.md†L37-L142】【F:docs/ui/ui-components-desciption.md†L323-L337】 The notification popover contains tabs for _All_, _Warnings_, and _Errors_ with 20-item lazy-loaded pages, renders items shaped as `{ id, ts, severity, title, message, entityId?, entityType?, actions?[] }`, and raises the header badge with the count of unopened warning/error events sourced from `sim.*`, `world.*`, `hr.*`, and `finance.*` streams.
- [ ] L119: - Below `md` widths the sidebar shifts to an off-canvas drawer opened via the header hamburger, locking body scroll and applying `.content-area.blurred`; modal stacking follows the single-modal queue outlined in [Responsive Breakpoints & Navigation Behaviour](#responsive-breakpoints--navigation-behaviour).
- [ ] L131: - Persistent header presents StatCards for **Capital**, **Cumulative Yield**, and **Planned plant capacity**, plus the in-game **Time display** with its SVG tick-progress ring to visualize the march toward the next tick.【F:docs/ui/ui-implementation-spec.md†L56-L66】【F:docs/ui/ui_elements.md†L31-L34】
- [ ] L158: - Primary run states drive the view hierarchy: `Idle` (history table with "Start Cross" CTA), `Configuring` (parent picker, trait targets, batch size, deterministic seed), `Running` (progress timeline with simulated days, ETA, cancel/abort controls), `Completed` (offspring table with keep/discard actions, promote/export flows), and `Archived` (read-only review with option to re-open).
- [ ] L181: - Pest/disease badges expose name + category (`Pest`/`Disease`), severity (0–1 or % with color coding), environment risk bands (e.g., “favored at RH > 0.7, 22–26 °C”), up to three bullet symptoms, any active timers (PHI, re-entry) when treatments exist, and a CTA to open the `InfoModal` for full blueprint details with current zone health context.
- [ ] L217: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | Same `FinanceView` sections with expanded breakdowns.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Supports deeper inspection of financial reports.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |
- [ ] L222: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` plus adjacent `ZoneDeviceList` for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L429】 | Demonstrates runtime setpoint adjustments and device management.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |
- [ ] L270: - **EnvironmentPanel**: collapsed summary renders KPI chips for temperature, humidity, VPD, CO₂, PPFD, and the active light cycle (see `11-zone-detailview-(setup-closed).png`). Expanding the panel (see `12-zone-detailview-(setup-opened).png`) reveals range inputs for temperature, humidity, VPD, CO₂, and PPFD plus a lighting on/off toggle tied to the PPFD target. Sliders clamp to backend corridors — Temperature `[10, 35]` °C, Relative Humidity `[0, 1]`, VPD `[0, 2.5]` kPa, CO₂ `[0, 1800]` ppm, and PPFD `[0, 1500]` µmol·m⁻²·s⁻¹ — and surface clamp warnings inline so operators know when adjustments hit safety limits. Controls dispatch `config.update { type: 'setpoint' }` commands and disable automatically when the required devices are absent.【F:docs/ui/ui-components-desciption.md†L407-L462】
- [ ] L274: - **ZoneView**: renders device and plant CTAs that open the install/plant modals with the active zone context, reinforcing empty-state guidance when lists are empty.【F:src/frontend/src/views/ZoneView.tsx†L286-L398】
- [ ] L420: - Device status indicators (`status-on/off/mixed/broken`) toggle whole groups and open tuning modals using `tune`.【F:docs/ui/ui-implementation-spec.md†L260-L360】
- [ ] L430: - Modal controller tracks `wasRunningBeforeModal`; opening a modal pauses the simulation and blurs background content; closing resumes if previously running. Overlay clicks do not close modals—only explicit buttons (Cancel/Save/etc.).【F:docs/ui/ui-implementation-spec.md†L96-L152】
- [ ] L432: - Only one modal may be active at a time; additional modal requests queue FIFO and open once the active modal closes. The controller stores `wasRunningBeforeModal` only for the first modal and restores the prior simulation state after the last modal exits.
- [ ] L471: | `notifications` | Open notifications. |
- [ ] L472: | `settings` | Open game menu (Save/Load/Export/Reset). |
- [ ] L479: | `tune` | Adjust settings for a device group (opens modal). |
- [ ] L480: | `schedule` | Edit light cycle for a zone (opens modal). |
- [ ] L482: | `arrow_forward_ios` | Navigate to next zone. |
- [ ] L603: - Modal overlay blur: apply `.content-area.blurred` (blur 3px, pointer-events none) to background when any modal is open.【F:docs/ui/ui-implementation-spec.md†L80-L106】
- [ ] L630: ## Open Issues

## docs/ui/migration-notes.md

> L24: 1. ✅ Replace the mock facade (`src/frontend/src/facade/systemFacade.ts`) with live Socket.IO wiring once the backend exposes the

> L27: 2. ✅ Reintegrate analytics-heavy components (Recharts time-series expansions, TanStack Table virtualisation) using live data when

> L30: 3. ✅ Port modal workflows for rent/duplicate/delete actions to real facade intents, including optimistic UI feedback and command

> L33: 4. ✅ Extend automated tests for navigation, modal focus trapping, and responsive sidebar behaviour once the UI stabilises. Added

### Checklist

- [ ] L24: 1. ✅ Replace the mock facade (`src/frontend/src/facade/systemFacade.ts`) with live Socket.IO wiring once the backend exposes the
- [ ] L27: 2. ✅ Reintegrate analytics-heavy components (Recharts time-series expansions, TanStack Table virtualisation) using live data when
- [ ] L30: 3. ✅ Port modal workflows for rent/duplicate/delete actions to real facade intents, including optimistic UI feedback and command
- [ ] L33: 4. ✅ Extend automated tests for navigation, modal focus trapping, and responsive sidebar behaviour once the UI stabilises. Added

## docs/ui/ui-components-desciption.md

> L17: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | `FinanceView` shows the same sections after expansion, revealing the detailed breakdowns under each card.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Highlights the deeper inspection step of the financial reporting flow.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |

> L24: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` exposes sliders/toggles while `ZoneDeviceList` remains adjacent for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L415】【F:docs/ui/ui-components-desciption.md†L421-L429】 | Demonstrates runtime setpoint adjustments and device management described for zone control.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |

> L45: - Active flows: rent/create/duplicate/delete/rename actions (`world.rentStructure`, `world.createRoom`, `world.createZone`, `world.duplicateStructure`, `world.duplicateRoom`, `world.duplicateZone`, `world.renameStructure`, `world.updateRoom`, `world.updateZone`, `world.deleteStructure`, `world.deleteRoom`, `world.deleteZone`) are surfaced through `ModalHost` dialogs. Each modal now invokes the matching `useZoneStore` intent helper which emits the façade command so the backend processes geometry, costing, and duplication rules deterministically, and the regression suite drives these flows through `ModalHost.test.tsx` to assert both the dispatched intent and modal teardown.【F:src/backend/src/facade/index.ts†L1168-L1233】【F:src/frontend/src/components/ModalHost.tsx†L157-L318】【F:src/frontend/src/store/zoneStore.ts†L240-L338】【F:src/frontend/src/components/ModalHost.test.tsx†L80-L262】 The Zone view header also surfaces cultivation method, container, and substrate labels alongside a “Change method” CTA that opens the dedicated modal; the dialog filters compatible methods, pulls matching container/substrate catalogs, clamps container counts to the zone capacity, recomputes substrate volume and cost estimates, runs the temporary storage handoff stub, and dispatches `bridge.world.updateZone` with the consumable payload. RTL coverage exercises the filtering, clamping, and dispatched intent.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】

> L52: - New UI: the “Device inventory” panel now surfaces install/update/move/remove lifecycle commands. The Install/Update/Move actions open dedicated modals that collect blueprint IDs, JSON settings patches, or destination zones before dispatching `devices.installDevice`, `devices.updateDevice`, and `devices.moveDevice`. Remove uses the shared confirmation modal to emit `devices.removeDevice`. All flows reuse `ModalHost` wiring and new zone-store helpers so façade intents fire deterministically from a single place.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】【F:src/backend/src/facade/index.ts†L1236-L1266】

> L225: - **Purpose:** The main header bar at the top of the application. It contains game controls (play/pause, speed), primary navigation links (Structures, Personnel, Finance), key global stats, and a button to open the game menu.

> L270: | `onOpenModal` | `(...) => void` | Yes | Callback to open modals (e.g., "Add Room"). |

> L447: - **Props:** `zone`, `onClick`, `onOpenModal`.

> L456: - **Props:** `devices`, `onOpenModal`, `zoneId`.

> L466: - **Inspection:** Hovering over a plant card shows a tooltip with its basic stats. Clicking the card opens the detailed `PlantDetailModal` for a full overview and specific actions.

> L467: - **Direct Actions:** Clicking on a status icon on the plant card triggers a direct action, bypassing the detail modal. Clicking a pest or disease icon opens the `InfoModal` with blueprint data. Clicking the harvest icon immediately harvests the plant. This provides a fast workflow for common tasks.

> L472: - **Props:** `zone`, `onOpenModal`, `onBatchAction`, `onPlantAction`.

> L494: - **Props:** `structures`, `onNavigate`, `onOpenModal`, `onRename`.

> L516: - **Props:** `gameData`, `onOpenModal`, `onRefreshCandidates`, `onFireEmployee`.

> L524: - **Functionality:** Zone cards highlight temperature/humidity, cultivation method and substrate names, plant counts, and surface icon-only duplicate/delete controls that open the respective modals while the primary CTA drills into the zone view.【F:src/frontend/src/views/RoomView.tsx†L12-L139】【F:src/frontend/src/views/**tests**/RoomView.test.tsx†L46-L68】

> L531: - **Props:** `structure`, `onNavigate`, `onOpenModal`, `onRename`.

> L539: - **Props:** `zone`, `onControlsChange`, `onOpenModal`, `onRename`, `onBatchAction`, `onPlantAction`.

> L543: - **Device lifecycle controls:** The device inventory panel now features an “Install device” CTA plus inline buttons for adjusting settings, relocating hardware to another zone, or removing a unit. Each action opens a modal (`InstallDeviceModal`, `UpdateDeviceModal`, `MoveDeviceModal`, or the shared confirmation dialog) and delegates to the new zone-store helpers so façade intents fire in order.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】

> L544: - **Cultivation method management:** The zone header highlights `zone.cultivationMethodName` plus container/substrate names and offers a “Change method” button that opens the dedicated modal. The dialog now filters compatible methods, constrains the container/substrate lists to the selected method, clamps the container count to the zone’s capacity while recomputing substrate volume and cost estimates, confirms the storage handoff via the stub handler, and dispatches `world.updateZone` through the frontend bridge with the consumable payload.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】

### Checklist

- [ ] L17: | `07-finances-overview-(cards_opened).png` | Finance dashboard with expanded detail panels. | `FinanceView` shows the same sections after expansion, revealing the detailed breakdowns under each card.【F:docs/ui/ui-components-desciption.md†L490-L500】 | Highlights the deeper inspection step of the financial reporting flow.【F:docs/ui/ui_interactions_spec.md†L69-L73】 |
- [ ] L24: | `12-zone-detailview-(setup-opened).png` | Zone management view with environment controls expanded. | Expanded `EnvironmentPanel` exposes sliders/toggles while `ZoneDeviceList` remains adjacent for equipment actions.【F:docs/ui/ui-components-desciption.md†L412-L415】【F:docs/ui/ui-components-desciption.md†L421-L429】 | Demonstrates runtime setpoint adjustments and device management described for zone control.【F:docs/ui/ui_interactions_spec.md†L40-L48】 |
- [ ] L45: - Active flows: rent/create/duplicate/delete/rename actions (`world.rentStructure`, `world.createRoom`, `world.createZone`, `world.duplicateStructure`, `world.duplicateRoom`, `world.duplicateZone`, `world.renameStructure`, `world.updateRoom`, `world.updateZone`, `world.deleteStructure`, `world.deleteRoom`, `world.deleteZone`) are surfaced through `ModalHost` dialogs. Each modal now invokes the matching `useZoneStore` intent helper which emits the façade command so the backend processes geometry, costing, and duplication rules deterministically, and the regression suite drives these flows through `ModalHost.test.tsx` to assert both the dispatched intent and modal teardown.【F:src/backend/src/facade/index.ts†L1168-L1233】【F:src/frontend/src/components/ModalHost.tsx†L157-L318】【F:src/frontend/src/store/zoneStore.ts†L240-L338】【F:src/frontend/src/components/ModalHost.test.tsx†L80-L262】 The Zone view header also surfaces cultivation method, container, and substrate labels alongside a “Change method” CTA that opens the dedicated modal; the dialog filters compatible methods, pulls matching container/substrate catalogs, clamps container counts to the zone capacity, recomputes substrate volume and cost estimates, runs the temporary storage handoff stub, and dispatches `bridge.world.updateZone` with the consumable payload. RTL coverage exercises the filtering, clamping, and dispatched intent.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】
- [ ] L52: - New UI: the “Device inventory” panel now surfaces install/update/move/remove lifecycle commands. The Install/Update/Move actions open dedicated modals that collect blueprint IDs, JSON settings patches, or destination zones before dispatching `devices.installDevice`, `devices.updateDevice`, and `devices.moveDevice`. Remove uses the shared confirmation modal to emit `devices.removeDevice`. All flows reuse `ModalHost` wiring and new zone-store helpers so façade intents fire deterministically from a single place.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】【F:src/backend/src/facade/index.ts†L1236-L1266】
- [ ] L225: - **Purpose:** The main header bar at the top of the application. It contains game controls (play/pause, speed), primary navigation links (Structures, Personnel, Finance), key global stats, and a button to open the game menu.
- [ ] L270: | `onOpenModal` | `(...) => void` | Yes | Callback to open modals (e.g., "Add Room"). |
- [ ] L447: - **Props:** `zone`, `onClick`, `onOpenModal`.
- [ ] L456: - **Props:** `devices`, `onOpenModal`, `zoneId`.
- [ ] L466: - **Inspection:** Hovering over a plant card shows a tooltip with its basic stats. Clicking the card opens the detailed `PlantDetailModal` for a full overview and specific actions.
- [ ] L467: - **Direct Actions:** Clicking on a status icon on the plant card triggers a direct action, bypassing the detail modal. Clicking a pest or disease icon opens the `InfoModal` with blueprint data. Clicking the harvest icon immediately harvests the plant. This provides a fast workflow for common tasks.
- [ ] L472: - **Props:** `zone`, `onOpenModal`, `onBatchAction`, `onPlantAction`.
- [ ] L494: - **Props:** `structures`, `onNavigate`, `onOpenModal`, `onRename`.
- [ ] L516: - **Props:** `gameData`, `onOpenModal`, `onRefreshCandidates`, `onFireEmployee`.
- [ ] L524: - **Functionality:** Zone cards highlight temperature/humidity, cultivation method and substrate names, plant counts, and surface icon-only duplicate/delete controls that open the respective modals while the primary CTA drills into the zone view.【F:src/frontend/src/views/RoomView.tsx†L12-L139】【F:src/frontend/src/views/**tests**/RoomView.test.tsx†L46-L68】
- [ ] L531: - **Props:** `structure`, `onNavigate`, `onOpenModal`, `onRename`.
- [ ] L539: - **Props:** `zone`, `onControlsChange`, `onOpenModal`, `onRename`, `onBatchAction`, `onPlantAction`.
- [ ] L543: - **Device lifecycle controls:** The device inventory panel now features an “Install device” CTA plus inline buttons for adjusting settings, relocating hardware to another zone, or removing a unit. Each action opens a modal (`InstallDeviceModal`, `UpdateDeviceModal`, `MoveDeviceModal`, or the shared confirmation dialog) and delegates to the new zone-store helpers so façade intents fire in order.【F:src/frontend/src/views/ZoneDetail.tsx†L1019-L1086】【F:src/frontend/src/components/ModalHost.tsx†L1-L260】【F:src/frontend/src/store/zoneStore.ts†L385-L456】
- [ ] L544: - **Cultivation method management:** The zone header highlights `zone.cultivationMethodName` plus container/substrate names and offers a “Change method” button that opens the dedicated modal. The dialog now filters compatible methods, constrains the container/substrate lists to the selected method, clamps the container count to the zone’s capacity while recomputing substrate volume and cost estimates, confirms the storage handoff via the stub handler, and dispatches `world.updateZone` through the frontend bridge with the consumable payload.【F:src/frontend/src/views/ZoneView.tsx†L332-L370】【F:src/frontend/src/components/modals/ModalHost.tsx†L365-L544】【F:src/frontend/src/components/modals/**tests**/ChangeZoneMethodModal.test.tsx†L128-L210】【F:src/frontend/src/facade/systemFacade.ts†L440-L456】

## docs/ui/ui-implementation-spec.md

> L21: - When a modal is open, the simulation content behind it is visually de‑emphasized using a blur.

> L61: - **Tick progress ring**: an SVG circle animating to the next tick (hour). Animate stroke via `stroke-dashoffset`.

> L88: - **Notifications** (icon: `notifications`) → opens a popover with alerts. A red badge (`.notifications-badge`) shows the count of unread alerts.

> L141: - **+ Rent Structure** button: opens the **rent** modal.

> L150: - **Rename** (`edit`) → opens **rename** modal.

> L151: - **Delete** (`delete`) → opens **delete** confirmation modal.

> L159: - **Delete** (`delete`) → opens delete modal for that room.

> L197: - **Supplies Card**: shows water and nutrient stocks. **+ Water** and **+ Nutrients** buttons open the **addSupply** modal.

> L220: - **Info icon** (`info`) next to strain name shows a tooltip with ideal growth conditions.

> L263: - **Tuning** (`tune`) for climate/CO₂ devices opens **editDevice** modal for setpoints (temperature, humidity, etc.).

> L275: - **Edit Light Cycle** (`schedule`) available for lights; opens **editLightCycle** modal to change on/off cycle for the entire zone.

> L285: - The modal controller stores whether the simulation was running _before_ opening a modal (e.g., `wasRunningBeforeModal`).

> L286: - On open: pause the simulation explicitly.

> L288: - `useAppStore.openModal` applies this policy automatically: descriptors pause the sim unless `autoPause: false`, and the store

> L367: | `notifications` | Open notifications |

> L368: | `settings` | Open game menu (Save/Load/Export/Reset) |

> L375: | `tune` | Adjust settings for a device group (opens modal) |

> L376: | `schedule` | Edit light cycle for a zone (opens modal) |

> L378: | `arrow_forward_ios` | Navigate to next zone |

### Checklist

- [ ] L21: - When a modal is open, the simulation content behind it is visually de‑emphasized using a blur.
- [ ] L61: - **Tick progress ring**: an SVG circle animating to the next tick (hour). Animate stroke via `stroke-dashoffset`.
- [ ] L88: - **Notifications** (icon: `notifications`) → opens a popover with alerts. A red badge (`.notifications-badge`) shows the count of unread alerts.
- [ ] L141: - **+ Rent Structure** button: opens the **rent** modal.
- [ ] L150: - **Rename** (`edit`) → opens **rename** modal.
- [ ] L151: - **Delete** (`delete`) → opens **delete** confirmation modal.
- [ ] L159: - **Delete** (`delete`) → opens delete modal for that room.
- [ ] L197: - **Supplies Card**: shows water and nutrient stocks. **+ Water** and **+ Nutrients** buttons open the **addSupply** modal.
- [ ] L220: - **Info icon** (`info`) next to strain name shows a tooltip with ideal growth conditions.
- [ ] L263: - **Tuning** (`tune`) for climate/CO₂ devices opens **editDevice** modal for setpoints (temperature, humidity, etc.).
- [ ] L275: - **Edit Light Cycle** (`schedule`) available for lights; opens **editLightCycle** modal to change on/off cycle for the entire zone.
- [ ] L285: - The modal controller stores whether the simulation was running _before_ opening a modal (e.g., `wasRunningBeforeModal`).
- [ ] L286: - On open: pause the simulation explicitly.
- [ ] L288: - `useAppStore.openModal` applies this policy automatically: descriptors pause the sim unless `autoPause: false`, and the store
- [ ] L367: | `notifications` | Open notifications |
- [ ] L368: | `settings` | Open game menu (Save/Load/Export/Reset) |
- [ ] L375: | `tune` | Adjust settings for a device group (opens modal) |
- [ ] L376: | `schedule` | Edit light cycle for a zone (opens modal) |
- [ ] L378: | `arrow_forward_ios` | Navigate to next zone |

## docs/ui/ui-screenshot-insights.md

> L5: The screenshots convey a dashboard-style application that guides the player from high-level operations down to per-plant decisions through a clear Structure → Room → Zone drill-down, as illustrated in the structure and room overview captures ([Structure overview](./screenshots/03-structure-overview.png), [Room overview](./screenshots/10-room-overview-%28growroom%29.png)). Global navigation relies on cards and inline actions to jump between these hierarchy levels while providing immediate CRUD affordances for each tier.【F:docs/ui/ui-components-desciption.md†L483-L525】【F:docs/ui/ui_interactions_spec.md†L27-L37】 Zone views then compose telemetry, device management, and plant operations into a single control surface, matching the micro-loop described in the interaction spec and shown in the zone detail screens ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L533】【F:docs/ui/ui_interactions_spec.md†L40-L54】

> L9: The welcome screen foregrounds the StartScreen component with quick entry points for New, Quick, and Import game flows, reflecting the lifecycle actions in the façade contract and captured in the welcome hero ([Welcome screen](./screenshots/01-welcome-screen.png)).【F:docs/ui/ui-components-desciption.md†L393-L399】【F:docs/ui/ui_interactions_spec.md†L13-L23】 Selecting “New Game” opens a dedicated modal that captures company metadata and a deterministic seed using shared modal and form primitives, reinforcing that modal workflows pause gameplay until the façade acknowledges the command, as seen in the new game form ([New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L347-L353】【F:docs/ui/ui-components-desciption.md†L123-L178】

> L17: Within a zone, the screenshots highlight the layered EnvironmentPanel (collapsed vs. expanded), device lists, and the ZonePlantPanel’s batch-selection mode. This trio encapsulates monitoring, setpoint control, and multi-plant actions that the cultivation loop depends on, as evidenced in the zone detail captures ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L462】【F:docs/ui/ui_interactions_spec.md†L40-L54】 Complementary strategic views such as PersonnelView and FinanceView expose their respective loops via tabbed candidate/staff management and collapsible revenue/expense reports, mirroring the hiring and finance stories from the spec and illustrated by their overview shots ([Personnel – job market](./screenshots/04-personell-overview-%28job-market%29.png), [Personnel – employees](./screenshots/05-personell-overview-%28my-employees%29.png), [Finance – cards collapsed](./screenshots/06-finances-overview-%28cards_closed%29.png), [Finance – cards expanded](./screenshots/07-finances-overview-%28cards_opened%29.png)).【F:docs/ui/ui-components-desciption.md†L490-L509】【F:docs/ui/ui_interactions_spec.md†L58-L73】

> L21: Every modal in the screenshots—including the game menu and hiring/new game flows—reuses the shared Modal shell, Form inputs, and Primary buttons, underscoring a consistent command pattern for façade intents and visible across multiple modal captures ([Game menu modal](./screenshots/08-model-game_menu.png), [New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L123-L178】【F:docs/ui/ui-components-desciption.md†L323-L337】 The dark Tailwind-based design system (stone background, lime accents) gives all cards and panels a cohesive appearance, reinforcing that gameplay relies on high-contrast status colors for quick scanning, a theme evident in the dashboard imagery ([Structure overview cards](./screenshots/03-structure-overview.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png)).【F:docs/ui/ui-components-desciption.md†L551-L574】 Together, these patterns show that the UI concept emphasizes deterministic flows, reusable components, and a layered information hierarchy that mirrors the simulation architecture.

### Checklist

- [ ] L5: The screenshots convey a dashboard-style application that guides the player from high-level operations down to per-plant decisions through a clear Structure → Room → Zone drill-down, as illustrated in the structure and room overview captures ([Structure overview](./screenshots/03-structure-overview.png), [Room overview](./screenshots/10-room-overview-%28growroom%29.png)). Global navigation relies on cards and inline actions to jump between these hierarchy levels while providing immediate CRUD affordances for each tier.【F:docs/ui/ui-components-desciption.md†L483-L525】【F:docs/ui/ui_interactions_spec.md†L27-L37】 Zone views then compose telemetry, device management, and plant operations into a single control surface, matching the micro-loop described in the interaction spec and shown in the zone detail screens ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L533】【F:docs/ui/ui_interactions_spec.md†L40-L54】
- [ ] L9: The welcome screen foregrounds the StartScreen component with quick entry points for New, Quick, and Import game flows, reflecting the lifecycle actions in the façade contract and captured in the welcome hero ([Welcome screen](./screenshots/01-welcome-screen.png)).【F:docs/ui/ui-components-desciption.md†L393-L399】【F:docs/ui/ui_interactions_spec.md†L13-L23】 Selecting “New Game” opens a dedicated modal that captures company metadata and a deterministic seed using shared modal and form primitives, reinforcing that modal workflows pause gameplay until the façade acknowledges the command, as seen in the new game form ([New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L347-L353】【F:docs/ui/ui-components-desciption.md†L123-L178】
- [ ] L17: Within a zone, the screenshots highlight the layered EnvironmentPanel (collapsed vs. expanded), device lists, and the ZonePlantPanel’s batch-selection mode. This trio encapsulates monitoring, setpoint control, and multi-plant actions that the cultivation loop depends on, as evidenced in the zone detail captures ([Zone detail – collapsed](./screenshots/11-zone-detailview-%28setup-closed%29.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png), [Zone detail – batch mode](./screenshots/13-zone-detailview-%28mass-selection-activated%29.png)).【F:docs/ui/ui-components-desciption.md†L407-L462】【F:docs/ui/ui_interactions_spec.md†L40-L54】 Complementary strategic views such as PersonnelView and FinanceView expose their respective loops via tabbed candidate/staff management and collapsible revenue/expense reports, mirroring the hiring and finance stories from the spec and illustrated by their overview shots ([Personnel – job market](./screenshots/04-personell-overview-%28job-market%29.png), [Personnel – employees](./screenshots/05-personell-overview-%28my-employees%29.png), [Finance – cards collapsed](./screenshots/06-finances-overview-%28cards_closed%29.png), [Finance – cards expanded](./screenshots/07-finances-overview-%28cards_opened%29.png)).【F:docs/ui/ui-components-desciption.md†L490-L509】【F:docs/ui/ui_interactions_spec.md†L58-L73】
- [ ] L21: Every modal in the screenshots—including the game menu and hiring/new game flows—reuses the shared Modal shell, Form inputs, and Primary buttons, underscoring a consistent command pattern for façade intents and visible across multiple modal captures ([Game menu modal](./screenshots/08-model-game_menu.png), [New game modal](./screenshots/02-modal-new_game.png)).【F:docs/ui/ui-components-desciption.md†L123-L178】【F:docs/ui/ui-components-desciption.md†L323-L337】 The dark Tailwind-based design system (stone background, lime accents) gives all cards and panels a cohesive appearance, reinforcing that gameplay relies on high-contrast status colors for quick scanning, a theme evident in the dashboard imagery ([Structure overview cards](./screenshots/03-structure-overview.png), [Zone detail – expanded](./screenshots/12-zone-detailview-%28setup-opened%29.png)).【F:docs/ui/ui-components-desciption.md†L551-L574】 Together, these patterns show that the UI concept emphasizes deterministic flows, reusable components, and a layered information hierarchy that mirrors the simulation architecture.

## docs/ui/ui_archictecture.md

> L24: 1. **Render (read)**

> L26: 2. **User Action (intent)**

> L28: 3. **Command (through the Facade)**

> L35: 4. **Logic (engine)**

> L37: 5. **State Update (commit)**

> L39: 6. **Notification (events)**

> L41: 7. **Re‑render (subscribe)**

> L79: **Behavior.** Maintains `{ visibleModal, formState }`. When opening a modal, it **may pause** the sim for clarity; on close, it optionally **resumes** if it was running.

> L172: - **Modals** ≈ `useModals()` with pause/resume behavior when opening/closing.

### Checklist

- [ ] L24: 1. **Render (read)**
- [ ] L26: 2. **User Action (intent)**
- [ ] L28: 3. **Command (through the Facade)**
- [ ] L35: 4. **Logic (engine)**
- [ ] L37: 5. **State Update (commit)**
- [ ] L39: 6. **Notification (events)**
- [ ] L41: 7. **Re‑render (subscribe)**
- [ ] L79: **Behavior.** Maintains `{ visibleModal, formState }`. When opening a modal, it **may pause** the sim for clarity; on close, it optionally **resumes** if it was running.
- [ ] L172: - **Modals** ≈ `useModals()` with pause/resume behavior when opening/closing.

## docs/ui/ui_elements.md

> L113: - **Team roster** renders employee cards with salary, assignment, and morale/energy bars. Each card exposes a "Fire" action that opens the global confirmation modal and dispatches `workforce.fire` on approval.

> L114: - **Job market** lists applicants as cards with skill progress bars, trait badges, and a "Hire" button. Hiring opens the dedicated modal (global modal slice) and sends `workforce.hire` with the configured wage. A refresh button triggers `workforce.refreshCandidates`.

### Checklist

- [ ] L113: - **Team roster** renders employee cards with salary, assignment, and morale/energy bars. Each card exposes a "Fire" action that opens the global confirmation modal and dispatches `workforce.fire` on approval.
- [ ] L114: - **Job market** lists applicants as cards with skill progress bars, trait badges, and a "Hire" button. Hiring opens the dedicated modal (global modal slice) and sends `workforce.hire` with the configured wage. A refresh button triggers `workforce.refreshCandidates`.

## docs/ui/ui_interactions_spec.md

> L91: Central modal controller; manages `visibleModal` and `formState`. Optionally **pauses** sim on open and **resumes** on close.

### Checklist

- [ ] L91: Central modal controller; manages `visibleModal` and `formState`. Optionally **pauses** sim on open and **resumes** on close.

## docs/vision_scope.md

> L7: **Elevator Pitch.** _Weed Breed_ is a modular, deterministic plant/grow simulation as a game. Players plan structures (Buildings → Rooms → Zones → Plants), control climate and devices, balance cost and yield, and experience complete cultivation cycles—from seeding to harvest and post-harvest. The system is open, extensible, and content-driven (blueprint JSONs) so that community, modders, and researchers can easily contribute content.

> L13: 1. **Determinism over visuals.** Reproducible runs beat visual effects.

> L14: 2. **Playability over realism.** Plausible rather than strictly scientific—with explicit simplifications where needed.

> L15: 3. **Open architecture.** Data/modding first, clear interfaces, stable formats.

> L16: 4. **Transparency.** Visible metrics, explainable decisions (logs, audits, replays).

> L17: 5. **Tight feedback loops.** Fun comes from meaningful micro-decisions in day-to-day operations.

> L55: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_

> L56: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_

> L63: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_

> L95: **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_

> L216: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_

> L257: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_

> L265: 1. **MVP:** One structure, basic climate control, 1–2 strains, 1 method, basic economy, save/load, deterministic 30-day run.

> L266: 2. **Alpha:** Pests/diseases + treatments, device degradation/maintenance, shop/research loop, editor v1.

> L267: 3. **Beta:** Balancing pass, golden runs (200 days), stability SLOs met, localization EN/DE.

> L268: 4. **1.0:** Content polish, modding docs, replay exporter, performance tuning.

### Checklist

- [ ] L7: **Elevator Pitch.** _Weed Breed_ is a modular, deterministic plant/grow simulation as a game. Players plan structures (Buildings → Rooms → Zones → Plants), control climate and devices, balance cost and yield, and experience complete cultivation cycles—from seeding to harvest and post-harvest. The system is open, extensible, and content-driven (blueprint JSONs) so that community, modders, and researchers can easily contribute content.
- [ ] L13: 1. **Determinism over visuals.** Reproducible runs beat visual effects.
- [ ] L14: 2. **Playability over realism.** Plausible rather than strictly scientific—with explicit simplifications where needed.
- [ ] L15: 3. **Open architecture.** Data/modding first, clear interfaces, stable formats.
- [ ] L16: 4. **Transparency.** Visible metrics, explainable decisions (logs, audits, replays).
- [ ] L17: 5. **Tight feedback loops.** Fun comes from meaningful micro-decisions in day-to-day operations.
- [ ] L55: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_
- [ ] L56: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_
- [ ] L63: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_
- [ ] L95: **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_
- [ ] L216: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_
- [ ] L257: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_
- [ ] L265: 1. **MVP:** One structure, basic climate control, 1–2 strains, 1 method, basic economy, save/load, deterministic 30-day run.
- [ ] L266: 2. **Alpha:** Pests/diseases + treatments, device degradation/maintenance, shop/research loop, editor v1.
- [ ] L267: 3. **Beta:** Balancing pass, golden runs (200 days), stability SLOs met, localization EN/DE.
- [ ] L268: 4. **1.0:** Content polish, modding docs, replay exporter, performance tuning.

## docs/weedbreed-final-truth.backup.md

> L15: - [Open Questions](#open-questions)

> L22: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】

> L183: ## Open Questions

> L187: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】

> L188: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】

> L189: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】

> L190: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】

> L191: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】

> L192: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

> L211: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

### Checklist

- [ ] L15: - [Open Questions](#open-questions)
- [ ] L22: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】
- [ ] L183: ## Open Questions
- [ ] L187: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】
- [ ] L188: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】
- [ ] L189: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】
- [ ] L190: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】
- [ ] L191: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】
- [ ] L192: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】
- [ ] L211: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

## docs/weedbreed-final-truth.md

> L15: - [Open Questions](#open-questions)

> L22: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】

> L169: ## Modular Plant Growth Simulation (Open Architecture)

> L207: 1. **Run a tick-based simulation** with configurable tick length (e.g., 1–10 minutes of sim time per tick).

> L208: 2. **Adjust conditions at runtime** (pause/resume, tick rate, setpoints for light/temperature/CO₂).

> L209: 3. **Visualize telemetry** (time-series charts for T, RH, VPD, PPFD; tables for plants/devices).

> L210: 4. **Save & load** full state with schema validation and versioning.

> L251: 1. `applyDevices` → 2) `deriveEnvironment` → 3) `irrigationAndNutrients` → 4) `updatePlants` → 5) `harvestAndInventory` → 6) `accounting` → 7) `commit`.&#x20;

> L427: 1. **M1 – Core Loop & Bus (Backend)**

> L431: 2. **M2 – Physics & Plant Model**

> L434: 3. **M3 – Save/Load & Schemas**

> L437: 4. **M4 – Dashboard (Frontend)**

> L440: 5. **M5 – Benchmarks & Hardening**

> L453: ## 13) Open Questions

> L483: > This PRD is designed to be “open architecture”: physics and plant models are boxed behind a single module boundary; devices, strains, and methods are pure JSON blueprints; the loop and event bus are stable contracts for UI and future systems. &#x20;

> L495: ## Open Questions

> L499: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】

> L500: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】

> L501: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】

> L502: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】

> L503: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】

> L504: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】

> L523: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

### Checklist

- [ ] L15: - [Open Questions](#open-questions)
- [ ] L22: - **Weedbreed.AI** is positioned as a modular, deterministic cultivation simulation that spans structures, climate control, and plant lifecycles while remaining open and extensible through data-driven content contributions.【F:docs/vision_scope.md†L5-L17】
- [ ] L169: ## Modular Plant Growth Simulation (Open Architecture)
- [ ] L207: 1. **Run a tick-based simulation** with configurable tick length (e.g., 1–10 minutes of sim time per tick).
- [ ] L208: 2. **Adjust conditions at runtime** (pause/resume, tick rate, setpoints for light/temperature/CO₂).
- [ ] L209: 3. **Visualize telemetry** (time-series charts for T, RH, VPD, PPFD; tables for plants/devices).
- [ ] L210: 4. **Save & load** full state with schema validation and versioning.
- [ ] L251: 1. `applyDevices` → 2) `deriveEnvironment` → 3) `irrigationAndNutrients` → 4) `updatePlants` → 5) `harvestAndInventory` → 6) `accounting` → 7) `commit`.&#x20;
- [ ] L427: 1. **M1 – Core Loop & Bus (Backend)**
- [ ] L431: 2. **M2 – Physics & Plant Model**
- [ ] L434: 3. **M3 – Save/Load & Schemas**
- [ ] L437: 4. **M4 – Dashboard (Frontend)**
- [ ] L440: 5. **M5 – Benchmarks & Hardening**
- [ ] L453: ## 13) Open Questions
- [ ] L483: > This PRD is designed to be “open architecture”: physics and plant models are boxed behind a single module boundary; devices, strains, and methods are pure JSON blueprints; the loop and event bus are stable contracts for UI and future systems. &#x20;
- [ ] L495: ## Open Questions
- [ ] L499: - **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). _(OPEN: validate)_【F:docs/vision_scope.md†L55-L56】
- [ ] L500: - **Retention Proxy:** 70% of players reach day 7 of a sandbox save. _(OPEN: measure)_【F:docs/vision_scope.md†L55-L57】
- [ ] L501: - **Memory Target:** Reference scenario uses < **1.0 GB RAM**. _(OPEN: finalize)_【F:docs/vision_scope.md†L61-L64】
- [ ] L502: - **Time Scale.** Tick-based with fixed tick duration: **default tick length = 5 in-game minutes**; **12 ticks = 1 in-game hour**, **288 ticks = 1 in-game day**, **7×288 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. _(OPEN: standard wall-clock tick duration, e.g., 1 min)_【F:docs/vision_scope.md†L95-L96】
- [ ] L503: - **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. _(OPEN: finalize list)_【F:docs/vision_scope.md†L214-L218】
- [ ] L504: - **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. _(OPEN: decide)_【F:docs/vision_scope.md†L254-L257】
- [ ] L523: | 11-open-questions | `docs/vision_scope.md §§ 3, 4, 8, 13`【F:docs/vision_scope.md†L55-L257】 |

## sources_inventory.md

> L30: | docs/\_final/11-open-questions.md | Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ] | 2025-10-01T11:53:08.100111 | 1330 | [vision, simulation loop, devices, agents/tasks, ops] | kept |

> L80: | docs/tasks/20250923-todo-findings.md | Create tasks to fix the issues: | 2025-10-01T11:53:08.108112 | 5332 | [data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | kept |

> L81: | docs/tasks/20250924-todo-findings.md | • Critical: config.update setpoint rejects UUID zoneIds (backend socketGateway.t | 2025-10-01T11:53:08.108112 | 5896 | [vision, data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | kept |

### Checklist

- [ ] L30: | docs/\_final/11-open-questions.md | Open Questions [ # Source: docs/vision_scope.md § 3. Success Criteria; docs/vision_scope.md § 4. Canonical Domain Model; docs/vision_scope.md § 8. Content & Data Strategy; docs/vision_scope.md § 13. Legal & Ethics ] | 2025-10-01T11:53:08.100111 | 1330 | [vision, simulation loop, devices, agents/tasks, ops] | kept |
- [ ] L80: | docs/tasks/20250923-todo-findings.md | Create tasks to fix the issues: | 2025-10-01T11:53:08.108112 | 5332 | [data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | kept |
- [ ] L81: | docs/tasks/20250924-todo-findings.md | • Critical: config.update setpoint rejects UUID zoneIds (backend socketGateway.t | 2025-10-01T11:53:08.108112 | 5896 | [vision, data/schema, simulation loop, devices, economy, agents/tasks, UI, tests, ops] | kept |
