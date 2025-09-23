# Weedbreed.AI — Personnel Role Blueprint

Personnel role blueprints describe every playable staff role without touching code.
The simulation loads them from JSON during startup and uses them to drive initial
roster creation, applicant synthesis, and persistence validation.

- **Location:** `data/blueprints/personnelRoles.json`
- **Schema owner:** Workforce systems (job market + personnel initialization)
- **Validation:** `loadPersonnelRoleBlueprints()` (`zod`) normalizes data and falls
  back to `DEFAULT_PERSONNEL_ROLE_BLUEPRINTS` when fields are missing.

---

## Top-Level Structure

```jsonc
{
  "version": "1.0.0", // optional semantic version tag
  "roles": [
    {
      /* PersonnelRoleBlueprint */
    },
  ],
}
```

Each `roles[]` entry must declare a unique `id`. Unknown fields are ignored but
preserved during normalization so designers can keep notes or tracking metadata
alongside the required properties.

---

## PersonnelRoleBlueprint Fields

| Field               | Type/Range                      | Notes                                                                                       |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `id`                | `string`                        | Canonical role identifier (`EmployeeRole`).                                                 |
| `name`              | `string`                        | Display name in UI. Defaults to `id` when omitted.                                          |
| `description`       | `string?`                       | Optional flavor text for dashboards.                                                        |
| `preferredShiftId`  | `string?`                       | Matches IDs from `SHIFT_TEMPLATES` (e.g. `shift.day`).                                      |
| `maxMinutesPerTick` | `number? (> 0)`                 | Per-tick labor cap; defaults to 90 minutes.                                                 |
| `roleWeight`        | `number? (>= 0)`                | Relative applicant generation weight. When missing or zero the default role weight is used. |
| `salary`            | [Salary config](#salary-config) | Required. Base pay plus optional modifiers.                                                 |
| `skillProfile`      | [Skill profile](#skill-profile) | Required. Defines primary/secondary/tertiary skills.                                        |

### Salary Config

```jsonc
{
  "basePerTick": 24, // required base salary per tick
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

- Primary skills are mandatory. Secondary and tertiary blocks are optional but inherit rolls/weights from defaults when omitted.
- `roll` bounds are clamped and swapped automatically if `min > max`.
- `weight` biases candidate selection when multiple tertiary skills exist.
- Unknown skills are rejected during validation—only `EMPLOYEE_SKILL_NAMES` (`Gardening`, `Maintenance`, `Logistics`, `Cleanliness`, `Administration`) are allowed.

---

## Normalization & Fallbacks

`normalizePersonnelRoleBlueprints()` merges user-provided data with the shipped defaults. Key behaviours:

1. **Missing roles inherit defaults.** Every default role is always present even if the JSON omits it.
2. **New roles are allowed.** Any role with an unknown `id` is accepted and will be surfaced to the job market and personnel factory.
3. **Graceful roll handling.** Invalid or missing roll bounds are coerced to non-negative integer ranges (0–5).
4. **Probability clamping.** Tertiary `chance` values are clamped to `[0, 1]`.
5. **Salary guards.** Base salary defaults to the fallback role, and random ranges are sanitized so `min <= max` when both are provided.

---

## Runtime Consumers

- `state/initialization/personnel.ts` — seeds the starting roster and exposes the loader/normalizer used in tests and factories.
- `engine/workforce/jobMarketService.ts` — draws applicant roles, rolls skills, and computes salary expectations directly from the blueprints.
- `persistence/schemas.ts` — derives the `EmployeeRole` enum and skill schema for save-game validation.

Refer to [Job Market Population](./job_market_population.md) for the applicant pipeline and to this document when authoring new role definitions.
