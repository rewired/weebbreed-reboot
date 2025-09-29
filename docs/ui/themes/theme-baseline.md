# Weedbreed.AI Theme Baseline

This baseline captures the shared naming patterns, palette expectations, and light/dark behaviours that every Weedbreed.AI DaisyUI theme must preserve. It consolidates the guidance from the UI build manual and component descriptions with the current token source so new themes remain compatible with existing Tailwind utilities and semantic color usage.

## Token Naming & Structure

- **CSS custom properties** are defined once under `:root` and re-declared inside `.theme-light`. They follow a `--color-*` prefix that mirrors their semantic role (`surface`, `text-muted`, `primary-strong`, etc.) rather than specific hex names. Future themes should add new tokens rather than renaming existing ones to keep Tailwind utilities working across palettes.【F:src/frontend/src/styles/tokens.css†L1-L32】【F:docs/ui/ui_archictecture.md†L85-L178】
- **Tailwind exposure.** `tailwind.config.ts` maps each custom property to a semantic color (`colors.surface`, `colors.primary`, `colors.success`, …). DaisyUI themes should override the CSS variables, not the Tailwind config, so utility classes like `bg-surface` and `text-warning` stay valid.【F:src/frontend/tailwind.config.ts†L4-L33】
- **Dark-first class toggle.** The application toggles themes by adding or removing `.theme-light` on the root while keeping `darkMode: 'class'`. DaisyUI themes should hook into the same mechanism (apply CSS variables when the theme class is present) to avoid drifting from the existing state handling.【F:src/frontend/src/styles/tokens.css†L1-L32】【F:docs/ui/ui-building_guide.md†L503-L515】

## Palette Tokens

| Token                      | Dark value (`:root`)      | Light value (`.theme-light`) | Usage                                                                                                                                     |
| -------------------------- | ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-surface`          | `17 24 39` (`#111827`)    | `248 250 252` (`#f8fafc`)    | Base app background / body fill.【F:src/frontend/src/styles/tokens.css†L1-L31】【F:docs/ui/ui-components-desciption.md†L554-L563】        |
| `--color-surface-muted`    | `30 41 59` (`#1e293b`)    | `241 245 249` (`#f1f5f9`)    | Muted panels, sidebar, drawers.【F:src/frontend/src/styles/tokens.css†L3-L31】                                                            |
| `--color-surface-elevated` | `43 55 77` (`#2b374d`)    | `226 232 240` (`#e2e8f0`)    | Raised cards, modal bodies.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-components-desciption.md†L561-L569】             |
| `--color-border`           | `71 85 105` (`#475569`)   | `203 213 225` (`#cbd5e1`)    | Card outlines, grid dividers.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-components-desciption.md†L561-L569】           |
| `--color-text`             | `226 232 240` (`#e2e8f0`) | `17 24 39` (`#111827`)       | Primary copy, key metrics.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-building_guide.md†L505-L515】                     |
| `--color-text-muted`       | `148 163 184` (`#94a3b8`) | `71 85 105` (`#475569`)      | Secondary labels, helper text.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-building_guide.md†L505-L515】                 |
| `--color-primary`          | `132 204 22` (`#84cc16`)  | `132 204 22` (`#84cc16`)     | Primary CTAs, active speed buttons.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-building_guide.md†L503-L515】            |
| `--color-primary-strong`   | `101 163 13` (`#65a30d`)  | `101 163 13` (`#65a30d`)     | Primary hover, focus rings.【F:src/frontend/src/styles/tokens.css†L3-L31】                                                                |
| `--color-accent`           | `34 197 94` (`#22c55e`)   | `34 197 94` (`#22c55e`)      | Positive emphasis (e.g., yield badges).【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-components-desciption.md†L554-L569】 |
| `--color-success`          | `22 163 74` (`#16a34a`)   | `21 128 61` (`#15803d`)      | Success toasts, device-ok states.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-building_guide.md†L508-L515】              |
| `--color-warning`          | `202 138 4` (`#ca8a04`)   | `217 119 6` (`#d97706`)      | Warning banners, VPD cautions.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-building_guide.md†L508-L515】                 |
| `--color-danger`           | `239 68 68` (`#ef4444`)   | `220 38 38` (`#dc2626`)      | Error states, failed intents.【F:src/frontend/src/styles/tokens.css†L3-L31】【F:docs/ui/ui-building_guide.md†L508-L515】                  |

## Dark Theme Expectations

- Dark mode is the **primary presentation**, anchored in Tailwind’s `stone` palette with lime accents. Cards use semi-transparent overlays (`bg-stone-800/30`) to create depth while respecting the shared surface tokens. New DaisyUI themes should preserve this layered appearance even if hues shift.【F:docs/ui/ui-components-desciption.md†L554-L569】【F:docs/ui/ui-building_guide.md†L503-L509】
- Typography relies on Inter with utility-driven heading styles (`text-3xl font-bold`, etc.). Themes must keep high contrast between `--color-text` and surfaces and avoid overriding font utilities so accessibility budgets remain intact.【F:docs/ui/ui-components-desciption.md†L570-L607】
- Status colors (success/warning/danger/info) appear in charts, device badges, and notifications; they need to stay visually distinct from `--color-primary` to prevent confusing uptime with actionable alerts.【F:docs/ui/ui-components-desciption.md†L564-L568】【F:docs/ui/ui-building_guide.md†L508-L515】

## Light Theme Guidance

- Light mode mirrors the dark theme semantics: white surfaces, slate borders, and the same lime primary. DaisyUI variants must provide the same contrast ratios by reusing the variable names instead of introducing separate Tailwind classes.【F:docs/ui/ui-building_guide.md†L510-L515】【F:src/frontend/src/styles/tokens.css†L18-L31】
- Buttons, cards, and modal shells keep identical padding, focus rings, and hover behaviours. Only the colors swap according to the tokens, so review the shared snippets in the build guide before adjusting component styles.【F:docs/ui/ui-building_guide.md†L517-L559】【F:docs/ui/ui-components-desciption.md†L575-L607】

## Implementation Checklist for New DaisyUI Themes

1. **Set CSS variables** for your palette on the root theme class (e.g., `.theme-myvariant`) using the `--color-*` names above. Apply `color-scheme` to assist native form controls.【F:src/frontend/src/styles/tokens.css†L1-L31】
2. **Inherit Tailwind utilities** by keeping `tailwind.config.ts` untouched; DaisyUI `theme` entries should read from the same CSS variables so components styled with `bg-surface`, `text-muted`, etc., stay aligned.【F:src/frontend/tailwind.config.ts†L4-L33】
3. **Validate contrast** for key surfaces, text, and status accents against AA targets outlined in the build guide. The baseline uses lime-600 for primary actions and ensures warnings/errors are never mistaken for success states.【F:docs/ui/ui-building_guide.md†L505-L515】【F:docs/ui/ui-components-desciption.md†L554-L569】
4. **Test both modes** (dark default, light opt-in) with the screenshot-driven flows—dashboard cards, zone detail, modal host—to confirm overlays, focus outlines, and banners inherit the updated tokens correctly.【F:docs/ui/ui-building_guide.md†L503-L559】

Following this checklist keeps DaisyUI themes interoperable with the existing Weedbreed.AI UI contracts while leaving room for brand-specific palettes.
