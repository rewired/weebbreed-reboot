# Weedbreed.AI — Vision & Scope

---

## 1. Vision

**Elevator Pitch.** *Weed Breed* ist eine modulare, deterministische Pflanzen‑/Grow‑Simulation als Spiel. Spieler\:innen planen Strukturen (Gebäude → Räume → Zonen → Pflanzen), steuern Klima und Geräte, balancieren Kosten und Ertrag und erleben vollständige Anbauzyklen – von Saat bis Ernte und Nachernte. Das System ist offen, erweiterbar und inhaltlich datengetrieben (Blueprint‑JSONs), sodass Community, Modder und Forschende Inhalte leicht ergänzen können.

**Warum jetzt?** Es gibt reichlich „Tycoon“-Spiele, aber kaum Titel, die **physikalisch plausibles Klima & Pflanzenphysiologie** mit **ökonomischem Gameplay** und **Determinismus** verbinden. *Weed Breed* schließt diese Lücke.

**Guiding Principles.**

1. **Determinismus vor Optik.** Reproduzierbare Läufe schlagen visuelle Effekte.
2. **Spielbarkeit vor Realismus.** Plausibel statt strikt wissenschaftlich – wo nötig mit klaren Vereinfachungen.
3. **Offene Architektur.** Daten‑/Modding‑First, klare Schnittstellen, stabile Formate.
4. **Transparenz.** Sichtbare Metriken, nachvollziehbare Entscheidungen (Logs, Audits, Replays).
5. **Kleine, starke Schleifen.** Spaß entsteht durch sinnvolle Mikro‑Entscheidungen im Tagesbetrieb.

**Nicht‑Ziele (Anti‑Scope).**

* Kein politisches/regulatorisches Simulationssystem; rechtliche Aspekte bleiben abstrahiert.
* Keine Shooter/Action‑Mechaniken.
* Keine exakten wissenschaftlichen Wachstumsmodelle mit Laborgenauigkeit; Fokus bleibt „plausibel & spielbar“.

**Erlebnis‑Pfeiler.**

* **Planen & Optimieren:** Klima, Licht, CO₂, Geräte‑Upgrades.
* **Risikomanagement:** Schädlinge/Krankheiten, Ressourcen‑Engpässe, Geräteverschleiß.
* **Wirtschaft:** Opex/Capex, Cashflow, Break‑even, Preis/Qualität.

---

## 2. Zielgruppen & Stakeholder

**Primäre Personas.**

* *Der/Die Optimierer\:in* – liebt Tabellen, will Kennzahlen verbessern (PPFD, VPD, €/g).
* *Der/Die Gestalter\:in* – baut schöne, effiziente Setups, mag Upgrades & Layout.
* *Der/Die Lernende* – will Zusammenhänge zwischen Klima, Pflanze, Ertrag verstehen.

**Stakeholder & Entscheidungshoheit (RACI‑light).**

* *Product/Design:* Vision, Prioritäten, Balancing‑Leitplanken.
* *Engineering:* Architektur, Qualität, deterministische Simulationsbasis.
* *Content:* Blueprints (Strains/Devices/Methods), Datenqualität, Quellen.

**Nutzungsumfeld.** Solo‑Spiel, optional Sandbox/Editor‑Modus. Streaming‑tauglich (klare Visuals, lesbare KPIs).

---

## 3. Erfolgskriterien

**Outcome‑KPIs (Ziele).**

* **First Harvest Time:** Erste Ernte < **30 Minuten** Spielzeit (MVP‑Default‑Setup). *(OPEN: validieren)*
* **Retention‑Proxy:** 70 % der Spieler\:innen erreichen Tag 7 einer Sandbox‑Save. *(OPEN: messen)*
* **Determinismus‑Score:** Referenz‑Run (200 Tage) reproduzierbar innerhalb **±0,5 %** bei Kernmetriken.

**Qualitätsziele/SLOs.**

* **Performance:** Referenz‑Szenario (s. unten) läuft bei **1× Geschwindigkeit** stabil mit **≥ 1 Tick/s** (1 In‑Game‑Tag in ≤ 24 s). Pro‑Tick‑Budget ≤ **50 ms** CPU‑Zeit.
* **Stabilität:** Keine Sim‑Deadlocks; Recovery nach Crash ohne Datenverlust (< 1 Tick).
* **Speicherziel:** Referenz‑Szenario < **1,0 GB RAM**. *(OPEN: finalisieren)*

**Referenz‑Szenario (Leistungs‑Benchmark & Balancing‑Grundlage).**

* **Struktur:** 1 mittleres Lager.
* **Räume 1:** 2 Zuchträume
  * **Zonen:** 5 Zonen mit unterschiedlichen **cultivationMethods** und **MAX** Pflanzen pro Zone. 10.000l Wasser und 100kg Nutrient.
* **Räume 2:** 1 Break Room für 8 Mitarbeiter:
  * **Zonen:** keine für den Break Room nötig
* **Personal:** 8 Mitarbeitende (mind. 4× Gardener, 2× Technician, 2× Janitor).
* **Startkapital:** 100.000.000.
* **Ziel:** Dieses Szenario dient als feste Lastvorgabe für Performance‑Messungen (≥ 1 Tick/s bei 1×) und als Grundlage für Balancing‑Pässe.

---

## 4. Domänenmodell (kanonisch)

**Kern‑Entitäten & Beziehungen.**

* **Structure → Room → Zone → Plant** (hierarchisch).
* **Devices** (z. B. Lamp, ClimateUnit, CO₂‑Injector, Dehumidifier) werden **Zonen** zugewiesen.
* **Strains** (JSON‑Blueprints) definieren Photoperiode, DLI/PPFD‑Fenster, NPK/Wasser‑Kurven, Stress‑Toleranzen.
* **CultivationMethods** (z. B. SOG/SCROG) setzen Topologie, Pflanzdichte und Arbeitsaufwand.
* **Pests/Diseases** als Ereignisse/Status mit Eintrittswahrscheinlichkeit, Fortschritt, Effekten & Treatments.

**Lebenszyklen.**

* **Pflanze:** Saat → Vegetativ → Blüte → Ernte → Nachernte (Trocknung/Reifung).
* **Gerät:** Effizienz‑Degeneration, Wartung, Austausch‑Trigger (Opex vs Capex‑Kippunkte).

\*\*Zeitskala. Tick‑basiert mit fester Tickdauer: **1 Tick = 1 In‑Game‑Stunde**; **24 Ticks = 1 In‑Game‑Tag**, **7×24 Ticks = 1 In‑Game‑Woche**. Ticks werden in Tages‑/Wochen‑Aggregationen zusammengefasst; Replays/Logs referenzieren Tick‑IDs. *(OPEN: Standard‑Tickdauer, z. B. 1 min)*

**Begriffslexikon (Auszug).**

* **PPFD** (µmol·m⁻²·s⁻¹), **DLI** (mol·m⁻²·d⁻¹), **VPD** (kPa), **Photoperiode**, **Stress**, **Biomasse**, **Bud‑Yield**.

---

## 5. Simulations‑Philosophie

* **Realismusgrade:** Klima \[plausibel], Wachstum \[semi‑empirisch], Ökonomie \[spielerisch‑plausibel].
* **Determinismus & RNG:** Globaler Seed; alle Zufallsquellen seedbar; deterministische Reihenfolge.
* **Kalibrierung:** Literaturwerte + expertenbasierte Plausibilisierung; Golden‑Runs als Referenz.
* **Balancing:** Kurven/Blueprint‑Parameter; Editor‑gestützte Feinjustierung; automatisierte Smokes (Tages‑Audits).

---

## 6. Progression & Ökonomie

**Makro‑Schleife (Expansion/CapEx).** Strukturen mieten/ausbauen, Geräte kaufen/tauschen, Methoden freischalten.
**Mikro‑Schleife (Tagesbetrieb/Opex).** Klima steuern, Bewässern/NPK, Schädlingskontrolle, Personal/Tasks.

**Kostenlogik.**

* **CapEx:** Anschaffungskosten pro Gerät, Abschreibung/Restwert.
* **OpEx:** Energie, Wasser, Nährstoffe, Wartung (**steigend**), Verbrauchsmaterial.
* **Austausch‑Kippunkt:** Wenn Wartung + Effizienzverlust > Einsparung durch Upgrade → **Agent schlägt Tausch vor**.

**Erlöse.** Qualität × Menge × Marktpreis (Balancing‑Matrix).

---

## 6a. Qualitätsgrade & Preisfunktionen

**Numerischer Qualitätsbegriff.**

* Qualität wird **numerisch** auf einer Skala **0–100** geführt (ganzzahlig), wobei **70** der markttechnische **Baseline‑Wert** ist (Listenpreis ohne Zu-/Abschlag).
* **Gerätequalität (Blueprint‑Feld `quality`)** beeinflusst **Anfangshaltbarkeit** und **Anfangseffizienz** eines Geräts.

**Gerätequalität → Haltbarkeit/Effizienz.**

* *Haltbarkeit:* `baseMTBF = spec.MTBF * (1 + (quality-70)/100)`
* *Effizienz:* `baseEfficiency = spec.efficiency * (1 + (quality-70)/200)`
  (Beide Formeln sind Platzhalter‑Kurven und können pro Gerätetyp differenziert werden.)

**Erntequalität (Pseudocode).**

```pseudo
function calculateHarvestQuality(finalHealth /*0..1*/, avgStress /*0..1*/, geneticQuality /*0..100*/, methodModifier /*~0.9..1.1*/): int {
  // Basiskomponenten normalisieren
  let healthScore   = clamp01(finalHealth)
  let stressPenalty = clamp01(avgStress)

  // Gewichte (Summe ≈ 1.0)
  const W_HEALTH = 0.55
  const W_STRESS = 0.25
  const W_GENET  = 0.20

  // Qualitätsrohwert 0..100
  let q = 100 * (
      W_HEALTH * healthScore
    + W_GENET  * (geneticQuality / 100)
    + W_STRESS * (1 - stressPenalty)
  )

  // Methode (SOG/SCROG etc.) wirkt leicht multiplicativ
  q = q * methodModifier

  // Soft‑Caps und Clamps
  if (q > 95) q = 95 + 0.5 * (q - 95)   // abflachen nahe Maximum
  return round(clamp(q, 0, 100))
}
```

**Preisfunktion (nicht‑linear, Pseudocode).**

```pseudo
function calculateSalePrice(basePrice, quality /*0..100*/): number {
  const BASELINE = 70
  const q = clamp(quality, 0, 100)

  if (q >= BASELINE) {
    // Überdurchschnittliche Qualität wird überproportional belohnt
    // Exponent > 1 verstärkt den Bonus
    const alpha = 1.25
    const factor = Math.pow(q / BASELINE, alpha)
    return basePrice * factor
  } else {
    // Unterdurchschnittliche Qualität führt zu starkem Abschlag (konvex)
    const beta = 1.5
    const factor = Math.pow(q / BASELINE, beta) // 0..1
    // Zusätzlicher Penalty‑Knick unter 50
    const kink = (q < 50) ? 0.85 : 1.0
    return basePrice * factor * kink
  }
}
```

**Design‑Intention.**

* **Exzellenz lohnt sich stark** (exponentieller Bonus), **Mittelmaß ist neutral**, **schwache Qualität wird hart bestraft**. Dadurch entsteht ein klarer Anreiz, Klima/Methoden/Personal und Gerätequalität zu optimieren.

---

## 7. Automatisierung & Agenten

**Agentenrollen (Beispiele).**

* **Auto‑Replant‑Agent:** Trigger „Zone ready“ → Setzling einsetzen; Priorität *hoch*; Fallback: Manual‑Task‑Queue.
* **Harvest‑Scheduler:** Reifegrad‑Erkennung, Slot‑Planung, Puffer für Nachernte‑Kapazität.
* **Climate‑Controller:** Zielkorridor halten (Temp/RH/CO₂/PPFD), Kosten‑sensitiv (Energiepreise).
* **Maintenance‑Advisor:** Degeneration/MTBF beobachten, Wartungsfenster planen, Tausch empfehlen.
* **Pest/Disease‑Manager:** Risikoabschätzung, Behandlung planen (Kosten/Nutzen/Qualitätseinfluss).

**Konfliktlösung & Prioritäten.** Zentraler **Task‑Arbiter** vergibt Slots nach Wichtigkeit (Pflanzenschutz > Ernte > Replant > Komfort).
**Fehlerzustände.** Ressourcen‑Mangel → degrade‑Modus (sichere Defaults); Dead‑Device → Notabschaltung & Alarm.

---

## 8. Inhalte & Datenstrategie

* **v1‑Umfang (Zielwerte):** \~8–12 Strains, \~10–15 Devices, 2–3 CultivationMethods, Basis‑Pests/Diseases, Treatments. *(OPEN: finale Liste)*
* **Quellen/Lizenzen:** Dokumentation der Datenherkünfte, Attribution, OS‑freundliche Lizenzen.
* **Modding/Editoren:** JSON‑Formate stabil (SemVer); In‑Game‑Editoren für Strains/Devices/Methods geplant.

---

## 9. UX‑ & Präsentations‑Vision (technologieagnostisch)

* **Schlüssel‑Screens:** Start (New/Load/Import), Dashboard (Zeit/Tick, Energie/Wasser/€), Struktur‑Explorer (Structure → Room → Zone → Plant), Detail‑Pane mit KPIs & Stress‑Breakdown, Shop/Research, Logs/Audits.
* **Informationshierarchie:** Oben: Tick/Zeit, Tageskosten, Energie/Wasser, Kontostand; Mitte: aktive Zone/Plant KPIs; Unten: Ereignisse/Tasks.
* **Zugänglichkeit:** Einheiten strikt SI, klare Tooltips, Farbschwächen‑freundliche Paletten, skalierbare Typografie.

---

## 10. Persistenz & Kompatibilität

* **Save/Load‑Versprechen:** Vorwärts‑Migration mit Schema‑Versionen (SemVer), Migrationsskripte; Crash‑sichere Saves.
* **Export/Replay:** JSONL‑Logs pro Tag/Ernte; deterministische Replays aus Seed + Input‑Stream.

---

## 11. Telemetrie, Validierung & Tests

* **Sim‑Audits:** Tages‑Summaries (Biomasse, Wasser, NPK, Energie, Kosten, Stress), Ernte‑Summaries (Yield, Qualität, €/g).
* **Deterministische Testläufe:** Referenz‑Seeds (z. B. `WB_SEED=golden-200d`), Golden‑Files, Toleranzen.
* **Observability:** Event‑Bus‑Proben, Tick‑Latenz, Dropped‑Tasks, OOM‑Wächter.

---

## 12. Nicht‑funktionale Anforderungen (NFR)

* **Performance:** Ziel‑Ticks/s je Referenz‑Szenario (s. §3); lineare Skalierung je Zone/Plant mit Obergrenzen.
* **Robustheit:** Safe‑Defaults bei Parameterfehlern; Validierung aller Blueprints beim Laden (Schema).
* **Sicherheit/Privacy:** Lokale Saves per Default; keine personenbezogenen Daten.
* **Internationalisierung:** Sprache DE/EN, SI‑Einheiten; Dezimal‑/Datumsformat konfigurierbar.

---

## 13. Recht & Ethik

* **Darstellung:** Neutrale, sachliche Darstellung; keine Glorifizierung; Altersfreigabe beachten.
* **Open‑Source‑Strategie:** Lizenzmodell (z. B. AGPL/Polyform?); Beiträge via PR‑Policy, CLA *(OPEN: festlegen)*.

---

## 14. Roadmap & Releasekriterien

**Milestones.**

1. **MVP**: Eine Struktur, einfache Klima‑Kontrolle, 1–2 Strains, 1 Methode, Basis‑Ökonomie, Save/Load, deterministischer 30‑Tage‑Run.
2. **Alpha**: Pests/Diseases + Treatments, Geräte‑Degeneration/Wartung, Shop/Research‑Loop, Editor‑v1.
3. **Beta**: Balancing‑Pass, Golden‑Runs (200 Tage), Stabilitäts‑SLOs erreicht, Localization EN/DE.
4. **1.0**: Inhaltspolitur, Modding‑Docs, Replay‑Exporter, Performance‑Tuning.

**Definition of Done (MVP).**

* Erste Ernte < 30 Min im Default‑Szenario.
* Reproduzierbarer Referenz‑Run (±0,5 %).
* Schema‑Versionierung & Migration vorhanden.
* Crash‑sichere Saves & Wiederanlauf.

---

## 15. Risiken & Annahmen

**Top‑Risiken.**

* **Balancing‑Komplexität:** Multiplikationseffekte aus Klima×Strain×Geräten.
* **Agenten‑Patts:** „Niemand fühlt sich zuständig“ → Deadlocks.
* **Datenqualität:** Unvollständige/uneinheitliche Blueprints.

**Gegenmaßnahmen.**

* Strikte Audit‑Metriken, schrittweise Freischaltung von Systemen (Feature Flags).
* Zentraler Task‑Arbiter, Deadlock‑Detektor, Fallback‑Tasks.
* Schema‑Validierung, Content‑Reviews, Test‑Seeds.

**Annahmen.**

* Community will Modding; deterministische Replays sind Kernnutzen; SI‑Einheiten sind akzeptiert.

---

> **Hinweis:** Dieses Dokument ist **technologieagnostisch**. Die konkrete Tech‑Ausprägung (Engine, UI‑Stack etc.) wird separat in „Architecture & Implementation Choices“ dokumentiert.
