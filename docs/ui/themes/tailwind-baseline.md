# Tailwind Baseline Theme Notes

- **Tailwind config** – `src/frontend/tailwind.config.ts` keeps `darkMode: 'class'` and ships an empty `plugins` array, so utilities come from core Tailwind only (no DaisyUI).
- **PostCSS** – `src/frontend/postcss.config.cjs` loads `tailwindcss` and `autoprefixer` without any DaisyUI preset wiring.
- **Theme toggling** – `src/frontend/src/styles/tokens.css` defines the default dark palette on `:root` and a `.theme-light` override. Switching the class on the root element flips palettes while Tailwind reads the CSS variables through configured color tokens.
- **Custom tokens** – The shared color tokens (`--color-surface`, `--color-text`, etc.) and layout token (`--sidebar-width`) feed both Tailwind (`theme.extend.colors`) and global styles (`src/frontend/src/index.css`).
