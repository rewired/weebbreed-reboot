# UI Screenshot Insights

## Overview of the Frontend Idea

The screenshots convey a dashboard-style application that guides the player from high-level operations down to per-plant decisions through a clear Structure → Room → Zone drill-down. Global navigation relies on cards and inline actions to jump between these hierarchy levels while providing immediate CRUD affordances for each tier.【F:docs/ui/ui-components-desciption.md†L483-L525】【F:docs/ui/ui_interactions_spec.md†L27-L37】 Zone views then compose telemetry, device management, and plant operations into a single control surface, matching the micro-loop described in the interaction spec.【F:docs/ui/ui-components-desciption.md†L407-L533】【F:docs/ui/ui_interactions_spec.md†L40-L54】

## Game Lifecycle Surfaces

The welcome screen foregrounds the StartScreen component with quick entry points for New, Quick, and Import game flows, reflecting the lifecycle actions in the façade contract.【F:docs/ui/ui-components-desciption.md†L393-L399】【F:docs/ui/ui_interactions_spec.md†L13-L23】 Selecting “New Game” opens a dedicated modal that captures company metadata and a deterministic seed using shared modal and form primitives, reinforcing that modal workflows pause gameplay until the façade acknowledges the command.【F:docs/ui/ui-components-desciption.md†L347-L353】【F:docs/ui/ui-components-desciption.md†L123-L178】

## Strategic Management Views

The structure overview leans on DashboardView cards with inline rename/duplicate buttons, enabling fast adjustments while encouraging the user to descend into specific rooms or zones without leaving the main context.【F:docs/ui/ui-components-desciption.md†L483-L487】【F:docs/ui/ui-components-desciption.md†L95-L165】 Structure and room detail views then reuse ZoneCard summaries so that geometry, duplication, and deletion actions stay one click away, aligning with the macro infrastructure flows for renting, cloning, or removing spaces.【F:docs/ui/ui-components-desciption.md†L513-L525】【F:docs/ui/ui_interactions_spec.md†L27-L36】

## Operations, Personnel, and Finance Loops

Within a zone, the screenshots highlight the layered EnvironmentPanel (collapsed vs. expanded), device lists, and the ZonePlantPanel’s batch-selection mode. This trio encapsulates monitoring, setpoint control, and multi-plant actions that the cultivation loop depends on.【F:docs/ui/ui-components-desciption.md†L407-L462】【F:docs/ui/ui_interactions_spec.md†L40-L54】 Complementary strategic views such as PersonnelView and FinanceView expose their respective loops via tabbed candidate/staff management and collapsible revenue/expense reports, mirroring the hiring and finance stories from the spec.【F:docs/ui/ui-components-desciption.md†L490-L509】【F:docs/ui/ui_interactions_spec.md†L58-L73】

## Interaction & Visual Patterns

Every modal in the screenshots—including the game menu and hiring/new game flows—reuses the shared Modal shell, Form inputs, and Primary buttons, underscoring a consistent command pattern for façade intents.【F:docs/ui/ui-components-desciption.md†L123-L178】【F:docs/ui/ui-components-desciption.md†L323-L337】 The dark Tailwind-based design system (stone background, lime accents) gives all cards and panels a cohesive appearance, reinforcing that gameplay relies on high-contrast status colors for quick scanning.【F:docs/ui/ui-components-desciption.md†L551-L574】 Together, these patterns show that the UI concept emphasizes deterministic flows, reusable components, and a layered information hierarchy that mirrors the simulation architecture.
