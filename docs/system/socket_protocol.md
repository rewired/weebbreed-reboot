# Socket Protocol — Simulation Gateway

The backend exposes a shared UI event stream (`uiStream$`) that aggregates
simulation telemetry and domain events with bounded buffers for downstream UI
adapters. Both the Socket.IO gateway and the server-sent events (SSE) gateway
subscribe to the same observable, ensuring identical payloads regardless of
transport. All payloads are JSON and use SI units unless stated otherwise.

## UI Stream (`uiStream$`)

- `createUiStream` (from `runtime/eventBus.ts`) returns an observable of
  `UiStreamPacket` objects. Adapter authors supply:
  - `snapshotProvider`: typically `facade.select((state) =>
buildSimulationSnapshot(state, repository))`.
  - `timeStatusProvider`: usually `() => facade.getTimeStatus()`.
- Default backpressure:
  - Simulation batches: **120 ms** window, max **5** ticks.
  - Domain events: **250 ms** window, max **25** events.
- Events are sanitised to `{ type, payload, tick, ts, level?, tags? }` before
  leaving the runtime.
- Subscribers receive four packet kinds:
  1. `{ channel: 'simulationUpdate', payload: SimulationUpdateMessage }`
  2. `{ channel: 'sim.tickCompleted', payload: UiSimulationTickEvent }`
  3. `{ channel: 'domainEvents', payload: UiDomainEventsMessage }`
  4. `{ channel: <event.type>, payload: event.payload ?? null }`
- The observable is hot (`share({ resetOnRefCountZero: false, … })`). Provide the
  **same** instance to every transport adapter to reuse buffers and ordering.

## Connection & Handshake

1. The client connects to the single Socket.IO namespace (`/`).
2. Immediately after the connection the gateway emits:
   - `gateway.protocol` – `{ version: 1 }` to allow clients to negotiate
     breaking changes.
   - `time.status` – `{ status: TimeStatus }`, mirroring the façade scheduler
     state (running/paused, tick, speed, targetTickRate).
   - `simulationUpdate` – a seed payload containing the latest snapshot. The
     structure is identical to the regular update batches documented below and
     always contains exactly one entry.

### Frontend Configuration

- The Vite dashboard reads the socket endpoint from the `VITE_SOCKET_URL`
  environment variable. Create a `.env` file next to the frontend package (see
  `.env.example`) to point the UI at a different host/port during development.
- When the variable is omitted the UI falls back to
  `http://localhost:7331/socket.io`, matching the default backend dev server.

## Outgoing Events

### `simulationUpdate`

Batched snapshot diff and event bundles. Payload:

```json
{
  "updates": [
    {
      "tick": 123,
      "ts": 1725712345678,
      "durationMs": 8.1,
      "phaseTimings": {
        "applyDevices": { "startedAt": 0, "completedAt": 1.1, "durationMs": 1.1 },
        "deriveEnvironment": { "startedAt": 1.1, "completedAt": 2.6, "durationMs": 1.5 },
        "irrigationAndNutrients": { "startedAt": 2.6, "completedAt": 3.7, "durationMs": 1.1 },
        "updatePlants": { "startedAt": 3.7, "completedAt": 5.0, "durationMs": 1.3 },
        "harvestAndInventory": { "startedAt": 5.0, "completedAt": 6.6, "durationMs": 1.6 },
        "accounting": { "startedAt": 6.6, "completedAt": 7.6, "durationMs": 1.0 },
        "commit": { "startedAt": 7.6, "completedAt": 8.1, "durationMs": 0.5 }
      },
      "events": [
        {
          "type": "plant.stageChanged",
          "tick": 123,
          "ts": 1725712345678,
          "payload": { "plantId": "plant-1", "from": "vegetative", "to": "flowering" }
        }
      ],
      "snapshot": {
        "tick": 123,
        "clock": { "tick": 123, "isPaused": false, "targetTickRate": 1 },
        "zones": [
          {
            "id": "zone-1",
            "name": "North Bloom",
            "structureId": "structure-1",
            "roomId": "room-1",
            "environment": {
              "temperature": 24.1,
              "relativeHumidity": 0.52,
              "co2": 980,
              "ppfd": 540,
              "vpd": 1.28
            },
            "metrics": {
              "averageTemperature": 23.8,
              "averageHumidity": 0.53,
              "averageCo2": 960,
              "averagePpfd": 530,
              "stressLevel": 0.12,
              "lastUpdatedTick": 123
            },
            "plants": [
              {
                "id": "plant-1",
                "strainId": "strain-1",
                "stage": "flowering",
                "health": 0.93,
                "stress": 0.1,
                "biomassDryGrams": 152.4,
                "yieldDryGrams": 45.2
              }
            ]
          }
        ]
      },
      "time": { "running": true, "paused": false, "speed": 1, "tick": 123, "targetTickRate": 1 }
    }
  ]
}
```

- Batching window defaults to **120 ms** (configurable) or a maximum of five
  ticks before the buffer flushes.
- `snapshot` is a light-weight view focusing on zone telemetry and plant status.
  UI consumers should treat it as ephemeral state (never mutate in place).
- The `events` array repeats the domain events emitted during the tick for
  convenience and matches the structure forwarded via `domainEvents`.

### `sim.tickCompleted`

A raw forwarding of the façade event. Each entry contains:

```json
{
  "tick": 123,
  "ts": 1725712345678,
  "durationMs": 8.1,
  "eventCount": 4,
  "phaseTimings": {
    /* same as above */
  },
  "events": [
    /* domain events for that tick */
  ]
}
```

The gateway always emits this message after the corresponding `simulationUpdate`
flush to keep telemetry ordering deterministic.

### `domainEvents`

Bundled domain-level notifications (plant/device/zone/market/finance/health,
including pests/diseases). Payload:

```json
{
  "events": [
    {
      "type": "plant.stageChanged",
      "tick": 123,
      "ts": 1725712345678,
      "payload": { "plantId": "plant-1", "from": "vegetative", "to": "flowering" }
    },
    {
      "type": "device.degraded",
      "tick": 123,
      "ts": 1725712345685,
      "level": "warning",
      "payload": { "deviceId": "lamp-1", "severity": "warning" }
    }
  ]
}
```

- Default throttling window: **250 ms** with a maximum batch size of 25 events.
- Every individual event is also re-emitted using the event’s `type` as the
  Socket.IO channel for legacy listeners (e.g. `plant.stageChanged`).

## Server-Sent Events (`/events`)

- Default endpoint: `/events` (configurable via `SseGatewayOptions.path`).
- Methods: `GET` for the live stream, `OPTIONS` for CORS preflight. Responses
  include `Access-Control-Allow-Origin: *` and disable proxy buffering.
- Handshake events are identical to the socket gateway (`gateway.protocol`,
  `time.status`, and an initial `simulationUpdate`).
- Keep-alive comments (`: keep-alive`) are emitted every **15 s** by default.
- Each packet from `uiStream$` is forwarded as an SSE event (`event: <channel>`
  - `data: <json>`). Individual domain events keep their original event names.
- Shut down via `SseGateway.close()` to unsubscribe all clients and stop the
  keep-alive timer.

## Incoming Commands

### Common Envelope

Every command payload may include an optional `requestId` string. When present it
is mirrored in the corresponding `*.result` response message and in the
acknowledgement callback.

Responses follow the façade’s `CommandResult<T>` structure:

```json
{
  "requestId": "cmd-1",
  "ok": false,
  "warnings": ["Speed multiplier unchanged."],
  "errors": [
    { "code": "ERR_VALIDATION", "message": "ticks must be greater than zero.", "path": ["ticks"] }
  ]
}
```

### `simulationControl`

Discriminated union on `action`:

| Action        | Payload fields                    | Delegated façade call              |
| ------------- | --------------------------------- | ---------------------------------- |
| `play`        | `gameSpeed?`, `maxTicksPerFrame?` | `start()` (or `resume` if running) |
| `pause`       | –                                 | `pause()`                          |
| `resume`      | –                                 | `resume()`                         |
| `step`        | `ticks?`                          | `step()`                           |
| `fastForward` | `multiplier`                      | `setSpeed()`                       |

All payloads are validated with Zod before the façade command is executed. If
validation fails the façade is not touched and the client receives an
`ERR_VALIDATION` response immediately.

### `config.update`

Currently supported targets:

| Type         | Payload fields              | Behaviour                                                                                    |
| ------------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| `tickLength` | `minutes` (> 0)             | Reconfigures the scheduler (restarts if required) and emits a `sim.tickLengthChanged` event. |
| `setpoint`   | `zoneId`, `metric`, `value` | Not yet implemented – returns `ERR_INVALID_STATE`.                                           |

Additional configuration mutations can be layered onto the same endpoint in the
future without breaking existing clients.

## Error Handling

- Validation errors (`ERR_VALIDATION`) map 1:1 to the offending field path.
- Internal failures (`ERR_INTERNAL`) surface the error message and the command
  path. The gateway never throws – failures are returned via the Socket.IO ACK
  callback and the mirrored `*.result` event.
- Unsupported commands yield `ERR_INVALID_STATE`.

## Batching Guarantees

- Simulation updates are emitted in tick order. No batch spans ticks out of
  order and the gateway never drops ticks – throttling only coalesces them.
- Domain events preserve emission order inside each batch.
- Closing the gateway (`SocketGateway.close()`) flushes pending timers and
  detaches all façade subscriptions.

## Versioning

The protocol version is incremented when payload structures change in a
non-backwards-compatible way. Clients should subscribe to `gateway.protocol` and
fail fast if an unknown version is announced.
