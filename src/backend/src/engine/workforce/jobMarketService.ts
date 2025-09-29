import process from 'node:process';

import { logger } from '@runtime/logger.js';
import { createSeededStreamGenerator, RNG_STREAM_IDS, RngService, RngStream } from '@/lib/rng.js';
import type {
  ApplicantState,
  EmployeeRole,
  EmployeeSkills,
  GameState,
  PersonnelNameDirectory,
  PersonnelRoleBlueprint,
  PersonnelRoleSkillRoll,
  PersonnelRoleSkillTemplate,
  SkillName,
} from '@/state/types.js';
import {
  DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
  loadPersonnelRoleBlueprints,
  normalizePersonnelRoleBlueprints,
} from '@/state/personnel/roleBlueprints.js';
import {
  DEFAULT_PERSONNEL_SKILL_BLUEPRINTS,
  getEmployeeSkillNames,
} from '@/state/personnel/skillBlueprints.js';
import { generateId } from '@/state/initialization/common.js';
import { loadPersonnelDirectory } from '@/state/initialization/personnel.js';
import type {
  CommandExecutionContext,
  CommandResult,
  RefreshCandidatesIntent,
} from '@/facade/index.js';
import type { SimulationPhaseContext, SimulationPhaseHandler } from '@/sim/loop.js';

const TICKS_PER_WEEK = 168;
const DEFAULT_BATCH_SIZE = 12;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_DIVERSE_PROBABILITY = 0.1;
const JOB_MARKET_STREAM_ID = RNG_STREAM_IDS.jobMarket;
const JOB_MARKET_CANDIDATE_STREAM_ID = RNG_STREAM_IDS.jobMarketCandidates;
const JOB_MARKET_GENDER_STREAM_ID = RNG_STREAM_IDS.jobMarketGender;

const FALLBACK_ROLE_BLUEPRINTS = normalizePersonnelRoleBlueprints(
  DEFAULT_PERSONNEL_ROLE_BLUEPRINTS,
);

const FALLBACK_ROLE_MAP = new Map<string, PersonnelRoleBlueprint>(
  FALLBACK_ROLE_BLUEPRINTS.map((role) => [role.id, role]),
);

const SALARY_TRAIT_MODIFIERS: Record<string, number> = {
  trait_frugal: 0.95,
  trait_demanding: 1.08,
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

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
  personalSeed?: string;
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
  personnelRoleBlueprints?: PersonnelRoleBlueprint[];
  dataDirectory?: string;
  fetchImpl?: typeof globalThis.fetch;
  httpEnabled?: boolean;
  batchSize?: number;
  maxRetries?: number;
  pDiverse?: number;
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

  private offlineSeedIndex = 0;

  private lastRefresh: LastRefreshState | null = null;

  private readonly dataDirectory?: string;

  private readonly logger = logger.child({ component: 'engine.jobMarket' });

  private readonly diversityProbability: number;

  private roleBlueprints: PersonnelRoleBlueprint[];

  private roleBlueprintIndex = new Map<string, PersonnelRoleBlueprint>();

  private roleBlueprintPromise: Promise<PersonnelRoleBlueprint[]> | null = null;

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
    this.diversityProbability = this.clamp(options.pDiverse ?? DEFAULT_DIVERSE_PROBABILITY, 0, 1);
    if (this.directory) {
      this.offlineSeedIndex = 0;
    }
    const providedRoles =
      options.personnelRoleBlueprints && options.personnelRoleBlueprints.length > 0
        ? normalizePersonnelRoleBlueprints(options.personnelRoleBlueprints)
        : undefined;
    if (providedRoles && providedRoles.length > 0) {
      this.roleBlueprints = providedRoles;
      this.rebuildRoleBlueprintIndex(this.roleBlueprints);
    } else if (this.dataDirectory) {
      this.roleBlueprints = [];
      this.roleBlueprintIndex = new Map();
    } else {
      this.roleBlueprints = FALLBACK_ROLE_BLUEPRINTS;
      this.rebuildRoleBlueprintIndex(this.roleBlueprints);
    }
  }

  private rebuildRoleBlueprintIndex(roles: readonly PersonnelRoleBlueprint[]): void {
    this.roleBlueprintIndex = new Map(roles.map((role) => [role.id, role]));
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
    const normalizedSeed = typeof base.personalSeed === 'string' ? base.personalSeed.trim() : '';
    const personalSeed =
      normalizedSeed.length > 0 ? normalizedSeed : this.generatePersonalSeed(week);
    const hashedSeed = this.hashSeed(personalSeed);
    const generator = createSeededStreamGenerator(
      String(hashedSeed),
      JOB_MARKET_CANDIDATE_STREAM_ID,
    );
    const stream = new RngStream(JOB_MARKET_CANDIDATE_STREAM_ID, generator);
    const roleBlueprints = await this.getRoleBlueprints();
    const role = this.pickRole(stream, roleBlueprints);
    const roleBlueprint = this.findRoleBlueprint(role);
    const skills = this.rollSkills(roleBlueprint, stream);
    const traits = await this.rollTraits(stream);
    const expectedSalary = this.computeSalary(roleBlueprint, skills, traits, stream);
    const id = generateId(this.jobStream, 'applicant');
    const fullName = `${base.firstName} ${base.lastName}`.trim();

    const candidate: ApplicantState = {
      id,
      name: fullName,
      desiredRole: role,
      expectedSalary,
      traits,
      skills,
      personalSeed,
    };

    const resolvedGender = this.resolveGender(base.gender, hashedSeed);
    if (resolvedGender) {
      candidate.gender = resolvedGender;
    }

    return candidate;
  }

  private async getRoleBlueprints(): Promise<PersonnelRoleBlueprint[]> {
    if (this.roleBlueprints && this.roleBlueprints.length > 0) {
      return this.roleBlueprints;
    }
    if (this.roleBlueprintPromise) {
      const roles = await this.roleBlueprintPromise;
      return roles;
    }
    if (!this.dataDirectory) {
      this.roleBlueprints = FALLBACK_ROLE_BLUEPRINTS;
      this.rebuildRoleBlueprintIndex(this.roleBlueprints);
      return this.roleBlueprints;
    }
    this.roleBlueprintPromise = loadPersonnelRoleBlueprints(this.dataDirectory)
      .then((roles) => {
        this.roleBlueprints = roles.length > 0 ? roles : FALLBACK_ROLE_BLUEPRINTS;
        this.rebuildRoleBlueprintIndex(this.roleBlueprints);
        return this.roleBlueprints;
      })
      .catch((error) => {
        this.logger.warn(
          { error: this.describeError(error) },
          'Failed to load personnel role blueprints; using defaults.',
        );
        this.roleBlueprints = FALLBACK_ROLE_BLUEPRINTS;
        this.rebuildRoleBlueprintIndex(this.roleBlueprints);
        return this.roleBlueprints;
      })
      .finally(() => {
        this.roleBlueprintPromise = null;
      });
    return this.roleBlueprintPromise;
  }

  private findRoleBlueprint(role: EmployeeRole): PersonnelRoleBlueprint {
    return (
      this.roleBlueprintIndex.get(role) ??
      FALLBACK_ROLE_MAP.get(role) ??
      FALLBACK_ROLE_BLUEPRINTS[0]!
    );
  }

  private getRoleWeight(blueprint: PersonnelRoleBlueprint): number {
    if (isFiniteNumber(blueprint.roleWeight) && blueprint.roleWeight! > 0) {
      return blueprint.roleWeight!;
    }
    const fallback = FALLBACK_ROLE_MAP.get(blueprint.id);
    if (fallback && isFiniteNumber(fallback.roleWeight) && fallback.roleWeight! > 0) {
      return fallback.roleWeight!;
    }
    return 1;
  }

  private clampProbability(value: number | undefined, fallback = 0): number {
    if (isFiniteNumber(value)) {
      return this.clamp(value, 0, 1);
    }
    if (isFiniteNumber(fallback)) {
      return this.clamp(fallback, 0, 1);
    }
    return 0;
  }

  private rollSkillLevel(
    template: PersonnelRoleSkillTemplate,
    stream: RngStream,
    fallbackRoll?: PersonnelRoleSkillRoll,
  ): number {
    const roll = template.roll ?? fallbackRoll;
    const fallbackLevel = isFiniteNumber(template.startingLevel) ? template.startingLevel : 0;
    if (!roll) {
      return this.clamp(Math.round(fallbackLevel), 0, 5);
    }
    const min = isFiniteNumber(roll.min) ? roll.min! : fallbackLevel;
    const max = isFiniteNumber(roll.max) ? roll.max! : min;
    if (!isFiniteNumber(min)) {
      return this.clamp(Math.round(fallbackLevel), 0, 5);
    }
    if (!isFiniteNumber(max) || max <= min) {
      return this.clamp(Math.round(min), 0, 5);
    }
    const rolled = stream.nextRange(min, max);
    return this.clamp(Math.round(rolled), 0, 5);
  }

  private pickWeightedTemplate(
    templates: readonly PersonnelRoleSkillTemplate[],
    stream: RngStream,
  ): PersonnelRoleSkillTemplate {
    if (templates.length === 0) {
      throw new Error('No skill templates available for selection.');
    }
    const weights = templates.map((template) => {
      const weight = template.weight;
      return isFiniteNumber(weight) && weight! > 0 ? weight! : 1;
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) {
      return templates[stream.nextInt(templates.length)]!;
    }
    let roll = stream.next() * total;
    for (let index = 0; index < templates.length; index += 1) {
      const weight = weights[index] ?? 0;
      if (weight <= 0) {
        continue;
      }
      if (roll <= weight) {
        return templates[index]!;
      }
      roll -= weight;
    }
    return templates[templates.length - 1]!;
  }

  private buildFallbackTertiaryCandidates(
    primary: SkillName,
    secondary?: SkillName,
  ): PersonnelRoleSkillTemplate[] {
    const available = getEmployeeSkillNames();
    const source =
      available.length > 0
        ? available
        : DEFAULT_PERSONNEL_SKILL_BLUEPRINTS.map((skill) => skill.id);
    return source
      .filter((skill) => skill !== primary && skill !== secondary)
      .map(
        (skill) =>
          ({
            skill,
            startingLevel: 1,
            roll: { min: 1, max: 3 },
            weight: 1,
          }) satisfies PersonnelRoleSkillTemplate,
      );
  }

  private rollSkills(blueprint: PersonnelRoleBlueprint, stream: RngStream): EmployeeSkills {
    const fallback = FALLBACK_ROLE_MAP.get(blueprint.id);
    const result: EmployeeSkills = {};
    const primaryTemplate = blueprint.skillProfile.primary;
    const primaryFallback = fallback?.skillProfile.primary;
    result[primaryTemplate.skill] = this.rollSkillLevel(
      primaryTemplate,
      stream,
      primaryFallback?.roll,
    );

    const secondaryTemplate = blueprint.skillProfile.secondary ?? fallback?.skillProfile.secondary;
    if (secondaryTemplate) {
      const secondaryFallback =
        blueprint.skillProfile.secondary && fallback?.skillProfile.secondary
          ? fallback.skillProfile.secondary
          : secondaryTemplate;
      result[secondaryTemplate.skill] = this.rollSkillLevel(
        secondaryTemplate,
        stream,
        secondaryFallback?.roll,
      );
    }

    const tertiaryConfig = blueprint.skillProfile.tertiary ?? fallback?.skillProfile.tertiary;
    if (tertiaryConfig) {
      const fallbackTertiary = fallback?.skillProfile.tertiary;
      const tertiaryChance = this.clampProbability(
        tertiaryConfig.chance,
        fallbackTertiary?.chance ?? 0.25,
      );
      if (tertiaryChance > 0 && stream.nextBoolean(tertiaryChance)) {
        const sourceCandidates =
          tertiaryConfig.candidates.length > 0
            ? tertiaryConfig.candidates
            : (fallbackTertiary?.candidates ?? []);
        const filteredCandidates = sourceCandidates.filter(
          (candidate) =>
            candidate.skill !== primaryTemplate.skill &&
            candidate.skill !== secondaryTemplate?.skill,
        );
        const candidatePool =
          filteredCandidates.length > 0
            ? filteredCandidates
            : this.buildFallbackTertiaryCandidates(primaryTemplate.skill, secondaryTemplate?.skill);
        if (candidatePool.length > 0) {
          const chosen = this.pickWeightedTemplate(candidatePool, stream);
          const level = this.rollSkillLevel(
            chosen,
            stream,
            tertiaryConfig.roll ?? fallbackTertiary?.roll,
          );
          if (level > 0) {
            result[chosen.skill] = level;
          }
        }
      }
    }

    return result;
  }

  private resolveGender(
    forcedGender: ApplicantState['gender'],
    hashedSeed: number,
  ): ApplicantState['gender'] {
    if (forcedGender === 'male' || forcedGender === 'female' || forcedGender === 'other') {
      return forcedGender;
    }
    return this.drawGenderFromSeed(hashedSeed);
  }

  private drawGenderFromSeed(hashedSeed: number): ApplicantState['gender'] {
    const generator = createSeededStreamGenerator(String(hashedSeed), JOB_MARKET_GENDER_STREAM_ID);
    const stream = new RngStream(JOB_MARKET_GENDER_STREAM_ID, generator);
    return this.drawGenderFromStream(stream);
  }

  private drawGenderFromStream(stream: RngStream): ApplicantState['gender'] {
    const probabilityDiverse = this.diversityProbability;
    if (probabilityDiverse >= 1) {
      return 'other';
    }
    if (probabilityDiverse <= 0) {
      return stream.next() < 0.5 ? 'female' : 'male';
    }
    const roll = stream.next();
    if (roll < probabilityDiverse) {
      return 'other';
    }
    const remaining = 1 - probabilityDiverse;
    const femaleThreshold = probabilityDiverse + remaining / 2;
    if (roll < femaleThreshold) {
      return 'female';
    }
    return 'male';
  }

  private pickRole(
    stream: RngStream,
    roleBlueprints: readonly PersonnelRoleBlueprint[],
  ): EmployeeRole {
    if (roleBlueprints.length === 0) {
      return FALLBACK_ROLE_BLUEPRINTS[0]?.id as EmployeeRole;
    }
    const weights = roleBlueprints.map((blueprint) => this.getRoleWeight(blueprint));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) {
      const index = stream.nextInt(roleBlueprints.length);
      return roleBlueprints[index]?.id as EmployeeRole;
    }
    let roll = stream.next() * totalWeight;
    for (let index = 0; index < roleBlueprints.length; index += 1) {
      const weight = weights[index] ?? 0;
      if (weight <= 0) {
        continue;
      }
      if (roll <= weight) {
        return roleBlueprints[index]!.id as EmployeeRole;
      }
      roll -= weight;
    }
    return roleBlueprints[roleBlueprints.length - 1]!.id as EmployeeRole;
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
    blueprint: PersonnelRoleBlueprint,
    skills: EmployeeSkills,
    traits: string[],
    stream: RngStream,
  ): number {
    const fallback = FALLBACK_ROLE_MAP.get(blueprint.id);
    const baseSalary = isFiniteNumber(blueprint.salary.basePerTick)
      ? blueprint.salary.basePerTick
      : (fallback?.salary.basePerTick ?? 20);
    const primarySkill = blueprint.skillProfile.primary.skill;
    const secondarySkill =
      blueprint.skillProfile.secondary?.skill ?? fallback?.skillProfile.secondary?.skill;
    const primaryLevel = skills[primarySkill] ?? 0;
    const secondaryLevel = secondarySkill ? (skills[secondarySkill] ?? 0) : 0;
    const tertiaryLevels = Object.entries(skills)
      .filter(([name]) => name !== primarySkill && name !== secondarySkill)
      .reduce((sum, [, value]) => sum + (value ?? 0), 0);

    const weightConfig = {
      ...(fallback?.salary.skillWeights ?? {}),
      ...(blueprint.salary.skillWeights ?? {}),
    } as Record<string, number | undefined>;
    const primaryWeight = isFiniteNumber(weightConfig.primary) ? weightConfig.primary! : 1.2;
    const secondaryWeight = isFiniteNumber(weightConfig.secondary) ? weightConfig.secondary! : 0.6;
    const tertiaryWeight = isFiniteNumber(weightConfig.tertiary) ? weightConfig.tertiary! : 0.35;

    const skillScore =
      primaryLevel * primaryWeight +
      secondaryLevel * secondaryWeight +
      tertiaryLevels * tertiaryWeight;

    const factorConfig = {
      ...(fallback?.salary.skillFactor ?? {}),
      ...(blueprint.salary.skillFactor ?? {}),
    } as Record<string, number | undefined>;
    const factorBase = isFiniteNumber(factorConfig.base) ? factorConfig.base! : 0.85;
    const factorPerPoint = isFiniteNumber(factorConfig.perPoint) ? factorConfig.perPoint! : 0.04;
    const factorMin = isFiniteNumber(factorConfig.min) ? factorConfig.min! : 0.85;
    const factorMax = isFiniteNumber(factorConfig.max) ? factorConfig.max! : 1.45;
    const skillFactor = this.clamp(factorBase + skillScore * factorPerPoint, factorMin, factorMax);

    const randomRangeConfig = {
      ...(fallback?.salary.randomRange ?? {}),
      ...(blueprint.salary.randomRange ?? {}),
    } as Record<string, number | undefined>;
    const randomMin = isFiniteNumber(randomRangeConfig.min) ? randomRangeConfig.min! : 0.9;
    const randomMax = isFiniteNumber(randomRangeConfig.max) ? randomRangeConfig.max! : 1.1;
    const randomness =
      randomMax > randomMin ? randomMin + stream.nextRange(0, randomMax - randomMin) : randomMin;

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
    const firstNamesMale = directory?.firstNamesMale ?? [];
    const firstNamesFemale = directory?.firstNamesFemale ?? [];
    const lastNames = directory?.lastNames ?? [];
    const applicants: ApplicantState[] = [];
    const combinedFirstNames = [...firstNamesFemale, ...firstNamesMale];

    for (let index = 0; index < count; index += 1) {
      const fallbackFirstName = `Candidate${week}-${index + 1}`;
      const chosenFirstName =
        combinedFirstNames.length > 0 ? this.jobStream.pick(combinedFirstNames) : undefined;
      const lastNameBase = lastNames.length > 0 ? this.jobStream.pick(lastNames) : 'Applicant';
      const personalSeed = this.takeOfflineSeed(directory, week);
      applicants.push(
        await this.createCandidate(
          {
            firstName: this.normaliseName(chosenFirstName, fallbackFirstName),
            lastName: this.normaliseName(lastNameBase, 'Applicant'),
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

  private takeOfflineSeed(directory: PersonnelNameDirectory | undefined, week: number): string {
    const seeds = directory?.randomSeeds ?? [];
    while (this.offlineSeedIndex < seeds.length) {
      const seed = seeds[this.offlineSeedIndex];
      this.offlineSeedIndex += 1;
      if (typeof seed === 'string') {
        const trimmed = seed.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
    return this.generatePersonalSeed(week);
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
        this.offlineSeedIndex = 0;
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
