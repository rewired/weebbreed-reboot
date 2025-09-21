# Room Purpose Registry

## Overview

Room purposes are content blueprints that describe how a room is used (e.g. grow room, break room).
The registry loads every JSON blueprint from `data/blueprints/roomPurposes/*.json`, validates the
payload, and stores the result in in-memory maps for quick lookups. Calling the loader multiple times
is safe—the internal caches are cleared and fully rebuilt on each invocation so tests and hot reloads
can reset state deterministically.

## API

The registry lives at `src/backend/src/engine/roomPurposeRegistry.ts` and exports three helpers:

- `loadRoomPurposes(options?)` — Reads all blueprints (optionally from a custom `dataDirectory`),
  validates them with Ajv, and populates the caches. Returns the loaded blueprints as an array.
- `getPurposeById(id)` — Retrieves a blueprint by identifier. Matching is case-insensitive and
  returns `undefined` when the id is unknown.
- `getPurposeByName(name)` — Retrieves a blueprint by name using a case-insensitive lookup.

Example:

```ts
import { loadRoomPurposes, getPurposeByName } from './engine/roomPurposeRegistry.js';

await loadRoomPurposes({ dataDirectory: '/absolute/path/to/data' });
const growRoom = getPurposeByName('Grow Room');
```

## Schema

Each blueprint must satisfy the following JSON Schema (Ajv syntax):

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

Additional fields are allowed to accommodate future gameplay metadata. The `kind` discriminator and
UUID `id` ensure interoperability with other blueprint loaders.
