# Weed Breed — Breeding Module (TS + Pseudocode)

> Consolidated spec & ready‑to‑use TypeScript for a deterministic breeding pipeline (A × B → C), plus UI pseudocode (React/Vite). Matches our schemas (strain JSON), naming rules (camelCase, SI), and the Node/TS toolchain.

---

## 0) Goals

- Deterministic, seed‑driven **breeding core** (F1 / F2+ / BX / IBL) that mixes parent traits into child strain blueprints.
- **Time model** that maps real breeding steps to in‑game calendar days (with overlap and parallelization).
- **UI flow** (Breeding Lab) to pick parents, plan a program, spawn populations, and select top genotypes.

---

## 1) Real → Game Mapping (Time)

**Realistic ranges**: A×B to a stable C line often takes **1.5–3 years**. A fast limited run (F2/F3) \~**8–12 months**.

**Game model per generation** (A×B → seed batch):

```
T_gen = veg + flower + tail + post
veg   = avg(vegetationDays[A], vegetationDays[B])
flower= avg(floweringDays[A],  floweringDays[B])
tail  = max(0, seedMaturationDays - (flower - pollinationDayInFlower))
post  = postProcessingDays
```

Defaults: `pollinationDayInFlower = 14`, `seedMaturationDays = 28`, `postProcessingDays = 21` (days).

Parallelization reduces **calendar time** after the first generation: `effectiveDays ≈ ceil(T_gen / parallelBatches)`.

---

## 2) Strain Fields used (subset)

We rely on keys already present/accepted by our `strain.json` shape:

- `id`, `name`, `lineage.parents[]`
- `genotype.{sativa,indica,ruderalis}`
- `chemotype.{thcContent,cbdContent}`
- `morphology.{growthRate,yieldFactor,leafAreaIndex}`
- `environmentalPreferences.{ lightSpectrum, lightIntensity, lightCycle, idealTemperature, idealHumidity, phRange }`
- `dailyNutrientDemand.{vegetation,flowering}` (NPK per phase)
- `dailyWaterUsagePerSquareMeter.{vegetation,flowering}`
- `generalResilience`, `npkTolerance`, `npkStressIncrement`
- `dailyInfectionIncrement`, `infectionThreshold`, `recoveryRate`, `regenerationRate`, `degenerationRate`, `fatalityThreshold`
- `vegetationDays`, `floweringDays`, `transitionTriggerHours`

> All numeric values in SI, camelCase identifiers, no unit suffixes.

---

## 3) Breeding Core (TypeScript)

> Drop this into **`packages/backend/src/breeding/breedingEngine.ts`** (or similar). No external deps.

```ts
// packages/backend/src/breeding/breedingEngine.ts
// Deterministic breeding core for Weed Breed.
// Exports: crossF1, segregateF2, backcross, stabilizeIBL, generatePopulation, selectTop, scoreStrain

import { randomUUID } from 'node:crypto';

/** Deterministic RNG seeded by (seedString, streamId). */
export function createRng(seedString = 'WB-SEED', streamId = 'breeding') {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  for (let i = 0; i < streamId.length; i++) {
    h = Math.imul(h ^ streamId.charCodeAt(i), 461845907);
    h = (h << 13) | (h >>> 19);
  }
  return function rnd() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return (t & 0x7fffffff) / 0x80000000; // [0,1)
  };
}

/** Standard normal via Box–Muller */
function normal01(rnd: () => number) {
  let u = 0,
    v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mixScalar(
  a: number,
  b: number,
  { t, sigma, rnd }: { t: number; sigma: number; rnd: () => number },
) {
  const base = lerp(a, b, t);
  return base + sigma * normal01(rnd);
}

function mixRange(
  rA: [number, number],
  rB: [number, number],
  opts: { t: number; sigma: number; rnd: () => number },
): [number, number] {
  const lo = Math.min(mixScalar(rA[0], rB[0], opts), mixScalar(rA[1], rB[1], opts));
  const hi = Math.max(mixScalar(rA[1], rB[1], opts), mixScalar(rA[0], rB[0], opts));
  return [lo, hi];
}

function mixPhasedObject(
  oA: any,
  oB: any,
  keys: string[],
  opts: { t: number; sigma: number; rnd: () => number },
) {
  const out: any = {};
  for (const k of keys) {
    out[k] = {};
    const phases = new Set([...Object.keys(oA?.[k] ?? {}), ...Object.keys(oB?.[k] ?? {})]);
    for (const p of phases) {
      const a = oA?.[k]?.[p];
      const b = oB?.[k]?.[p];
      if (typeof a === 'number' && typeof b === 'number') {
        out[k][p] = mixScalar(a, b, opts);
      } else if (a && b && typeof a === 'object' && typeof b === 'object') {
        out[k][p] = {};
        const nutrients = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const n of nutrients) {
          const an = a[n] ?? b[n] ?? 0;
          const bn = b[n] ?? a[n] ?? 0;
          out[k][p][n] = mixScalar(an, bn, opts);
        }
      }
    }
  }
  return out;
}

function normalizeGenotype(g: { sativa?: number; indica?: number; ruderalis?: number }) {
  const s = (g.sativa ?? 0) + (g.indica ?? 0) + (g.ruderalis ?? 0);
  if (s <= 0) return { sativa: 0.33, indica: 0.33, ruderalis: 0.34 };
  return {
    sativa: clamp01((g.sativa ?? 0) / s),
    indica: clamp01((g.indica ?? 0) / s),
    ruderalis: clamp01((g.ruderalis ?? 0) / s),
  };
}

function applyHeterosis(child: any, factor = { yieldFactor: 1.06, growthRate: 1.03 }) {
  if (child.morphology?.yieldFactor != null) child.morphology.yieldFactor *= factor.yieldFactor;
  if (child.morphology?.growthRate != null) child.morphology.growthRate *= factor.growthRate;
}

export type BreedingMode = 'F1' | 'F2' | 'BX' | 'IBL';

export interface MinimalStrain {
  id: string;
  name: string;
  genotype?: { sativa?: number; indica?: number; ruderalis?: number };
  chemotype?: { thcContent?: number; cbdContent?: number };
  morphology?: { growthRate?: number; yieldFactor?: number; leafAreaIndex?: number };
  environmentalPreferences?: any;
  dailyNutrientDemand?: any;
  dailyWaterUsagePerSquareMeter?: any;
  generalResilience?: number;
  npkTolerance?: number;
  npkStressIncrement?: number;
  dailyInfectionIncrement?: number;
  infectionThreshold?: number;
  recoveryRate?: number;
  degenerationRate?: number;
  regenerationRate?: number;
  fatalityThreshold?: number;
  vegetationDays?: number;
  floweringDays?: number;
  transitionTriggerHours?: number;
}

function makeChild(
  parentA: MinimalStrain,
  parentB: MinimalStrain,
  {
    seed = 'WB-SEED',
    mode = 'F1' as BreedingMode,
    bxParent = 'A' as 'A' | 'B',
    mutationSigma = 0.01,
  } = {},
) {
  const rnd = createRng(seed, `breed-${mode}`);
  const t = mode === 'F1' ? 0.5 : mode === 'BX' ? (bxParent === 'A' ? 0.75 : 0.25) : 0.5;
  const sigma =
    mode === 'F1'
      ? 0.02
      : mode === 'F2'
        ? 0.06
        : mode === 'BX'
          ? 0.03
          : mode === 'IBL'
            ? 0.015
            : 0.03;
  const mix = (a: number, b: number) => mixScalar(a, b, { t, sigma, rnd });

  const geno = normalizeGenotype({
    sativa: mix(parentA.genotype?.sativa ?? 0.33, parentB.genotype?.sativa ?? 0.33),
    indica: mix(parentA.genotype?.indica ?? 0.33, parentB.genotype?.indica ?? 0.33),
    ruderalis: mix(parentA.genotype?.ruderalis ?? 0.34, parentB.genotype?.ruderalis ?? 0.34),
  });

  const thc = clamp01(
    mix(parentA.chemotype?.thcContent ?? 0.15, parentB.chemotype?.thcContent ?? 0.15),
  );
  const cbd = clamp01(
    mix(parentA.chemotype?.cbdContent ?? 0.01, parentB.chemotype?.cbdContent ?? 0.01),
  );

  const growthRate = clamp01(
    mix(parentA.morphology?.growthRate ?? 0.5, parentB.morphology?.growthRate ?? 0.5),
  );
  const yieldFactor = Math.max(
    0,
    mix(parentA.morphology?.yieldFactor ?? 1.0, parentB.morphology?.yieldFactor ?? 1.0),
  );
  const leafAreaIndex = Math.max(
    0,
    mix(parentA.morphology?.leafAreaIndex ?? 2.0, parentB.morphology?.leafAreaIndex ?? 2.0),
  );

  const child: any = {
    id: randomUUID(),
    name: `${parentA.name ?? 'A'} × ${parentB.name ?? 'B'} ${mode}`,
    lineage: { parents: [parentA.id, parentB.id] },
    genotype: geno,
    chemotype: { thcContent: thc, cbdContent: cbd },
    morphology: { growthRate, yieldFactor, leafAreaIndex },
    environmentalPreferences: {
      lightSpectrum: {
        vegetation: mixRange(
          (parentA.environmentalPreferences?.lightSpectrum?.vegetation as [number, number]) ?? [
            400, 700,
          ],
          (parentB.environmentalPreferences?.lightSpectrum?.vegetation as [number, number]) ?? [
            400, 700,
          ],
          { t, sigma, rnd },
        ),
        flowering: mixRange(
          (parentA.environmentalPreferences?.lightSpectrum?.flowering as [number, number]) ?? [
            350, 660,
          ],
          (parentB.environmentalPreferences?.lightSpectrum?.flowering as [number, number]) ?? [
            350, 660,
          ],
          { t, sigma, rnd },
        ),
      },
      lightIntensity: {
        vegetation: mixRange(
          (parentA.environmentalPreferences?.lightIntensity?.vegetation as [number, number]) ?? [
            400, 600,
          ],
          (parentB.environmentalPreferences?.lightIntensity?.vegetation as [number, number]) ?? [
            400, 600,
          ],
          { t, sigma, rnd },
        ),
        flowering: mixRange(
          (parentA.environmentalPreferences?.lightIntensity?.flowering as [number, number]) ?? [
            600, 1000,
          ],
          (parentB.environmentalPreferences?.lightIntensity?.flowering as [number, number]) ?? [
            600, 1000,
          ],
          { t, sigma, rnd },
        ),
      },
      lightCycle: {
        vegetation: [
          Math.round(
            mix(
              parentA.environmentalPreferences?.lightCycle?.vegetation?.[0] ?? 18,
              parentB.environmentalPreferences?.lightCycle?.vegetation?.[0] ?? 18,
            ),
          ),
          Math.round(
            mix(
              parentA.environmentalPreferences?.lightCycle?.vegetation?.[1] ?? 6,
              parentB.environmentalPreferences?.lightCycle?.vegetation?.[1] ?? 6,
            ),
          ),
        ],
        flowering: [12, 12],
      },
      idealTemperature: {
        vegetation: mixRange(
          (parentA.environmentalPreferences?.idealTemperature?.vegetation as [number, number]) ?? [
            20, 28,
          ],
          (parentB.environmentalPreferences?.idealTemperature?.vegetation as [number, number]) ?? [
            20, 28,
          ],
          { t, sigma, rnd },
        ),
        flowering: mixRange(
          (parentA.environmentalPreferences?.idealTemperature?.flowering as [number, number]) ?? [
            22, 30,
          ],
          (parentB.environmentalPreferences?.idealTemperature?.flowering as [number, number]) ?? [
            22, 30,
          ],
          { t, sigma, rnd },
        ),
      },
      idealHumidity: {
        vegetation: mixRange(
          (parentA.environmentalPreferences?.idealHumidity?.vegetation as [number, number]) ?? [
            0.6, 0.7,
          ],
          (parentB.environmentalPreferences?.idealHumidity?.vegetation as [number, number]) ?? [
            0.6, 0.7,
          ],
          { t, sigma, rnd },
        ),
        flowering: mixRange(
          (parentA.environmentalPreferences?.idealHumidity?.flowering as [number, number]) ?? [
            0.5, 0.6,
          ],
          (parentB.environmentalPreferences?.idealHumidity?.flowering as [number, number]) ?? [
            0.5, 0.6,
          ],
          { t, sigma, rnd },
        ),
      },
      phRange: mixRange(
        (parentA.environmentalPreferences?.phRange as [number, number]) ?? [5.8, 6.2],
        (parentB.environmentalPreferences?.phRange as [number, number]) ?? [5.8, 6.2],
        { t, sigma, rnd },
      ),
    },
    ...mixPhasedObject(
      {
        dailyNutrientDemand: parentA.dailyNutrientDemand,
        dailyWaterUsagePerSquareMeter: parentA.dailyWaterUsagePerSquareMeter,
      },
      {
        dailyNutrientDemand: parentB.dailyNutrientDemand,
        dailyWaterUsagePerSquareMeter: parentB.dailyWaterUsagePerSquareMeter,
      },
      ['dailyNutrientDemand', 'dailyWaterUsagePerSquareMeter'],
      { t, sigma, rnd },
    ),
    generalResilience: clamp01(
      mix(parentA.generalResilience ?? 0.5, parentB.generalResilience ?? 0.5),
    ),
    npkTolerance: Math.max(0, mix(parentA.npkTolerance ?? 0.05, parentB.npkTolerance ?? 0.05)),
    npkStressIncrement: Math.max(
      0,
      mix(parentA.npkStressIncrement ?? 0.01, parentB.npkStressIncrement ?? 0.01),
    ),
    dailyInfectionIncrement: Math.max(
      0,
      mix(parentA.dailyInfectionIncrement ?? 0.002, parentB.dailyInfectionIncrement ?? 0.002),
    ),
    infectionThreshold: clamp01(
      mix(parentA.infectionThreshold ?? 0.2, parentB.infectionThreshold ?? 0.2),
    ),
    recoveryRate: Math.max(0, mix(parentA.recoveryRate ?? 0.04, parentB.recoveryRate ?? 0.04)),
    degenerationRate: Math.max(
      0,
      mix(parentA.degenerationRate ?? 0.03, parentB.degenerationRate ?? 0.03),
    ),
    regenerationRate: Math.max(
      0,
      mix(parentA.regenerationRate ?? 0.03, parentB.regenerationRate ?? 0.03),
    ),
    fatalityThreshold: clamp01(
      mix(parentA.fatalityThreshold ?? 0.95, parentB.fatalityThreshold ?? 0.95),
    ),
    vegetationDays: Math.max(
      7,
      Math.round(mix(parentA.vegetationDays ?? 21, parentB.vegetationDays ?? 21)),
    ),
    floweringDays: Math.max(
      42,
      Math.round(mix(parentA.floweringDays ?? 60, parentB.floweringDays ?? 60)),
    ),
    transitionTriggerHours: Math.round(
      mix(parentA.transitionTriggerHours ?? 13, parentB.transitionTriggerHours ?? 13),
    ),
  };

  if (mode === 'F1') applyHeterosis(child);

  // light global mutation
  child.morphology.growthRate = clamp01(child.morphology.growthRate + 0.01 * normal01(rnd));
  child.chemotype.thcContent = clamp01(child.chemotype.thcContent + 0.01 * normal01(rnd));
  child.chemotype.cbdContent = clamp01(child.chemotype.cbdContent + 0.01 * normal01(rnd));

  return child;
}

export function crossF1(a: MinimalStrain, b: MinimalStrain, opts: any = {}) {
  return makeChild(a, b, { ...opts, mode: 'F1' });
}
export function segregateF2(a: MinimalStrain, b: MinimalStrain, opts: any = {}) {
  return makeChild(a, b, { ...opts, mode: 'F2' });
}
export function backcross(
  a: MinimalStrain,
  b: MinimalStrain,
  { recurrent = 'A', ...opts }: any = {},
) {
  return makeChild(a, b, { ...opts, mode: 'BX', bxParent: recurrent === 'A' ? 'A' : 'B' });
}
export function stabilizeIBL(p: MinimalStrain, opts: any = {}) {
  return makeChild(p, p, { ...opts, mode: 'IBL' });
}

export function generatePopulation(
  a: MinimalStrain,
  b: MinimalStrain,
  { count = 24, mode = 'F1', seed = 'WB-SEED' } = {},
) {
  const kids: any[] = [];
  for (let i = 0; i < count; i++) kids.push(makeChild(a, b, { seed: `${seed}-i${i}`, mode }));
  return kids;
}

export function scoreStrain(
  strain: MinimalStrain,
  weights = { yield: 0.5, thc: 0.3, resilience: 0.2 },
) {
  const cycleDays = (strain.vegetationDays ?? 21) + (strain.floweringDays ?? 60);
  const cyclePenalty = Math.max(0, (cycleDays - 84) / 84);
  const score =
    (strain.morphology?.yieldFactor ?? 1) * weights.yield +
    (strain.chemotype?.thcContent ?? 0.15) * weights.thc +
    (strain.generalResilience ?? 0.5) * weights.resilience -
    cyclePenalty * 0.2;
  return score;
}

export function selectTop(pop: MinimalStrain[], k = 3, weights?: any) {
  return [...pop]
    .map((s) => ({ s, score: scoreStrain(s as any, weights) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((e) => e.s);
}
```

---

## 4) Time Model (TypeScript)

> Drop this into **`packages/backend/src/breeding/timeModel.ts`**.

```ts
// packages/backend/src/breeding/timeModel.ts
// Time estimation for breeding generations with overlap & parallelization.

export interface MinimalStrain {
  id: string;
  name: string;
  vegetationDays?: number;
  floweringDays?: number;
}

export interface BreedingTimingSettings {
  pollinationDayInFlower: number;
  seedMaturationDays: number;
  postProcessingDays: number;
}

export const defaultBreedingTimings: BreedingTimingSettings = {
  pollinationDayInFlower: 14,
  seedMaturationDays: 28,
  postProcessingDays: 21,
};

export interface GenerationBreakdown {
  vegetationDays: number;
  floweringDays: number;
  overlapCompensationDays: number;
  postProcessingDays: number;
  totalDays: number;
}

function avg(a?: number, b?: number, fallback = 21) {
  const va = typeof a === 'number' ? a : fallback;
  const vb = typeof b === 'number' ? b : fallback;
  return (va + vb) / 2;
}

export function generationDurationDays(
  parentA: MinimalStrain,
  parentB: MinimalStrain,
  settings: BreedingTimingSettings = defaultBreedingTimings,
): GenerationBreakdown {
  const vegetationDays = Math.max(
    7,
    Math.round(avg(parentA.vegetationDays, parentB.vegetationDays, 21)),
  );
  const floweringDays = Math.max(
    42,
    Math.round(avg(parentA.floweringDays, parentB.floweringDays, 60)),
  );

  const afterPollination = Math.max(0, floweringDays - settings.pollinationDayInFlower);
  const missingForSeeds = Math.max(0, settings.seedMaturationDays - afterPollination);
  const overlapCompensationDays = Math.round(missingForSeeds);

  const totalDays =
    vegetationDays + floweringDays + overlapCompensationDays + settings.postProcessingDays;
  return {
    vegetationDays,
    floweringDays,
    overlapCompensationDays,
    postProcessingDays: settings.postProcessingDays,
    totalDays,
  };
}

export type ProgramStep = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'BX1' | 'BX2' | 'IBL';

export function estimateProjectTimelineDays(
  parents: { A: MinimalStrain; B: MinimalStrain },
  steps: ProgramStep[] = ['F1', 'F2', 'F3', 'F4', 'F5'],
  settings: BreedingTimingSettings = defaultBreedingTimings,
  parallelBatches = 1,
): { perGeneration: GenerationBreakdown[]; calendarDays: number } {
  const perGeneration: GenerationBreakdown[] = [];
  let calendarDays = 0;
  const base = generationDurationDays(parents.A, parents.B, settings);

  steps.forEach((_, index) => {
    perGeneration.push(base);
    if (index === 0) calendarDays += base.totalDays;
    else calendarDays += Math.ceil(base.totalDays / Math.max(1, parallelBatches));
  });

  return { perGeneration, calendarDays };
}

export function examplePrograms(
  parents: { A: MinimalStrain; B: MinimalStrain },
  settings: BreedingTimingSettings = defaultBreedingTimings,
) {
  const classic = estimateProjectTimelineDays(parents, ['F1', 'F2', 'F3', 'F4', 'F5'], settings, 1);
  const backcross = estimateProjectTimelineDays(
    parents,
    ['F1', 'BX1', 'BX2', 'F2', 'F3'],
    settings,
    2,
  );
  return { classic, backcross };
}
```

---

## 5) UI (React/Vite) — Pseudocode

> Frontend lives in `apps/frontend`. Keep it simple; use hooks and a store (zustand or context) to keep selected parents & program.

**State Model (sketch)**

```ts
// apps/frontend/src/features/breeding/state.ts
export type ProgramStep = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'BX1' | 'BX2' | 'IBL';
export interface BreedingState {
  parentAId?: string;
  parentBId?: string;
  steps: ProgramStep[];
  seed: string; // deterministic seed
  populationSize: number; // per generation
  parallelBatches: number;
}
```

**Page Layout**

```tsx
// apps/frontend/src/features/breeding/BreedingLabPage.tsx
// Pseudocode – wire to real components/APIs later
import { useState } from 'react';
import { generationDurationDays, estimateProjectTimelineDays } from '@backend/breeding/timeModel';
import { generatePopulation, selectTop } from '@backend/breeding/breedingEngine';

export default function BreedingLabPage() {
  const [parentA, setParentA] = useState<any>();
  const [parentB, setParentB] = useState<any>();
  const [steps, setSteps] = useState(['F1', 'F2', 'F3', 'F4', 'F5'] as const);
  const [seed, setSeed] = useState('WB-SEED');
  const [populationSize, setPopulationSize] = useState(24);
  const [parallelBatches, setParallelBatches] = useState(1);

  const canSim = !!parentA && !!parentB;
  const breakdown = canSim ? generationDurationDays(parentA, parentB) : undefined;
  const timeline = canSim
    ? estimateProjectTimelineDays(
        { A: parentA, B: parentB },
        steps as any,
        undefined,
        parallelBatches,
      )
    : undefined;

  function handleSimulate() {
    if (!canSim) return;
    const pop = generatePopulation(parentA, parentB, { count: populationSize, mode: 'F1', seed });
    const top = selectTop(pop, 3);
    // show in table/modal; allow user to pin as new parents for next step
  }

  return (
    <div className="grid gap-4">
      {/* Parent pickers */}
      {/* Program planner (steps) */}
      {/* Seed, populationSize, parallelBatches inputs */}
      {/* Breakdown cards for veg/flower/tail/post */}
      {/* Timeline summary (calendar days) */}
      <button onClick={handleSimulate} disabled={!canSim}>
        Simulate F1 Population
      </button>
    </div>
  );
}
```

**Components (sketch)**

- `ParentPicker`: list/search strain blueprints → sets `parentA|B` (by id or full object).
- `ProgramPlanner`: editable chips for steps (`F1`, `F2`, `BX1`, …) with presets.
- `TimelineCard`: renders numbers from `generationDurationDays` and `estimateProjectTimelineDays`.
- `PopulationTable`: shows generated children (id, key traits, score); actions: **Promote as Parent**, **Save as Blueprint**.

**Saving a blueprint**

- Backend route `POST /api/breeding/blueprints` to persist a generated child JSON (validates against strain schema; auto‑adds `lineage.parents`).

---

## 6) CLI Demo (optional)

Add a minimal script to run from backend:

```ts
// packages/backend/scripts/breedTimeDemo.ts
import { examplePrograms } from '../src/breeding/timeModel';

const A = { id: 'A', name: 'Parent A', vegetationDays: 21, floweringDays: 60 };
const B = { id: 'B', name: 'Parent B', vegetationDays: 24, floweringDays: 58 };

const out = examplePrograms({ A, B });
console.log(JSON.stringify(out, null, 2));
```

**package.json** (backend)

```json
{
  "scripts": {
    "breed:time": "tsx packages/backend/scripts/breedTimeDemo.ts"
  }
}
```

---

## 7) Balancing Knobs

- **Heterosis** multipliers (affect `yieldFactor`, `growthRate`).
- **σ per mode**: F1 (low), F2 (high), BX (mid), IBL (very low).
- **Mutation sigma**: rare small global shake.
- **Score weights** in `scoreStrain` for your meta (yield vs THC vs resilience vs cycle length penalty).
- **Parallelization** vs cost: larger labs shorten calendar time but burn cash.

---

## 8) Integration Tips

- Keep RNG streams **per run**: `createRng(seed, 'breed-F1')`, `'breed-F2'`, …
- Use schema validation (Zod) on save; never rename JSON keys.
- Store all times as **days**; UI may format into months/weeks.
- Deterministic tests: fix `seed`, assert distribution ranges and ordering by `scoreStrain`.

---

**Done.** This file gives you drop‑in TS modules, UI scaffolding, and a CLI demo hook. Adjust weights/sigmas to hit your desired gameplay curve.
