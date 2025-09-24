# Terpene & Effekte — High‑Level Konzepte für Strain‑Blueprints (High‑Level, nur Pseudocode)

> Ziel: Einheitliches, erweiterbares Konzept, um **Terpene**, **Effektachsen** (z. B. calming/energizing), **positive/negative Effekte** und **Aroma‑Noten** in Strain‑Blueprints abzubilden – ohne konkrete Implementierung. Fokus auf **Skalen**, **Normalisierung**, **Mapping‑Regeln** und **Integration ins Spiel**.

---

## 0) Leitplanken

- **Skalen & Einheiten:**
  - Cannabinoide als Anteile \[0..1].
  - Terpene als **mg/g** (Total + Komponenten). Alternativquellen (%/ppm) werden **konzeptionell** auf mg/g normalisiert.
  - Effektwerte (Achsen, positiv/negativ) auf \[0..1]; zusätzlich **confidence** \[0..1].

- **Kanonisierung:** Feste **Kanon‑Keys** für Terpene, Aromen, Effekte. Synonyme werden per Mapping vereinheitlicht (Konzept, keine Liste im Code).
- **Provenance/Audit:** Jede abgeleitete Zahl kennt **Quelle** + **Zeitpunkt** + **Normalisierungs‑Version** (Konzeptstring).

---

## 1) Zielschema (konzeptionell)

**Blueprint.Konzepte**

- `chemistry.cannabinoids`: THC/CBD/… als Anteile (mean, optional quantile).
- `chemistry.terpenes`: `total_mg_g` + `components[terpeneKey].mg_g`.
- `sensory.aromaNotes`: Liste gewichteter Noten (`note`, `weight`).
- `effects.axes`: Achsen z. B. `energizing`, `calming`, `focus`, `euphoria`, `sedation` → jeweils `value` + `confidence`.
- `effects.positives` / `effects.negatives`: gewichtete Effektschlüssel (z. B. `relaxed`, `happy` … / `dryMouth`, `anxious` …).
- `provenance`: Quellen, Normalisierungs‑Tag.

**Anforderung:** Schema bleibt **additiv** erweiterbar (neue Terpene/Effekte via Kanon‑Erweiterung möglich).

---

## 2) Kanon‑Vokabular (konzeptionell)

- **Terpene (Beispiele):** myrcene, limonene, caryophyllene, pinene, linalool, terpinolene, humulene, ocimene, bisabolol, eucalyptol, geraniol, nerolidol, valencene, borneol.
- **Aroma‑Noten (Beispiele):** citrus, earthy, pine, spicy, diesel, sweet, floral, herbal, berry, tropical, skunk, woody.
- **Positive Effekte (Beispiele):** relaxed, happy, euphoric, uplifted, creative, focused, talkative, giggly, tingly, aroused.
- **Negative Effekte (Beispiele):** dryMouth, dryEyes, anxious, paranoid, dizzy, headache.
- **Synonyme → Kanon:** Konzept einer Mapping‑Tabelle (z. B. `beta‑caryophyllene` → `caryophyllene`; `lemon/orange` → `citrus`).

---

## 3) Normalisierung (konzeptionell)

**Eingangsdaten → interne Skalen**

- Cannabinoide: Prozentangaben → Anteil \[0..1].
- Terpene: %, ppm → mg/g.
- Effekte/Tags: Skalen vereinheitlichen (z. B. Votes/Stars → \[0..1]).

**Pseudocode (konzeptuell):**

```pseudocode
FOR each strainInput:
  cannabinoids := normalizeCannabinoids(strainInput.cannabinoids)  // -> [0..1]
  terpeneComponents := convertTerpenesToMgPerG(strainInput.terpenes) // keys canonized
  total_mg_g := sum(terpeneComponents)
  aromaNotes := mapAromaSynonyms(strainInput.aromaTags)
  posEffects := mapEffectSynonyms(strainInput.positiveTags)
  negEffects := mapEffectSynonyms(strainInput.negativeTags)
  confidence := computeConfidence(sourceQuality, dataCompleteness)
```

---

## 4) Achsen‑Ableitung aus Terpenprofil (Heuristik, High‑Level)

**Idee:** Eine **Gewichtungsmatrix** verknüpft Terpenanteile mit Effektachsen.

- **Eingabe:** Terpenanteile `w_t = mg_g_t / total_mg_g`.
- **Matrix (Konzept):** Für jedes Terpen existieren Achsen‑Gewichte (z. B. limonene → energizing↑, euphoria↑; myrcene → calming↑, sedation↑).
- **Berechnung:** Achsenwert = Σ (Anteil_terpen × gewicht_terpen→achse) → anschließend Clamping \[0..1]; **gamma**/Rescaling optional.
- **Confidence:** steigt mit `total_mg_g` und Datenqualität.

**Pseudocode (konzeptuell):**

```pseudocode
weights := normalize(terpeneComponents)  // divide by total_mg_g
axes := { energizing:0, calming:0, focus:0, euphoria:0, sedation:0 }
FOR each terpene t IN weights:
  FOR each axis a:
    axes[a] += weights[t] * MATRIX[t][a]  // MATRIX = heuristische Domain‑Werte
axes := clamp01(applyGamma(axes, gamma≈0.9))
confidence_axes := f(total_mg_g, sourceQuality)
```

**Hinweis:** Matrix ist **dokumentiert**, versioniert und kann projektspezifisch feinjustiert werden (kein „harte Wahrheit“, sondern spielmechanischer Kompromiss).

---

## 5) Ableitung positiver/negativer Effekte (High‑Level)

**Direktdaten vorhanden?** → auf Kanon‑Keys mappen und auf \[0..1] skalieren.

**Fehlen Direktdaten?** → aus Achsen **abgeleitete Startwerte** erzeugen; später durch reale Daten/Messungen überschreiben.

**Heuristische Beispiele (nur Konzept):**

- uplifted ≈ f(energizing, euphoria)
- relaxed ≈ f(calming, sedation)
- creative ≈ f(energizing, focus, terpinoleneShare)
- anxious ≈ g(energizing, THC) – h(calming)
- dryMouth/dryEyes: Basiswert + THC‑Skalierung

**Pseudocode (konzeptuell):**

```pseudocode
if hasDirectEffectData:
  positives := scaleToUnitInterval(mapToCanonKeys(input.positives))
  negatives := scaleToUnitInterval(mapToCanonKeys(input.negatives))
else:
  positives := derivePositivesFromAxes(axes, thc)
  negatives := deriveNegativesFromAxes(axes, thc)
```

---

## 6) ETL‑Pipeline (High‑Level, Quelle‑agnostisch)

**Extract → Transform → Load → Validate → Audit/Export**

**Pseudocode (konzeptuell):**

```pseudocode
PIPELINE ingestStrains(source):
  FOR each raw in source:
    data := extract(raw)
    data := canonizeSynonyms(data)
    data := normalizeScales(data)  // mg/g, [0..1], etc.
    axes, axesConfidence := deriveAxesFromTerpenes(data.terpenes)
    pos, neg := mergeDirectAndDerivedEffects(data.effects, axes, data.cannabinoids)
    blueprint := assembleBlueprint(data, axes, pos, neg, provenanceTag)
    validate(blueprint)  // schema-level, conceptual
    writeToRepository(blueprint)
AFTER all: exportAsBundleZip()
```

---

## 7) Spiel‑Integration (Konzept)

- **Nachfrage‑Segmente:** (z. B. Medical‑Calm, Creative‑Focus, Party‑Uplift, Sleep‑Sedation). Segment‑Score = dot( Segment‑Gewichte, Effektachsen ).
- **Preisdynamik:** Preis‑Multiplikator um Baseline herum anhand Segment‑Fit und Angebotslage.
- **Produktvariation:** Terpenprofil variiert je Batch (Einfluss: Klima, Stress, Genetik). Batch übernimmt **gemessene** Terpene → Effekte passen sich an.
- **Nebenwirkungen:** Negativ‑Scores beeinflussen Zufriedenheit/Retouren.
- **UI‑Darstellung:** Radar (Achsen), Balken (Top‑Terpene mg/g), Bubble‑Cloud (Positiv/Negativ‑Tags), Aroma‑Chips.

---

## 8) Daten‑Governance & Versionierung

- **Normalisierungs‑Tag:** z. B. `terpene-mg-g.v1; axes-matrix.v2025-09`.
- **Quellenklassifizierung:** API > Labor > Crowd > Manuell (steuert confidence).
- **Audit‑Trails:** Jeder Import hinterlässt Diff/Changelog (Konzept‑Eintrag, kein Code).

---

## 9) Qualitätssicherung (High‑Level Tests)

- **Schema‑Checks:** Pflichtfelder vorhanden? Skalen \[0..1]? Summen plausibel?
- **Konsistenz:** total_mg_g ≈ Σ components (±Toleranz).
- **Heuristik‑Sanity:** Extremprofile (myrcene‑lastig) → calming/sedation ↑; limonene‑lastig → energizing ↑.
- **Stichproben‑Review:** Manuelle Kurationspunkte im Workflow.

---

## 10) Roadmap (Iterativ)

1. **Kanon definieren** (Terpene, Effekte, Synonyme) + Normalisierungs‑Notizen.
2. **Matrix v1** (Terpen → Achsen) dokumentieren und festpinnen.
3. **Erster Importlauf** (eine Quelle) → Blueprints erstellen.
4. **Validierung & Feinschliff** (Feedback‑Loop, Matrix‑Tuning).
5. **Mehrquellen‑Merge** (Konfliktstrategie, Confidence‑Gewichtung).
6. **Batch‑Level** (realistische Varianz, Spielbalance).

---

## 11) Beispiel‑Blueprint (schematisch, nicht implementierungsnah)

```pseudocode
Blueprint := {
  id,
  displayName,
  chemistry: {
    cannabinoids: { thc:{mean}, cbd:{mean}, ... },
    terpenes: { total_mg_g, components: { terpeneKey -> mg_g } }
  },
  sensory: { aromaNotes: [{ note, weight }, ...] },
  effects: {
    axes: { energizing:{value, confidence}, calming:{...}, focus:{...}, euphoria:{...}, sedation:{...} },
    positives: { effectKey -> value },
    negatives: { effectKey -> value }
  },
  provenance: { sources:[...], normalization: tag }
}
```

---

## 12) Schnittstellen zum Rest des Systems

- **Importer** (konzeptuell): nimmt beliebige Quellen, liefert normalisierte Blueprints.
- **Validator** (konzeptuell): prüft Skalen/Schlüssel/Konsistenz.
- **Exporter** (konzeptuell): bündelt Blueprints (z. B. ZIP), inklusive Audit‑Metadaten.
- **UI/Gameplay** liest nur **normierte** Felder – Quelle/Confidence steuern Tooltips und Balance.

---

**Ergebnis:** Eine klare, implementierungsneutrale Blaupause, die Terpene & Effekte konsistent in deine Strain‑Blueprints integriert und gleichzeitig genügend Freiheitsgrade für spätere Feinjustierung, Mehrquellen‑Merges und Spielbalancing lässt.
