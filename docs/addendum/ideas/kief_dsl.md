# KIEF DSL — High‑Level Integration (Monorepo, `data/kief`, Pseudocode‑Only)

> **Goal:** High‑level integration framework for **KIEF** (file extension **`.kief`**) in your PNPM monorepo. Backend source code lives under **`/src/backend/src`**. **Rule files live under `/**data/kief/**`**. No legacy extensions.
> Treat all state code in this document as pseudocode!

---

## 1) Core Idea

- **Engine** (TS) computes physics/biology and owns state (under `src/backend/src/engine`).
- **KIEF** expresses **policies/automation** as if‑then rules per **scope** (`company|structure|room|zone|plant|device`).
- Pipeline: **`.kief`** → **Parser** → **IR (JSON‑like)** → **Compiler** → **RuleRuntime** → hooks into **tick loop** & **event bus**.

---

## 2) Monorepo Folder Structure (Proposal)

```
/                        # Repo root (pnpm workspace root)
  package.json           # root scripts (rules:*)
  pnpm-workspace.yaml
  /data
    /kief                # 🔹 Rule packages (authoring layer)
      core.kief
      devices.kief
      economy.kief
  /src
    /backend
      /src               # 🔹 Backend code
        /engine          # Sim core (physics/bio)
        /rulekit         # KIEF stack (Parser/IR/Compiler/Runtime)
          /dsl           # grammar.kief-spec.md, parser.pseudo, units.pseudo
          /ir            # schema.pseudo, types.pseudo
          /compiler      # binder.pseudo, expr-compiler.pseudo, effect-ops.pseudo
          /runtime       # runtime.pseudo, scheduler.pseudo, metrics.pseudo
```

---

## 3) KIEF File (Author View)

```kief
rule "Plant VPD raises stress":
  scope: plant
  trigger: onTick(every=1)
  when: self.env.vpdEffective > self.targets.vpd + 0.2 kPa
  then:
    inc self.stress.vpd by clamp((self.env.vpdEffective - self.targets.vpd) * self.sensitivity.vpd, 0, 3.0)
    cap self.stress.vpd between [0, 100]
```

**Language Building Blocks (Short):**

- **Trigger:** `onTick(every=N[, offset=M]) | onEvent("Name") | onThreshold(path, above|below, value[, hysteresis=Δ]) | onChange(path)`
- **Condition:** Boolean expr over `self.*`, `parent.*`, aggregations via `children.*` (`sum/avg/min/max/quantile`)
- **Effects:** `set | inc | dec | cap | emit | schedule | transition` (write access **only to `self.*`**)
- **Units:** Literals like `1.5 kPa`, `1600 ppm`, `120 EUR` → normalized internally

---

## 4) Parser → IR (Pseudocode)

```pseudo
function parseKief(text):
  tokens = lex(text)
  ast = parseRules(tokens)
  ir = []
  for node in ast.rules:
    irRule = {
      id: slug(node.title),
      scope: node.scope,
      trigger: normalizeTrigger(node.trigger),
      where: compileExpr(node.where?),
      when: compileExpr(node.when?),
      then: compileEffects(node.effects)
    }
    validateUnits(irRule)      # kPa/ppm/EUR → SI
    assertWriteScope(irRule)   # only self.* is writable
    ir.push(irRule)
  return { rules: ir }
```

**IR Sketch (JSON‑like):**

```json
{
  "rules": [
    {
      "id": "plant_vpd_raises_stress",
      "scope": "plant",
      "trigger": { "type": "onTick", "every": 1, "offset": 0 },
      "where": null,
      "when": {
        "op": ">",
        "lhs": "self.env.vpdEffective",
        "rhs": { "op": "+", "lhs": "self.targets.vpd", "rhs": { "value": 0.2, "unit": "kPa" } }
      },
      "then": [
        {
          "op": "inc",
          "path": "self.stress.vpd",
          "expr": {
            "fn": "clamp",
            "args": [
              {
                "op": "*",
                "lhs": { "op": "-", "lhs": "self.env.vpdEffective", "rhs": "self.targets.vpd" },
                "rhs": { "path": "self.sensitivity.vpd" }
              },
              0,
              3
            ]
          }
        },
        { "op": "cap", "path": "self.stress.vpd", "lo": 0, "hi": 100 }
      ]
    }
  ]
}
```

---

## 5) Compiler (IR → Closures)

```pseudo
function compile(ir):
  compiled = []
  for r in ir.rules:
    whenFn = makeBoolExprFn(r.when)            # (ctx) → bool
    effectFns = r.then.map(makeEffectFn)       # (ctx) → void
    compiled.push({ id:r.id, scope:r.scope, trigger:r.trigger,
                    whereFn: makeBoolExprFn(r.where?), whenFn, effectFns })
  return compiled
```

**Adapter (Decoupling from the Data Model):**

```pseudo
interface EntityAdapter { get(path); set(path,val); inc(path,delta); }
interface Accessors {
  resolve(scope,id): EntityAdapter
  parentOf(scope,id): EntityAdapter | null
  childrenOf(scope,id, childScope): Iterable<EntityAdapter>
}
```

---

## 6) Runtime & Hooks

```pseudo
class RuleRuntime {
  loadFromText(kiefText): ruleset = compile(parseKief(kiefText))
  bindAccessors(acc)
  setRng(rng)

  onTick(t):
    for scope in order(company→…→device):
      for entity in world.byScope(scope):
        for rule in ruleset where rule.scope==scope:
          if matchTrigger(rule.trigger,t) and rule.whereFn(entity) and rule.whenFn(entity):
            applyEffects(rule.effectFns, entity)  # atomic per rule

  onEvent(evt,t):
    for rule in ruleset matching evt:
      if rule.whereFn(evt.scopeEntity) and rule.whenFn(evt.scopeEntity):
        applyEffects(rule.effectFns, evt.scopeEntity)
}
```

**Determinism & Safety:** stable ordering `(scope, priority=0, ruleId)`, atomic rule transactions, write access strictly `self.*`, hysteresis/edges (`onThreshold(..., hysteresis=Δ)`).

---

## 7) Engine Integration (Main Loop, Backend under `src/backend/src`)

```pseudo
// composition root (src/backend/src/index.ts)
const runtime = new RuleRuntime()
runtime.bindAccessors(makeAccessors(world))
runtime.setRng(seedRng(SEED))

// Load KIEF rules from /data/kief
for file in readDir('/data/kief/*.kief'):
  runtime.loadFromText(read(file))

// Event bridge
engine.on('event', (evt) => runtime.onEvent(evt, engine.tick))

// Tick loop
while engine.running:
  runtime.onTick(engine.tick)   # 1) apply policies
  engine.step(engine.tick)      # 2) compute physics/biology
  telemetry.push(runtime.metrics())
```

---

## 8) Root Scripts (PNPM, Repo Root)

```json
{
  "scripts": {
    "rules:compile": "kief compile \"data/kief/**/*.kief\"",
    "rules:lint": "kief lint \"data/kief/**/*.kief\"",
    "rules:test": "vitest -c src/backend/rulekit.vitest.config.ts"
  }
}
```

> If you don’t have a CLI yet: implement `validate`/`compile` as Node scripts in the backend for now and invoke them via root scripts.

---

## 9) Telemetry & Tests

- **Per‑tick metrics:** `rulesEvaluated`, `rulesFired`, `effectsApplied`, `avgEvalMicros`.
- **Golden tests:** Mini world → tick sequence → expected state diffs (JSON).
- **Property checks:** Caps take effect, hysteresis doesn’t flip‑flop, determinism (seed).

---

## 10) Authoring Guardrails

- Always end continuous quantities with **`cap …`**.
- Units in literals are mandatory; parser normalizes internally.
- Use hysteresis for `onThreshold`/actuators to prevent pumping.
- Stable `id` (kebab‑case) for diffs & telemetry.

---

## 11) Starter Packages (`/data/kief`)

- `core.kief`: Plant‑VPD stress, CO₂ safety clamp, night‑cycle light cap
- `devices.kief`: Dehumidifier control p95(leaf‑VPD), device replacement trigger
- `economy.kief`: Monthly OPEX alert, budget guard

## 12) Integration Plan
