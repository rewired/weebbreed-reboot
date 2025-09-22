# **TypeScript beibehalten – Toolchain stabilisieren (ohne ts-node, ESM-konform)**

## Aufgabe (Frage an Codex)

Analysiere den aktuellen Repo-Stand und stelle die **TypeScript-Toolchain** so um, dass:

1. **keine** `ts-node`/`--loader`/Experimental-Flags mehr für den Runtime-Start nötig sind,
2. **ESM-konforme** Builds (Node 23+) entstehen,
3. **Dev** schnell & simpel läuft (Hot-Reload),
4. **CI/Docs** konsistent sind.

> Du entscheidest im Projektkontext die passenden Tools (bevorzugt: `tsx` für Dev, `tsup` oder `esbuild` für Build). Leite die Schritte selbst ab, führe sie aus und liefere Tests & Doku-Updates.

---

## Ziele

- **Single Source of Truth**: TS im `src/`, Build erzeugt ESM-JS in `dist/`.
- **Dev**: `pnpm dev` startet mit `tsx` (kein ts-node).
- **Prod**: `pnpm start` startet `node dist/index.js`.
- **CI**: deterministischer Build & Test auf Node 23; keine Experimental-Loader.
- **ESM only**: Konsistente Imports, saubere Pfade/Aliase.
- **Docs/ADR**: Entscheidung dokumentiert (TS bleibt), Migrationsnotizen enthalten.

---

## Konkrete Deliverables

1. **package.json**-Skripte (Backend-Workspace):

   ```json
   {
     "type": "module",
     "scripts": {
       "dev": "tsx --watch src/index.ts",
       "build": "tsup src/index.ts --format esm --dts --sourcemap --clean",
       "start": "node dist/index.js",
       "test": "vitest run",
       "lint": "eslint .",
       "typecheck": "tsc -p tsconfig.json --noEmit"
     }
   }
   ```

2. **tsconfig.json** (ESM, striktes Typenchecking, Node 23):

   ```json
   {
     "compilerOptions": {
       "module": "ESNext",
       "target": "ES2022",
       "moduleResolution": "Bundler",
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "useUnknownInCatchVariables": true,
       "resolveJsonModule": true,
       "exactOptionalPropertyTypes": true,
       "isolatedModules": true,
       "verbatimModuleSyntax": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "baseUrl": ".",
       "paths": { "@/*": ["src/*"] },
       "types": ["node"]
     },
     "include": ["src/**/*"]
   }
   ```

3. **Tsup** (falls gewählt) – optional `tsup.config.ts`:

   ```ts
   import { defineConfig } from 'tsup';
   export default defineConfig({
     entry: ['src/index.ts'],
     format: ['esm'],
     dts: true,
     sourcemap: true,
     clean: true,
     outDir: 'dist',
     target: 'es2022',
     skipNodeModulesBundle: true,
   });
   ```

4. **CI-Pipeline** (Node 23, pnpm, Build, Test, Smoke-start):
   - Install → `pnpm -w i --frozen-lockfile`
   - Lint/Typecheck → `pnpm -w lint && pnpm -w typecheck`
   - Build → `pnpm -w build`
   - Test → `pnpm -w test`
   - Smoke → `node dist/index.js --version` (oder minimaler Start)

5. **ADR-Update**: „Wir bleiben bei TypeScript“ (Begründung, Tool-Entscheidungen, Rollback-Plan).

6. **README/Docs**: „How to run (dev/prod)“, ESM-Hinweise, Pfad-Aliase, Import-Endungen.

7. **Migrationsnotizen**: Entfernte Flags, ggf. ersetzte Loader, Pfad-Alias-Strategie.

---

## Arbeitsschritte (selbst ableiten & ausführen)

1. **Status-Audit**
   - Finde alle Stellen mit `ts-node`, `--loader`, `--experimental-loader`, `TS_NODE_EXPERIMENTAL_RESOLVER`.
   - Prüfe Import-Stil (ESM?), Pfad-Aliase (`@/…`), JSON-Imports, Test-Runner-Konfig (Vitest/Jest).

2. **Dev-Runner umstellen**
   - Ersetze `ts-node` durch **`tsx`** (oder **vite-node**, wenn sinnvoll).
   - Sicherstellen: `pnpm dev` startet ohne Loader-Flags.

3. **Build-Kette etablieren**
   - Baue mit **`tsup`** (oder `esbuild`) → ESM-Output in `dist/`.
   - **Start** über `node dist/index.js`.
   - Generiere `.d.ts` (für Editor-DX, falls Lib-Exports).

4. **ESM-Konformität erzwingen**
   - `"type":"module"` im Workspace.
   - Keine CJS-Reste (require/module.exports) im Backend.
   - Optional: ESLint-Regelset für ESM & Node 23 (`eslint-plugin-n`).

5. **Pfad-Aliase & Imports**
   - Primär via tsconfig `paths`. Für Runtime:
     - Entweder **tsup** löst intern (empfohlen) → im Output bleiben relative Pfade stabil,
     - oder Import-Map/Resolver einsetzen (nur wenn nötig).

   - Einheitliche Import-Endungen: TS-Quellcode **ohne** Endungen; Build erzeugt korrekte ESM-JS.

6. **Tests modernisieren**
   - Vitest auf ESM belassen; keine TS-Transforms notwendig, wenn Vitest TS versteht.
   - Coverage & Snapshots prüfen.

7. **CI aktualisieren**
   - Node 23, pnpm, Cache-Strategie, Artefakte (z. B. `dist/` oder Audit-Reports).

8. **Docs/ADR/Changelog**
   - ADR: Entscheidung + Trade-offs (DX, Performance, Stabilität).
   - README: klare Befehle für Dev, Build, Start, Test, Troubleshooting.
   - CHANGELOG: Eintrag „Toolchain stabilisiert, ts-node entfernt“.

---

## Abnahmekriterien (Definition of Done)

- `pnpm dev` läuft ohne `ts-node`/Loader-Flags, Hot-Reload funktioniert.
- `pnpm build && pnpm start` startet **stabil** (Node 23, ESM).
- CI grün: Lint, Typecheck, Build, Tests, Smoke-Start.
- ADR/README aktualisiert; kein Erwähnen von ts-node/Experimental-Loadern.
- Import-Fehler, Pfad-Alias-Probleme und ESM-Interop-Warnungen: **0**.

---

## Hinweise & Pseudocode-Snippets

**ESM-Import von JSON (Node 23):**

```ts
// tsconfig: resolveJsonModule: true
// TS-Quellcode:
import roomSchema from '../schemas/room.json' assert { type: 'json' };
// oder ohne assert je nach ts/tsup-Version; im Build testen.
```

**CLI-Entrypoint robust starten:**

```ts
// src/index.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  // optional: parse args (--version)
  console.log('Weed Breed Backend – OK');
}
```

**Vitest (ESM) Beispiel-Konfig (optional vitest.config.ts):**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.{test,spec}.ts'] },
});
```

---

### Optional: Monorepo-Feinschliff

- Workspaces trennen (`/src/backend`, `/apps/frontend`), je eigenes `package.json` & `tsconfig`.
- Root-`pnpm -w` Scripts für `build`, `test`, `lint`, `validate:data` (später nützlich).

---

**Bitte führe diese Umstellung durch, passe die betroffenen Dateien an und liefere PR-Notizen (Breaking Changes: keine).**
