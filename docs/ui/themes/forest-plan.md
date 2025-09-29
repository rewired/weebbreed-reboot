# Forest Theme Integration Plan

## Decision Summary

- **Chosen approach:** Factor the DaisyUI "forest" theme into a dedicated module at `src/frontend/src/themes/forest.ts` instead of embedding it directly in `tailwind.config.ts`.
- **Rationale:**
  - Keeps the Tailwind configuration lean and focused on build tooling while the theme data lives alongside other runtime UI assets, allowing React components and feature toggles to consume the same source of truth as the build step.【F:src/frontend/src/themes/forest.ts†L1-L86】
  - The strongly typed export shields both Tailwind and runtime consumers from accidental drift in CSS custom property names, which is harder to enforce when the theme is copied into the config file as an inline literal.【F:src/frontend/src/themes/forest.ts†L1-L86】
  - Consolidating the theme into an importable module mirrors how we already centralize color tokens for the default and `theme-light` schemes inside CSS, keeping future dark/light/forest switches symmetrical and easier to test.【F:src/frontend/src/styles/tokens.css†L1-L33】

## Type & Module Sketch

- `ThemeDefinition`: shared interface that captures the canonical name, color-scheme metadata, activating class name, and DaisyUI-compatible CSS custom properties. Tailwind and any runtime registries can rely on the interface to validate new themes at compile time.【F:src/frontend/src/themes/forest.ts†L33-L56】
- `ForestThemeDefinition`/`forestTheme`: concrete export for the DaisyUI forest palette, including the exact custom properties DaisyUI exposes. The module ships both a named and default export for ergonomic imports (`import { forestTheme } ...` or `import forestTheme ...`).【F:src/frontend/src/themes/forest.ts†L58-L86】
- Tailwind usage: `tailwind.config.ts` can import `{ forestTheme }` and hand its `cssVariables` bag to DaisyUI (or a custom plugin) without suppressing TypeScript warnings. Runtime toggles can reuse `forestTheme.className` to attach the right class to `document.documentElement`.

## Coexistence with Existing Toggles

- The current theme system defaults to the dark palette in `:root` and enables the light palette by toggling the `theme-light` class on `<html>`.【F:src/frontend/src/styles/tokens.css†L1-L33】【F:src/frontend/src/store/ui.ts†L89-L103】
- We will extend the toggle logic to support `theme-forest` by:
  1. Adding a new branch that removes both `theme-light` and `theme-forest` before applying the selected theme, keeping mutual exclusivity explicit.【F:src/frontend/src/store/ui.ts†L89-L103】
  2. Mirroring the CSS variable overrides from `forestTheme.cssVariables` into a `.theme-forest { ... }` block (either generated at build-time or authored once), matching how `.theme-light` is layered today.【F:src/frontend/src/styles/tokens.css†L1-L33】
  3. Ensuring the default (`:root`) remains a dark-first palette so toggling back from forest/light does not require a dedicated class.
- Because `forestTheme` carries both `className` and `colorScheme`, runtime logic can set `document.documentElement.dataset.colorScheme` or adjust `color-scheme` values to align with accessibility requirements when the forest theme is active.

## Next Steps

1. Update `tailwind.config.ts` to import `{ forestTheme }` and hand its `cssVariables` to DaisyUI (or a future Tailwind plugin wrapper).
2. Author the `.theme-forest` CSS overrides using the values in `forestTheme.cssVariables` so that toggling via DOM class mirrors the Tailwind preview.
3. Extend the UI store to register `forestTheme.className` as an available option and persist the user choice alongside existing light/dark state.
