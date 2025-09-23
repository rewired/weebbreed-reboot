import process from 'node:process';

import { logger } from '@runtime/logger.js';
import { createSeededStreamGenerator, RNG_STREAM_IDS, RngService, RngStream } from '@/lib/rng.js';
import type {
  ApplicantState,
  EmployeeRole,
  EmployeeSkills,
  GameState,
  PersonnelNameDirectory,
  SkillName,
} from '@/state/models.js';
import { generateId } from '@/state/initialization/common.js';
import {
  DEFAULT_SALARY_BY_ROLE,
  loadPersonnelDirectory,
} from '@/state/initialization/personnel.js';
import type {
  CommandExecutionContext,
  CommandResult,
  RefreshCandidatesIntent,
} from '@/facade/index.js';
import type { SimulationPhaseContext, SimulationPhaseHandler } from '@/sim/loop.js';

const TICKS_PER_WEEK = 168;
const DEFAULT_BATCH_SIZE = 12;
const DEFAULT_MAX_RETRIES = 2;
const JOB_MARKET_STREAM_ID = RNG_STREAM_IDS.jobMarket;
const JOB_MARKET_CANDIDATE_STREAM_ID = RNG_STREAM_IDS.jobMarketCandidates;

const SKILL_NAMES: SkillName[] = [
  'Gardening',
  'Maintenance',
  'Logistics',
  'Cleanliness',
  'Administration',
];

const ROLE_SKILL_PROFILE: Record<
  EmployeeRole,
  { primary: SkillName; secondary?: SkillName; tertiary?: SkillName }
> = {
  Gardener: { primary: 'Gardening', secondary: 'Cleanliness' },
  Technician: { primary: 'Maintenance', secondary: 'Logistics' },
  Janitor: { primary: 'Cleanliness', secondary: 'Logistics' },
  Operator: { primary: 'Logistics', secondary: 'Administration' },
  Manager: { primary: 'Administration', secondary: 'Logistics', tertiary: 'Cleanliness' },
};

const ROLE_WEIGHTS: Array<{ role: EmployeeRole; weight: number }> = [
  { role: 'Gardener', weight: 0.35 },
  { role: 'Technician', weight: 0.2 },
  { role: 'Operator', weight: 0.18 },
  { role: 'Janitor', weight: 0.15 },
  { role: 'Manager', weight: 0.12 },
];

const SALARY_TRAIT_MODIFIERS: Record<string, number> = {
  trait_frugal: 0.95,
  trait_demanding: 1.08,
};

const toGender = (value: unknown): ApplicantState['gender'] => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female') {
    return normalized;
  }
  if (normalized.length === 0) {
    return undefined;
  }
  return 'other';
};

interface RandomUserProfile {
  gender?: string;
  name?: { first?: string; last?: string };
  login?: { salt?: string };
}

interface RandomUserResponse {
  results?: RandomUserProfile[];
}

interface CandidateBaseProfile {
  firstName: string;
  lastName: string;
  gender?: ApplicantState['gender'];
  personalSeed: string;
}

export type CandidateSource = 'remote' | 'local';

export interface JobMarketRefreshSummary {
  count: number;
  seed: string;
  week: number;
  source: CandidateSource;
  policyId?: string;
  retries: number;
  reason: 'manual' | 'auto';
}

interface CandidateGenerationResult {
  applicants: ApplicantState[];
  source: CandidateSource;
  retries: number;
}

interface FetchResult {
  profiles: RandomUserProfile[];
  attempts: number;
}

interface LastRefreshState {
  week: number;
  seed: string;
  source: CandidateSource;
}

export interface JobMarketServiceOptions {
  state: GameState;
  rng: RngService;
  personnelDirectory?: PersonnelNameDirectory;
  dataDirectory?: string;
  fetchImpl?: typeof globalThis.fetch;
  httpEnabled?: boolean;
  batchSize?: number;
  maxRetries?: number;
}

export class JobMarketService {
  private readonly state: GameState;

  private readonly rng: RngService;

  private readonly jobStream: RngStream;

  private readonly batchSize: number;

  private readonly maxRetries: number;

  private readonly fetchImpl?: typeof globalThis.fetch;

  private httpEnabled: boolean;

  private directory?: PersonnelNameDirectory;

  private directoryPromise: Promise<PersonnelNameDirectory | undefined> | null = null;

  private lastRefresh: LastRefreshState | null = null;

  private readonly dataDirectory?: string;

  private readonly logger = logger.child({ component: 'engine.jobMarket' });

  constructor(options: JobMarketServiceOptions) {
    this.state = options.state;
    this.rng = options.rng;
    this.jobStream = this.rng.getStream(JOB_MARKET_STREAM_ID);
    this.batchSize = Math.max(1, Math.trunc(options.batchSize ?? DEFAULT_BATCH_SIZE));
    this.maxRetries = Math.max(1, Math.trunc(options.maxRetries ?? DEFAULT_MAX_RETRIES));
    const globalFetch =
      typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined;
    this.fetchImpl = options.fetchImpl ?? globalFetch;
    const httpDisabledEnv = process.env.WEEBBREED_DISABLE_JOB_MARKET_HTTP === 'true';
    this.httpEnabled = options.httpEnabled ?? !httpDisabledEnv;
    if (!this.fetchImpl) {
      this.httpEnabled = false;
    }
    this.directory = options.personnelDirectory;
    this.dataDirectory = options.dataDirectory;
  }

  createCommitHook(): SimulationPhaseHandler {
    return async (context) => {
      await this.refreshForTick(context, {
        reason: 'auto',
        force: false,
        seedOverride: undefined,
        policyId: undefined,
      });
    };
  }

  async refreshCandidates(
    intent: RefreshCandidatesIntent,
    context: CommandExecutionContext,
  ): Promise<CommandResult<JobMarketRefreshSummary>> {
    const simulationContext: SimulationPhaseContext = {
      state: context.state,
      tick: context.tick,
      tickLengthMinutes: context.state.metadata.tickLengthMinutes,
      phase: 'commit',
      events: context.events,
      accounting: {
        recordUtility: () => undefined,
        recordDevicePurchase: () => undefined,
      },
    };

    const summary = await this.refreshForTick(simulationContext, {
      reason: 'manual',
      force: intent.force,
      seedOverride: intent.seed,
      policyId: intent.policyId,
    });

    if (!summary) {
      const cachedSeed = this.composeApiSeed(this.getCurrentWeek(context.tick), intent.seed);
      const cachedSource = this.lastRefresh?.source ?? 'local';
      return {
        ok: true,
        data: {
          count: this.state.personnel.applicants.length,
          seed: cachedSeed,
          week: this.getCurrentWeek(context.tick),
          source: cachedSource,
          policyId: intent.policyId,
          retries: 0,
          reason: 'manual',
        },
        warnings: [`Candidates already refreshed for week ${this.getCurrentWeek(context.tick)}.`],
      } satisfies CommandResult<JobMarketRefreshSummary>;
    }

    return { ok: true, data: summary } satisfies CommandResult<JobMarketRefreshSummary>;
  }

  private async refreshForTick(
    context: SimulationPhaseContext,
    options: {
      reason: 'manual' | 'auto';
      force?: boolean;
      seedOverride?: string;
      policyId?: string;
    },
  ): Promise<JobMarketRefreshSummary | null> {
    const week = this.getCurrentWeek(context.tick);
    const apiSeed = this.composeApiSeed(week, options.seedOverride);
    const baseForce = options.force ?? options.reason === 'manual';
    const effectiveForce = baseForce || this.state.personnel.applicants.length === 0;

    if (
      !effectiveForce &&
      this.lastRefresh &&
      this.lastRefresh.week === week &&
      this.lastRefresh.seed === apiSeed
    ) {
      return null;
    }

    const generation = await this.generateCandidates(apiSeed, week);
    this.state.personnel.applicants = generation.applicants;
    this.lastRefresh = { week, seed: apiSeed, source: generation.source };

    const summary: JobMarketRefreshSummary = {
      count: generation.applicants.length,
      seed: apiSeed,
      week,
      source: generation.source,
      policyId: options.policyId,
      retries: generation.retries,
      reason: options.reason,
    };

    context.events.queue(
      'hr.candidatesRefreshed',
      {
        ...summary,
        candidateIds: generation.applicants.map((candidate) => candidate.id),
      },
      context.tick,
      'info',
    );

    return summary;
  }

  private getCurrentWeek(tick: number): number {
    if (!Number.isFinite(tick)) {
      return 0;
    }
    const normalized = Math.max(0, Math.trunc(tick));
    return Math.floor(normalized / TICKS_PER_WEEK);
  }

  private composeApiSeed(week: number, override?: string): string {
    if (override && override.trim().length > 0) {
      return override.trim();
    }
    const baseSeed = this.state.metadata.seed ?? 'game';
    return `${baseSeed}-${week}`;
  }

  private async generateCandidates(
    apiSeed: string,
    week: number,
  ): Promise<CandidateGenerationResult> {
    const profiles = await this.fetchProfiles(apiSeed);
    if (profiles) {
      const mapped = await this.buildCandidatesFromProfiles(profiles.profiles, week);
      if (mapped.length >= this.batchSize) {
        return {
          applicants: mapped.slice(0, this.batchSize),
          source: 'remote',
          retries: Math.max(0, profiles.attempts - 1),
        } satisfies CandidateGenerationResult;
      }
      const remaining = this.batchSize - mapped.length;
      const offline = await this.generateOfflineCandidates(remaining, week);
      return {
        applicants: [...mapped, ...offline],
        source: mapped.length > 0 ? 'remote' : 'local',
        retries: Math.max(0, profiles.attempts - 1),
      } satisfies CandidateGenerationResult;
    }

    const offline = await this.generateOfflineCandidates(this.batchSize, week);
    return {
      applicants: offline,
      source: 'local',
      retries: this.maxRetries - 1,
    } satisfies CandidateGenerationResult;
  }

  private async buildCandidatesFromProfiles(
    profiles: RandomUserProfile[],
    week: number,
  ): Promise<ApplicantState[]> {
    const candidates: ApplicantState[] = [];
    const target = Math.min(this.batchSize, profiles.length);
    for (let index = 0; index < target; index += 1) {
      const profile = profiles[index];
      const base = this.extractBaseProfile(profile, week, index);
      if (!base) {
        const fallback = await this.generateOfflineCandidates(1, week);
        candidates.push(...fallback);
        continue;
      }
      candidates.push(await this.createCandidate(base, week));
    }
    return candidates;
  }

  private extractBaseProfile(
    profile: RandomUserProfile | undefined,
    week: number,
    index: number,
  ): CandidateBaseProfile | null {
    if (!profile) {
      return null;
    }
    const rawFirst = profile.name?.first ?? '';
    const rawLast = profile.name?.last ?? '';
    const firstName = this.normaliseName(rawFirst, `Candidate${index + 1}`);
    const lastName = this.normaliseName(rawLast, 'Applicant');
    const gender = toGender(profile.gender);
    const salt = profile.login?.salt;
    const personalSeed =
      typeof salt === 'string' && salt.trim().length > 0
        ? salt.trim()
        : this.generatePersonalSeed(week);
    return { firstName, lastName, gender, personalSeed } satisfies CandidateBaseProfile;
  }

  private async createCandidate(base: CandidateBaseProfile, week: number): Promise<ApplicantState> {
    const personalSeed =
      base.personalSeed.trim().length > 0
        ? base.personalSeed.trim()
        : this.generatePersonalSeed(week);
    const hashedSeed = this.hashSeed(personalSeed);
    const generator = createSeededStreamGenerator(
      String(hashedSeed),
      JOB_MARKET_CANDIDATE_STREAM_ID,
    );
    const stream = new RngStream(JOB_MARKET_CANDIDATE_STREAM_ID, generator);
    const role = this.pickRole(stream);
    const skills = this.rollSkills(role, stream);
    const traits = await this.rollTraits(stream);
    const expectedSalary = this.computeSalary(role, skills, traits, stream);
    const id = generateId(this.jobStream, 'applicant');
    const fullName = `${base.firstName} ${base.lastName}`.trim();

    return {
      id,
      name: fullName,
      desiredRole: role,
      expectedSalary,
      traits,
      skills,
      personalSeed,
      gender: base.gender,
    } satisfies ApplicantState;
  }

  private pickRole(stream: RngStream): EmployeeRole {
    const roll = stream.next();
    let accumulator = 0;
    for (const entry of ROLE_WEIGHTS) {
      accumulator += entry.weight;
      if (roll <= accumulator) {
        return entry.role;
      }
    }
    return ROLE_WEIGHTS[ROLE_WEIGHTS.length - 1]?.role ?? 'Gardener';
  }

  private rollSkills(role: EmployeeRole, stream: RngStream): EmployeeSkills {
    const profile = ROLE_SKILL_PROFILE[role];
    const result: EmployeeSkills = {};
    const primaryLevel = this.clamp(Math.round(2 + stream.nextRange(0, 3)), 1, 5);
    result[profile.primary] = primaryLevel;

    if (profile.secondary) {
      const secondaryBase = this.clamp(Math.round(stream.nextRange(1, 4)), 1, 4);
      result[profile.secondary] = secondaryBase;
    }

    const shouldAddTertiary = profile.tertiary ? stream.nextBoolean(0.4) : stream.nextBoolean(0.25);
    if (shouldAddTertiary) {
      const candidates = SKILL_NAMES.filter(
        (skill) =>
          skill !== profile.primary && skill !== profile.secondary && skill !== profile.tertiary,
      );
      const tertiarySkill = profile.tertiary ?? candidates[stream.nextInt(candidates.length)];
      const tertiaryLevel = this.clamp(Math.round(stream.nextRange(1, 3)), 1, 3);
      result[tertiarySkill] = tertiaryLevel;
    }

    return result;
  }

  private async rollTraits(stream: RngStream): Promise<string[]> {
    const directory = await this.getDirectory();
    const available = directory?.traits ?? [];
    if (available.length === 0) {
      return [];
    }
    const pool = [...available];
    const traits: string[] = [];
    const desiredCount = stream.nextBoolean(0.6) ? 1 + Number(stream.nextBoolean(0.3)) : 0;
    for (let index = 0; index < desiredCount && pool.length > 0; index += 1) {
      const pickIndex = stream.nextInt(pool.length);
      const trait = pool.splice(pickIndex, 1)[0];
      traits.push(trait.id);
    }
    return traits;
  }

  private computeSalary(
    role: EmployeeRole,
    skills: EmployeeSkills,
    traits: string[],
    stream: RngStream,
  ): number {
    const baseSalary = DEFAULT_SALARY_BY_ROLE[role] ?? 20;
    const profile = ROLE_SKILL_PROFILE[role];
    const primary = skills[profile.primary] ?? 1;
    const secondary = profile.secondary ? (skills[profile.secondary] ?? 0) : 0;
    const tertiarySkills = Object.entries(skills)
      .filter(([name]) => name !== profile.primary && name !== profile.secondary)
      .reduce((sum, [, value]) => sum + (value ?? 0), 0);
    const skillScore = primary * 1.2 + secondary * 0.6 + tertiarySkills * 0.35;
    const skillFactor = this.clamp(0.85 + skillScore * 0.04, 0.85, 1.45);
    const randomness = 0.9 + stream.nextRange(0, 0.2);
    const traitModifier = traits.reduce(
      (modifier, traitId) => modifier * (SALARY_TRAIT_MODIFIERS[traitId] ?? 1),
      1,
    );
    const salary = Math.round(baseSalary * skillFactor * randomness * traitModifier);
    return Math.max(12, salary);
  }

  private async fetchProfiles(seed: string): Promise<FetchResult | null> {
    if (!this.httpEnabled || !this.fetchImpl) {
      return null;
    }
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const url = new URL('https://randomuser.me/api/');
        url.searchParams.set('results', String(this.batchSize));
        url.searchParams.set('inc', 'name,gender,login');
        url.searchParams.set('seed', seed);
        const response = await this.fetchImpl(url.toString());
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as RandomUserResponse;
        const profiles = Array.isArray(payload?.results) ? payload.results : null;
        if (!profiles) {
          throw new Error('Unexpected job market response payload.');
        }
        return { profiles, attempts: attempt } satisfies FetchResult;
      } catch (error) {
        lastError = error;
      }
    }

    this.logger.warn(
      { seed, attempts: this.maxRetries, error: this.describeError(lastError) },
      'Job market provider unavailable; falling back to offline candidate generation.',
    );
    return null;
  }

  private async generateOfflineCandidates(count: number, week: number): Promise<ApplicantState[]> {
    const directory = await this.getDirectory();
    const firstNames = directory?.firstNames ?? [];
    const lastNames = directory?.lastNames ?? [];
    const applicants: ApplicantState[] = [];
    for (let index = 0; index < count; index += 1) {
      const firstName =
        firstNames.length > 0 ? this.jobStream.pick(firstNames) : `Candidate${week}-${index + 1}`;
      const lastName = lastNames.length > 0 ? this.jobStream.pick(lastNames) : 'Applicant';
      const gender = this.jobStream.nextBoolean() ? 'female' : 'male';
      const personalSeed = this.generatePersonalSeed(week);
      applicants.push(
        await this.createCandidate(
          {
            firstName: this.normaliseName(firstName, `Candidate${index + 1}`),
            lastName: this.normaliseName(lastName, 'Applicant'),
            gender,
            personalSeed,
          },
          week,
        ),
      );
    }
    return applicants;
  }

  private generatePersonalSeed(week: number): string {
    return `offline-${week}-${this.jobStream.nextString(10)}`;
  }

  private normaliseName(value: string | undefined, fallback: string): string {
    if (!value) {
      return fallback;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return fallback;
    }
    return trimmed
      .split(/\s+/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  private hashSeed(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash === 0 ? 1 : hash;
  }

  private async getDirectory(): Promise<PersonnelNameDirectory | undefined> {
    if (this.directory) {
      return this.directory;
    }
    if (this.directoryPromise) {
      return this.directoryPromise;
    }
    if (!this.dataDirectory) {
      return undefined;
    }
    this.directoryPromise = loadPersonnelDirectory(this.dataDirectory)
      .then((directory) => {
        this.directory = directory;
        return directory;
      })
      .catch((error) => {
        this.logger.warn(
          { error: this.describeError(error) },
          'Failed to load personnel directory for job market fallback.',
        );
        return undefined;
      })
      .finally(() => {
        this.directoryPromise = null;
      });
    return this.directoryPromise;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

export default JobMarketService;
