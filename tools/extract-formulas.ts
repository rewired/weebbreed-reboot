import { promises as fs } from 'node:fs';
import path from 'node:path';

/* eslint-disable no-useless-escape */

interface FormulaSpec {
  file: string;
  formula: string;
  topic: string;
}

interface FormulaEntry {
  id: string;
  topic: string;
  formula: string;
  sourcePath: string;
  heading: string;
  anchor: string;
  startLine: number;
  endLine: number;
  context: string;
  glossary: string[];
}

const FORMULA_SPECS: FormulaSpec[] = [
  { file: 'docs/DD.md', formula: 'sum ≤ 1', topic: 'Genetics' },
  { file: 'docs/DD.md', formula: '`1.0` = neutral', topic: 'Resilience' },
  { file: 'docs/DD.md', formula: '±noise × base', topic: 'Breeding' },
  {
    file: 'docs/DD.md',
    formula: 'Max plant count = `floor(zoneArea / areaPerPlant)`',
    topic: 'Capacity',
  },
  { file: 'docs/DD.md', formula: 'tickLengthMinutes / 60', topic: 'Time Scaling' },
  {
    file: 'docs/system/wb-physio.md',
    formula: 'Tₜ = Tₐ + (T₀ − Tₐ) · exp(−k · Δt)',
    topic: 'Temperature',
  },
  {
    file: 'docs/system/wb-physio.md',
    formula: 'g_c = g₀ · clamp(LAI / 3, 0.3, 2)',
    topic: 'Transpiration',
  },
  {
    file: 'docs/system/wb-physio.md',
    formula: 'E = g_c · VPD · f_stomatal',
    topic: 'Transpiration',
  },
  {
    file: 'docs/system/wb-physio.md',
    formula: 'litres = E · area · Δt · 3600 · 0.018',
    topic: 'Transpiration',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'accumulatedMs += now - lastNow',
    topic: 'Scheduler',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'accumulatedMs ≥ tickIntervalMs / gameSpeed',
    topic: 'Scheduler',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'accumulatedMs -= tickIntervalMs / gameSpeed',
    topic: 'Scheduler',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula:
      'ΔRH = (mass_kg ÷ (volume_m3 × SATURATION_VAPOR_DENSITY_KG_PER_M3)) × efficiency × powerMod',
    topic: 'Humidity',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'Δ = k_mix * (ambient − current)',
    topic: 'Environment',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'req_phase = curve[phase]',
    topic: 'Nutrition',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'req_tick_plant = req_phase * (zoneArea / plantCount) * (tickHours / 24)',
    topic: 'Nutrition',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'stress_raw = Σ w_D * penalty_D',
    topic: 'Stress',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'stress = clamp01(stress_raw * (1 − generalResilience))',
    topic: 'Stress',
  },
  { file: 'docs/system/simulation-engine.md', formula: 'stress > θ_stress', topic: 'Stress' },
  { file: 'docs/system/simulation-engine.md', formula: 'health -= α * stress', topic: 'Health' },
  { file: 'docs/system/simulation-engine.md', formula: 'health += β_recovery', topic: 'Health' },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'actualGrowth = potentialGrowth * health * (1 − γ * stress)',
    topic: 'Growth',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'tickHours = tickLengthMinutes / 60',
    topic: 'Time Scaling',
  },
  {
    file: 'docs/system/simulation-engine.md',
    formula: 'device.power_kW × tickHours × electricityCostPerKWh',
    topic: 'Energy',
  },
  {
    file: 'docs/TDD.md',
    formula: 'U = w1*priority + w2*skillMatch + w3*roleAffinity + w4*urgency',
    topic: 'Tasks',
  },
  {
    file: 'docs/TDD.md',
    formula: 'w5*distance - w6*fatigue + w7*morale + w8*toolAvailability ± traitMods',
    topic: 'Tasks',
  },
  {
    file: 'docs/system/job_market_population.md',
    formula: 'Math.floor(tick / 168)',
    topic: 'Scheduler',
  },
  {
    file: 'docs/system/job_market_population.md',
    formula: 'apiSeed = override ?? "<gameSeed>-<weekIndex>"',
    topic: 'Seeding',
  },
  {
    file: 'docs/system/job_market_population.md',
    formula: 'P(other) = pDiverse',
    topic: 'Probability',
  },
  {
    file: 'docs/system/job_market_population.md',
    formula: 'P(male) = P(female) = (1 - pDiverse) / 2',
    topic: 'Probability',
  },
  {
    file: 'docs/system/facade.md',
    formula: 'revenue = `harvestBasePricePerGram × modifiers`',
    topic: 'Economics',
  },
  { file: 'docs/system/employees.md', formula: 'progressTicks >= durationTicks', topic: 'Tasks' },
  {
    file: 'docs/addendum/ideas/breeding_module.md',
    formula: 'T_gen = veg + flower + tail + post',
    topic: 'Breeding',
  },
  {
    file: 'docs/addendum/ideas/breeding_module.md',
    formula: 'veg   = avg(vegetationDays[A], vegetationDays[B])',
    topic: 'Breeding',
  },
  {
    file: 'docs/addendum/ideas/breeding_module.md',
    formula: 'flower= avg(floweringDays[A],  floweringDays[B])',
    topic: 'Breeding',
  },
  {
    file: 'docs/addendum/ideas/breeding_module.md',
    formula: 'tail  = max(0, seedMaturationDays - (flower - pollinationDayInFlower))',
    topic: 'Breeding',
  },
  {
    file: 'docs/addendum/ideas/breeding_module.md',
    formula: 'post  = postProcessingDays',
    topic: 'Breeding',
  },
  {
    file: 'docs/addendum/ideas/breeding_module.md',
    formula: 'effectiveDays ≈ ceil(T_gen / parallelBatches)',
    topic: 'Breeding',
  },
  {
    file: 'docs/addendum/ideas/terpenes.md',
    formula: 'w_t = mg_g_t / total_mg_g',
    topic: 'Terpenes',
  },
  // eslint-disable-next-line no-useless-escape
  {
    file: 'docs/addendum/ideas/terpenes.md',
    formula: String.raw`axis = Σ (share_terpene × weight_terpene→axis) → clamp \[0..1]`,
    topic: 'Terpenes',
  },
];

const DOCS_ROOT = process.cwd();
const EXTRACTION_DIR = path.join('docs', '_extraction');
const FORMULA_MD_PATH = path.join(EXTRACTION_DIR, 'formulas.md');
const FORMULA_INDEX_PATH = path.join(EXTRACTION_DIR, 'formulas_index.json');

async function main() {
  const entries: FormulaEntry[] = [];

  for (let i = 0; i < FORMULA_SPECS.length; i += 1) {
    const spec = FORMULA_SPECS[i];
    const absolutePath = path.join(DOCS_ROOT, spec.file);
    const content = await fs.readFile(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const matchInfo = locateFormula(lines, spec.formula);
    if (!matchInfo) {
      throw new Error(`Formula not found: ${spec.formula} in ${spec.file}`);
    }
    const { lineIndex, matchText } = matchInfo;
    const headingInfo = findHeading(lines, lineIndex);
    const context = lines[lineIndex]?.trim() ?? '';
    entries.push({
      id: '',
      topic: spec.topic,
      formula: normalizeFormula(matchText),
      sourcePath: spec.file,
      heading: headingInfo.heading,
      anchor: headingInfo.anchor,
      startLine: lineIndex + 1,
      endLine: lineIndex + 1,
      context,
      glossary: [],
    });
  }

  entries.sort((a, b) => {
    if (a.sourcePath === b.sourcePath) {
      return a.startLine - b.startLine;
    }
    return a.sourcePath.localeCompare(b.sourcePath);
  });

  entries.forEach((entry, index) => {
    entry.id = `F-${(index + 1).toString().padStart(4, '0')}`;
  });

  await fs.mkdir(EXTRACTION_DIR, { recursive: true });
  await fs.writeFile(FORMULA_MD_PATH, buildMarkdown(entries), 'utf8');
  await fs.writeFile(FORMULA_INDEX_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

function locateFormula(
  lines: string[],
  formula: string,
): { lineIndex: number; matchText: string } | null {
  const escaped = escapeRegex(formula);
  const regex = new RegExp(escaped);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(regex);
    if (match) {
      return { lineIndex: i, matchText: match[0] };
    }
  }
  return null;
}

function findHeading(lines: string[], lineIndex: number): { heading: string; anchor: string } {
  for (let i = lineIndex; i >= 0; i -= 1) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const heading = headingMatch[2].trim();
      return { heading, anchor: slugify(heading) };
    }
  }
  return { heading: '', anchor: '' };
}

function normalizeFormula(text: string): string {
  return text.replace(/`/g, '').trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=|{}\[\]:;"'<>?,./\\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildMarkdown(entries: FormulaEntry[]): string {
  const lines: string[] = [];
  lines.push('# Extracted Formulas');
  lines.push('');
  for (const entry of entries) {
    lines.push(`## ${entry.id} — ${entry.topic}`);
    lines.push('');
    const source = `${entry.sourcePath}#${entry.anchor}`;
    const lineSpan = `L${entry.startLine}`;
    lines.push(`- Source: ${source} (${lineSpan})`);
    if (entry.heading) {
      lines.push(`- Heading: ${entry.heading}`);
    }
    lines.push('');
    if (entry.context) {
      lines.push('> ' + entry.context);
      lines.push('');
    }
    lines.push('```math');
    lines.push(entry.formula);
    lines.push('```');
    lines.push('');
    if (entry.glossary.length) {
      lines.push('**Glossary**');
      for (const item of entry.glossary) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
