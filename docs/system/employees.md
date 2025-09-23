# Weedbreed.AI — Employee System

## Overview

Employees are the heart of automation in Weedbreed.AI. They are **autonomous agents** that pick, claim, and complete work based on their **skills**, **role**, and **current state** (energy, morale). Instead of the player micromanaging every step, the simulation **generates tasks** (“Harvest plants in Zone A”, “Repair device in Zone B”), and employees choose the **highest-priority suitable task** to execute. This reduces player burden and naturally scales with company growth.

---

## 1) Candidate Generation & External Name Provider

To keep the labor market dynamic and credible, the game continuously injects new, unique candidates. Rather than relying only on a fixed local name list, the game **optionally** queries a **seedable external name provider** (e.g., an API that returns first/last names) and falls back to local data if unavailable. An free and open provider is https://randomuser.me/. For detailed information about the API, check the providers documentation.

- **Periodic refresh**  
   Once per in-game week (e.g., every **168 ticks** if 1 tick = 1 hour), refresh the candidate pool.
- **Deterministic, efficient fetch**  
   Use an endpoint that accepts `results` (e.g., 12), `inc=name` (only first/last names), and a deterministic `seed`.
  - **Seed construction**: derive `apiSeed` from the game’s original seed + current in-game week index, e.g.  
     `apiSeed = "{gameSeed}-week-{weekIndex}"`  
     This guarantees **reproducible candidates** for identical runs.
- **Privacy-aware payload**  
   Request **first/last names, age, gender and password only**; no other personal data. The age should range between `[18;65]`. For employee the age should play am altering role for random skill creation.
  A random password will be mapped as "personal" RNG seed. For the ease of use request the password with `password=number,8` as additional parameter from API. The attribute in our Employee-Object is called `personalSeed`, not `password`.
- **Offline-safe fallback**
  If the external provider is unreachable or disabled, **fallback** to `/data/personnel/` local lists to synthesize names.
- **Resilience & retries**
  The job market service performs up to two attempts per refresh against the remote provider. When the HTTP call fails or is disabled it switches to the local generator, reusing the same deterministic `personalSeed` logic so rerolls remain reproducible.
- **Profile synthesis**
  After names are obtained, the game **generates full candidate profiles**:
  randomized **skills**, **traits**, and a **wage** consistent with the generated profile and company difficulty/balancing rules.

---

## 2) Work as Discrete Tasks

Work is modeled as **discrete Tasks** rather than continuous processes.

- **Task generation**  
   Each tick, the **task engine** scans the world and generates a list of required tasks.  
   Examples: a broken device creates a `repair_device` task; harvest-ready plants create `harvest_plants`; sanitation needs create `clean_zone`; etc.  
   Base properties (priority, required skill/role, default labor) come from `/data/configs/task_definitions.json`.
- **Duration & scaling**  
   Each task has `durationTicks`. It can **scale** depending on its **cost basis**:
  - `perAction` — fixed duration (e.g., repair a device)
  - `perPlant` — duration × number of plants affected (e.g., harvest)
  - `perSquareMeter` — duration × area (e.g., clean a zone)
- **Progress & completion**  
   When an employee claims a task, their status becomes **Working**. Each tick spent on the task increases `progressTicks` by 1. When `progressTicks >= durationTicks`, the task completes and its **effects** are applied to the game state (device repaired, harvest added to inventory, cleanliness improved, etc.).

---

## 3) Overtime (Energy-Linked)

Overtime is directly tied to **employee energy**.

- **Trigger**  
   Employees have **energy** in the range `0..100`. Each hour (tick) of work consumes energy.  
   An employee **always finishes the current task**, even if their energy dips **below 0** during execution. Any negative energy at completion counts as **overtime**.
- **Computation**  
   At task completion, convert the **magnitude of negative energy** into **overtime hours** (ticks). Energy is then clamped/reset according to rest policy.
- **Compensation policy (player-defined)**  
   Company policy `overtimePolicy` determines how overtime is compensated:
  - **`payout`** — pay overtime immediately at **1.5× hourly wage** (or a configurable multiplier). This costs cash now but keeps availability high (after the standard rest).
  - **`timeOff`** — credit overtime hours to the employee’s **`leaveHours`** balance. In their next **OffDuty** period, they take this extra time off. This saves immediate cash but reduces near-term availability.

---

# DD Additions

## Personnel (new or clarified fields)

- `id: string (UUID v4)` — primary key.
- `name: string` — display name (full name).
- `role: string` — e.g., `Gardener`, `Technician`, `IPMSpecialist`.
- `skills: { [skillName: string]: number }` — skill levels `0..n`.
- `traits: string[]` — e.g., `Meticulous`, `Slacker` (modulate utility/learning).
- `hourlyWage: number` — currency-neutral cost per hour.
- `energy: number` — `0..100`.
- `morale: number` — `0..100`.
- `status: "Idle" | "Working" | "Resting" | "OffDuty"`.
- `leaveHours: number` — accrued time-off hours (from overtime when `overtimePolicy = "timeOff"`).
- `certifications?: string[]` — e.g., pesticide handling.
- `assignedStructureId?: string (UUID)` — optional current workplace scope.

## Hiring / Candidate Source

- `hiring.candidateRefreshIntervalTicks: number` — e.g., `168`.
- `hiring.externalNameProvider.enabled: boolean` — on/off.
- `hiring.externalNameProvider.results: number` — e.g., `12`.
- `hiring.externalNameProvider.includeFields: string[]` — e.g., `["name"]`.
- `hiring.externalNameProvider.apiSeedFormat: string` — e.g., `"{gameSeed}-week-{weekIndex}"`.
- `hiring.fallback.useLocalNames: boolean` — default `true`.

## Tasks (augment existing section)

- `task.id: string (UUID v4)`
- `task.kind: string` — task code (must exist in `task_definitions.json`).
- `task.priority: number`
- `task.requiredRole?: string`
- `task.requiredSkills?: { [skillName: string]: number }`
- `task.location: { structureId: string, roomId?: string, zoneId?: string }`
- `task.toolsRequired?: string[]`
- `task.safetyConstraints?: string[]` — e.g., “no entry before `reentryIntervalTicks` expires”.
- `task.costBasis: "perAction" | "perPlant" | "perSquareMeter"`
- `task.quantity?: number` — plants count / area in m² / 1 for perAction.
- `task.durationTicks: number` — computed from template × scaling.
- `task.progressTicks: number` — 0..durationTicks.
- `task.splitable?: boolean` — may be batched across agents.
- `task.blocking?: boolean` — requires exclusive access.
- `task.deadlineTick?: number` — optional.

## Overtime & Policy

- `companyPolicies.overtimePolicy: "payout" | "timeOff"`
- `companyPolicies.overtimeMultiplier: number` — default `1.5`.
- `companyPolicies.maxShiftHours?: number` — optional soft cap before mandatory rest.
- `companyPolicies.restRecoveryPerTick?: number` — energy restored per tick while Resting/OffDuty.
