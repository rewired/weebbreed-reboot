# Runtime Event Bus Migration Notes

## Overview

The telemetry event bus now lives in `src/runtime/eventBus.ts`. The module exposes a
singleton `eventBus`, a convenience `emit(type, payload?, tick?, level?)` helper, and
observable accessors (`events`, `bufferedEvents`, `events$`). Downstream packages should
consume this runtime module rather than instantiating their own telemetry bus.

Key behavioural tweaks:

- `EventBus.emit` supports both the original object form and the new signature
  `emit(type, payload?, tick?, level?)`. Timestamps continue to default to `Date.now()`
  when not provided.
- `createEventCollector` exposes a `queue` function with the same signature to ease
  refactors inside tick handlers. Passing an explicit `tick` overrides the collector’s
  default; otherwise the current tick is applied automatically.

## Migration Guidance

1. Replace imports of `../src/lib/eventBus.js` (or equivalent) for runtime telemetry with
   `../../runtime/eventBus.js`. The runtime module re-exports `EventBus`,
   `createEventCollector`, and the relevant types.
2. Update `eventBus.emit({ ... })` calls to use the helper signature where convenient:

   ```ts
   emit('plant.stageChanged', { plantId }, currentTick, 'info');
   ```

3. When queuing events during tick processing, prefer `collector.queue('type', payload,
tick, level)` to benefit from the default tick handling.

### Suggested Codemod

For simple cases, a jscodeshift transform that visits `CallExpression`s on `emit` or
`queue` can convert literal object calls to the new signature. The transform should:

- Turn `bus.emit({ type: 'x', payload, tick, level })` into `bus.emit('x', payload, tick,
level)`.
- Turn `collector.queue({ type: 'x', payload, tick })` into
  `collector.queue('x', payload, tick)`.

Always verify transformed files and ensure custom event structures (e.g., tags) are
handled manually.
