# Prompt: Event-Layer (RxJS) & UI-Stream

## Aufgabe (Frage an Codex)

Extrahiere einen reinen Event-Bus für Telemetrie (kein Command), richte `uiStream$` ein und entkopple UI/Transport.

## Ziele

- API: `emit(type, payload, tick, level='info')`.
- `uiStream$`: gefilterter/buffernder Stream für UI/Adapter.
- Strukturierter Logger (`pino`) parallel.
- Tests: Anzahl, Form, Backpressure.

## Schritte

1. `src/runtime/eventBus.(ts|mjs)` mit Subject/Observable.
2. Emissionspunkte im Sim-Code einheitlich benutzen.
3. WebSocket/SSE-Adapter konsumieren `uiStream$` (separater Adapter).
4. Unit-Tests für Filter/Buffer/Backpressure.
