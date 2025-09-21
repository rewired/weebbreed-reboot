# Room Purpose Registry

## Overview

Room purposes are content blueprints that describe how a room is used (e.g. grow room, break room).
The shared engine module exposes repository-backed helpers that operate on the data loaded by the
backend `BlueprintRepository`. Blueprints are validated with Zod during repository initialisation, so
the runtime helpers only need a source that implements `listRoomPurposes()` (the repository does).

## API

The helpers live at `src/engine/roomPurposes/index.ts` and export repository-oriented utilities:

- `listRoomPurposes(source)` — Returns all known room purposes from a repository-like source.
- `getRoomPurpose(source, value, { by })` — Retrieves a purpose by id (default) or name; lookups are
  case-insensitive and return `undefined` when no match is found.
- `requireRoomPurpose(source, value, { by })` — Same as `getRoomPurpose` but throws when the lookup
  fails.
- `resolveRoomPurposeId(source, name)` — Convenience helper that resolves an id from a room purpose
  name (throws when unknown).

Example:

```ts
import { BlueprintRepository } from './data/index.js';
import { resolveRoomPurposeId } from '../engine/roomPurposes/index.js';

const repository = await BlueprintRepository.loadFrom('/absolute/path/to/data');
const growRoomId = resolveRoomPurposeId(repository, 'Grow Room');
```

## Schema

Each blueprint is validated against the following Zod schema:

```json
{
  "type": "object",
  "required": ["id", "kind", "name"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "kind": { "type": "string", "const": "RoomPurpose" },
    "name": { "type": "string", "minLength": 1 },
    "description": { "type": "string" },
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
