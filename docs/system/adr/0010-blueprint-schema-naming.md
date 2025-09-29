# ADR 0010 — Blueprint Schema Naming Alignment

- **Status:** Accepted (2025-10-03)
- **Owner:** Simulation Platform
- **Context:** Naming consistency for substrate/container blueprint schemas

## Context

The blueprint loader recently introduced dedicated substrate and container
schemas to replace inline validation. The files were initially published as
`substrateBlueprintSchema.ts` and `containerBlueprintSchema.ts`, exporting
`substrateBlueprintSchema` and `containerBlueprintSchema` constants. While this
mirrored the historic "Blueprint" naming of the JSON data, it broke the
convention used elsewhere in `@/data/schemas` where schema modules export a
`<resource>Schema` symbol (for example `strainSchema`, `deviceSchema`, and
`roomPurposeSchema`). The inconsistency caused import ordering drift in
`@/data/dataLoader` and increased the risk of duplicate re-exports as future
contributors add schema helpers.

## Decision

- Rename the modules to `substrateSchema.ts` and `containerSchema.ts` and export
  `substrateSchema` / `containerSchema` constants to match the folder’s naming
  conventions.
- Retain the public type aliases `SubstrateBlueprint` and `ContainerBlueprint`
  so downstream code continues to consume blueprint-shaped data without churn.
- Update imports and barrel re-exports in
  `src/backend/src/data/dataLoader.ts` and
  `src/backend/src/data/schemas/index.ts` to reference the new module names,
  keeping downstream type-only consumers (for example
  `src/backend/src/testing/fixtures.ts`) unchanged.

## Consequences

- Schema imports across the backend now follow a single `<resource>Schema`
  convention, improving readability and searchability for contributors.
- Blueprint type names remain unchanged, so no blueprint JSON files or tests
  require adjustments beyond the schema references.
- Future schema additions can reuse the established naming pattern without
  special casing the substrate and container modules.

## References

- `src/backend/src/data/schemas/substrateSchema.ts`
- `src/backend/src/data/schemas/containerSchema.ts`
- `src/backend/src/data/dataLoader.ts`
- `src/backend/src/data/schemas/index.ts`
- `src/backend/src/testing/fixtures.ts`
