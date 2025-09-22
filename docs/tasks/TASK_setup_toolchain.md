- [ ] done

# TASK_setup_toolchain

## Goal

Stabile TS-Toolchain ohne ESM-Loader-Hacks; Frontend via Vite, Backend CJS-Build.

## Acceptance Criteria

- Dev-Start: `pnpm dev` startet Frontend & Backend (watch).
- Backend baut nach `pnpm build` nach `dist/` (CJS).
- Keine Nutzung von `--loader ts-node/esm`.

## Steps

1. Scripts wie in **AGENTS.md §2** einrichten.
2. Backend-`tsconfig.json` auf `module: "CommonJS"`; Aliase `@/*`.
3. `tsup` oder `tsc` für Build; `tsx` für Dev-Watch.
4. Vite-Config belassen; ggf. Pfadalias spiegeln.

## Notes

- Keine JSON-Schemafelder umbenennen. Benennungsregeln beachten.
