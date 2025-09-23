# 2025-09-25 — Randomuser-backed job market refresh

- Task WB-JM-201 (Priority: High) — Implementation: Harden the job market refresh pipeline so RandomUser-backed candidate pulls stay deterministic per seed and gracefully fall back to the offline generator when HTTP is disabled or failures exhaust retries.
  - Files/Modules: `src/backend/src/engine/workforce/jobMarketService.ts` (engine), `src/backend/src/facade/index.ts` (facade), `src/backend/src/server/startServer.ts`.
  - Acceptance: Given a fixed simulation seed the candidate roster, IDs, and ordering remain identical across refreshes, and `refreshCandidates` completes via offline synthesis when randomuser.me is unreachable.

- Task WB-JM-202 (Priority: High) — Testing: Extend workforce refresh tests to cover remote success, deterministic reseeding, and forced fallback scenarios, including façade command wiring.
  - Files/Modules: `src/backend/src/engine/workforce/__tests__/jobMarketService.test.ts` (engine), `src/backend/src/facade/__tests__/workforce.test.ts` (facade test surface).
  - Acceptance: Automated tests assert byte-stable outputs for identical seeds, confirm `refreshCandidates` emits deterministic telemetry, and validate fallback activation when `fetch` rejects.

- Task WB-JM-203 (Priority: Medium) — Documentation: Update the job market population docs and façade command reference to spell out deterministic seeding, RandomUser usage, offline fallback policy, and operator toggles.
  - Files/Modules: `docs/system/job_market_population.md`, `docs/system/ui_archictecture.md`, `docs/system/facade.md` (docs).
  - Acceptance: Documentation explicitly covers deterministic output guarantees and the fallback behaviour for RandomUser outages, and references the façade command surface for manual refreshes.
