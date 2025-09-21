# Prompt: UI-Bridge (SSE/WebSocket) als Adapter

## Aufgabe (Frage an Codex)

Expose `uiStream$` via SSE/WebSocket, ohne enge Kopplung. Baue eine minimale Timeline-Demo (nur Adapter, kein Full-UI).

## Ziele

- Stabiler Transport (SSE oder WS), Backpressure/Buffer.
- Beispielseite zeigt Events in Timeline.

## CSS-Hinweis

```css
.timeline {
  display: grid;
  gap: 0.5rem;
  grid-auto-rows: minmax(2rem, auto);
}
.event {
  border: 1px solid #333;
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
}
```
