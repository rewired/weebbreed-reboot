# Forest Theme Token → DaisyUI Mapping Plan

This plan documents how the `src/frontend/src/styles/tokens.css` custom properties
back the DaisyUI theme used by the dashboard. Keep this file in sync with any
additions or renames to the token file so downstream implementers can wire the
same schema without spelunking through CSS.

## 1. Token Inventory (`tokens.css`)

### 1.1 Color Tokens

All color tokens are declared as **space–separated RGB tuples** (0–255 per
channel). When referencing them in CSS utilities you must wrap them in
`rgb(var(--token-name) / <alpha-value>)` so Tailwind can inject opacity.

| Custom property            | Purpose (dark mode defaults)         |
| -------------------------- | ------------------------------------ |
| `--color-surface`          | Base app background                  |
| `--color-surface-muted`    | Muted panels / secondary backgrounds |
| `--color-surface-elevated` | Cards, popovers, modal chrome        |
| `--color-border`           | Divider and outline color            |
| `--color-primary`          | Primary brand action                 |
| `--color-primary-strong`   | Primary hover / active emphasis      |
| `--color-accent`           | Secondary accent (success-tinted)    |
| `--color-text`             | High-emphasis copy                   |
| `--color-text-muted`       | Secondary copy / metadata            |
| `--color-success`          | Positive status                      |
| `--color-warning`          | Cautionary status                    |
| `--color-danger`           | Destructive status                   |

> Light theme overrides (`.theme-light { ... }`) provide per-token RGB values
> while keeping the same semantics.

### 1.2 Radius Tokens

Radius tokens are single values (CSS length units). They currently do not vary
between light and dark themes.

| Custom property   | Default value | Intended usage                          |
| ----------------- | ------------- | --------------------------------------- |
| `--radius-box`    | `1rem`        | Cards, dialogs, flyouts (`rounded-box`) |
| `--radius-button` | `0.5rem`      | Buttons and inputs (`rounded-btn`)      |
| `--radius-badge`  | `1.9rem`      | Chips & badges (`rounded-badge`)        |

> Add new `--radius-*` tokens instead of hard-coding radii in components.
> Update this table whenever a new token ships.

### 1.3 Other Shared Tokens

| Custom property   | Default value | Notes                           |
| ----------------- | ------------- | ------------------------------- |
| `--sidebar-width` | `280px`       | Keeps layout gutters consistent |
| `color-scheme`    | `dark\|light` | Declared per theme wrapper      |

## 2. DaisyUI Theme Mapping

Define the DaisyUI theme (`forest`) in `tailwind.config.ts` by pointing every
required key at the appropriate token. Use `rgb(...)` for the RGB tuples above.
If future tokens switch to OKLCH strings, use
`oklch(var(--token-name) / <alpha-value>)` instead.

| DaisyUI theme key | Token source                                      | Formatting guideline                                                                                                              |
| ----------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `base-100`        | `--color-surface`                                 | `rgb(var(--color-surface) / <alpha-value>)`                                                                                       |
| `base-200`        | `--color-surface-muted`                           | `rgb(var(--color-surface-muted) / <alpha-value>)`                                                                                 |
| `base-300`        | `--color-surface-elevated`                        | `rgb(var(--color-surface-elevated) / <alpha-value>)`                                                                              |
| `base-content`    | `--color-text`                                    | `rgb(var(--color-text) / <alpha-value>)`                                                                                          |
| `neutral`         | `--color-border`                                  | `rgb(var(--color-border) / <alpha-value>)`                                                                                        |
| `neutral-content` | `--color-text-muted`                              | `rgb(var(--color-text-muted) / <alpha-value>)`                                                                                    |
| `primary`         | `--color-primary`                                 | `rgb(var(--color-primary) / <alpha-value>)`                                                                                       |
| `primary-focus`   | `--color-primary-strong`                          | `rgb(var(--color-primary-strong) / <alpha-value>)`                                                                                |
| `primary-content` | `--color-surface` (dark) / `--color-text` (light) | Prefer `rgb(var(--color-primary-content, var(--color-surface)) / <alpha-value>)` to allow overrides via `--color-primary-content` |
| `accent`          | `--color-accent`                                  | `rgb(var(--color-accent) / <alpha-value>)`                                                                                        |
| `accent-content`  | `--color-surface`                                 | `rgb(var(--color-surface) / <alpha-value>)`                                                                                       |
| `success`         | `--color-success`                                 | `rgb(var(--color-success) / <alpha-value>)`                                                                                       |
| `warning`         | `--color-warning`                                 | `rgb(var(--color-warning) / <alpha-value>)`                                                                                       |
| `error`           | `--color-danger`                                  | `rgb(var(--color-danger) / <alpha-value>)`                                                                                        |

### 2.1 Handling Mixed Theme Content Colors

For content colors that must differ between dark/light contexts (e.g.
`primary-content`), declare a specific custom property in `tokens.css`:

```css
:root {
  --color-primary-content: 17 24 39;
}

.theme-light {
  --color-primary-content: 17 24 39; /* override if light theme needs different value */
}
```

Then reference it via Tailwind/DaisyUI using the fallback form shown in the
mapping table. This allows future adjustments (like switching to OKLCH) without
rewiring Tailwind config.

## 3. DaisyUI Radius Bridge

Map the radius tokens directly to DaisyUI’s rounded variables inside the theme
configuration or a small plugin:

```ts
const forestTheme = {
  'rounded-box': 'var(--radius-box)',
  'rounded-btn': 'var(--radius-button)',
  'rounded-badge': 'var(--radius-badge)',
};
```

If DaisyUI introduces new rounded keys, create matching `--radius-*` tokens and
append them here.

## 4. Change Management Checklist

1. Add or update the token in `tokens.css`.
2. Record the new token (and format) in the inventory tables above.
3. Update the DaisyUI mapping table and Tailwind configuration.
4. Verify that dark/light theme overrides exist where contrast requires it.
5. Note the change in `CHANGELOG.md` and surface it to the UI team.

# Keeping this loop tight ensures every theme tweak is deterministic and auditable.

# Forest Theme Integration Plan

## Decision Summary

- **Chosen approach:** Factor the DaisyUI "forest" theme into a dedicated module at `src/frontend/src/themes/forest.ts` instead of embedding it directly in `tailwind.config.ts`.
- **Rationale:**
  - Keeps the Tailwind configuration lean and focused on build tooling while the theme data lives alongside other runtime UI assets, allowing React components and feature toggles to consume the same source of truth as the build step.【F:src/frontend/src/themes/forest.ts†L1-L86】
  - The strongly typed export shields both Tailwind and runtime consumers from accidental drift in CSS custom property names, which is harder to enforce when the theme is copied into the config file as an inline literal.【F:src/frontend/src/themes/forest.ts†L1-L86】
- Consolidating the theme into an importable module mirrors how we already centralize color tokens for the default and `theme-light` schemes inside CSS, keeping future dark/light/forest switches symmetrical and easier to test.【F:src/frontend/src/styles/tokens.css†L1-L46】

## Type & Module Sketch

- `ThemeDefinition`: shared interface that captures the canonical name, color-scheme metadata, activating class name, and DaisyUI-compatible CSS custom properties. Tailwind and any runtime registries can rely on the interface to validate new themes at compile time.【F:src/frontend/src/themes/forest.ts†L33-L56】
- `ForestThemeDefinition`/`forestTheme`: concrete export for the DaisyUI forest palette, including the exact custom properties DaisyUI exposes. The module ships both a named and default export for ergonomic imports (`import { forestTheme } ...` or `import forestTheme ...`).【F:src/frontend/src/themes/forest.ts†L58-L86】
- Tailwind usage: `tailwind.config.ts` can import `{ forestTheme }` and hand its `cssVariables` bag to DaisyUI (or a custom plugin) without suppressing TypeScript warnings. Runtime toggles can reuse `forestTheme.className` to attach the right class to `document.documentElement`.

## Coexistence with Existing Toggles

- The current theme system defaults to the dark palette in `:root` and enables the light palette by toggling the `theme-light` class on `<html>`.【F:src/frontend/src/styles/tokens.css†L1-L46】【F:src/frontend/src/store/ui.ts†L89-L109】
- We will extend the toggle logic to support `theme-forest` by:
  1. ✅ Adding a new branch that removes both `theme-light` and `theme-forest` before applying the selected theme, keeping mutual exclusivity explicit.【F:src/frontend/src/store/ui.ts†L89-L109】
  2. ✅ Mirroring the CSS variable overrides from `forestTheme.cssVariables` into a `.theme-forest { ... }` block (either generated at build-time or authored once), matching how `.theme-light` is layered today.【F:src/frontend/src/styles/tokens.css†L1-L46】
  3. Ensuring the default (`:root`) remains a dark-first palette so toggling back from forest/light does not require a dedicated class.
- Because `forestTheme` carries both `className` and `colorScheme`, runtime logic can set `document.documentElement.dataset.colorScheme` or adjust `color-scheme` values to align with accessibility requirements when the forest theme is active.

## Next Steps

1. Update `tailwind.config.ts` to import `{ forestTheme }` and hand its `cssVariables` to DaisyUI (or a future Tailwind plugin wrapper).
2. Author the `.theme-forest` CSS overrides using the values in `forestTheme.cssVariables` so that toggling via DOM class mirrors the Tailwind preview.
3. Extend the UI store to register `forestTheme.className` as an available option and persist the user choice alongside existing light/dark state.
