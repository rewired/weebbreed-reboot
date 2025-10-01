# Appendix 04: Simulation Loop and Event Surfaces

## Fixed-Step Loop Overview

The simulation runs as a fixed-step scheduler that accumulates wall-clock time, executes full ticks whenever the accumulated duration crosses the configured interval, and publishes a snapshot with batched events after each committed tick, keeping progression deterministic through seeded RNG streams.【F:docs/system/simulation-engine.md†L5-L25】

## Canonical Tick Phases

1. **Device Control** – Evaluate device setpoints, hysteresis, and control decisions before emitting environmental deltas.【F:docs/TDD.md†L30-L39】【F:docs/system/facade.md†L203-L216】
2. **Apply Device Deltas** – Apply device contributions to zone temperature, relative humidity, CO₂, and PPFD using the delta-based environment solver.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L31-L56】
3. **Normalize to Ambient** – Mix each zone back toward ambient conditions with airflow-scaled exponential decay while clamping humidity and CO₂ safety bounds.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L57-L63】
4. **Irrigation and Nutrients** – Convert strain NPK curves and water usage (g/m²/day) into per-tick, per-plant demands, adjust reservoirs, and log deficits when supplies fall short.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L75-L114】
5. **Plants** – Advance phenology, compute stress from environmental deviations and resource fulfillment, update health, and accumulate biomass while enforcing caps and stage-specific harvest windows.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L80-L106】
6. **Health** – Detect, progress, and spread pest or disease outbreaks, apply treatments with re-entry and pre-harvest guards, and emit outbreak telemetry.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L118-L135】
7. **Tasks and Agents** – Generate tasks from world state, score and assign them to employees via the utility model, advance task progress, and handle overtime policies and resulting events.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L139-L172】
8. **Harvest, Inventory, and Market** – Create harvest lots, manage timestamps and quality decay, and prepare goods for downstream market handling.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L176-L193】
9. **Accounting** – Book per-tick operating expenses (maintenance, energy, water, nutrients, rent, labor) using tick-length-normalized rates and emit finance summaries.【F:docs/TDD.md†L30-L39】【F:docs/system/simulation-engine.md†L176-L194】
10. **Commit and Emit** – Atomically commit the new state, snapshot results, and publish telemetry such as `sim.tickCompleted` at the end of each tick.【F:docs/TDD.md†L30-L39】【F:docs/system/facade.md†L203-L218】

## Event Bus and Transport Shapes

The runtime exposes a shared telemetry bus in `src/runtime/eventBus.ts`, offering a singleton `eventBus`, a helper `emit(type, payload?, tick?, level?)`, and observable accessors so tick handlers can queue events with explicit tick context.【F:docs/system/runtime-event-bus-migration.md†L5-L33】 Downstream transports consume the unified UI stream, which sanitises events to `{ type, payload, tick, ts, level?, tags? }` and multiplexes them across the `simulationUpdate`, `sim.tickCompleted`, `domainEvents`, and direct `<event.type>` channels.【F:docs/system/socket_protocol.md†L13-L31】

Socket clients receive a handshake sequence on connection: `gateway.protocol { version }`, `time.status { status }`, and a seed `simulationUpdate` payload that matches the steady-state batch shape.【F:docs/system/socket_protocol.md†L33-L46】 Each `simulationUpdate` groups one or more `updates`, and every entry carries the committed tick metadata (`tick`, `ts`, `durationMs`), per-phase timings, the events emitted during that tick, and a snapshot containing the authoritative structures, rooms, zones, environment metrics, resources, devices, and plants.【F:docs/system/socket_protocol.md†L77-L200】

## Domain Event Taxonomy

Simulation-facing events cover tick lifecycle telemetry such as `sim.tickCompleted` and optional phase change notifications.【F:docs/TDD.md†L180-L188】【F:docs/system/facade.md†L203-L218】 Plant events include stage transitions, harvest completions, and health alerts, while device events report degradation, failures, and repairs for maintenance workflows.【F:docs/TDD.md†L180-L188】【F:docs/system/simulation-engine.md†L82-L135】 Health-related emissions surface detections, spread updates, treatment applications, and containment outcomes, mirroring the dedicated health phase responsibilities.【F:docs/TDD.md†L180-L188】【F:docs/system/simulation-engine.md†L118-L135】 Task and workforce events track employee assignments, task completions, failures, overtime accrual, and related payouts or time-off scheduling.【F:docs/TDD.md†L180-L188】【F:docs/system/simulation-engine.md†L139-L172】 Finance and market events report per-tick summaries such as `finance.tick`, alongside inventory lot changes and sale completions produced by the harvest and accounting phases.【F:docs/TDD.md†L180-L188】【F:docs/system/simulation-engine.md†L176-L194】 Environment guards may additionally emit anomalies like `env.safetyExceeded` when clamps trigger, ensuring downstream observers react to unsafe conditions.【F:docs/system/simulation-engine.md†L62-L63】
