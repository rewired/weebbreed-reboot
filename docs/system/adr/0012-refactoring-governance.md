# ADR 0012 — Refactoring Governance & Modularisation Thresholds

- **Status:** Accepted (2025-09-29)
- **Owner:** Simulation Platform
- **Context:** Multiple core modules (backend world service, shared models, frontend modal host) have exceeded 1,000 lines and now blend unrelated responsibilities. The lack of explicit thresholds let these god modules grow unchecked, making defects harder to isolate, discouraging reuse, and delaying architectural cleanups that would otherwise have been incremental.

## Decision

- Establish quantitative guardrails for module size and responsibility to trigger a refactoring review:
  - Backend/Frontend source files above **600 lines** or containing **three or more distinct responsibilities** (e.g., state orchestration, schema parsing, UI rendering) must be queued for decomposition.
  - Shared utility modules that introduce **runtime-only dependencies** into pure type/contract layers must be split so type definitions remain dependency-light.
- Require feature and platform teams to document approved refactoring plans in `/docs/tasks/*-refactoring-*.md`, capturing problem statement, goals, and sequencing before code changes land.
- Encourage reuse by default: modal, service, or hook implementations that are consumed in **two or more contexts** must be extracted into dedicated modules (e.g., `components/modals/<feature>/` or `engine/world/<domain>/`).
- Embed refactoring checkpoints into quarterly planning: review modules breaching thresholds, prioritise remediation, and update this ADR if thresholds need adjustment.

## Consequences

- Teams have a clear, documented trigger for when to invest in structural cleanups, reducing ambiguity around "too big" modules.
- Documentation of refactorings becomes a prerequisite, improving knowledge transfer and aligning cross-team expectations.
- Component and service reuse increases because extraction is mandated once a second consumer exists, lowering duplication and divergence.
- Planning cadences explicitly account for refactoring debt, making it harder for oversized modules to persist unnoticed.

## References

- `docs/tasks/20250929-refactoring-roadmap.md`
- `src/backend/src/engine/world/worldService.ts`
- `src/backend/src/state/models.ts`
- `src/frontend/src/components/ModalHost.tsx`
