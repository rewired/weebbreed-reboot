# ADR 0008 — Auto-Provision Personnel Directory from RandomUser

- **Status:** Accepted (2025-09-26)
- **Owner:** Simulation Platform
- **Context:** Personnel directory bootstrapping & offline job market parity

## Context

The job market service already maintains a weekly refresh cadence and falls back
to local name lists when HTTP calls fail. However, freshly-cloned or production
installations often lack the `/data/personnel` directory assets (gendered first
names, last names, stored personal seeds). Without those files, offline
candidate generation degrades to placeholder names and synthetic seeds, which
breaks immersion and makes QA harder.

Operators requested that the backend populate the directory automatically when
it is missing so fully-offline deployments can still ship convincing applicant
rosters. The solution needed to stay deterministic, respect the existing
RandomUser contract, and fail fast when external integrations were intentionally
disabled.

## Decision

- Introduce `provisionPersonnelDirectory()` and invoke it during backend
  startup before the initial game state loads.
- When any of the four required files (`names/firstNamesFemale.json`,
  `names/firstNamesMale.json`, `names/lastNames.json`, `randomSeeds.json`) are
  missing, fetch deterministic RandomUser batches (default: 4×60 profiles) using
  seeds composed from the simulation seed and the batch index.
- Merge fetched entries with any existing data, normalise casing, drop blanks,
  and write sorted JSON files with trailing newlines so repo snapshots remain
  stable.
- Treat provisioning failures as fatal when the directory is incomplete. Missing
  network access, disabled HTTP integrations, or unusable provider payloads
  cause startup to abort with an actionable error so operators can resolve the
  root cause before gameplay begins.
- Leave existing files untouched when the directory is already complete to keep
  release artifacts reproducible and avoid unnecessary churn.

## Consequences

- Fresh deployments automatically populate high-quality name lists and personal
  seeds, ensuring the offline generator mirrors the RandomUser-backed pipeline.
- Provisioning produces deterministic assets tied to the simulation seed, so QA
  can replay a run and inspect the same on-disk names when diagnosing issues.
- Operators can bundle the generated files with release artifacts to avoid
  recurring outbound HTTP calls.
- Startup now depends on RandomUser availability (or pre-provisioned assets).
  Misconfiguration or provider outages will prevent the server from booting
  until the directory is fixed.

## Failure Modes & Mitigations

| Failure                                                               | Impact                                                                               | Mitigation                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true` or no `fetch` implementation | Provisioner throws and startup aborts.                                               | Ship the personnel directory with the build or enable HTTP for the first boot.                       |
| RandomUser returns malformed payloads (no names)                      | Provisioner throws and startup aborts.                                               | Retry manually later or supply pre-generated files. Logs capture the failing seed and attempt count. |
| Partial network outage during provisioning                            | Provisioner retries (`maxRetries`, default 2) and then aborts.                       | Override batch size/retries or rerun once connectivity is restored.                                  |
| Existing files contain duplicates or blanks                           | Provisioner merges with normalisation and de-duplication, then rewrites clean files. | No action needed; the new pass cleans the data.                                                      |

## Operational Guidance

- Allow outbound HTTPS on the first boot or run provisioning offline beforehand
  and copy the resulting files into `/data/personnel`.
- Monitor startup logs for the `state.personnelProvisioner` component; successful
  runs emit counts of generated male names, female names, last names, and stored
  seeds.
- For deterministic QA repros, note the simulation seed used during
  provisioning—the same seed will recreate identical file contents on another
  machine.

## Alternatives Considered

1. **Manual documentation only.** Rejected because it burdens operators with
   error-prone manual steps and results in inconsistent offline directories.
2. **Bundling static name lists in git.** Deferred to avoid shipping a bloated
   dataset and to preserve localisation flexibility for future markets.
3. **Lazy provisioning inside the job market refresh.** Rejected because the
   server would reach runtime before discovering missing assets, yielding
   confusing mid-simulation failures.

## Rollback Plan

If the automatic provisioning causes unacceptable startup coupling, remove the
`provisionPersonnelDirectory()` call from the backend bootstrap sequence and
restore manual instructions in the ops runbook. Existing generated files can be
left in place; they are regular JSON assets under `/data/personnel`.
