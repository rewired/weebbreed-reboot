# Prompt: RoomPurposes ent-harden & Registry einführen

## Aufgabe (Frage an Codex)

Prüfe das gesamte Repo auf **hardcodierte** `roomPurpose`/`roomPurposes`/Enums/Listen und ersetze sie durch einen **RoomPurpose-Registry**-Mechanismus, der JSON-Blueprints aus `/data/blueprints/roomPurposes/*.json` lädt und validiert.

## Ziele

- Alle RoomPurposes werden **ausschließlich** aus JSON geladen (kein Hardcode).
- Registry mit `Map<id, purpose>` und `Map<nameLower, purpose>`.
- AJV-Validierung mit Schema (UUID-Pflicht, kind="RoomPurpose").
- Unit-Tests (Load/Validation/Lookups) und Docs-Update.

## Schritte (selbst ableiten & ausführen)

- [ ] Codebase durchsuchen (Enum/const/listen) und Stellen markieren, die Purposes hardcodieren.
- [x] `src/engine/roomPurposeRegistry.(ts|mjs)` anlegen:
  - Glob-Laden von `data/blueprints/roomPurposes/*.json`.
  - AJV-Validation nach Schema (siehe unten).
  - Exporte: `loadRoomPurposes()`, `getPurposeById(id)`, `getPurposeByName(name)`.
- [ ] Call-Sites refactoren (Rooms/Factories/Tests), damit sie nur noch via Registry arbeiten.
- [x] Tests:
  - Erfolgreiches Laden und Zugriff auf `id`/`name`.
  - Validation-Fehler → Test erwartet Fehler.
- [x] Doku: Kurze Readme in `/docs` zu Registry-Nutzung.

## JSON-Schema (Vorschlag)

```json
{
  "type": "object",
  "required": ["id", "kind", "name"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "kind": { "type": "string", "const": "RoomPurpose" },
    "name": { "type": "string", "minLength": 1 },
    "flags": { "type": "object", "additionalProperties": { "type": "boolean" } },
    "economy": {
      "type": "object",
      "properties": {
        "areaCost": { "type": "number", "minimum": 0 },
        "baseRentPerTick": { "type": "number", "minimum": 0 }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": true
}
```

## Pseudocode-Hinweis

```js
// src/engine/roomPurposeRegistry.mjs
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(roomPurposeSchema);

const byId = new Map(),
  byName = new Map();
export async function loadRoomPurposes() {
  byId.clear();
  byName.clear();
  for (const file of await glob('data/blueprints/roomPurposes/*.json')) {
    const obj = JSON.parse(await readFile(file, 'utf8'));
    if (!validate(obj)) throw new Error('Invalid RoomPurpose: ' + file);
    byId.set(obj.id, obj);
    byName.set(obj.name.toLowerCase(), obj);
  }
}
export const getPurposeById = (id) => byId.get(id);
export const getPurposeByName = (n) => byName.get(n.toLowerCase());
```
