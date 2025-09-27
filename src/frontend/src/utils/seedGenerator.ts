import seedConfigJson from '../data/configs/seed-config.json';

type WeightedLexiconEntry = readonly [word: string, weight: number];

interface SeedLexicon {
  color: WeightedLexiconEntry[];
  strain: WeightedLexiconEntry[];
  fruit: WeightedLexiconEntry[];
  dessert: WeightedLexiconEntry[];
  suffix: WeightedLexiconEntry[];
}

type TemplatePart = keyof SeedLexicon;

interface TemplateOptions {
  preferAlliteration: boolean;
  maxLen?: number;
}

interface Template {
  parts: TemplatePart[];
  weight: number;
  options: TemplateOptions;
}

interface SeedConfig {
  separator: string;
  minScore: number;
  count: number;
  blacklist: string[];
  lexicon: SeedLexicon;
  templates: Template[];
}

const seedConfig = seedConfigJson as unknown as SeedConfig;

// MULLBERRY32 PRNG implementation
class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

// Convert microtime to 32-bit seed
function microtimeTo32BitSeed(): number {
  const now = Date.now();
  return (now ^ (now >>> 16)) & 0xffffffff;
}

// Helper functions
function normalizeCapitalize(tokens: string[]): string[] {
  return tokens.map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase());
}

function normalizePascal(tokens: string[]): string[] {
  return tokens.map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase());
}

function toJoined(tokens: string[], separator: string): string {
  const normalized = normalizeCapitalize(tokens);
  return normalized.join(separator);
}

function toPascal(tokens: string[]): string {
  const normalized = normalizePascal(tokens);
  return normalized.join('');
}

function isVowel(char: string): boolean {
  return ['a', 'e', 'i', 'o', 'u'].includes(char.toLowerCase());
}

function endsWithVowel(word: string): boolean {
  return isVowel(word[word.length - 1]);
}

function startsWithVowel(word: string): boolean {
  return isVowel(word[0]);
}

function endsWithConsonant(word: string): boolean {
  return !endsWithVowel(word);
}

function startsWithConsonant(word: string): boolean {
  return !startsWithVowel(word);
}

function allStartWithSameLetter(tokens: string[]): boolean {
  if (tokens.length < 2) return false;
  const firstLetter = tokens[0].toLowerCase()[0];
  return tokens.every((token) => token.toLowerCase()[0] === firstLetter);
}

function hasHardCluster(word: string): boolean {
  const hardClusters = ['sk', 'zk', 'gz', 'zd', 'ch', 'sh', 'th', 'ph'];
  return hardClusters.some((cluster) => word.toLowerCase().includes(cluster));
}

function hardClusterEndStart(wordA: string, wordB: string): boolean {
  const endA = wordA.toLowerCase().slice(-2);
  const startB = wordB.toLowerCase().slice(0, 2);
  return hasHardCluster(endA) && hasHardCluster(startB);
}

function pickWeighted(
  items: readonly WeightedLexiconEntry[],
  rng: Mulberry32,
  preferAlliterationWith?: string,
): string {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty lexicon.');
  }

  const preferredLetter = preferAlliterationWith?.toLowerCase()[0];
  const pool = items.map(([word, weight]) => {
    const bonus = preferredLetter && word.toLowerCase()[0] === preferredLetter ? 0.3 : 0;
    return [word, weight + bonus] as [string, number];
  });

  const totalWeight = pool.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight <= 0) {
    return pool[0][0];
  }

  const r = rng.next() * totalWeight;

  let cumulativeWeight = 0;
  for (const [word, weight] of pool) {
    cumulativeWeight += weight;
    if (cumulativeWeight >= r) {
      return word;
    }
  }

  return pool[pool.length - 1][0]; // fallback
}

function score(tokens: string[]): number {
  let score = 0;

  // Alliteration bonus
  if (allStartWithSameLetter(tokens) && tokens.length > 1) {
    score += 1.2;
  }

  // Transition quality
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i].toLowerCase();
    const b = tokens[i + 1].toLowerCase();

    // Vowel ↔ consonant flow
    if (
      (endsWithVowel(a) && startsWithConsonant(b)) ||
      (endsWithConsonant(a) && startsWithVowel(b))
    ) {
      score += 0.6;
    }

    // Penalize double letter at boundary
    if (a[a.length - 1] === b[0]) {
      score -= 0.5;
    }

    // Penalize harsh clusters
    if (hardClusterEndStart(a, b)) {
      score -= 0.4;
    }
  }

  // Length heuristic on Pascal form
  const pascal = toPascal(tokens);
  if (pascal.length >= 10 && pascal.length <= 18) {
    score += 0.6;
  }
  if (pascal.length > 22) {
    score -= 0.8;
  }
  if (pascal.length < 8) {
    score -= 0.3;
  }

  // Bonus for strong endings
  const strongEndings = [
    'Gold',
    'Fuel',
    'Punch',
    'Rush',
    'Prime',
    'Ultra',
    'Nova',
    'Max',
    'Pro',
    'King',
    'Queen',
  ];
  if (strongEndings.some((ending) => pascal.endsWith(ending))) {
    score += 0.4;
  }

  return score;
}

function chooseTemplate(templates: readonly Template[], rng: Mulberry32): Template {
  if (templates.length === 0) {
    throw new Error('Cannot choose a template from an empty list.');
  }

  const totalWeight = templates.reduce((sum, template) => sum + template.weight, 0);
  if (totalWeight <= 0) {
    return templates[0];
  }

  const r = rng.next() * totalWeight;

  let cumulativeWeight = 0;
  for (const template of templates) {
    cumulativeWeight += template.weight;
    if (cumulativeWeight >= r) {
      return template;
    }
  }

  return templates[templates.length - 1]; // fallback
}

// Main generation function
export function generateSeed(): string {
  const cfg = seedConfig;

  const rng = new Mulberry32(microtimeTo32BitSeed());

  const separator = cfg.separator || '-';
  const minScore = cfg.minScore || 0.6;
  const target = cfg.count || 1;
  const blacklist = new Set<string>(cfg.blacklist);
  const maxTries = target * 40;

  let tries = 0;
  const results: string[] = [];

  while (results.length < target && tries < maxTries) {
    tries++;
    const template = chooseTemplate(cfg.templates, rng);

    const [firstCategory, ...remainingParts] = template.parts;
    const firstToken = pickWeighted(cfg.lexicon[firstCategory], rng);
    const tokens = [firstToken];

    for (const category of remainingParts) {
      const prefer = template.options.preferAlliteration ? firstToken : undefined;
      const token = pickWeighted(cfg.lexicon[category], rng, prefer);
      tokens.push(token);
    }

    // Local search to improve score
    let bestTokens = [...tokens];
    let bestScore = score(bestTokens);

    for (let mutation = 0; mutation < 3; mutation++) {
      const idx = rng.nextInt(bestTokens.length);
      const category = template.parts[idx];
      const prefer = template.options.preferAlliteration ? bestTokens[0] : undefined;
      const alternative = pickWeighted(cfg.lexicon[category], rng, prefer);

      const mutated = [...bestTokens];
      mutated[idx] = alternative;
      const newScore = score(mutated);

      if (newScore > bestScore) {
        bestTokens = mutated;
        bestScore = newScore;
      }
    }

    // Check max length constraint
    const pascal = toPascal(bestTokens);
    if (template.options.maxLen && pascal.length > template.options.maxLen) {
      continue;
    }

    // Check quality threshold
    if (bestScore < minScore) {
      continue;
    }

    const candidate = toJoined(bestTokens, separator);

    // Check blacklist
    if (blacklist.has(candidate)) {
      continue;
    }

    results.push(candidate);
    blacklist.add(candidate);
  }

  return results[0] || 'default-seed';
}

// Generate a seed based on current microtime
export function generateTimestampSeed(): string {
  return generateSeed();
}
