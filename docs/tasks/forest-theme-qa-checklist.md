# Forest Theme QA Checklist

Use this checklist to verify the finance dashboard after the forest theme rolls out. Focus on visual regressions and token usage for the chart module that now relies on CSS variables instead of hard-coded hex values.

- [ ] **Finance → ProfitChart**
  - [ ] Revenue line renders with the success token color and keeps its 80% opacity overlay.
  - [ ] Expenses line renders with the danger token color and keeps its 80% opacity overlay.
  - [ ] Profit line and fill use the primary token color and remain legible against the muted surface background.
  - [ ] Grid, labels, and growth metric badges remain readable in both default and light theme variants.

Document any visual discrepancies in the QA report so the design system tokens can be updated if required.
