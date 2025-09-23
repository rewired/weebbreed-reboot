# Weedbreed.AI — Personnel Role Blueprint

Personnel role blueprints describe every playable staff role without touching code.
The simulation loads them from JSON during startup and uses them to drive initial
roster creation, applicant synthesis, and persistence validation.

- **Location:** `data/blueprints/personnel/roles/*.json`
- **Schema owner:** Workforce systems (job market + personnel initialization)
- **Validation:** `loadPersonnelRoleBlueprints()` (`zod`) scans the directory,
  normalizes every file, and falls back to
  `DEFAULT_PERSONNEL_ROLE_BLUEPRINTS` when files are missing or invalid.

---

## Directory Layout

Each role lives in its own JSON file. Designers add, edit, or remove roles by
dropping files into the directory — no manifest editing required.

```text
data/blueprints/personnel/roles/
  Gardener.json
  Janitor.json
  Manager.json
  Technician.json
  Operator.json
  Specialist.json        ← custom role example
```

Files are loaded in lexicographical order, but the resulting role map is keyed
by `id`, so later files override earlier ones with the same identifier.

---

## PersonnelRoleBlueprint Fields

| Field | Type/Range | Notes
|
| ------------------- | ------------------------------- | ----------------------------------------------------------------------
--------------------- |
| `id` | `string` | Canonical role identifier (`EmployeeRole`).
|
| `name` | `string?` | Display name in UI. Defaults to `id` when omitted.
|
| `description` | `string?` | Optional flavor text for dashboards.
|
| `preferredShiftId` | `string?` | Matches IDs from `SHIFT_TEMPLATES` (e.g. `shift.day`).
|
| `maxMinutesPerTick` | `number? (> 0)` | Per-tick labor cap; defaults to 90 minutes.
|
| `roleWeight` | `number? (>= 0)` | Relative applicant generation weight. When missing or zero the default
role weight is used. |
| `salary` | [Salary config](#salary-config) | Optional. Inherits the fallback/default salary when omitted (20 if no fallback exists).
|
| `skillProfile` | [Skill profile](#skill-profile) | Required for new roles. Primary skills must be present; secondary/tertiary data inherits defaults when omitted.
|

### Salary Config

```jsonc
{
  "basePerTick": 24, // recommended base salary per tick
  "skillFactor": {
    // optional scaling by rolled skills
    "base": 0.85,
    "perPoint": 0.04,
    "min": 0.85,
    "max": 1.45,
  },
  "randomRange": {
    // optional salary noise multiplier
    "min": 0.9,
    "max": 1.1,
  },
  "skillWeights": {
    // optional contribution weights for salary score
    "primary": 1.2,
    "secondary": 0.6,
    "tertiary": 0.35,
  },
}
```

- Omitted fields inherit the default blueprint values.
- `skillFactor.*` values let designers tweak how aggressively skill points affect pay.
- `randomRange` controls per-applicant salary noise; `min`/`max` are clamped and swapped if misordered.
- `skillWeights` tune how primary/secondary/tertiary skills contribute to the salary multiplier. Missing entries fall back to defaults (1.2 / 0.6 / 0.35).

### Skill Profile

```jsonc
{
  "primary": {
    "skill": "Gardening",       // required, must be one of EMPLOYEE_SKILL_NAMES
    "startingLevel": 4,
    "roll": { "min": 3, "max": 5 },
    "weight": 2                 // optional, used when picking tertiary candidates
  },
  "secondary": { ... },          // optional second guaranteed skill
  "tertiary": {                  // optional pool of probabilistic skills
    "chance": 0.25,              // probability (0..1) of rolling a tertiary skill
    "roll": { "min": 1, "max": 3 },
    "candidates": [
      { "skill": "Logistics", "startingLevel": 1, "weight": 1 },
      { "skill": "Administration", "startingLevel": 1 }
    ]
  }
}
```

- Primary skills are mandatory for every role. Secondary and tertiary blocks are optional but inherit rolls/weights from defaults when omitted.
- `roll` bounds are clamped and swapped automatically if `min > max`.
- `weight` biases candidate selection when multiple tertiary skills exist.
- Unknown skills are rejected during validation—only `EMPLOYEE_SKILL_NAMES` (`Gardening`, `Maintenance`, `Logistics`, `Cleanliness`, `Administration`) are allowed.

---

## Normalization & Fallbacks

`normalizePersonnelRoleBlueprints()` merges user-provided data with the shipped
defaults. Key behaviours:

1. **Missing roles inherit defaults.** Every default role is always present even
   if the directory omits the file.
2. **New roles are allowed.** Any role with an unknown `id` is accepted and will
   be surfaced to the job market and personnel factory.
3. **Graceful roll handling.** Invalid or missing roll bounds are coerced to
   non-negative integer ranges (0–5).
4. **Probability clamping.** Tertiary `chance` values are clamped to `[0, 1]`.
5. **Salary guards.** Missing base salaries inherit the fallback role’s value,
   otherwise a generic `20` is used. Random ranges are sanitized so
   `min <= max` when both are provided.

Example file (`data/blueprints/personnel/roles/Specialist.json`):

```jsonc
{
  "id": "Specialist",
  "name": "IPM Specialist",
  "roleWeight": 0.05,
  "salary": { "basePerTick": 30 },
  "skillProfile": {
    "primary": {
      "skill": "Cleanliness",
      "startingLevel": 4,
      "roll": { "min": 2, "max": 4 },
    },
  },
}
```

Unknown fields are ignored but preserved during normalization so designers can
keep notes or tracking metadata alongside the required properties.

## Runtime Consumers

- `state/initialization/personnel.ts` — seeds the starting roster and exposes the loader/normalizer used in tests and factories.
- `engine/workforce/jobMarketService.ts` — draws applicant roles, rolls skills, and computes salary expectations directly from the blueprints.
- `persistence/schemas.ts` — derives the `EmployeeRole` enum and skill schema for save-game validation.

Refer to [Job Market Population](./job_market_population.md) for the applicant pipeline and to this document when authoring new role definitions.
