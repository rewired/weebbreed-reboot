# Forest Theme vs Weedbreed Tokens

This document captures the comparison between the DaisyUI **forest** theme export and the existing Weedbreed.AI theme tokens/documentation.

## Sources Reviewed

- DaisyUI forest theme export (`forest-designer.json`).【F:docs/ui/themes/forest-designer.json†L1-L83】
- Current token definitions (`src/frontend/src/styles/tokens.css`).【F:src/frontend/src/styles/tokens.css†L1-L50】
- Documented dark-theme palette expectations (`docs/ui/ui-components-desciption.md`).【F:docs/ui/ui-components-desciption.md†L554-L569】

## Direct Token Overlaps

| Semantic token    | Forest value                | Weedbreed token                      | Alignment                                                                                                                                                                                            |
| ----------------- | --------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-primary` | `#047a17` (deep evergreen)  | `#047a17` (adopted)                  | **Resolved:** Tokens now ship the evergreen CTA hue; contrast validated for buttons and focus outlines.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/theme-baseline.md†L12-L34】 |
| `--color-accent`  | `#037a68` (teal)            | `#037a45` (balanced teal-green)      | **Resolved:** Accent leans teal but remains distinct from success tokens after palette refresh.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                       |
| `--color-success` | `#006628`                   | `#0f9d58` (dark) / `#0b7d4d` (light) | **Resolved:** Success colors darkened to match forest cues while preserving AA contrast on cards.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                     |
| `--color-warning` | `#ff8300`                   | `#ff8300` (dark) / `#d97706` (light) | **Resolved:** Adopted DaisyUI orange for dark mode with curated light-mode mirror.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                                    |
| `--color-error`   | `#ff191e`                   | `#ff191e` (dark) / `#dc2626` (light) | **Resolved:** Retained vibrant red for alerts; light mode keeps accessible crimson fallback.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                          |
| `--color-border`  | `1px` (shared sizing token) | `#275547` border tone (1px width)    | **Resolved:** Borders now use an evergreen-neutral while keeping component thickness semantics.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                       |
| `color-scheme`    | `dark`                      | `dark`                               | **Match:** consistent with dark-first approach.【F:src/frontend/src/styles/tokens.css†L1-L38】                                                                                                       |

> **Resolution:** Weedbreed adopted the evergreen-forward palette and mirrored it across dark/light tokens, preserving CTA and status contrast budgets documented in the build guide.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/theme-baseline.md†L12-L48】

## Surface & Neutral Colors

- Forest provides `--color-base-100/200/300` ranging from `#030202` to `#010101`, effectively near-black surfaces.【F:docs/ui/themes/forest-designer.json†L6-L24】 Weedbreed derived moss-toned surfaces (`#07140f`, `#0d2119`, `#143026`) to preserve elevation cues while keeping the forest hue family.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/theme-baseline.md†L12-L21】
- Neutral content in forest (`#9ca6a2`) informed the refreshed muted text (`#9ca6a2` dark / `#3c544a` light), maintaining readability on both palettes.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/theme-baseline.md†L17-L23】

## Text & Content Colors

- Forest sets every `*-content` token to pure black or near-black.【F:docs/ui/themes/forest-designer.json†L16-L83】 Weedbreed keeps high-emphasis copy as light-on-dark (`#e9f7ef`) and dark-on-light (`#052015`), exposing them through `--color-text` and `--color-text-muted` overrides consumed by DaisyUI mappings.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L10-L44】

## Radius, Size, and Depth Tokens

- Forest exposes `--radius-selector` (1rem), `--radius-field` (2rem), `--radius-box` (1rem), plus `--size-selector`/`--size-field` (0.25rem).【F:docs/ui/themes/forest-designer.json†L66-L77】 Weedbreed continues to drive radii from shared `--radius-*` tokens, keeping component-level classes aligned while DaisyUI hooks inherit the same values.【F:src/frontend/src/styles/tokens.css†L1-L38】【F:docs/ui/themes/forest-plan.md†L46-L77】
- `--depth` and `--noise` are zeroed in forest.【F:docs/ui/themes/forest-designer.json†L78-L83】 Weedbreed currently simulates depth via semi-transparent overlays (`bg-stone-800/30`) rather than explicit tokens.【F:docs/ui/ui-components-desciption.md†L558-L569】 No immediate action, but note the missing abstraction if the team wants to adopt DaisyUI noise overlays later.

## Missing Weedbreed-Specific Tokens

- Weedbreed defines `--color-surface-muted`, `--color-surface-elevated`, `--color-text`, `--color-text-muted`, `--color-primary-strong`, `--color-danger`, and `--sidebar-width`, none of which exist in the forest export.【F:src/frontend/src/styles/tokens.css†L1-L38】 All tokens now carry forest-coherent values across dark, light, and `.theme-forest` overrides to avoid regressions when DaisyUI toggles themes.【F:src/frontend/src/styles/tokens.css†L1-L46】【F:docs/ui/themes/theme-baseline.md†L9-L48】
- Forest includes `--color-info`, but Weedbreed still omits a dedicated info token. Continue mapping info states to cyan/blue utilities until a shared token is introduced.【F:docs/ui/themes/forest-designer.json†L40-L47】【F:docs/ui/ui-components-desciption.md†L554-L569】

## Summary of Action Items

1. **Palette Alignment:** ✅ Adopted evergreen CTA and accent palette across tokens.
2. **Surface Recalibration:** ✅ Custom moss surfaces provide elevation cues without collapsing depth.
3. **Text Content Overrides:** ✅ DaisyUI content tokens map to refreshed text variables for readability.
4. **Token Extensions:** ✅ Forest theme now inherits Weedbreed-specific tokens (`surface-muted`, `surface-elevated`, `primary-strong`, `danger`, `sidebar-width`).
5. **Radius/Spacing Strategy:** 🔄 Continue mirroring radius tokens; revisit if DaisyUI adds new knobs.

Addressing these gaps will keep any forest-based skin compatible with the existing Weedbreed UI architecture without sacrificing accessibility or brand cues.
