# 2025-09-26 — Personnel directory provisioning follow-ups

- Task WB-JM-204 (Priority: High) — Implementation: Expose a CLI/ops command to
  re-run `provisionPersonnelDirectory` without restarting the backend so live
  environments can refresh the offline directory after wiping data or rotating
  seeds.
  - Files/Modules: `src/backend/src/server/startServer.ts`,
    `src/backend/src/state/initialization/personnelProvisioner.ts`,
    `src/backend/src/facade/index.ts`.
  - Acceptance: Operators can trigger provisioning via façade or CLI, logs show
    the same counters as startup provisioning, and existing files are merged
    deterministically.

- Task WB-JM-205 (Priority: High) — Testing: Add startup integration tests that
  cover provisioning failure paths (HTTP disabled, missing fetch, empty RandomUser
  payload) so CI catches regressions before release.
  - Files/Modules:
    `src/backend/src/state/initialization/__tests__/personnelProvisioner.test.ts`,
    `src/backend/src/server/__tests__/startServer.test.ts` (new).
  - Acceptance: Tests assert the server aborts with actionable errors when the
    directory is incomplete and provisioning cannot reach RandomUser.

- Task WB-JM-206 (Priority: Medium) — Documentation: Extend the deployment
  runbook with packaging guidance for the new `/data/personnel` files and add a
  troubleshooting checklist for provisioning failures.
  - Files/Modules: `docs/system/audit.md`, `docs/system/logging.md`,
    `docs/operations/deployment.md` (new).
  - Acceptance: Ops docs include steps for bundling provisioned data, verifying
    startup logs, and rerunning the command from WB-JM-204.
