# Math Formulas Overview [ # Source: docs/_extraction/formulas.md § Extracted Formulas ]

## Breeding

- `T_gen = veg + flower + tail + post`【F:docs/\_extraction/formulas.md†L3-L12】
- `veg   = avg(vegetationDays[A], vegetationDays[B])`【F:docs/\_extraction/formulas.md†L14-L23】
- `flower= avg(floweringDays[A],  floweringDays[B])`【F:docs/\_extraction/formulas.md†L25-L34】
- `tail  = max(0, seedMaturationDays - (flower - pollinationDayInFlower))`【F:docs/\_extraction/formulas.md†L36-L45】
- `post  = postProcessingDays`【F:docs/\_extraction/formulas.md†L47-L56】
- `effectiveDays ≈ ceil(T_gen / parallelBatches)`【F:docs/\_extraction/formulas.md†L58-L67】
- `±noise × base`【F:docs/\_extraction/formulas.md†L113-L122】

## Terpenes

- `w_t = mg_g_t / total_mg_g`【F:docs/\_extraction/formulas.md†L69-L78】
- `axis = Σ (share_terpene × weight_terpene→axis) → clamp \[0..1]`【F:docs/\_extraction/formulas.md†L80-L89】

## Genetics & Resilience

- `sum ≤ 1`【F:docs/\_extraction/formulas.md†L91-L100】
- `1.0 = neutral`【F:docs/\_extraction/formulas.md†L102-L111】

## Capacity

- `Max plant count = floor(zoneArea / areaPerPlant)`【F:docs/\_extraction/formulas.md†L123-L133】

## Time Scaling

- `tickLengthMinutes / 60`【F:docs/\_extraction/formulas.md†L135-L144】
- `tickHours = tickLengthMinutes / 60`【F:docs/\_extraction/formulas.md†L366-L375】

## Tasks & Workforce

- `progressTicks >= durationTicks`【F:docs/\_extraction/formulas.md†L146-L155】
- `U = w1*priority + w2*skillMatch + w3*roleAffinity + w4*urgency`【F:docs/\_extraction/formulas.md†L421-L430】
- `w5*distance - w6*fatigue + w7*morale + w8*toolAvailability ± traitMods`【F:docs/\_extraction/formulas.md†L432-L440】

## Economics

- `revenue = harvestBasePricePerGram × modifiers`【F:docs/\_extraction/formulas.md†L157-L166】
- `device.power_kW × tickHours × electricityCostPerKWh`【F:docs/\_extraction/formulas.md†L355-L364】

## Scheduler & Seeding

- `Math.floor(tick / 2016)`【F:docs/\_extraction/formulas.md†L168-L177】
- `apiSeed = override ?? "<gameSeed>-<weekIndex>"`【F:docs/\_extraction/formulas.md†L179-L188】
- `accumulatedMs += now - lastNow`【F:docs/\_extraction/formulas.md†L212-L221】
- `accumulatedMs ≥ tickIntervalMs / gameSpeed`【F:docs/\_extraction/formulas.md†L223-L232】
- `accumulatedMs -= tickIntervalMs / gameSpeed`【F:docs/\_extraction/formulas.md†L234-L243】

## Probability

- `P(other) = pDiverse`【F:docs/\_extraction/formulas.md†L190-L199】
- `P(male) = P(female) = (1 - pDiverse) / 2`【F:docs/\_extraction/formulas.md†L201-L210】

## Environment & Humidity

- `ΔRH = (mass_kg ÷ (volume_m3 × SATURATION_VAPOR_DENSITY_KG_PER_M3)) × efficiency × powerMod`【F:docs/\_extraction/formulas.md†L245-L254】
- `Δ = k_mix * (ambient − current)`【F:docs/\_extraction/formulas.md†L256-L265】
- `Tₜ = Tₐ + (T₀ − Tₐ) · exp(−k · Δt)`【F:docs/\_extraction/formulas.md†L377-L386】

## Nutrition & Growth

- `req_phase = curve[phase]`【F:docs/\_extraction/formulas.md†L267-L276】
- `req_tick_plant = req_phase * (zoneArea / plantCount) * (tickHours / 24)`【F:docs/\_extraction/formulas.md†L278-L287】
- `stress_raw = Σ w_D * penalty_D`【F:docs/\_extraction/formulas.md†L289-L298】
- `stress = clamp01(stress_raw * (1 − generalResilience))`【F:docs/\_extraction/formulas.md†L300-L309】
- `stress > θ_stress`【F:docs/\_extraction/formulas.md†L311-L320】
- `health -= α * stress`【F:docs/\_extraction/formulas.md†L322-L331】
- `health += β_recovery`【F:docs/\_extraction/formulas.md†L333-L342】
- `actualGrowth = potentialGrowth * health * (1 − γ * stress)`【F:docs/\_extraction/formulas.md†L344-L353】

## Temperature & Transpiration

- `g_c = g₀ · clamp(LAI / 3, 0.3, 2)`【F:docs/\_extraction/formulas.md†L388-L397】
- `E = g_c · VPD · f_stomatal`【F:docs/\_extraction/formulas.md†L400-L408】
- `litres = E · area · Δt · 3600 · 0.018`【F:docs/\_extraction/formulas.md†L410-L419】
