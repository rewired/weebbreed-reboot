#!/usr/bin/env node

import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { Command } from 'commander';

import { createPriceCatalogFromRepository } from '../src/backend/src/engine/economy/catalog.js';
import {
  CostAccountingService,
  type UtilityCostBreakdown,
} from '../src/backend/src/engine/economy/costAccounting.js';
import type { GameState, PlantState } from '../src/backend/src/state/types.js';
import {
  createInitialState,
  type StateFactoryContext,
  type StateFactoryOptions,
} from '../src/backend/src/stateFactory.js';
import { SimulationLoop, type SimulationLoopOptions } from '../src/backend/src/sim/loop.js';
import { BlueprintRepository } from '../src/backend/src/data/blueprintRepository.js';
import { RngService } from '../src/backend/src/lib/rng.js';

interface AuditOptions {
  seed: string;
  days?: number;
  ticks?: number;
  tickLength?: number;
  output?: string;
  runId?: string;
  baseline?: string;
  baselineMode: 'tick' | 'day';
  toleranceDefault: number;
  tolerances: Record<string, number>;
  dataDir?: string;
  overrunThresholdMs: number;
  overrunConsecutive: number;
}

interface TickMetricRecord extends Record<string, number | boolean> {
  tick: number;
  day: number;
  sim_time_days: number;
  biomass_kg: number;
  biomass_delta_kg: number;
  stress_avg: number;
  quality_avg: number;
  energy_kwh: number;
  water_l: number;
  npk_g: number;
  opex_eur: number;
  capex_eur: number;
  tasks_dropped: number;
  throttled: boolean;
  tick_duration_ms: number;
}

interface DayMetricRecord extends Record<string, number | boolean> {
  day: number;
  ticks: number;
  biomass_kg: number;
  biomass_delta_kg: number;
  stress_avg: number;
  quality_avg: number;
  energy_kwh: number;
  water_l: number;
  npk_g: number;
  opex_eur: number;
  capex_eur: number;
  tasks_dropped: number;
  throttled: boolean;
}

interface RegressionDetail {
  id: number;
  metric: string;
  baseline: number;
  current: number;
  difference: number;
  tolerance: number;
}

interface ComparisonResult {
  status: 'pass' | 'regression';
  regressions: RegressionDetail[];
}

interface FinanceTickPayload {
  capex?: number;
  opex?: number;
  utilities?: UtilityCostBreakdown;
}

type AuditEvent = {
  type?: string;
  payload?: unknown;
  tick?: number;
  ts?: number;
  level?: string;
};

type SimulationLoopEventBus = NonNullable<SimulationLoopOptions['eventBus']>;

interface DailyAccumulator {
  day: number;
  ticks: number;
  biomassDelta: number;
  stressSum: number;
  qualitySum: number;
  energy: number;
  water: number;
  nutrients: number;
  opex: number;
  capex: number;
  tasksDropped: number;
  throttledTicks: number;
  lastBiomass: number;
}

const createToleranceCollector = () => {
  return (value: string, previous: Record<string, number>) => {
    const [key, raw] = value.split('=');
    if (!key || raw === undefined) {
      throw new Error(`Invalid tolerance format: "${value}". Expected metric=value.`);
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Tolerance for metric "${key}" must be a non-negative number.`);
    }
    return { ...previous, [key]: parsed };
  };
};

const collectPlants = (state: GameState): PlantState[] => {
  const plants: PlantState[] = [];
  for (const structure of state.structures) {
    for (const room of structure.rooms) {
      for (const zone of room.zones) {
        for (const plant of zone.plants) {
          plants.push(plant);
        }
      }
    }
  }
  return plants;
};

const safeNumber = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return value;
};

const formatCsvValue = (value: string | number | boolean | undefined | null): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return value.toString();
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const writeCsvRow = <T extends Record<string, unknown>>(
  writer: ReturnType<typeof createWriteStream>,
  columns: string[],
  row: T,
) => {
  const values = columns.map((column) =>
    formatCsvValue(row[column] as string | number | boolean | undefined),
  );
  writer.write(`${values.join(',')}\n`);
};

const writeJsonlRow = (writer: ReturnType<typeof createWriteStream>, record: unknown) => {
  writer.write(`${JSON.stringify(record)}\n`);
};

const createDailyAccumulator = (day: number): DailyAccumulator => ({
  day,
  ticks: 0,
  biomassDelta: 0,
  stressSum: 0,
  qualitySum: 0,
  energy: 0,
  water: 0,
  nutrients: 0,
  opex: 0,
  capex: 0,
  tasksDropped: 0,
  throttledTicks: 0,
  lastBiomass: 0,
});

const flushDailyAccumulator = (
  accumulator: DailyAccumulator,
  jsonlWriter: ReturnType<typeof createWriteStream>,
  csvWriter: ReturnType<typeof createWriteStream>,
  columns: string[],
  results: DayMetricRecord[],
) => {
  if (accumulator.ticks === 0) {
    return;
  }

  const record: DayMetricRecord = {
    day: accumulator.day,
    ticks: accumulator.ticks,
    biomass_kg: accumulator.lastBiomass,
    biomass_delta_kg: accumulator.biomassDelta,
    stress_avg: accumulator.ticks > 0 ? accumulator.stressSum / accumulator.ticks : 0,
    quality_avg: accumulator.ticks > 0 ? accumulator.qualitySum / accumulator.ticks : 0,
    energy_kwh: accumulator.energy,
    water_l: accumulator.water,
    npk_g: accumulator.nutrients,
    opex_eur: accumulator.opex,
    capex_eur: accumulator.capex,
    tasks_dropped: accumulator.tasksDropped,
    throttled: accumulator.throttledTicks > 0,
  };

  results.push(record);
  writeJsonlRow(jsonlWriter, record);
  writeCsvRow(csvWriter, columns, record);
};

const extractFinanceMetrics = (events: AuditEvent[]): FinanceTickPayload => {
  const financeEvent = events.find((event) => event.type === 'finance.tick');
  if (!financeEvent) {
    return {};
  }
  const payload = financeEvent.payload as FinanceTickPayload | undefined;
  if (!payload) {
    return {};
  }
  return payload;
};

const extractTickDuration = (events: AuditEvent[], resultDuration: number): number => {
  const tickEvent = events.find((event) => event.type === 'sim.tickCompleted');
  if (tickEvent?.payload && typeof tickEvent.payload === 'object') {
    const maybeDuration = (tickEvent.payload as { durationMs?: number }).durationMs;
    if (typeof maybeDuration === 'number' && Number.isFinite(maybeDuration)) {
      return maybeDuration;
    }
  }
  return resultDuration;
};

const computeTickMetric = (
  state: GameState,
  tick: number,
  tickLengthMinutes: number,
  finance: FinanceTickPayload,
  biomassKg: number,
  biomassDeltaKg: number,
  stressAvg: number,
  qualityAvg: number,
  tasksDropped: number,
  throttled: boolean,
  tickDurationMs: number,
): TickMetricRecord => {
  const simTimeDays = (tick * tickLengthMinutes) / (24 * 60);
  const dayIndex = Math.floor(((tick - 1) * tickLengthMinutes) / (24 * 60)) + 1;
  const utilities = finance.utilities;
  const energy = utilities ? safeNumber(utilities.energy.quantity) : 0;
  const water = utilities ? safeNumber(utilities.water.quantity) : 0;
  const nutrients = utilities ? safeNumber(utilities.nutrients.quantity) : 0;

  return {
    tick,
    day: dayIndex,
    sim_time_days: simTimeDays,
    biomass_kg: biomassKg,
    biomass_delta_kg: biomassDeltaKg,
    stress_avg: stressAvg,
    quality_avg: qualityAvg,
    energy_kwh: energy,
    water_l: water,
    npk_g: nutrients,
    opex_eur: safeNumber(finance.opex),
    capex_eur: safeNumber(finance.capex),
    tasks_dropped: tasksDropped,
    throttled,
    tick_duration_ms: tickDurationMs,
  };
};

const updateDailyAccumulator = (
  accumulator: DailyAccumulator,
  tickMetric: TickMetricRecord,
): void => {
  accumulator.ticks += 1;
  accumulator.biomassDelta += tickMetric.biomass_delta_kg;
  accumulator.stressSum += tickMetric.stress_avg;
  accumulator.qualitySum += tickMetric.quality_avg;
  accumulator.energy += tickMetric.energy_kwh;
  accumulator.water += tickMetric.water_l;
  accumulator.nutrients += tickMetric.npk_g;
  accumulator.opex += tickMetric.opex_eur;
  accumulator.capex += tickMetric.capex_eur;
  accumulator.tasksDropped += tickMetric.tasks_dropped;
  accumulator.throttledTicks += tickMetric.throttled ? 1 : 0;
  accumulator.lastBiomass = tickMetric.biomass_kg;
};

const loadBaselineRecords = async (filePath: string): Promise<Array<Record<string, unknown>>> => {
  const absolute = path.resolve(filePath);
  const content = await readFile(absolute, 'utf-8');
  if (absolute.endsWith('.json')) {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error(`Baseline JSON file must contain an array: ${filePath}`);
    }
    return parsed as Array<Record<string, unknown>>;
  }
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Failed to parse JSONL baseline at line ${index + 1}: ${(error as Error).message}`,
      );
    }
  });
};

const compareMetrics = (
  current: Array<Record<string, unknown>>,
  baseline: Array<Record<string, unknown>>,
  idKey: 'tick' | 'day',
  tolerances: Record<string, number>,
  defaultTolerance: number,
): ComparisonResult => {
  const baselineMap = new Map<number, Record<string, unknown>>();
  for (const entry of baseline) {
    const rawId = entry[idKey];
    if (typeof rawId !== 'number' || !Number.isFinite(rawId)) {
      continue;
    }
    baselineMap.set(rawId, entry);
  }

  const regressions: RegressionDetail[] = [];
  const metricKeys = new Set<string>();
  for (const entry of current) {
    Object.keys(entry).forEach((key) => {
      if (key === idKey) {
        return;
      }
      metricKeys.add(key);
    });
  }

  for (const entry of current) {
    const rawId = entry[idKey];
    if (typeof rawId !== 'number' || !Number.isFinite(rawId)) {
      continue;
    }
    const baselineEntry = baselineMap.get(rawId);
    if (!baselineEntry) {
      regressions.push({
        id: rawId,
        metric: '<missing-baseline>',
        baseline: NaN,
        current: NaN,
        difference: Infinity,
        tolerance: 0,
      });
      continue;
    }

    for (const metric of metricKeys) {
      const currentValue = entry[metric];
      const baselineValue = baselineEntry[metric];
      const tolerance = tolerances[metric] ?? defaultTolerance;
      const currentNumber =
        typeof currentValue === 'boolean'
          ? currentValue
            ? 1
            : 0
          : safeNumber(currentValue as number);
      const baselineNumber =
        typeof baselineValue === 'boolean'
          ? baselineValue
            ? 1
            : 0
          : safeNumber(baselineValue as number);
      const difference = Math.abs(currentNumber - baselineNumber);
      if (difference > tolerance) {
        regressions.push({
          id: rawId,
          metric,
          baseline: baselineNumber,
          current: currentNumber,
          difference,
          tolerance,
        });
      }
    }
  }

  return {
    status: regressions.length > 0 ? 'regression' : 'pass',
    regressions,
  };
};

const createOutputDirectory = async (
  options: AuditOptions,
): Promise<{ directory: string; runId: string }> => {
  const baseOutput = options.output
    ? path.resolve(options.output)
    : path.resolve('reports', 'audit');
  const runId = options.runId ?? new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(baseOutput, runId);
  await mkdir(directory, { recursive: true });
  return { directory, runId };
};

const createAuditEventBus = () => {
  const captured: AuditEvent[] = [];
  return {
    emit(eventOrType: AuditEvent | string, payload?: unknown, tick?: number, level?: string) {
      if (typeof eventOrType === 'string') {
        captured.push({ type: eventOrType, payload, tick, level });
      } else if (eventOrType) {
        captured.push(eventOrType);
      }
    },
    emitMany(events: Iterable<AuditEvent>) {
      for (const event of events) {
        this.emit(event);
      }
    },
    getEvents(): AuditEvent[] {
      return captured;
    },
  };
};

const expectedDataSubdirectories: string[][] = [
  ['blueprints', 'strains'],
  ['blueprints', 'devices'],
  ['blueprints', 'cultivationMethods'],
  ['blueprints', 'roomPurposes'],
  ['prices'],
];

const isDirectory = async (target: string): Promise<boolean> => {
  try {
    const stats = await stat(target);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

const isValidDataDirectory = async (candidate: string): Promise<boolean> => {
  if (!(await isDirectory(candidate))) {
    return false;
  }

  for (const segments of expectedDataSubdirectories) {
    const subdirectory = path.join(candidate, ...segments);
    if (!(await isDirectory(subdirectory))) {
      return false;
    }
  }

  return true;
};

const resolveDataDirectory = async (override?: string): Promise<string> => {
  const baseDirectory = path.resolve('src/backend/src');
  const cwd = process.cwd();
  const envOverride = override ? path.resolve(override) : process.env.WEEBBREED_DATA_DIR;

  const candidates = [
    envOverride,
    path.resolve(baseDirectory, '..', 'data'),
    path.resolve(baseDirectory, '../../..', 'data'),
    path.resolve(baseDirectory, '../../../..', 'data'),
    path.resolve(cwd, 'data'),
    path.resolve(cwd, '..', 'data'),
  ].filter(Boolean) as string[];

  const checked = new Set<string>();
  for (const candidate of candidates) {
    if (checked.has(candidate)) {
      continue;
    }
    checked.add(candidate);
    if (await isValidDataDirectory(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Unable to locate blueprint data directory. Set --data-dir or WEEBBREED_DATA_DIR.',
  );
};

const summarizeMetrics = (ticks: TickMetricRecord[], days: DayMetricRecord[]) => {
  const totals = ticks.reduce(
    (acc, tick) => {
      acc.biomassDelta += tick.biomass_delta_kg;
      acc.energy += tick.energy_kwh;
      acc.water += tick.water_l;
      acc.nutrients += tick.npk_g;
      acc.opex += tick.opex_eur;
      acc.capex += tick.capex_eur;
      acc.tasks += tick.tasks_dropped;
      acc.stressSum += tick.stress_avg;
      acc.qualitySum += tick.quality_avg;
      return acc;
    },
    {
      biomassDelta: 0,
      energy: 0,
      water: 0,
      nutrients: 0,
      opex: 0,
      capex: 0,
      tasks: 0,
      stressSum: 0,
      qualitySum: 0,
    },
  );

  const tickCount = ticks.length || 1;
  return {
    totals: {
      biomass_delta_kg: totals.biomassDelta,
      energy_kwh: totals.energy,
      water_l: totals.water,
      npk_g: totals.nutrients,
      opex_eur: totals.opex,
      capex_eur: totals.capex,
      tasks_dropped: totals.tasks,
    },
    averages: {
      stress_avg: totals.stressSum / tickCount,
      quality_avg: totals.qualitySum / tickCount,
    },
    daysSimulated: days.length,
  };
};

const runAudit = async (options: AuditOptions): Promise<number> => {
  const { directory, runId } = await createOutputDirectory(options);

  const tickJsonlPath = path.join(directory, 'metrics-ticks.jsonl');
  const tickCsvPath = path.join(directory, 'metrics-ticks.csv');
  const dayJsonlPath = path.join(directory, 'metrics-days.jsonl');
  const dayCsvPath = path.join(directory, 'metrics-days.csv');
  const summaryPath = path.join(directory, 'summary.json');

  const tickJsonlWriter = createWriteStream(tickJsonlPath, { encoding: 'utf8' });
  const tickCsvWriter = createWriteStream(tickCsvPath, { encoding: 'utf8' });
  const dayJsonlWriter = createWriteStream(dayJsonlPath, { encoding: 'utf8' });
  const dayCsvWriter = createWriteStream(dayCsvPath, { encoding: 'utf8' });

  const tickColumns: Array<keyof TickMetricRecord> = [
    'tick',
    'day',
    'sim_time_days',
    'biomass_kg',
    'biomass_delta_kg',
    'stress_avg',
    'quality_avg',
    'energy_kwh',
    'water_l',
    'npk_g',
    'opex_eur',
    'capex_eur',
    'tasks_dropped',
    'throttled',
    'tick_duration_ms',
  ];
  const dayColumns: Array<keyof DayMetricRecord> = [
    'day',
    'ticks',
    'biomass_kg',
    'biomass_delta_kg',
    'stress_avg',
    'quality_avg',
    'energy_kwh',
    'water_l',
    'npk_g',
    'opex_eur',
    'capex_eur',
    'tasks_dropped',
    'throttled',
  ];

  tickCsvWriter.write(`${tickColumns.join(',')}\n`);
  dayCsvWriter.write(`${dayColumns.join(',')}\n`);

  const dataDirectory = await resolveDataDirectory(options.dataDir);
  const repository = await BlueprintRepository.loadFrom(dataDirectory);
  const summary = repository.getSummary();
  const rng = new RngService(options.seed);

  const context: StateFactoryContext = {
    repository,
    rng,
    dataDirectory,
  };

  const stateOptions: StateFactoryOptions = {};
  if (
    typeof options.tickLength === 'number' &&
    Number.isFinite(options.tickLength) &&
    options.tickLength > 0
  ) {
    stateOptions.tickLengthMinutes = options.tickLength;
  }

  const initialState = await createInitialState(context, stateOptions);
  const tickLengthMinutes = initialState.metadata.tickLengthMinutes;

  const priceCatalog = createPriceCatalogFromRepository(repository);
  const costAccountingService = new CostAccountingService(priceCatalog);
  const eventBus = createAuditEventBus();
  const loop = new SimulationLoop({
    state: initialState,
    eventBus: eventBus as unknown as SimulationLoopEventBus,
    accounting: { service: costAccountingService },
  });

  const ticksPerDay = (24 * 60) / tickLengthMinutes;
  const defaultDays = options.days ?? 7;
  const targetTicks = options.ticks ?? Math.max(1, Math.round(defaultDays * ticksPerDay));

  const tickMetrics: TickMetricRecord[] = [];
  const dayMetrics: DayMetricRecord[] = [];

  let previousBiomassKg =
    collectPlants(initialState).reduce((sum, plant) => sum + safeNumber(plant.biomassDryGrams), 0) /
    1000;
  let previousCancelled = initialState.tasks.cancelled.length;
  let consecutiveOverruns = 0;
  let maxConsecutiveOverruns = 0;
  let dailyAccumulator = createDailyAccumulator(1);
  dailyAccumulator.lastBiomass = previousBiomassKg;

  for (let index = 0; index < targetTicks; index += 1) {
    const result = await loop.processTick();
    const events = result.events as AuditEvent[];
    const tickNumber = initialState.clock.tick;
    const plants = collectPlants(initialState);
    const biomassGrams = plants.reduce((sum, plant) => sum + safeNumber(plant.biomassDryGrams), 0);
    const biomassKg = biomassGrams / 1000;
    const biomassDeltaKg = biomassKg - previousBiomassKg;
    previousBiomassKg = biomassKg;

    const stressAvg =
      plants.length > 0
        ? plants.reduce((sum, plant) => sum + safeNumber(plant.stress), 0) / plants.length
        : 0;

    const rawQualityAverage =
      plants.length > 0
        ? plants.reduce((sum, plant) => sum + safeNumber(plant.quality), 0) / plants.length
        : 0;
    const qualityAvg = rawQualityAverage * 100;

    const finance = extractFinanceMetrics(events);
    const cancelledCount = initialState.tasks.cancelled.length;
    const tasksDropped = Math.max(0, cancelledCount - previousCancelled);
    previousCancelled = cancelledCount;

    const tickDurationMs = extractTickDuration(events, result.completedAt - result.startedAt);
    if (tickDurationMs > options.overrunThresholdMs) {
      consecutiveOverruns += 1;
      maxConsecutiveOverruns = Math.max(maxConsecutiveOverruns, consecutiveOverruns);
    } else {
      consecutiveOverruns = 0;
    }

    const throttled = consecutiveOverruns >= options.overrunConsecutive;

    const metric = computeTickMetric(
      initialState,
      tickNumber,
      tickLengthMinutes,
      finance,
      biomassKg,
      biomassDeltaKg,
      stressAvg,
      qualityAvg,
      tasksDropped,
      throttled,
      tickDurationMs,
    );

    tickMetrics.push(metric);
    writeJsonlRow(tickJsonlWriter, metric);
    writeCsvRow(
      tickCsvWriter,
      tickColumns,
      metric as unknown as Record<string, string | number | boolean>,
    );

    const currentDayIndex = metric.day;
    if (currentDayIndex !== dailyAccumulator.day) {
      flushDailyAccumulator(dailyAccumulator, dayJsonlWriter, dayCsvWriter, dayColumns, dayMetrics);
      dailyAccumulator = createDailyAccumulator(currentDayIndex);
      dailyAccumulator.lastBiomass = previousBiomassKg;
    }

    updateDailyAccumulator(dailyAccumulator, metric);
  }

  flushDailyAccumulator(dailyAccumulator, dayJsonlWriter, dayCsvWriter, dayColumns, dayMetrics);

  tickJsonlWriter.end();
  tickCsvWriter.end();
  dayJsonlWriter.end();
  dayCsvWriter.end();

  await Promise.all([
    finished(tickJsonlWriter),
    finished(tickCsvWriter),
    finished(dayJsonlWriter),
    finished(dayCsvWriter),
  ]);

  let comparison: ComparisonResult | undefined;
  if (options.baseline) {
    const baselineRecords = await loadBaselineRecords(options.baseline);
    const currentRecords = options.baselineMode === 'tick' ? tickMetrics : dayMetrics;
    comparison = compareMetrics(
      currentRecords as Array<Record<string, unknown>>,
      baselineRecords,
      options.baselineMode === 'tick' ? 'tick' : 'day',
      options.tolerances,
      options.toleranceDefault,
    );
  }

  const summaryData = {
    runId,
    seed: options.seed,
    tickLengthMinutes,
    ticksSimulated: tickMetrics.length,
    daysSimulated: dayMetrics.length,
    dataDirectory,
    blueprintSummary: summary,
    metrics: summarizeMetrics(tickMetrics, dayMetrics),
    overrun: {
      thresholdMs: options.overrunThresholdMs,
      consecutiveRequired: options.overrunConsecutive,
      maxConsecutiveOverruns,
    },
    comparison: comparison ?? null,
    outputs: {
      ticks: { jsonl: tickJsonlPath, csv: tickCsvPath },
      days: { jsonl: dayJsonlPath, csv: dayCsvPath },
    },
  };

  await writeFile(summaryPath, `${JSON.stringify(summaryData, null, 2)}\n`, 'utf-8');

  if (comparison && comparison.status === 'regression') {
    console.error('Audit detected regressions:');
    for (const regression of comparison.regressions) {
      console.error(
        `  ${options.baselineMode} ${regression.id}: ${regression.metric} (baseline=${regression.baseline}, current=${regression.current}, diff=${regression.difference}, tolerance=${regression.tolerance})`,
      );
    }
    return 1;
  }

  console.log(`Audit completed. Output directory: ${directory}`);
  return 0;
};

const main = async () => {
  const program = new Command();
  const collectTolerance = createToleranceCollector();

  program
    .name('run_audit')
    .description('Execute a deterministic simulation run and collect audit metrics.')
    .option('-s, --seed <seed>', 'Seed for deterministic RNG', 'audit-default')
    .option('-d, --days <number>', 'Number of simulation days to run (default: 7)', (value) =>
      Number(value),
    )
    .option('-t, --ticks <number>', 'Number of ticks to run (overrides --days)', (value) =>
      Number(value),
    )
    .option(
      '--tick-length <minutes>',
      'Override tick length in minutes for the initial state',
      (value) => Number(value),
    )
    .option('-o, --output <dir>', 'Output directory for audit artifacts')
    .option('--run-id <id>', 'Explicit identifier for the run output directory')
    .option('-b, --baseline <path>', 'Baseline metrics file (JSON or JSONL) to compare against')
    .option(
      '--baseline-mode <mode>',
      'Baseline scope: "tick" or "day"',
      (value) => {
        const normalized = value === 'tick' ? 'tick' : value === 'day' ? 'day' : undefined;
        if (!normalized) {
          throw new Error('Baseline mode must be "tick" or "day".');
        }
        return normalized;
      },
      'day',
    )
    .option(
      '--tolerance <metric=value...>',
      'Metric-specific tolerance (repeatable)',
      collectTolerance,
      {},
    )
    .option(
      '--tolerance-default <value>',
      'Default tolerance when not specified per metric',
      (value) => Number(value),
      0,
    )
    .option('--data-dir <dir>', 'Override blueprint data directory')
    .option(
      '--overrun-threshold <ms>',
      'Tick duration threshold (ms) before counting overruns',
      (value) => Number(value),
      50,
    )
    .option(
      '--overrun-consecutive <count>',
      'Number of consecutive overruns required to flag throttling',
      (value) => Number(value),
      60,
    );

  program.parse(process.argv);
  const opts = program.opts();

  const options: AuditOptions = {
    seed: opts.seed,
    days: typeof opts.days === 'number' && Number.isFinite(opts.days) ? opts.days : undefined,
    ticks:
      typeof opts.ticks === 'number' && Number.isFinite(opts.ticks)
        ? Math.max(1, Math.floor(opts.ticks))
        : undefined,
    tickLength:
      typeof opts.tickLength === 'number' && Number.isFinite(opts.tickLength)
        ? opts.tickLength
        : undefined,
    output: opts.output,
    runId: opts.runId,
    baseline: opts.baseline,
    baselineMode: opts.baselineMode,
    toleranceDefault:
      typeof opts.toleranceDefault === 'number' && Number.isFinite(opts.toleranceDefault)
        ? Math.max(0, opts.toleranceDefault)
        : 0,
    tolerances: opts.tolerance,
    dataDir: opts.dataDir,
    overrunThresholdMs:
      typeof opts.overrunThreshold === 'number' && Number.isFinite(opts.overrunThreshold)
        ? Math.max(0, opts.overrunThreshold)
        : 50,
    overrunConsecutive:
      typeof opts.overrunConsecutive === 'number' && Number.isFinite(opts.overrunConsecutive)
        ? Math.max(1, Math.floor(opts.overrunConsecutive))
        : 60,
  };

  try {
    const exitCode = await runAudit(options);
    process.exitCode = exitCode;
  } catch (error) {
    console.error('Audit run failed:', error);
    process.exitCode = 1;
  }
};

void main();
