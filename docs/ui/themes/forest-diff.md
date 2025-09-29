# Forest Theme vs Weedbreed Tokens

This document captures the comparison between the DaisyUI **forest** theme export and the existing Weedbreed.AI theme tokens/documentation.

## Sources Reviewed

- DaisyUI forest theme export (`forest-designer.json`).【F:docs/ui/themes/forest-designer.json†L1-L83】
- Current token definitions (`src/frontend/src/styles/tokens.css`).【F:src/frontend/src/styles/tokens.css†L1-L32】
- Documented dark-theme palette expectations (`docs/ui/ui-components-desciption.md`).【F:docs/ui/ui-components-desciption.md†L554-L569】

## Direct Token Overlaps

| Semantic token    | Forest value                | Weedbreed token                               | Alignment                                                                                                   |
| ----------------- | --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `--color-primary` | `#047a17` (deep evergreen)  | `#84cc16` (lime 500)                          | **Conflict:** drastically darker; would shift CTA contrast away from current lime identity. Needs decision. |
| `--color-accent`  | `#037a68` (teal)            | `#22c55e` (emerald)                           | **Conflict:** hue shift from warm green to cool teal may clash with existing success/health cues.           |
| `--color-success` | `#006628`                   | `#16a34a`                                     | **Conflict:** darker saturation; verify accessibility on dark cards.                                        |
| `--color-warning` | `#ff8300`                   | `#ca8a04`                                     | **Conflict:** DaisyUI orange vs current amber. Requires brand direction.                                    |
| `--color-error`   | `#ff191e`                   | `#ef4444`                                     | **Conflict:** DaisyUI error is more neon red; check contrast against modal backgrounds.                     |
| `--color-border`  | `1px` (shared sizing token) | `1px` border thickness implicit in components | **Match:** no change required.                                                                              |
| `color-scheme`    | `dark`                      | `dark`                                        | **Match:** consistent with dark-first approach.                                                             |

> **Follow-up:** Determine whether Weedbreed keeps the lime-first palette (preferred by design docs) or adopts the deeper evergreen from forest. Any adoption must preserve CTA contrast budgets and update light theme mirrors simultaneously.

## Surface & Neutral Colors

- Forest provides `--color-base-100/200/300` ranging from `#030202` to `#010101`, effectively near-black surfaces.【F:docs/ui/themes/forest-designer.json†L6-L24】 Current tokens expect `#111827`, `#1e293b`, and `#2b374d`, which align with Tailwind `stone`/`slate` tones for layered depth.【F:src/frontend/src/styles/tokens.css†L1-L12】【F:docs/ui/ui-components-desciption.md†L554-L569】
  - **Conflict:** Using forest base values would collapse layered elevation cues (cards/sidebars would be almost indistinguishable). Recommend deriving new surface tokens instead of adopting raw forest values.
- Neutral content in forest (`#9ca6a2`) differs from documented muted text/border guidance (`#94a3b8` / `#475569`).【F:docs/ui/themes/forest-designer.json†L34-L39】【F:docs/ui/ui-components-desciption.md†L554-L569】
  - **Follow-up:** Validate readability for secondary copy if adopting forest neutral.

## Text & Content Colors

- Forest sets every `*-content` token to pure black or near-black.【F:docs/ui/themes/forest-designer.json†L16-L83】 Weedbreed tokens rely on light text on dark backgrounds (e.g., `--color-text: #e2e8f0`).【F:src/frontend/src/styles/tokens.css†L7-L12】
  - **Conflict:** Directly applying forest content colors would invert contrast (black text on dark surfaces). The design system must remap `*-content` tokens to Weedbreed text variables or override DaisyUI defaults.

## Radius, Size, and Depth Tokens

- Forest exposes `--radius-selector` (1rem), `--radius-field` (2rem), `--radius-box` (1rem), plus `--size-selector`/`--size-field` (0.25rem).【F:docs/ui/themes/forest-designer.json†L66-L77】 Current Weedbreed tokens do not define radius/size variables; radii come from component-level Tailwind classes documented as `rounded-lg` / `rounded-md`.【F:docs/ui/ui-components-desciption.md†L564-L569】
  - **Missing mapping:** Decide whether to introduce corresponding CSS variables or continue hard-coding radii in components. Without new tokens, these DaisyUI controls will have no effect.
- `--depth` and `--noise` are zeroed in forest.【F:docs/ui/themes/forest-designer.json†L78-L83】 Weedbreed currently simulates depth via semi-transparent overlays (`bg-stone-800/30`) rather than explicit tokens.【F:docs/ui/ui-components-desciption.md†L558-L569】 No immediate action, but note the missing abstraction if the team wants to adopt DaisyUI noise overlays later.

## Missing Weedbreed-Specific Tokens

- Weedbreed defines `--color-surface-muted`, `--color-surface-elevated`, `--color-text`, `--color-text-muted`, `--color-primary-strong`, `--color-danger`, and `--sidebar-width`, none of which exist in the forest export.【F:src/frontend/src/styles/tokens.css†L1-L32】
  - **Follow-up:** Any DaisyUI integration must extend forest with these project-specific variables to avoid regressions (sidebar layout, hover states, text contrasts).
- Forest includes `--color-info`, but Weedbreed lacks a dedicated info token. If adopted, map it to existing informational blue/cyan styles per the component guide to prevent redundant tokens.【F:docs/ui/themes/forest-designer.json†L40-L47】【F:docs/ui/ui-components-desciption.md†L554-L569】

## Summary of Action Items

1. **Palette Alignment:** Confirm whether to keep Weedbreed’s lime-based CTAs or adopt forest’s evergreen palette. Update both dark and light modes consistently.
2. **Surface Recalibration:** Derive new surface values (or retain existing ones) to preserve elevation cues; raw forest surfaces are too close to black.
3. **Text Content Overrides:** Explicitly map DaisyUI `*-content` tokens to Weedbreed text colors to maintain readability.
4. **Token Extensions:** Introduce DaisyUI-compatible tokens for `surface-muted`, `surface-elevated`, `primary-strong`, `danger`, and `sidebar-width`, or document why they remain outside DaisyUI’s scope.
5. **Radius/Spacing Strategy:** Decide whether to adopt DaisyUI radius/size tokens or continue with component-level Tailwind classes; update build guide accordingly.

Addressing these gaps will keep any forest-based skin compatible with the existing Weedbreed UI architecture without sacrificing accessibility or brand cues.
