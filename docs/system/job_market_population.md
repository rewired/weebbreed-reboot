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
force regeneration when `force` is set. Applicant composition (role mix, skill
rolls, salaries) is data-driven via the
[`data/blueprints/personnel/roles/*.json`](./personnel_roles_blueprint.md) files; the
service hot-loads updated blueprints on demand and falls back to the shipped
defaults when the file is missing.

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

## Startup Provisioning Service

- **Responsibility.** `provisionPersonnelDirectory()` runs during backend
  startup (before the initial game state is created). It verifies the presence of
  the personnel directory assets and, when files are missing, bootstraps them by
  calling RandomUser with deterministic seeds derived from the simulation seed.
- **Generated files.** When provisioning succeeds the following files are
  written under `/data/personnel/` (existing entries are merged and
  de-duplicated):
  - `names/firstNamesFemale.json`
  - `names/firstNamesMale.json`
  - `names/lastNames.json`
  - `randomSeeds.json`
    Each file is JSON formatted with sorted entries and a trailing newline so the
    repo-friendly form matches runtime output.
- **Deterministic batches.** The provisioner requests batches of 60 profiles by
  default and iterates through 240 total profiles (configurable) using seeds of
  the form `<gameSeed>-<batchIndex>`. This produces stable gendered name sets and
  a reusable pool of `login.salt` values.
- **Failure policy.** Provisioning is skipped entirely when all four files are
  already present. If HTTP integrations are disabled (env var
  `WEEBBREED_DISABLE_JOB_MARKET_HTTP=true`) or no `fetch` implementation is
  available, startup aborts with an error because offline generations would lack
  parity data. RandomUser payloads that do not contain usable first or last
  names also trigger a fatal startup error.
- **Operator workflow.** Production deployments should either bundle the
  provisioned directory with the release artifact or allow outbound HTTPS during
  the first boot so the service can populate the files. Provisioning logs include
  counts of generated male names, female names, last names, and stored seeds.

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
   candidate never perturb another stream (e.g., tasks or physics). Gender
   selection uses a separate `job-market.gender` stream so probability tuning
   stays deterministic regardless of name availability.
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
4. **Gender draw.** Seeded RNG selects gender with `P(other) = pDiverse` and
   `P(male) = P(female) = (1 - pDiverse) / 2`, unless the profile forces a
   specific value.
5. **Role selection.** Weighted draw using each blueprint’s `roleWeight`
   (defaults baked into the fallback data mirror the historical 35/20/18/15/12
   distribution). Custom roles inherit the same logic once added to the
   blueprint file.
6. **Skill roll.** Apply the blueprint `skillProfile` for primary/secondary
   skills and the optional tertiary pool using bounded random draws (levels
   clamp between 0–5). Missing rolls inherit the fallback defaults.
7. **Trait roll.** Sample distinct trait IDs from the personnel directory (if
   available) with a 60% chance to assign at least one trait.
8. **Salary computation.** Start from the role blueprint’s `salary.basePerTick`,
   scale by the weighted skill score (`salary.skillWeights`), apply the
   `salary.skillFactor` curve, blend in trait modifiers, sprinkle bounded
   randomness (`salary.randomRange`), and clamp to ≥ 12.
9. **Assembly.** Produce `ApplicantState` records with `id`, `name`,
   `desiredRole`, `expectedSalary`, `skills`, `traits`, and `personalSeed`, plus
   `gender` when known.

---

## Fallback Strategy (Offline Mode)

- **Name directory usage.** When a `PersonnelNameDirectory` is bundled, the
  offline generator draws first names from the combined female/male lists,
  random last names, trait IDs, and pre-stored personal seeds from that
  directory. Gender draws happen independently so probability tuning does not
  depend on which name lists are populated.
- **Synthetic names.** If the directory is missing or empty, the generator
  fabricates deterministic placeholders (`Candidate<week>-<n>`, `Applicant`).
- **Parity with remote flow.** Offline candidates reuse the same RNG streams,
  trait logic, and salary computation so balancing remains identical across
  remote/offline runs.
- **Stored seeds.** The generator consumes `randomSeeds.json` entries before
  synthesising new seeds. This preserves RandomUser-provided `login.salt`
  entropy for offline runs and keeps personal seeds stable between refreshes.
- **Retry reuse.** When a remote call partially succeeds (fewer profiles than
  requested), offline synthesis tops up the batch to maintain the configured
  count.

---

## Configuration & Operations

| Knob             | Default          | Description                                                                                                                           |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `batchSize`      | 12               | Number of candidates requested per refresh (`results` query param).                                                                   |
| `maxRetries`     | 2                | Maximum remote fetch attempts before falling back to offline generation.                                                              |
| `httpEnabled`    | `true`           | Feature toggle; disabled automatically when `fetch` is unavailable or the environment flag below is set.                              |
| `TICKS_PER_WEEK` | 168              | Interval between automatic refreshes (commit hook compares `tick / 168`).                                                             |
| `fetchImpl`      | global `fetch`   | Injectable fetch implementation for tests or alternative transports.                                                                  |
| `dataDirectory`  | resolved at boot | Source for personnel names/traits used during offline fallback.                                                                       |
| `pDiverse`       | 0.1              | Probability that a candidate is assigned the `other` gender; the remaining probability is split evenly between male and female draws. |

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
