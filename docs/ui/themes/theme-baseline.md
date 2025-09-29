# Weedbreed.AI Theme Baseline

This baseline captures the shared naming patterns, palette expectations, and light/dark behaviours that every Weedbreed.AI DaisyUI theme must preserve. It consolidates the guidance from the UI build manual and component descriptions with the current token source so new themes remain compatible with existing Tailwind utilities and semantic color usage.

## Token Naming & Structure

- **CSS custom properties** are defined once under `:root` and re-declared inside `.theme-light` / `.theme-forest`. They follow a `--color-*` prefix that mirrors their semantic role (`surface`, `text-muted`, `primary-strong`, etc.) rather than specific hex names. Future themes should add new tokens rather than renaming existing ones to keep Tailwind utilities working across palettes.【F:src/frontend/src/styles/tokens.css†L1-L46】【F:docs/ui/ui_archictecture.md†L85-L178】
- **Tailwind exposure.** `tailwind.config.ts` maps each custom property to a semantic color (`colors.surface`, `colors.primary`, `colors.success`, …). DaisyUI themes should override the CSS variables, not the Tailwind config, so utility classes like `bg-surface` and `text-warning` stay valid.【F:src/frontend/tailwind.config.ts†L4-L33】
- **Dark-first class toggle.** The application toggles themes by adding or removing `.theme-light` on the root while keeping `darkMode: 'class'`. DaisyUI themes should hook into the same mechanism (apply CSS variables when the theme class is present) to avoid drifting from the existing state handling.【F:src/frontend/src/styles/tokens.css†L1-L46】【F:docs/ui/ui-building_guide.md†L503-L515】

## Palette Tokens

| Token                      | Dark value (`:root`)      | Light value (`.theme-light`) | Usage                                                                                                                                     |
| -------------------------- | ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-surface`          | `7 20 15` (`#07140f`)     | `242 251 246` (`#f2fbf6`)    | Base app background / body fill.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/ui-components-desciption.md†L554-L569】        |
| `--color-surface-muted`    | `13 33 25` (`#0d2119`)    | `223 243 232` (`#dff3e8`)    | Muted panels, sidebar, drawers.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                            |
| `--color-surface-elevated` | `20 48 38` (`#143026`)    | `203 232 219` (`#cbe8db`)    | Raised cards, modal bodies.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/ui-components-desciption.md†L561-L569】             |
| `--color-border`           | `39 85 71` (`#275547`)    | `129 169 150` (`#81a996`)    | Card outlines, grid dividers.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/ui-components-desciption.md†L561-L569】           |
| `--color-text`             | `233 247 239` (`#e9f7ef`) | `5 32 21` (`#052015`)        | Primary copy, key metrics.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】                      |
| `--color-text-muted`       | `156 166 162` (`#9ca6a2`) | `60 84 74` (`#3c544a`)       | Secondary labels, helper text.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】                  |
| `--color-primary`          | `4 122 23` (`#047a17`)    | `4 122 23` (`#047a17`)       | Primary CTAs, active speed buttons.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】             |
| `--color-primary-strong`   | `3 99 18` (`#036312`)     | `3 99 18` (`#036312`)        | Primary hover, focus rings.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                                |
| `--color-accent`           | `3 122 69` (`#037a45`)    | `15 157 88` (`#0f9d58`)      | Positive emphasis (e.g., yield badges).【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/ui-components-desciption.md†L554-L569】 |
| `--color-success`          | `15 157 88` (`#0f9d58`)   | `11 125 77` (`#0b7d4d`)      | Success toasts, device-ok states.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】               |
| `--color-warning`          | `255 131 0` (`#ff8300`)   | `217 119 6` (`#d97706`)      | Warning banners, VPD cautions.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】                  |
| `--color-danger`           | `255 25 30` (`#ff191e`)   | `220 38 38` (`#dc2626`)      | Error states, failed intents.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】                   |

## Dark Theme Expectations

- Dark mode is the **primary presentation**, anchored in the forest evergreen palette with layered moss-toned surfaces. Cards use subtle transparency overlays (`bg-stone-800/30`) to maintain depth while respecting the shared surface tokens, so new DaisyUI themes should preserve this layered appearance even when hues shift.【F:docs/ui/ui-components-desciption.md†L554-L569】【F:docs/ui/themes/forest-diff.md†L5-L83】
- Typography relies on Inter with utility-driven heading styles (`text-3xl font-bold`, etc.). Themes must keep high contrast between `--color-text` and surfaces and avoid overriding font utilities so accessibility budgets remain intact.【F:docs/ui/ui-components-desciption.md†L570-L607】
- Status colors (success/warning/danger/info) appear in charts, device badges, and notifications; they need to stay visually distinct from `--color-primary` to prevent confusing uptime with actionable alerts.【F:docs/ui/ui-components-desciption.md†L564-L568】【F:docs/ui/ui-building_guide.md†L508-L515】

## Light Theme Guidance

- Light mode mirrors the dark theme semantics with misted evergreen neutrals, softer borders, and the same evergreen primary. DaisyUI variants must provide the same contrast ratios by reusing the variable names instead of introducing separate Tailwind classes.【F:src/frontend/src/styles/tokens.css†L24-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】
- Buttons, cards, and modal shells keep identical padding, focus rings, and hover behaviours. Only the colors swap according to the tokens, so review the shared snippets in the build guide before adjusting component styles.【F:docs/ui/ui-building_guide.md†L517-L559】【F:docs/ui/ui-components-desciption.md†L575-L607】

## Implementation Checklist for New DaisyUI Themes

1. **Set CSS variables** for your palette on the root theme class (e.g., `.theme-myvariant`) using the `--color-*` names above. Apply `color-scheme` to assist native form controls.【F:src/frontend/src/styles/tokens.css†L1-L46】
2. **Inherit Tailwind utilities** by keeping `tailwind.config.ts` untouched; DaisyUI `theme` entries should read from the same CSS variables so components styled with `bg-surface`, `text-muted`, etc., stay aligned.【F:src/frontend/tailwind.config.ts†L4-L33】
3. **Validate contrast** for key surfaces, text, and status accents against AA targets outlined in the build guide. The baseline now uses evergreen primaries with amber/orange warnings and saturated red danger tones; keep them visually distinct from success cues.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/ui-components-desciption.md†L554-L569】
4. **Test both modes** (dark default, light opt-in) with the screenshot-driven flows—dashboard cards, zone detail, modal host—to confirm overlays, focus outlines, and banners inherit the updated tokens correctly.【F:docs/ui/ui-building_guide.md†L503-L559】

Following this checklist keeps DaisyUI themes interoperable with the existing Weedbreed.AI UI contracts while leaving room for brand-specific palettes.
