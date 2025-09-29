# ADR 0011 — Cultivation Setup UI Consolidation

- **Status:** Accepted (2025-09-29)
- **Owner:** Simulation Platform
- **Context:** The `CreateZoneModal` and `ChangeZoneMethodModal` dialogs both rendered
  cultivation method, container, and substrate selectors alongside capacity checks and
  cost summaries. Each modal carried bespoke state wiring for catalog loading,
  compatibility filtering, container counting, and price math. The duplication caused
  the "Change method" dialog to drift visually from "Add zone" and made catalog or
  capacity tweaks error prone because they required touching two divergent codepaths
  plus separate tests.

## Decision

- Extract a shared `useCultivationSetup` hook that ingests catalog snapshots,
  available area, and initial selections to derive filtered method/container/substrate
  options, container capacity, substrate volume, and cost totals while surfacing a
  normalized state bag for UI rendering.
- Introduce a `CultivationSetupSection` component that receives the hook state and
  renders the normalized selectors, area field (with optional "Max" helper),
  container count input, and cost breakdown. Labels, helper copy, and capacity
  messages remain customizable so host modals can adjust tone without forking the
  layout.
- Update `CreateZoneModal` to render the shared section below the zone-name field and
  delegate catalog/area/capacity logic to the hook, keeping submission validation and
  intent dispatch localized to the modal.
- Update `ChangeZoneMethodModal` to reuse the shared hook/section while preserving its
  current-setup summary, storage handoff confirmation, and warning surfaces. The modal
  now passes zone-specific defaults (existing container count, non-editable area) into
  the shared hook instead of duplicating compatibility rules.
- Refresh React Testing Library suites to cover the shared workflow (capacity clamps,
  storage handoff) through the change-method modal and keep the `ModalHost` create-zone
  regression tests green.

## Consequences

- Cultivation setup UI and logic now live in one place, ensuring both dialogs stay
  visually aligned and reducing the risk of catalog or pricing regressions.
- Future features (e.g., method hints, pricing tweaks) can be implemented once in the
  shared hook/section and immediately benefit both modals.
- The shared hook centralizes catalog status handling, so catalog-loading edge cases
  no longer require redundant defensive code in each modal.

## References

- `src/frontend/src/components/modals/zones/CultivationSetupSection.tsx`
- `src/frontend/src/components/modals/zones/CreateZoneModal.tsx`
- `src/frontend/src/components/modals/zones/ChangeZoneMethodModal.tsx`
- `src/frontend/src/components/modals/__tests__/ChangeZoneMethodModal.test.tsx`
- `docs/ui/ui-components-desciption.md`
