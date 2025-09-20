# Weedbreed.AI — Vision & Scope

---

## 1. Vision

**Elevator Pitch.** *Weed Breed* is a modular, deterministic plant/grow simulation as a game. Players plan structures (Buildings → Rooms → Zones → Plants), control climate and devices, balance cost and yield, and experience complete cultivation cycles—from seeding to harvest and post-harvest. The system is open, extensible, and content-driven (blueprint JSONs) so that community, modders, and researchers can easily contribute content.

**Why now?** There are plenty of “tycoon” games, but few that combine **physically plausible climate & plant physiology** with **economic gameplay** and **determinism**. *Weed Breed* fills this gap.

**Guiding Principles.**

1. **Determinism over visuals.** Reproducible runs beat visual effects.
2. **Playability over realism.** Plausible rather than strictly scientific—with explicit simplifications where needed.
3. **Open architecture.** Data/modding first, clear interfaces, stable formats.
4. **Transparency.** Visible metrics, explainable decisions (logs, audits, replays).
5. **Tight feedback loops.** Fun comes from meaningful micro-decisions in day-to-day operations.

**Non-Goals (Anti-Scope).**

* No political/regulatory simulation; legal aspects remain abstracted.
* No shooter/action mechanics.
* No exact lab-grade growth models; the focus remains “plausible & playable.”

**Experience Pillars.**

* **Planning & Optimization:** Climate, light, CO₂, device upgrades.
* **Risk Management:** Pests/diseases, resource bottlenecks, device wear.
* **Economy:** OpEx/CapEx, cash flow, break-even, price/quality.

---

## 2. Target Audiences & Stakeholders

**Primary Personas.**

* **The Optimizer** — loves spreadsheets, wants to improve KPIs (PPFD, VPD, €/g).
* **The Builder** — creates beautiful, efficient setups; enjoys upgrades & layout.
* **The Learner** — wants to understand the relationship between climate, plant, and yield.

**Stakeholders & Decision Authority (RACI-light).**

* **Product/Design:** Vision, priorities, balancing guardrails.
* **Engineering:** Architecture, quality, deterministic simulation foundation.
* **Content:** Blueprints (strains/devices/methods), data quality, sources.

**Usage Context.** Solo play, optional sandbox/editor mode. Streaming-friendly (clear visuals, readable KPIs).

---

## 3. Success Criteria

**Outcome KPIs (Goals).**

* **First Harvest Time:** First harvest in **< 30 minutes** of play (MVP default setup). *(OPEN: validate)*
* **Retention Proxy:** 70% of players reach day 7 of a sandbox save. *(OPEN: measure)*
* **Determinism Score:** Reference run (200 days) reproducible within **±0.5%** on core metrics.

**Quality Goals/SLOs.**

* **Performance:** Reference scenario (see below) runs at **1× speed** with **≥ 1 tick/s** (1 in-game day in ≤ 24 s). Per-tick CPU budget ≤ **50 ms**.
* **Stability:** No sim deadlocks; crash recovery without data loss (< 1 tick).
* **Memory Target:** Reference scenario uses < **1.0 GB RAM**. *(OPEN: finalize)*

**Reference Scenario (Performance Benchmark & Balancing Baseline).**

* **Structure:** 1 medium warehouse.
* **Rooms 1:** 2 grow rooms

  * **Zones:** 5 zones with different **cultivationMethods** and **MAX** plants per zone. 10,000 L water and 100 kg nutrients.
* **Rooms 2:** 1 break room for 8 employees

  * **Zones:** none required for the break room
* **Staff:** 8 employees (at least 4× Gardener, 2× Technician, 2× Janitor).
* **Starting Capital:** 100,000,000.
* **Goal:** Fixed load profile for performance measurements (≥ 1 tick/s at 1×) and baseline for balancing passes.

---

## 4. Canonical Domain Model

**Core Entities & Relationships.**

* **Structure → Room → Zone → Plant** (hierarchical).
* **Devices** (e.g., Lamp, ClimateUnit, CO₂ Injector, Dehumidifier) are assigned to **zones**.
* **Strains** (JSON blueprints) define photoperiod, DLI/PPFD ranges, NPK/water curves, stress tolerances.
* **CultivationMethods** (e.g., SOG/SCROG) set topology, plant density, and labor requirements.
* **Pests/Diseases** as events/states with incidence probability, progression, effects & treatments.

**Lifecycles.**

* **Plant:** Seed → Vegetative → Flowering → Harvest → Post-harvest (drying/curing).
* **Device:** Efficiency degradation, maintenance, replacement triggers (OpEx vs CapEx tipping points).

**Time Scale.** Tick-based with fixed tick duration: **1 tick = 1 in-game hour**; **24 ticks = 1 in-game day**, **7×24 ticks = 1 in-game week**. Ticks are aggregated into day/week summaries; replays/logs reference tick IDs. *(OPEN: standard wall-clock tick duration, e.g., 1 min)*

**Glossary (Excerpt).**

* **PPFD** (µmol·m⁻²·s⁻¹), **DLI** (mol·m⁻²·d⁻¹), **VPD** (kPa), **Photoperiod**, **Stress**, **Biomass**, **Bud Yield**.

---

## 5. Simulation Philosophy

* **Realism Levels:** Climate \[plausible], growth \[semi-empirical], economy \[playfully plausible].
* **Determinism & RNG:** Global seed; all randomness is seedable; deterministic ordering.
* **Calibration:** Literature values + expert plausibility checks; golden runs as reference.
* **Balancing:** Curves/blueprint parameters; editor-assisted fine-tuning; automated smokes (daily audits).

---

## 6. Progression & Economy

**Macro Loop (Expansion/CapEx).** Rent/expand structures, purchase/replace devices, unlock methods.
**Micro Loop (Daily Ops/OpEx).** Control climate, irrigation/NPK, pest control, staffing/tasks.

**Cost Logic.**

* **CapEx:** Device purchase price, depreciation/residual value.
* **OpEx:** Energy, water, nutrients, maintenance (**increasing**), consumables.
* **Replacement Tipping Point:** If maintenance + efficiency loss > savings from upgrade → **agent proposes replacement**.

**Revenue.** Quality × quantity × market price (balancing matrix).

---

## 6a. Quality Grades & Price Functions

**Numeric Quality Concept.**

* Quality is tracked **numerically** on a **0–100** integer scale, where **70** is the market **baseline** (list price without premium/discount).
* **Device quality (blueprint field `quality`)** affects **initial durability** and **initial efficiency** of a device.

**Device Quality → Durability/Efficiency.**

* *Durability:* `baseMTBF = spec.MTBF * (1 + (quality - 70) / 100)`
* *Efficiency:* `baseEfficiency = spec.efficiency * (1 + (quality - 70) / 200)`
  (Both are placeholder curves and may be differentiated per device type.)

**Harvest Quality (Pseudocode).**

```pseudo
function calculateHarvestQuality(finalHealth /*0..1*/, avgStress /*0..1*/, geneticQuality /*0..100*/, methodModifier /*~0.9..1.1*/): int {
  // Normalize base components
  let healthScore   = clamp01(finalHealth)
  let stressPenalty = clamp01(avgStress)

  // Weights (sum ≈ 1.0)
  const W_HEALTH = 0.55
  const W_STRESS = 0.25
  const W_GENET  = 0.20

  // Raw quality 0..100
  let q = 100 * (
      W_HEALTH * healthScore
    + W_GENET  * (geneticQuality / 100)
    + W_STRESS * (1 - stressPenalty)
  )

  // Method (SOG/SCROG etc.) acts mildly multiplicatively
  q = q * methodModifier

  // Soft caps and clamps
  if (q > 95) q = 95 + 0.5 * (q - 95)   // flatten near maximum
  return round(clamp(q, 0, 100))
}
```

**Price Function (Non-linear, Pseudocode).**

```pseudo
function calculateSalePrice(basePrice, quality /*0..100*/): number {
  const BASELINE = 70
  const q = clamp(quality, 0, 100)

  if (q >= BASELINE) {
    // Above-average quality is rewarded disproportionately
    // Exponent > 1 amplifies the bonus
    const alpha = 1.25
    const factor = Math.pow(q / BASELINE, alpha)
    return basePrice * factor
  } else {
    // Below-average quality receives a strong discount (convex)
    const beta = 1.5
    const factor = Math.pow(q / BASELINE, beta) // 0..1
    // Additional penalty kink below 50
    const kink = (q < 50) ? 0.85 : 1.0
    return basePrice * factor * kink
  }
}
```

**Design Intent.**

* **Excellence pays off strongly** (exponential bonus), **average is neutral**, **poor quality is penalized hard**. This creates a clear incentive to optimize climate/methods/staff and device quality.

---

## 7. Automation & Agents

**Agent Roles (Examples).**

* **Auto-Replant Agent:** Trigger “zone ready” → plant seedling; priority *high*; fallback: manual task queue.
* **Harvest Scheduler:** Ripeness detection, slot planning, buffer for post-harvest capacity.
* **Climate Controller:** Keep target corridor (temp/RH/CO₂/PPFD), cost-sensitive (energy prices).
* **Maintenance Advisor:** Monitor degradation/MTBF, plan maintenance windows, recommend replacement.
* **Pest/Disease Manager:** Risk assessment, plan treatments (cost/benefit/quality impact).

**Conflict Resolution & Priorities.** Central **task arbiter** allocates slots by importance (plant protection > harvest > replant > comfort).
**Failure States.** Resource shortage → degrade mode (safe defaults); dead device → emergency shutdown & alarm.

---

## 8. Content & Data Strategy

* **v1 Scope (Targets):** \~8–12 strains, \~10–15 devices, 2–3 cultivation methods, basic pests/diseases, treatments. *(OPEN: finalize list)*
* **Sources/Licenses:** Document data provenance, attribution, OSS-friendly licenses.
* **Modding/Editors:** JSON formats stable (SemVer); in-game editors for strains/devices/methods planned.

---

## 9. UX & Presentation Vision (Technology-Agnostic)

* **Key Screens:** Start (New/Load/Import), Dashboard (time/tick, energy/water/€), Structure Explorer (Structure → Room → Zone → Plant), detail pane with KPIs & stress breakdown, Shop/Research, Logs/Audits.
* **Information Hierarchy:** Top: tick/time, daily costs, energy/water, balance; middle: active zone/plant KPIs; bottom: events/tasks.
* **Accessibility:** Strict SI units, clear tooltips, color-vision-friendly palettes, scalable typography.

---

## 10. Persistence & Compatibility

* **Save/Load Promise:** Forward migrations with schema versions (SemVer), migration scripts; crash-safe saves.
* **Export/Replay:** JSONL logs per day/harvest; deterministic replays from seed + input stream.

---

## 11. Telemetry, Validation & Tests

* **Sim Audits:** Daily summaries (biomass, water, NPK, energy, costs, stress), harvest summaries (yield, quality, €/g).
* **Deterministic Test Runs:** Reference seeds (e.g., `WB_SEED=golden-200d`), golden files, tolerances.
* **Observability:** Event bus probes, tick latency, dropped tasks, OOM guard.

---

## 12. Non-Functional Requirements (NFR)

* **Performance:** Target ticks/s per reference scenario (see §3); linear scaling per zone/plant with upper bounds.
* **Robustness:** Safe defaults on parameter errors; validate all blueprints at load time (schema).
* **Security/Privacy:** Local saves by default; no personal data.
* **Internationalization:** Languages DE/EN, SI units; configurable decimal/date formats.

---

## 13. Legal & Ethics

* **Portrayal:** Neutral, factual representation; no glorification; respect age ratings.
* **Open-Source Strategy:** License model (e.g., AGPL/Polyform?); contributions via PR policy, CLA. *(OPEN: decide)*

---

## 14. Roadmap & Release Criteria

**Milestones.**

1. **MVP:** One structure, basic climate control, 1–2 strains, 1 method, basic economy, save/load, deterministic 30-day run.
2. **Alpha:** Pests/diseases + treatments, device degradation/maintenance, shop/research loop, editor v1.
3. **Beta:** Balancing pass, golden runs (200 days), stability SLOs met, localization EN/DE.
4. **1.0:** Content polish, modding docs, replay exporter, performance tuning.

**Definition of Done (MVP).**

* First harvest < 30 min in the default scenario.
* Reproducible reference run (±0.5%).
* Schema versioning & migrations present.
* Crash-safe saves & restart.

---

## 15. Risks & Assumptions

**Top Risks.**

* **Balancing complexity:** Multiplicative effects from climate × strain × devices.
* **Agent standoffs:** “No one feels responsible” → deadlocks.
* **Data quality:** Incomplete/inconsistent blueprints.

**Mitigations.**

* Strict audit metrics, phased system enablement (feature flags).
* Central task arbiter, deadlock detector, fallback tasks.
* Schema validation, content reviews, test seeds.

**Assumptions.**

* The community wants modding; deterministic replays are core value; SI units are acceptable.

---

> **Note:** This document is **technology-agnostic**. Concrete technology choices (engine, UI stack, etc.) are ore have to be documented separately in “Architecture & Implementation Choices.”
