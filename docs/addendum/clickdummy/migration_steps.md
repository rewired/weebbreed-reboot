## Inventory

| Area                          | What’s in the clickdummy                                                                                                                                                                                                                                                                                                             | Recommended target placement in `src/frontend/src`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout shell & navigation     | Simulation header with play/speed controls, global stats, view tabs; sidebar tree for structures/rooms/zones; breadcrumb trail; event ticker; inline renaming widgets and icon buttons.\:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation | Fold navigation and status controls into the design-system primitives already living under `components/` (e.g., extend `DashboardHeader`, `Navigation`, `TimeDisplay`).\:codex-file-citation:codex-file-citationSidebar hierarchy and breadcrumbs belong with the world/zone navigation slice (likely `views/world` or a new `views/structures` module) so they can bind to Zustand selection state. Event log can hydrate from the existing game store and live beside `components/TimeDisplay`. |
| Structure/room overview views | Structures dashboard cards, structure detail with room summaries, room detail with zone cards, plus top-level dispatcher that swaps between dashboard/personnel/finance/zone views.\:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation                                                                 | Reconcile with the real “overview/world” route implementations in `views/DashboardOverview.tsx` and `views/ZoneDetail.tsx`, augmenting them with structure/room drill-downs and reusing shared cards/panels for consistency.\:codex-file-citation:codex-file-citation Shared cards (e.g., zone tiles) should live under `components/cards` (new subfolder) to stay composable.                                                                                                                    |
| Zone simulation panels        | Collapsible environment controls, plant grid with batch actions, device list, wrapped by `ZoneDetailView`.\:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation                                                                                                                                          | Merge functionality into the richer zone analytics page already defined in `views/ZoneDetail.tsx`, adding control widgets and batch actions while wiring to real telemetry and command dispatch (store selectors & intent handlers).\:codex-file-citation Control widgets should become reusable `components/forms` pieces for setpoints.                                                                                                                                                         |
| Personnel & job market        | Job market cards, staff roster with morale bars, hire/fire flows and modal integration.\:codex-file-citation:codex-file-citation                                                                                                                                                                                                     | Enrich the existing personnel dashboard by mapping applicant/employee presentation from the clickdummy onto the live store-backed `views/PersonnelView.tsx`, reusing shared metric/tile components and hooking hire/fire actions into `usePersonnelStore`.\:codex-file-citation Modals should mount through the app modal slice for consistency.                                                                                                                                                  |
| Finance dashboard             | Revenue/expense summary cards, collapsible lists, time-range toggles within `FinanceView`.\:codex-file-citation                                                                                                                                                                                                                      | Blend with `views/FinancesView.tsx`, lifting useful UX (time-range switcher, breakdown lists) while keeping charting and data derived from `financeHistory` in the zone store.\:codex-file-citation Shared breakdown widgets belong in `components/panels` for reuse.                                                                                                                                                                                                                             |
| Modal workflows               | CRUD modals for rooms/zones/devices, plant detail, rent structure, duplicate flows, game menu, deletion confirmation.\:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation                                                                                       | Implement as typed modal descriptors in the existing modal slice (`store`), rendering via the shared `Modal` component and colocating modal bodies with their owning views (e.g., `views/ZoneDetail/modals`). Maintain deterministic payloads for seeded fixtures.                                                                                                                                                                                                                                |
| Shared UI primitives          | Buttons, form controls, stat cards, icon wrappers used across views.\:codex-file-citation:codex-file-citation:codex-file-citation:codex-file-citation                                                                                                                                                                                | Map to the design tokens/components already in `components/` (Card, Panel, ToggleSwitch, Tabs) to avoid duplicating primitives; any missing pieces (e.g., inline edit) should live in `components/inputs`. Align icon usage with the project’s icon strategy instead of ad-hoc Material glyphs.\:codex-file-citation:codex-file-citation                                                                                                                                                          |
| Data fixtures & RNG helpers   | Deterministic mock data factory (`initialMockData`, `generateCandidates`, `createPlant`), constants for job roles and device costs, seeded RNG and incremental IDs.\:codex-file-citation:codex-file-citation:codex-file-citation                                                                                                     | Relocate into a dedicated `fixtures/` (or `mocks/`) module under the frontend package to power offline previews/tests, replacing `deterministicUuid` with the project’s seeded ID utilities (or a new deterministic helper shared via `store/utils`). Fixtures should emit objects that satisfy `SimulationSnapshot`/store hydration types.                                                                                                                                                       |
| Utility helpers               | Structure/room/zone lookup helpers, aggregate yield/progress calculators.\:codex-file-citation                                                                                                                                                                                                                                       | Recast as selector helpers within the Zustand stores (`store/selectors.ts`) or colocated utility modules so they operate on normalized snapshot data and can be unit tested with real types.                                                                                                                                                                                                                                                                                                      |
## Data shape gaps vs PRD

1. GameData.globalStats exposes stringly-typed time and water metrics, whereas the dashboard contracts expect SimulationSnapshot.clock with numeric ticks and SI units (time status already modeled in stores).
2. Structure/room definitions omit required PRD fields (status, rent per tick, volumes, purpose metadata) found in StructureSnapshot/RoomSnapshot, so the migration must enrich fixtures with geometry and lifecycle attributes.
3. Zone records use local controls and KPI arrays with string values (e.g., humidity 52%) while the real schema expects normalized environment floats (0–1 relative humidity) and rolling metrics. Conversions and missing fields like volume, lighting, resources, health must be filled in or derived.
4. Plant objects rely on name/progress/harvestable while the PRD mandates strain IDs, stages, biomass, and linkage to structure/room IDs (PlantSnapshot).
5. Devices only expose name/type; backend contracts require blueprintId, kind, status, maintenance metrics, and settings payloads.
6. Personnel and candidate records lack morale/energy, salary-per-tick units, and optional seeds/gender present in PersonnelSnapshot types; salary semantics should switch from annual numbers to per-tick values.
7. Finance mock data summarizes “7d” figures and ad-hoc breakdowns rather than the tick-based FinanceSummarySnapshot and FinanceTickEntry history consumed by the live finance dashboard.

## Non-determinism & global state to replace

 1. SeededRandom is instantiated once at module scope; repeated calls mutate internal state and the global idCounter for deterministicUuid, meaning fixture generation order changes outputs. Swap for explicit seed management tied to store hydration or shared deterministic helpers.

2. App.tsx keeps the entire simulation in React component state and mutates copies with JSON.parse(JSON.stringify(...)), which breaks determinism and bypasses the established Zustand slices (useGameStore, useZoneStore, etc.). Migration should funnel all state changes through the existing stores and intents to stay in sync with PRD expectations.

## Migration backlog

1. Define fixture-to-snapshot translator – Map initialMockData into SimulationSnapshot/store slices so clickdummy content can hydrate the Zustand stores without breaking type guarantees; normalize units and add missing PRD fields in this step.

2. Introduce deterministic helper module – Replace deterministicUuid/module-global RNG with a seeded helper integrated into store/utils, ensuring repeatable fixture generation and aligning with backend seeds.

3. Refactor layout shell – Extend App.tsx to render the real header/navigation/sidebar using existing design-system components, wiring controls to useGameStore for play/speed state and navigation slices for selections.

4. Port structure & room views – Implement structure/room detail pages leveraging DashboardOverview data, adding drill-down panels and breadcrumb logic derived from clickdummy while using normalized store selectors.

5. Enhance zone detail – Merge environment controls, plant grids, and device management into ZoneDetail, binding sliders/toggles to setpoint dispatch and using real telemetry values.

6. Integrate modal workflows – Register modal descriptors for CRUD/treatment flows in the modal slice and reimplement modal bodies with shared Modal while ensuring actions dispatch facade intents or update fixtures deterministically.

7. Rebuild personnel dashboard – Adapt hiring/roster UI to the live usePersonnelStore, translating morale/energy displays and hooking up modal-driven hires/fires using deterministic fixtures when backend data is absent.

8. Align finance UX – Incorporate clickdummy time-range controls and breakdown lists into FinancesView, ensuring metrics and charts consume normalized finance history from the store.

9. Finalize shared primitives & tests – Replace bespoke form/button/icon components with project-standard equivalents, add unit tests for new helpers/selectors, and verify seeded fixture snapshots remain stable.

## Open questions / risks

1. ✅ Do we continue using Material Icons from the clickdummy or switch to the project’s preferred icon set to stay consistent with the design system?
   - **Resolution:** Adopt the app’s component-driven icon approach (React icon components behind a shared wrapper) so we can replace the Material glyph spans during migration without carrying the Google font dependency.

2. ✅ How should setpoint controls interact with the simulation facade—are sendConfigUpdate/sendFacadeIntent handlers already available for temperature, humidity, PPFD, etc., or do we need to extend store slices?
   - **Resolution:** Use the existing `useZoneStore().sendSetpoint` helper, which is wired through the simulation bridge to emit `config.update` messages; extend the slice only when the backend adds new metrics.

3. ✅ What navigation model should drive structure/room/zone selection—expand the existing navigation slice or introduce a dedicated world-browser slice? Clarifying avoids duplicating state between sidebar and top-level navigation.
   - **Resolution:** Reuse and extend the current navigation slice, which already tracks structure/room/zone IDs, so both sidebar and top-level navigation stay in sync without a second store.

4. ✅ Should personnel and finance fixtures represent per-tick values (per PRD) or retain aggregated “7d” placeholders until backend feeds real snapshots? Aligning units is critical for determinism and SI compliance.
   - **Resolution:** Normalize fixtures to the per-tick units defined in the simulation snapshots to preserve determinism and satisfy the SI-based contracts used throughout the UI and backend.

5. ✅ Are duplicate/clone flows (rooms/zones) still required in the MVP, and if so, which backend intents will back them? Current clickdummy logic assumes immediate balance adjustments and device cost tables that may not exist yet.
   - **Resolution:** Keep the duplicate flows and route them through the existing `world.duplicateRoom`/`world.duplicateZone` facade intents, which already recreate devices and post finance events for cost accounting.

---

## Lösungsweg

### Daten- und Zustandsnormalisierung

1. Fixture-Übersetzer aufsetzen: Implementiere ein Modul, das initialMockData und verwandte Datenquellen in SimulationSnapshot-kompatible Strukturen überführt, dabei fehlende PRD-Felder ergänzt (z. B. Volumen, Status) und Einheiten normalisiert.

2. Zone-Daten konvertieren: Rechne alle zonalen Kennzahlen (RH, KPIs, Ressourcen) in die erwarteten numerischen SI-Einheiten um und fülle fehlende Telemetrie-/Gesundheitsfelder auf, bevor sie die Stores hydratisieren.

3. Pflanzen-, Geräte-, Personal- und Finanzobjekte anreichern: Erweitere Fixtures um strain-IDs, Stadien, Geräte-Blueprint-Informationen, per-Tick-Kosten sowie tickbasierte Finanzhistorien, damit sie die Snapshot-Typen erfüllen.

4. Deterministische Hilfsfunktionen zentralisieren: Ersetze deterministicUuid und globale SeededRandom-Instanzen durch eine seeded Helper-Utility in store/utils, die wiederholbare IDs und Zufallsdaten liefert.

5. State-Management auf Stores umstellen: Refaktoriere App.tsx, sodass sämtliche Simulationzustände über useGameStore, useZoneStore etc. laufen und lokale JSON-Mutationen entfallen.

### Layout- und Navigationsmigration

6. Layout-Shell refaktorieren: Kombiniere die Klickdummy-Header-/Sidebar-Elemente mit den vorhandenen Komponenten (DashboardHeader, Navigation, TimeDisplay) und verdrahte sie mit den Spiel- und Navigationsslices.

7. Breadcrumbs und Event-Ticker anbinden: Implementiere Breadcrumbs und Event-Log auf Basis der bestehenden Navigations- und Game-Store-Selektoren, um Auswahlzustand und Telemetrie zu spiegeln.

8. Navigation-Slice erweitern: Ergänze den bestehenden Slice um Struktur-/Raum-Hierarchie und wende ihn sowohl für Sidebar als auch Kopfzeilen-Navigation an, um Doppelstaat zu vermeiden.

### View-spezifische Portierungen

9. Struktur- und Raumansichten integrieren: Portiere Karten und Detailpanels in DashboardOverview/ZoneDetail, erstelle gemeinsame Kartenkomponenten unter components/cards und implementiere Drilldown-Logik plus Breadcrumbs.

10. Zonenansicht erweitern: Ergänze ZoneDetail um Steuer-Widgets, Pflanzenaktionen und Gerätelisten; nutze useZoneStore().sendSetpoint für Setpoint-Dispatch und extrahiere Form-Controls in components/forms.

11. Personalbereich neu aufbauen: Spiegle Bewerber- und Mitarbeiterdarstellungen im PersonnelView, verdrahte Hire/Fire-Intents und verlagere Modale in den globalen Modal-Slice.

12. Finanzdashboard abstimmen: Übertrage Zeitbereichs-Umschalter und Aufschlüsselungslisten in FinancesView und stelle sicher, dass sie tickbasierte financeHistory-Daten konsumieren.

### Modale und Workflows

13. Modal-Descriptoren registrieren: Definiere typsichere Descriptoren für CRUD-, Duplizier-, Detail- und Bestätigungsmodale im Modal-Slice und implementiere zugehörige Inhaltskomponenten in den jeweiligen View-Ordnern.

14. Fassade-Intents anbinden: Route Modale-Aktionen (z. B. duplicateRoom/duplicateZone) durch vorhandene Fassade-Intents, inklusive deterministischer Kosten-/Bestandsupdates.

### Gemeinsame Komponenten & Utilities

15. UI-Primitiven angleichen: Ersetze Klickdummy-Schaltflächen, Formulare und Icon-Hüllen durch existierende Design-System-Komponenten, ergänze fehlende Inline-Edit-/Icon-Wrapper unter components/inputs.

16. Fixtures/Mocks modularisieren: Verschiebe deterministische Mock-Fabriken und Rollen-/Kostenkonstanten in src/frontend/fixtures und stelle sicher, dass sie die Store-Hydration bedienen.

17. Selektor-Helper neu platzieren: Portiere Struktur-/Raum-/Zonen-Helper als testbare Selektoren in store/selectors.ts oder modulnahe Utilities.

### Qualitätssicherung

19. Unit- und Snapshot-Tests ergänzen: Schreibe Tests für neue Selektoren, deterministische Fixtures und UI-Komponenten, um die Stabilität der migrierten Oberflächen sicherzustellen.

20. Determinismus verifizieren: Führe wiederholte Hydrationen mit gleichem Seed aus, um identische Snapshot-Ergebnisse zu bestätigen und Regressionen beim RNG-Austausch auszuschließen.
