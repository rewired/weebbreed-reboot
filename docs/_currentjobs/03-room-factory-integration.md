# Prompt: RoomFactory mit PurposeRegistry verdrahten

## Aufgabe (Frage an Codex)

Integriere die RoomPurposeRegistry in die Raum-Erzeugung. `createRoom` bzw. `Room` muss eine `purposeId` validieren und den Purpose laden.

## Ziele

- `purposeId` → Purpose existiert → an Room-Instanz gebunden.
- Zweckabhängige Defaults (z. B. ökonomische Parameter) werden übernommen.
- Fail-Fast bei unbekannter `purposeId`.
- Unit-Tests + Doku.

## Schritte (selbst ableiten & ausführen)

1. `createRoom({ purposeId, ... })` ruft `getPurposeById(purposeId)`.
2. Bei `undefined` → klarer Fehler mit Hilfetext (Liste verfügbarer Ids/namen).
3. Room speichert `purpose` read-only (keine Runtime-Mutationen).
4. Tests: valid/invalid; Defaults greifen.
5. Doc: Beispiel-JSON & Factory-Aufruf in `/docs`.

## Pseudocode

```js
import { getPurposeById } from '../engine/roomPurposeRegistry.mjs';
export function createRoom({ id, purposeId, area, height, ...rest }) {
  const purpose = getPurposeById(purposeId);
  if (!purpose) throw new Error('Unknown purposeId=' + purposeId);
  return new Room({ id, area, height, purpose, ...rest });
}
```
