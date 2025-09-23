# Weedbreed.AI — Job Market Population

This page documents how the simulation keeps the applicant pool fresh while
preserving determinism and offline resilience. It covers the weekly refresh
trigger, remote API contract, RNG seeding, profile synthesis pipeline, fallback
strategy, and operator-facing configuration levers.

---

## Weekly Refresh Lifecycle

- **Commit hook integration.** `JobMarketService.createCommitHook()` is registered
  on the simulation loop’s `commit` phase so the job market refresh runs right
  after a tick is committed.
- **Tick-based cadence.** The service derives the in-game week with
  `Math.floor(tick / 168)` (168 ticks ≈ 1 simulated week when 1 tick = 1 hour).
  A refresh is attempted whenever the derived week changes or the applicant pool
  is empty.
- **Idempotence guard.** Within the same week the service short-circuits if the
  computed seed matches the last successful refresh, avoiding double-fetches on
  manual retries.
- **Event emission.** Every successful refresh raises `hr.candidatesRefreshed`
  with `{ week, seed, count, retries, source, policyId?, candidateIds[] }` so
  dashboards and audit tooling can react.

Manual refreshes (`facade.workforce.refreshCandidates`) reuse the same path and
force regeneration when `force` is set.

---

## Remote Provider Contract (randomuser.me)

- **Endpoint:** `https://randomuser.me/api/`
- **Query parameters:**
  - `results=<batchSize>` — number of profiles requested (defaults to 12).
  - `inc=name,gender,login` — request only the fields needed for synthesis.
  - `seed=<apiSeed>` — deterministic seed composed from the game seed and week.
- **Response handling:** the service accepts only array payloads under
  `results`; any malformed body throws and counts toward the retry budget.
- **Retries:** up to `maxRetries` attempts (default 2). Failures fall back to the
  offline generator after the last attempt and log a warning with the seed and
  error details.

The API call is optional—see the feature toggle below—and is skipped entirely if
HTTP support is disabled or `fetch` is unavailable.

---

## Deterministic Seeding Strategy

1. **Weekly API seed.** `apiSeed = override ?? "<gameSeed>-<weekIndex>"` keeps
   remote responses stable across runs and allows forced reseeding via command
   overrides.
2. **Profile-specific personal seeds.**
   - Remote profiles reuse `login.salt` when present.
   - Offline/generated profiles synthesize `offline-<week>-<rngString>`.
3. **RNG stream isolation.** Each personal seed is hashed and fed into
   `createSeededStreamGenerator` for the dedicated
   `job-market.candidates` stream, ensuring the attribute rolls for one
   candidate never perturb another stream (e.g., tasks or physics).
4. **ID generation.** Applicant IDs come from the stable `job-market` RNG stream
   so list ordering and references stay deterministic between refreshes.

---

## Candidate Synthesis Pipeline

1. **Profile collection.** Fetch remote profiles (or synthesize offline names)
   to produce `{ firstName, lastName, gender?, personalSeed? }` bases.
2. **Normalization.** Names are trimmed and title-cased; missing entries fall
   back to `Candidate<N>` / `Applicant` placeholders.
3. **Personal seed resolution.** Missing seeds are replaced with an offline seed
   tied to the week; all seeds are hashed before RNG usage.
4. **Role selection.** Weighted draw (`Gardener 35%`, `Technician 20%`,
   `Operator 18%`, `Janitor 15%`, `Manager 12%`).
5. **Skill roll.** Apply role templates for primary/secondary skills and an
   optional tertiary skill using bounded random draws (levels clamp between 1–5).
6. **Trait roll.** Sample distinct trait IDs from the personnel directory (if
   available) with a 60% chance to assign at least one trait.
7. **Salary computation.** Start from `DEFAULT_SALARY_BY_ROLE`, scale by skills,
   trait modifiers, and a small randomness factor, then clamp to ≥ 12.
8. **Assembly.** Produce `ApplicantState` records with `id`, `name`,
   `desiredRole`, `expectedSalary`, `skills`, `traits`, and `personalSeed`, plus
   `gender` when known.

---

## Fallback Strategy (Offline Mode)

- **Name directory usage.** When a `PersonnelNameDirectory` is bundled, the
  offline generator draws first/last names and trait IDs from that directory.
- **Synthetic names.** If the directory is missing or empty, the generator
  fabricates deterministic placeholders (`Candidate<week>-<n>`, `Applicant`).
- **Parity with remote flow.** Offline candidates reuse the same RNG streams,
  trait logic, and salary computation so balancing remains identical across
  remote/offline runs.
- **Retry reuse.** When a remote call partially succeeds (fewer profiles than
  requested), offline synthesis tops up the batch to maintain the configured
  count.

---

## Configuration & Operations

| Knob             | Default          | Description                                                                                              |
| ---------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `batchSize`      | 12               | Number of candidates requested per refresh (`results` query param).                                      |
| `maxRetries`     | 2                | Maximum remote fetch attempts before falling back to offline generation.                                 |
| `httpEnabled`    | `true`           | Feature toggle; disabled automatically when `fetch` is unavailable or the environment flag below is set. |
| `TICKS_PER_WEEK` | 168              | Interval between automatic refreshes (commit hook compares `tick / 168`).                                |
| `fetchImpl`      | global `fetch`   | Injectable fetch implementation for tests or alternative transports.                                     |
| `dataDirectory`  | resolved at boot | Source for personnel names/traits used during offline fallback.                                          |

**Environment variables**

- `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true` — hard-disables remote calls even if
  `fetch` is present. Useful for fully-offline deployments or deterministic CI.

**Timeouts**

- The service does **not** currently apply an explicit HTTP timeout. Hosting
  environments that require stricter guarantees should wrap the provided
  `fetchImpl` with an `AbortController` or gateway-level timeout.

---

## Monitoring & Observability

- Logs include `{ component: "engine.jobMarket", seed, attempts, source }` on
  refresh and warn on remote failures or fallback directory load issues.
- The refresh summary is emitted to command callers and telemetry consumers,
  enabling UI surfaces and audit scripts to display the source (`remote` vs.
  `local`) and retry count for each population run.

---

## Operational Checklist

1. Ensure the backend has network access to `randomuser.me` **or** ship the
   `/data/personnel` directory with rich name/trait lists.
2. Optionally set `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true` when running in
   air-gapped environments.
3. Monitor `hr.candidatesRefreshed` events and job market logs to confirm weekly
   refreshes are succeeding.
4. Use the façade command `refreshCandidates` with `force=true` or a custom
   `seed` when QA requires deterministic rerolls for a particular week.
