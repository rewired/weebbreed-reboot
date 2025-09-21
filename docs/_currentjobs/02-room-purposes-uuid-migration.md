# Prompt: UUID-Backfill für RoomPurposes

## Aufgabe (Frage an Codex)

Ergänze in allen `/data/blueprints/roomPurposes/*.json` Dateien ein Feld `id` (UUID v4), falls nicht vorhanden, und setze `"kind": "RoomPurpose"`.

## Ziele

- Jedes RoomPurpose-JSON hat `id: <uuid-v4>` und `kind: "RoomPurpose"`.
- Migrationsskript und Tests vorhanden.
- Doku-Hinweis zur UUID-Pflicht.

## Schritte (selbst ableiten & ausführen)

1. `tools/migrate-room-purposes.(ts|mjs)` implementieren:
   - Alle JSONs laden → id ergänzen (falls fehlt) → kind normalisieren.
   - Datein sauber formatiert zurückschreiben.
2. Dry-Run-Option (z. B. `--dry`) implementieren.
3. Tests mit tmp-Verzeichnis (erwartete Mutationen).
4. README-Snippet in `/docs` ergänzen.

## Pseudocode-Hinweis

```js
import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'glob';
import { v4 as uuid } from 'uuid';
for (const file of await glob('data/blueprints/roomPurposes/*.json')) {
  const obj = JSON.parse(await readFile(file, 'utf8'));
  let mutated = false;
  if (!obj.id) {
    obj.id = uuid();
    mutated = true;
  }
  if (obj.kind !== 'RoomPurpose') {
    obj.kind = 'RoomPurpose';
    mutated = true;
  }
  if (mutated) await writeFile(file, JSON.stringify(obj, null, 2) + '\n');
}
```
