- [ ] done

# TASK_event_bus_ts

## Goal

RxJS‑Event‑Bus in TS inkl. Typen & UI‑Stream (keine Commands, nur Telemetrie).

## Acceptance Criteria

- `events$`, `uiStream$`, `emit()` vorhanden.
- UI‑Stream gefiltert/gepuffert (keine Debug‑Flut).
- Typen für Event‑Payloads.

## Steps

1. `src/sim/eventBus.ts` aufsetzen.
2. Typen: `type SimEvent = { type: string; payload: unknown; tick: number; level?: 'info'|'debug'|'warn'|'error' }`.
3. Beispiel‑Listener im Backend registrieren.
