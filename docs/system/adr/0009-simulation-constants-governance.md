# ADR 0009 — Simulation Constant Governance & Documentation Loop

- **Status:** Accepted (2025-09-26)
- **Owner:** Simulation Platform
- **Context:** Canonical definition, review, and documentation of simulation constants

## Context

Simulation constants (environmental coefficients, physiology clamps, balance
factors, etc.) have accumulated across the backend in ad-hoc modules while their
narrative explanations live under `docs/constants/**`. Contributors have been
adding new tunables in whichever module happened to be nearby, occasionally
duplicating values, misaligning units, or forgetting to update the public
reference docs. As the physiology and economic models become more modular, the
lack of a single stewardship workflow risks drift between the runtime behaviour
and the documentation relied on by designers and QA.

## Decision

- Declare `src/backend/src/constants/` as the sole source of truth for
  simulation-wide constants that are intended for tuning or cross-module reuse.
- Require each exported constant to carry an inline JSDoc summary that mirrors
  and links to its documentation entry.
- Pair every constant change with an update to the corresponding page under
  `docs/constants/`, ensuring the prose remains synchronized with the code.
- Introduce a lightweight review checklist for pull requests that touch
  simulation constants, covering location, naming, documentation, and tests when
  applicable.

## Scope

- **In scope:** Physical/environmental coefficients, physiology tunables,
  balance knobs, and any other values surfaced to simulation designers via JSON
  or documentation.
- **Out of scope:** One-off helper constants scoped to a single module (retain
  them in place) and frontend-only presentation constants.
- **Stakeholders:** Simulation platform engineers, gameplay engineers, QA, and
  tuning/design staff who rely on documented constants.

## Consequences

- Centralizing constants reduces duplication and provides predictable discovery
  for new contributors, reinforcing determinism and replaceability targets.
- JSDoc + documentation pairing keeps designers and engineers aligned on the
  intent and acceptable ranges of tunables, lowering onboarding overhead.
- The review checklist formalizes stewardship expectations, enabling QA to audit
  constant changes and catch unsynchronized updates before release.
- Future tooling (lint rules, doc generators) can target the shared constants
  directory to automate drift detection.

## References

- `docs/constants/*`
- Simulation Platform Coding Standards (`AGENTS.md`)
