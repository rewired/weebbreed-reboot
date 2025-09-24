# Terpene & Effects — High‑Level Concepts for Strain Blueprints (Augmented)

> Goal: A consistent, extensible concept to represent **terpenes**, **effect axes** (e.g., calming/energizing), **positive/negative effects**, and **aroma notes** in strain blueprints — implementation‑agnostic. This augmented edition adds **English effect lists** (positive/negative + experience descriptors) and an **English canon of cannabis‑relevant terpenes** (with common synonyms).

---

## 0) Guardrails

- **Scales & Units**
  - Cannabinoids as fractions \[0..1].
  - Terpenes in **mg/g** (total + components). Alternate sources (%/ppm) are conceptually normalized to mg/g.
  - Effect axes and effect tags normalized to \[0..1]; include **confidence** \[0..1].

- **Canonization**: Fixed **canon keys** for terpenes, aromas, and effects. Synonyms are mapped into the canon (concept; no hardcoded list required by the engine).
- **Provenance/Audit**: Every derived number keeps **source**, **timestamp**, and a **normalization tag** (concept string).

---

## 1) Target Schema (Concept)

**Blueprint Concepts**

- `chemistry.cannabinoids`: THC/CBD/… as fractions (mean, optional quantiles).
- `chemistry.terpenes`: `total_mg_g` + `components[terpeneKey].mg_g`.
- `sensory.aromaNotes`: weighted notes (`note`, `weight`).
- `effects.axes`: axes like `energizing`, `calming`, `focus`, `euphoria`, `sedation` → each with `value` + `confidence`.
- `effects.positives` / `effects.negatives`: weighted effect keys (e.g., `relaxed`, `happy` … / `dryMouth`, `anxious` …).
- `provenance`: sources, normalization tag.

**Requirement:** Schema is **additively** extensible (new terpenes/effects via canon updates).

---

## 2) Normalization (Concept)

**Input → Internal Scales**

- Cannabinoids: percent → fraction \[0..1].
- Terpenes: %, ppm → mg/g.
- Effects/Tags: unify heterogeneous rating scales (votes/stars → \[0..1]).

```pseudocode
FOR each strainInput:
  cannabinoids := normalizeCannabinoids(strainInput.cannabinoids)
  terpeneComponents := convertTerpenesToMgPerG(strainInput.terpenes) // canonized keys
  total_mg_g := sum(terpeneComponents)
  aromaNotes := mapAromaSynonyms(strainInput.aromaTags)
  posEffects := mapEffectSynonyms(strainInput.positiveTags)
  negEffects := mapEffectSynonyms(strainInput.negativeTags)
  confidence := computeConfidence(sourceQuality, dataCompleteness)
```

---

## 3) Axis Derivation from Terpene Profile (Heuristic, Concept)

- **Input:** terpene shares `w_t = mg_g_t / total_mg_g`.
- **Matrix (concept):** For each terpene, weights to axes (e.g., limonene → energizing↑, euphoria↑; myrcene → calming↑, sedation↑).
- **Computation:** axis = Σ (share_terpene × weight_terpene→axis) → clamp \[0..1]; optional gamma/rescaling.
- **Confidence:** increases with `total_mg_g` and source quality.

```pseudocode
weights := normalize(terpeneComponents)
axes := { energizing:0, calming:0, focus:0, euphoria:0, sedation:0 }
FOR each terpene t IN weights:
  FOR each axis a:
    axes[a] += weights[t] * MATRIX[t][a]
axes := clamp01(applyGamma(axes, gamma≈0.9))
confidence_axes := f(total_mg_g, sourceQuality)
```

---

## 4) Deriving Positive/Negative Effects (Concept)

- If direct crowd/lab/clinical tags exist → map to canon keys, scale to \[0..1].
- If missing → seed from axis values (and THC level) with documented heuristics; later override with real data.

```pseudocode
if hasDirectEffectData:
  positives := scaleToUnitInterval(mapToCanonKeys(input.positives))
  negatives := scaleToUnitInterval(mapToCanonKeys(input.negatives))
else:
  positives := derivePositivesFromAxes(axes, thc)
  negatives := deriveNegativesFromAxes(axes, thc)
```

---

## 5) ETL Pipeline (Concept)

```pseudocode
PIPELINE ingestStrains(source):
  FOR each raw in source:
    data := extract(raw)
    data := canonizeSynonyms(data)
    data := normalizeScales(data) // mg/g, [0..1]
    axes, axesConfidence := deriveAxesFromTerpenes(data.terpenes)
    pos, neg := mergeDirectAndDerivedEffects(data.effects, axes, data.cannabinoids)
    blueprint := assembleBlueprint(data, axes, pos, neg, provenanceTag)
    validate(blueprint)
writeToRepository(blueprint)
AFTER all: exportAsBundleZip()
```

---

# Appendices (New)

## A) **Effect Vocabulary — English (Canon Keys)**

### A.1 Positive effects (list)

- relaxed
- happy
- euphoric
- uplifted
- creative
- focused
- talkative
- giggly
- sociable
- calm
- energized
- motivated
- mindful
- tingly
- bodyLightness
- appetiteIncrease
- aroused
- painRelief (tag; see medical)
- stressRelief (tag; see medical)

> _Note:_ Some "positive" keys (e.g., painRelief, stressRelief) straddle wellness/medical semantics; keep them as tags if you separate recreational vs. medical schemas.

### A.2 Negative effects (list)

- dryMouth
- dryEyes
- anxious
- paranoia
- dizziness
- headache
- fatigue
- couchLock
- overfocused (tunnelVision)
- increasedHeartRate
- memoryLapse (shortTerm)
- coordinationImpairment

### A.3 Experience descriptors ("Wirkung") — English list

Use these as high‑level **experience labels** (non‑medical, UI‑friendly):

- clearHeaded
- cerebral
- uplifting
- energizing
- invigorating
- mellow
- calming
- soothing
- grounding
- dreamy
- stoney
- sedating
- balanced
- social
- creativeFlow
- focusedFlow
- introspective
- bodyEuphoric
- mindEuphoric
- daytimeFriendly
- nighttimeFriendly

> _Usage:_ These descriptors can be derived from axes or curated per cultivar; expose them as a simple list for UI chips and shop filters.

---

## B) **Cannabis‑Relevant Terpene Canon — English**

> Canon keys (lowerCamelCase). Include common synonyms for ingestion/ETL.

- **myrcene** (β‑myrcene)
- **limonene** (d‑limonene)
- **betaCaryophyllene** (β‑caryophyllene, BCP)
- **alphaPinene** (α‑pinene)
- **betaPinene** (β‑pinene)
- **linalool**
- **terpinolene**
- **humulene** (α‑humulene; caryophyllene oxide ≠ humulene → list separately if measured)
- **ocimene** (α‑ocimene, β‑ocimene, allo‑ocimene)
- **bisabolol** (α‑bisabolol, levomenol)
- **nerolidol** (trans‑/cis‑nerolidol)
- **eucalyptol** (1,8‑cineole)
- **geraniol**
- **valencene**
- **borneol**
- **camphene**
- **terpineol** (α‑terpineol; include β/γ variants if available)
- **fenchol**
- **sabinene**
- **delta3Carene** (Δ³‑carene)
- **phellandrene** (α‑/β‑phellandrene)
- **pulegone** (typically trace)
- **guaiol**
- **cedrene** (α‑/β‑cedrene)
- **camphor**
- **isopulegol**
- **phytol** (terpenoid alcohol; often from chlorophyll degradation)
- **paraCymene** (p‑cymene)
- **thymol** (phenolic monoterpenoid)
- **carvacrol** (phenolic monoterpenoid)
- **menthol** (rare in cannabis chemovars; include if measured)
- **hexahydrofarnesylAcetone** (terpenoid‑like; optional extended canon)

**Notes**

- Keep the **primary canon** compact for gameplay and analytics. Track **synonyms** and **isomers** in a mapping table used by the importer.
- If labs report only "top‑3" terpenes, allow partial vectors; compute `total_mg_g` from known components and mark confidence accordingly.

---

## C) JSON Blueprint Stubs (Effects & Terpenes)

```jsonc
{
  "chemistry": {
    "terpenes": {
      "total_mg_g": 6.2,
      "components": {
        "myrcene": 2.4,
        "limonene": 0.9,
        "betaCaryophyllene": 0.8,
        "alphaPinene": 0.5,
        "linalool": 0.3,
      },
    },
  },
  "effects": {
    "axes": {
      "energizing": { "value": 0.62, "confidence": 0.7 },
      "calming": { "value": 0.38, "confidence": 0.7 },
      "focus": { "value": 0.55, "confidence": 0.6 },
      "euphoria": { "value": 0.68, "confidence": 0.7 },
      "sedation": { "value": 0.32, "confidence": 0.6 },
    },
    "positives": {
      "uplifted": 0.7,
      "happy": 0.65,
      "creative": 0.6,
      "relaxed": 0.45,
      "focused": 0.55,
    },
    "negatives": {
      "dryMouth": 0.5,
      "dryEyes": 0.35,
      "anxious": 0.2,
    },
    "descriptors": ["cerebral", "daytimeFriendly", "creativeFlow", "balanced"],
  },
}
```

---

## D) Validation & Canon Checks (Zod Sketch)

```ts
const TerpeneKey = z.enum([
  'myrcene',
  'limonene',
  'betaCaryophyllene',
  'alphaPinene',
  'betaPinene',
  'linalool',
  'terpinolene',
  'humulene',
  'ocimene',
  'bisabolol',
  'nerolidol',
  'eucalyptol',
  'geraniol',
  'valencene',
  'borneol',
  'camphene',
  'terpineol',
  'fenchol',
  'sabinene',
  'delta3Carene',
  'phellandrene',
  'pulegone',
  'guaiol',
  'cedrene',
  'camphor',
  'isopulegol',
  'phytol',
  'paraCymene',
  'thymol',
  'carvacrol',
  'menthol',
]);

const PositiveEffect = z.enum([
  'relaxed',
  'happy',
  'euphoric',
  'uplifted',
  'creative',
  'focused',
  'talkative',
  'giggly',
  'sociable',
  'calm',
  'energized',
  'motivated',
  'mindful',
  'tingly',
  'bodyLightness',
  'appetiteIncrease',
  'aroused',
  'painRelief',
  'stressRelief',
]);

const NegativeEffect = z.enum([
  'dryMouth',
  'dryEyes',
  'anxious',
  'paranoia',
  'dizziness',
  'headache',
  'fatigue',
  'couchLock',
  'overfocused',
  'increasedHeartRate',
  'memoryLapse',
  'coordinationImpairment',
]);

const Descriptor = z.enum([
  'clearHeaded',
  'cerebral',
  'uplifting',
  'energizing',
  'invigorating',
  'mellow',
  'calming',
  'soothing',
  'grounding',
  'dreamy',
  'stoney',
  'sedating',
  'balanced',
  'social',
  'creativeFlow',
  'focusedFlow',
  'introspective',
  'bodyEuphoric',
  'mindEuphoric',
  'daytimeFriendly',
  'nighttimeFriendly',
]);
```

---

## E) UI/Gameplay Hooks (Quick Notes)

- **Radar** for axes, **bar** for top terpenes (mg/g), **chips** for descriptors and effects.
- **Filters**: descriptors, top terpenes, axes thresholds.
- **Economy tie‑in**: market segments consume by descriptor bundles (e.g., Calm‑Sleep vs. Party‑Uplift).

---

**Normalization Tags (example):** `terpene-mg-g.v1; axes-matrix.v2025-09; effects-canon.v2025-09`
