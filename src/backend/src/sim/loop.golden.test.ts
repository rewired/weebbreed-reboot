import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EventBus } from '@/lib/eventBus.js';
import { RngService, RNG_STREAM_IDS, type RngStream } from '@/lib/rng.js';
import { createInitialState } from '../stateFactory.js';
import { SimulationLoop } from './loop.js';
import { TICK_PHASES } from './tickPhases.js';
import {
  createBlueprintRepositoryStub,
  createCultivationMethodBlueprint,
  createDeviceBlueprint,
  createDevicePriceMap,
  createStateFactoryContext,
  createStrainBlueprint,
  createStrainPriceMap,
} from '@/testing/fixtures.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { GameState, ZoneState } from '@/state/types.js';
import { createPhenologyConfig } from '@/engine/plants/phenology.js';
import type { PhenologyState } from '@/engine/plants/phenology.js';
import { updatePlantGrowth } from '@/engine/plants/growthModel.js';
import { TranspirationFeedbackService } from '@/engine/environment/transpirationFeedback.js';
import type { SimulationEvent } from '@/lib/eventBus.js';
import type { SimulationPhaseContext } from './loop.js';
import type { PriceCatalog } from '@/engine/economy/pricing.js';

interface TickMetrics {
  biomassDelta: number;
  avgVpd: number;
  avgStress: number;
  avgHealth: number;
  plantCount: number;
}

interface FinanceTickPayload {
  revenue?: number;
  expenses?: number;
  capex?: number;
  opex?: number;
  utilities?: {
    totalCost?: number;
    energy?: { quantity?: number };
    water?: { quantity?: number };
    nutrients?: { quantity?: number };
  };
  maintenance?: Array<{ totalCost?: number }>;
}

interface SamplePoint {
  tick: number;
  biomassDelta: number;
  avgHealth: number;
  avgStress: number;
  avgVpd: number;
  cumulativeBiomassDelta: number;
  cumulativeRevenue: number;
  cumulativeExpenses: number;
  cashOnHand: number;
  waterRemaining: number;
  nutrientsRemaining: number;
  eventCount: number;
}

interface SimulationKpiSummary {
  metadata: {
    seed: string;
    daysSimulated: number;
    tickLengthMinutes: number;
    ticksPerDay: number;
    ticksSimulated: number;
  };
  totals: {
    biomassDelta: number;
    averageBiomassPerTick: number;
    averageBiomassPerDay: number;
    averageVpd: number;
    averageStress: number;
    averageHealth: number;
  };
  finalState: {
    tick: number;
    plantCount: number;
    biomassDry: number;
    averageHealth: number;
    averageQuality: number;
    averageStress: number;
    environment: {
      temperature: number;
      humidity: number;
      co2: number;
      ppfd: number;
      vpd: number;
    };
    resources: {
      waterLiters: number;
      nutrientsGrams: number;
    };
    cashOnHand: number;
    financeSummary: {
      totalRevenue: number;
      totalExpenses: number;
      totalPayroll: number;
      totalMaintenance: number;
      netIncome: number;
      lastTickRevenue: number;
      lastTickExpenses: number;
    };
  };
  financials: {
    revenue: number;
    expenses: number;
    capex: number;
    opex: number;
    utilityCost: number;
    maintenanceCost: number;
    utilitiesConsumed: {
      energyKwh: number;
      waterLiters: number;
      nutrientsGrams: number;
    };
  };
  events: {
    dispatched: number;
    counts: Record<string, number>;
  };
  samples: SamplePoint[];
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(MODULE_DIR, '__golden__');
const GOLDEN_PATH = path.join(GOLDEN_DIR, 'loop-200d.json');
const GOLDEN_UPDATE_FLAGS = new Set(['1', 'true', 'yes']);
const DEFAULT_RELATIVE_TOLERANCE = 5e-3;
const DEFAULT_ABSOLUTE_TOLERANCE = 1e-6;
const DAYS_TO_SIMULATE = 200;
const RANDOM_SAMPLE_TARGET = 8;

const sanitizeNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Object.is(value, -0) ? 0 : value;
};

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

const isFinanceTickEvent = (
  event: SimulationEvent,
): event is SimulationEvent<FinanceTickPayload> => {
  if (event.type !== 'finance.tick') {
    return false;
  }
  return typeof event.payload === 'object' && event.payload !== null;
};

const createPlantPhaseHandler = (
  repository: BlueprintRepository,
  phenologies: Map<string, PhenologyState>,
  metrics: Map<number, TickMetrics>,
) => {
  const transpirationFeedback = new TranspirationFeedbackService();
  return (context: SimulationPhaseContext) => {
    const tickHours = context.tickLengthMinutes / 60;
    let biomassDelta = 0;
    let vpdSum = 0;
    let stressSum = 0;
    let healthSum = 0;
    let plantCount = 0;

    for (const structure of context.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const strain = zone.strainId ? repository.getStrain(zone.strainId) : undefined;
          if (!strain) {
            continue;
          }
          const phenologyConfig = createPhenologyConfig(strain);
          let zoneTranspiration = 0;
          let zoneVpdSum = 0;
          let zonePlantCount = 0;
          const updatedPlants = zone.plants.map((plant) => {
            const result = updatePlantGrowth({
              plant,
              strain,
              environment: zone.environment,
              tickHours,
              tick: context.tick,
              phenology: phenologies.get(plant.id),
              phenologyConfig,
              resourceSupply: {
                waterSupplyFraction: zone.resources.reservoirLevel,
                nutrientSupplyFraction: zone.resources.nutrientStrength,
              },
            });
            phenologies.set(plant.id, result.phenology);
            context.events.queueMany(result.events);
            biomassDelta += result.biomassDelta;
            vpdSum += result.metrics.vpd.value;
            stressSum += result.metrics.overallStress;
            healthSum += result.plant.health;
            plantCount += 1;
            zoneTranspiration += result.transpirationLiters;
            zoneVpdSum += result.metrics.vpd.value;
            zonePlantCount += 1;
            return result.plant;
          });
          zone.plants = updatedPlants;
          if (zonePlantCount > 0) {
            zone.environment.vpd = zoneVpdSum / zonePlantCount;
          }
          transpirationFeedback.apply(zone, zoneTranspiration, context.accounting);
        }
      }
    }

    const divisor = plantCount > 0 ? plantCount : 1;
    metrics.set(context.tick, {
      biomassDelta,
      avgVpd: vpdSum / divisor,
      avgStress: stressSum / divisor,
      avgHealth: healthSum / divisor,
      plantCount,
    });
  };
};

const toSortedRecord = (entries: Map<string, number>): Record<string, number> => {
  const sorted = Array.from(entries.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const record: Record<string, number> = {};
  for (const [key, value] of sorted) {
    record[key] = value;
  }
  return record;
};

const assertApproximatelyEqual = (actual: number, expected: number, label: string) => {
  const difference = Math.abs(actual - expected);
  const tolerance = Math.max(
    DEFAULT_ABSOLUTE_TOLERANCE,
    Math.abs(expected) * DEFAULT_RELATIVE_TOLERANCE,
  );
  if (difference > tolerance) {
    throw new Error(
      `${label} differs from golden file. Expected ${expected}, received ${actual} (Δ=${difference}, tolerance=${tolerance}).`,
    );
  }
};

const generateSampleTicks = (stream: RngStream, totalTicks: number): number[] => {
  const selected = new Set<number>([
    1,
    Math.max(1, Math.round(totalTicks / 4)),
    Math.max(1, Math.round(totalTicks / 2)),
    totalTicks,
  ]);
  while (selected.size < RANDOM_SAMPLE_TARGET) {
    const candidate = Math.floor(stream.next() * totalTicks) + 1;
    selected.add(Math.max(1, Math.min(totalTicks, candidate)));
  }
  return Array.from(selected).sort((a, b) => a - b);
};

const collectFinalEnvironment = (state: GameState) => {
  const totals = { temperature: 0, humidity: 0, co2: 0, ppfd: 0, vpd: 0, count: 0 };
  for (const structure of state.structures) {
    for (const room of structure.rooms) {
      for (const zone of room.zones) {
        totals.temperature += zone.environment.temperature;
        totals.humidity += zone.environment.relativeHumidity;
        totals.co2 += zone.environment.co2;
        totals.ppfd += zone.environment.ppfd;
        totals.vpd += zone.environment.vpd;
        totals.count += 1;
      }
    }
  }
  if (totals.count === 0) {
    return { temperature: 0, humidity: 0, co2: 0, ppfd: 0, vpd: 0 };
  }
  return {
    temperature: totals.temperature / totals.count,
    humidity: totals.humidity / totals.count,
    co2: totals.co2 / totals.count,
    ppfd: totals.ppfd / totals.count,
    vpd: totals.vpd / totals.count,
  };
};

const gatherPlants = (state: GameState) => {
  const zones: ZoneState[] = [];
  for (const structure of state.structures) {
    for (const room of structure.rooms) {
      zones.push(...room.zones);
    }
  }
  return zones.flatMap((zone) => zone.plants);
};

const runReferenceSimulation = async (): Promise<SimulationKpiSummary> => {
  const seed = 'loop-golden-200-days';

  const strain = createStrainBlueprint();
  const method = createCultivationMethodBlueprint();
  const lamp = createDeviceBlueprint({ kind: 'Lamp' });
  const climateUnit = createDeviceBlueprint({
    kind: 'ClimateUnit',
    settings: { coverageArea: 12 },
  });
  const dehumidifier = createDeviceBlueprint({ kind: 'Dehumidifier' });

  const devicePrices = createDevicePriceMap([
    [
      lamp.id,
      {
        capitalExpenditure: 720,
        baseMaintenanceCostPerTick: 0.002,
        costIncreasePer1000Ticks: 0.0004,
      },
    ],
    [
      climateUnit.id,
      {
        capitalExpenditure: 1450,
        baseMaintenanceCostPerTick: 0.0028,
        costIncreasePer1000Ticks: 0.0006,
      },
    ],
    [
      dehumidifier.id,
      {
        capitalExpenditure: 680,
        baseMaintenanceCostPerTick: 0.0018,
        costIncreasePer1000Ticks: 0.0005,
      },
    ],
  ]);

  const strainPrices = createStrainPriceMap([
    [strain.id, { seedPrice: 0.6, harvestPricePerGram: 4.2 }],
  ]);

  const repository = createBlueprintRepositoryStub({
    strains: [strain],
    cultivationMethods: [method],
    devices: [lamp, climateUnit, dehumidifier],
    devicePrices,
    strainPrices,
  });

  const priceCatalog: PriceCatalog = {
    devicePrices,
    strainPrices,
    utilityPrices: repository.getUtilityPrices(),
  };

  const rng = new RngService(seed);
  const sampleStream = rng.getStream(RNG_STREAM_IDS.simulationTest);
  const context = createStateFactoryContext(seed, { repository, rng });
  const tickLengthMinutes = 60;
  const state = await createInitialState(context, { tickLengthMinutes });

  const ticksPerDayRaw = (24 * 60) / state.metadata.tickLengthMinutes;
  if (!Number.isInteger(ticksPerDayRaw)) {
    throw new Error('Tick length must divide evenly into a full in-game day.');
  }
  const ticksPerDay = Math.trunc(ticksPerDayRaw);
  const totalTicks = ticksPerDay * DAYS_TO_SIMULATE;

  const sampleTicks = generateSampleTicks(sampleStream, totalTicks);
  const sampleTickSet = new Set(sampleTicks);

  const phenologies = new Map<string, PhenologyState>();
  const tickMetrics = new Map<number, TickMetrics>();

  const loop = new SimulationLoop({
    state,
    eventBus: new EventBus(),
    phases: {
      updatePlants: createPlantPhaseHandler(repository, phenologies, tickMetrics),
    },
    accounting: { priceCatalog },
  });

  const totals = {
    ticks: 0,
    totalBiomassDelta: 0,
    totalAvgVpd: 0,
    totalAvgStress: 0,
    totalAvgHealth: 0,
    eventCounts: new Map<string, number>(),
    eventTotal: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalCapex: 0,
    totalOpex: 0,
    totalUtilityCost: 0,
    totalMaintenanceCost: 0,
    energyConsumed: 0,
    waterConsumed: 0,
    nutrientsConsumed: 0,
  };

  const samples: SamplePoint[] = [];

  for (let index = 0; index < totalTicks; index += 1) {
    const result = await loop.processTick();
    if (index === 0) {
      expect(Object.keys(result.phaseTimings)).toEqual([...TICK_PHASES]);
    }
    const metrics = tickMetrics.get(result.tick);
    if (!metrics) {
      throw new Error(`Missing metrics for tick ${result.tick}`);
    }
    tickMetrics.delete(result.tick);

    totals.ticks += 1;
    totals.totalBiomassDelta += metrics.biomassDelta;
    totals.totalAvgVpd += metrics.avgVpd;
    totals.totalAvgStress += metrics.avgStress;
    totals.totalAvgHealth += metrics.avgHealth;

    for (const event of result.events) {
      totals.eventTotal += 1;
      const count = totals.eventCounts.get(event.type) ?? 0;
      totals.eventCounts.set(event.type, count + 1);
      if (isFinanceTickEvent(event)) {
        const payload = event.payload;
        totals.totalRevenue += safeNumber(payload.revenue);
        totals.totalExpenses += safeNumber(payload.expenses);
        totals.totalCapex += safeNumber(payload.capex);
        totals.totalOpex += safeNumber(payload.opex);
        if (payload.utilities) {
          totals.totalUtilityCost += safeNumber(payload.utilities.totalCost);
          totals.energyConsumed += safeNumber(payload.utilities.energy?.quantity);
          totals.waterConsumed += safeNumber(payload.utilities.water?.quantity);
          totals.nutrientsConsumed += safeNumber(payload.utilities.nutrients?.quantity);
        }
        if (Array.isArray(payload.maintenance)) {
          for (const record of payload.maintenance) {
            totals.totalMaintenanceCost += safeNumber(record?.totalCost);
          }
        }
      }
    }

    if (sampleTickSet.has(result.tick)) {
      samples.push({
        tick: result.tick,
        biomassDelta: sanitizeNumber(metrics.biomassDelta),
        avgHealth: sanitizeNumber(metrics.avgHealth),
        avgStress: sanitizeNumber(metrics.avgStress),
        avgVpd: sanitizeNumber(metrics.avgVpd),
        cumulativeBiomassDelta: sanitizeNumber(totals.totalBiomassDelta),
        cumulativeRevenue: sanitizeNumber(totals.totalRevenue),
        cumulativeExpenses: sanitizeNumber(totals.totalExpenses),
        cashOnHand: sanitizeNumber(state.finances.cashOnHand),
        waterRemaining: sanitizeNumber(state.inventory.resources.waterLiters),
        nutrientsRemaining: sanitizeNumber(state.inventory.resources.nutrientsGrams),
        eventCount: totals.eventTotal,
      });
    }
  }

  const plants = gatherPlants(state);
  const finalPlantCount = plants.length;
  const finalBiomassDry = plants.reduce((sum, plant) => sum + plant.biomassDryGrams, 0);
  const finalAverageHealth =
    finalPlantCount > 0
      ? plants.reduce((sum, plant) => sum + plant.health, 0) / finalPlantCount
      : 0;
  const finalAverageQuality =
    finalPlantCount > 0
      ? plants.reduce((sum, plant) => sum + plant.quality, 0) / finalPlantCount
      : 0;
  const finalAverageStress =
    finalPlantCount > 0
      ? plants.reduce((sum, plant) => sum + plant.stress, 0) / finalPlantCount
      : 0;
  const environment = collectFinalEnvironment(state);

  const averageBiomassPerTick = totals.ticks > 0 ? totals.totalBiomassDelta / totals.ticks : 0;
  const averageBiomassPerDay = averageBiomassPerTick * ticksPerDay;

  const summary: SimulationKpiSummary = {
    metadata: {
      seed: state.metadata.seed,
      daysSimulated: DAYS_TO_SIMULATE,
      tickLengthMinutes: state.metadata.tickLengthMinutes,
      ticksPerDay,
      ticksSimulated: totalTicks,
    },
    totals: {
      biomassDelta: sanitizeNumber(totals.totalBiomassDelta),
      averageBiomassPerTick: sanitizeNumber(averageBiomassPerTick),
      averageBiomassPerDay: sanitizeNumber(averageBiomassPerDay),
      averageVpd: sanitizeNumber(totals.totalAvgVpd / totals.ticks),
      averageStress: sanitizeNumber(totals.totalAvgStress / totals.ticks),
      averageHealth: sanitizeNumber(totals.totalAvgHealth / totals.ticks),
    },
    finalState: {
      tick: state.clock.tick,
      plantCount: finalPlantCount,
      biomassDry: sanitizeNumber(finalBiomassDry),
      averageHealth: sanitizeNumber(finalAverageHealth),
      averageQuality: sanitizeNumber(finalAverageQuality),
      averageStress: sanitizeNumber(finalAverageStress),
      environment: {
        temperature: sanitizeNumber(environment.temperature),
        humidity: sanitizeNumber(environment.humidity),
        co2: sanitizeNumber(environment.co2),
        ppfd: sanitizeNumber(environment.ppfd),
        vpd: sanitizeNumber(environment.vpd),
      },
      resources: {
        waterLiters: sanitizeNumber(state.inventory.resources.waterLiters),
        nutrientsGrams: sanitizeNumber(state.inventory.resources.nutrientsGrams),
      },
      cashOnHand: sanitizeNumber(state.finances.cashOnHand),
      financeSummary: {
        totalRevenue: sanitizeNumber(state.finances.summary.totalRevenue),
        totalExpenses: sanitizeNumber(state.finances.summary.totalExpenses),
        totalPayroll: sanitizeNumber(state.finances.summary.totalPayroll),
        totalMaintenance: sanitizeNumber(state.finances.summary.totalMaintenance),
        netIncome: sanitizeNumber(state.finances.summary.netIncome),
        lastTickRevenue: sanitizeNumber(state.finances.summary.lastTickRevenue),
        lastTickExpenses: sanitizeNumber(state.finances.summary.lastTickExpenses),
      },
    },
    financials: {
      revenue: sanitizeNumber(totals.totalRevenue),
      expenses: sanitizeNumber(totals.totalExpenses),
      capex: sanitizeNumber(totals.totalCapex),
      opex: sanitizeNumber(totals.totalOpex),
      utilityCost: sanitizeNumber(totals.totalUtilityCost),
      maintenanceCost: sanitizeNumber(totals.totalMaintenanceCost),
      utilitiesConsumed: {
        energyKwh: sanitizeNumber(totals.energyConsumed),
        waterLiters: sanitizeNumber(totals.waterConsumed),
        nutrientsGrams: sanitizeNumber(totals.nutrientsConsumed),
      },
    },
    events: {
      dispatched: totals.eventTotal,
      counts: toSortedRecord(totals.eventCounts),
    },
    samples,
  };

  return summary;
};

const shouldUpdateGolden = (): boolean => {
  const envFlag = process.env.UPDATE_GOLDENS ?? process.env.UPDATE_SIM_GOLDENS;
  if (envFlag && GOLDEN_UPDATE_FLAGS.has(envFlag.toLowerCase())) {
    return true;
  }
  if (!existsSync(GOLDEN_PATH)) {
    return true;
  }
  return false;
};

const writeGolden = (summary: SimulationKpiSummary) => {
  mkdirSync(GOLDEN_DIR, { recursive: true });
  writeFileSync(GOLDEN_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
};

const readGolden = (): SimulationKpiSummary => {
  if (!existsSync(GOLDEN_PATH)) {
    throw new Error(
      `Golden file missing at ${GOLDEN_PATH}. Run this test with UPDATE_GOLDENS=1 to create the baseline.`,
    );
  }
  const raw = readFileSync(GOLDEN_PATH, 'utf8');
  return JSON.parse(raw) as SimulationKpiSummary;
};

const compareSummaries = (current: SimulationKpiSummary, expected: SimulationKpiSummary) => {
  expect(current.metadata).toEqual(expected.metadata);

  assertApproximatelyEqual(
    current.totals.biomassDelta,
    expected.totals.biomassDelta,
    'totals.biomassDelta',
  );
  assertApproximatelyEqual(
    current.totals.averageBiomassPerTick,
    expected.totals.averageBiomassPerTick,
    'totals.averageBiomassPerTick',
  );
  assertApproximatelyEqual(
    current.totals.averageBiomassPerDay,
    expected.totals.averageBiomassPerDay,
    'totals.averageBiomassPerDay',
  );
  assertApproximatelyEqual(
    current.totals.averageVpd,
    expected.totals.averageVpd,
    'totals.averageVpd',
  );
  assertApproximatelyEqual(
    current.totals.averageStress,
    expected.totals.averageStress,
    'totals.averageStress',
  );
  assertApproximatelyEqual(
    current.totals.averageHealth,
    expected.totals.averageHealth,
    'totals.averageHealth',
  );

  expect(current.finalState.tick).toBe(expected.finalState.tick);
  expect(current.finalState.plantCount).toBe(expected.finalState.plantCount);
  assertApproximatelyEqual(
    current.finalState.biomassDry,
    expected.finalState.biomassDry,
    'finalState.biomassDry',
  );
  assertApproximatelyEqual(
    current.finalState.averageHealth,
    expected.finalState.averageHealth,
    'finalState.averageHealth',
  );
  assertApproximatelyEqual(
    current.finalState.averageQuality,
    expected.finalState.averageQuality,
    'finalState.averageQuality',
  );
  assertApproximatelyEqual(
    current.finalState.averageStress,
    expected.finalState.averageStress,
    'finalState.averageStress',
  );
  assertApproximatelyEqual(
    current.finalState.environment.temperature,
    expected.finalState.environment.temperature,
    'finalState.environment.temperature',
  );
  assertApproximatelyEqual(
    current.finalState.environment.humidity,
    expected.finalState.environment.humidity,
    'finalState.environment.humidity',
  );
  assertApproximatelyEqual(
    current.finalState.environment.co2,
    expected.finalState.environment.co2,
    'finalState.environment.co2',
  );
  assertApproximatelyEqual(
    current.finalState.environment.ppfd,
    expected.finalState.environment.ppfd,
    'finalState.environment.ppfd',
  );
  assertApproximatelyEqual(
    current.finalState.environment.vpd,
    expected.finalState.environment.vpd,
    'finalState.environment.vpd',
  );
  assertApproximatelyEqual(
    current.finalState.resources.waterLiters,
    expected.finalState.resources.waterLiters,
    'finalState.resources.waterLiters',
  );
  assertApproximatelyEqual(
    current.finalState.resources.nutrientsGrams,
    expected.finalState.resources.nutrientsGrams,
    'finalState.resources.nutrientsGrams',
  );
  assertApproximatelyEqual(
    current.finalState.cashOnHand,
    expected.finalState.cashOnHand,
    'finalState.cashOnHand',
  );
  assertApproximatelyEqual(
    current.finalState.financeSummary.totalRevenue,
    expected.finalState.financeSummary.totalRevenue,
    'finalState.financeSummary.totalRevenue',
  );
  assertApproximatelyEqual(
    current.finalState.financeSummary.totalExpenses,
    expected.finalState.financeSummary.totalExpenses,
    'finalState.financeSummary.totalExpenses',
  );
  assertApproximatelyEqual(
    current.finalState.financeSummary.totalMaintenance,
    expected.finalState.financeSummary.totalMaintenance,
    'finalState.financeSummary.totalMaintenance',
  );
  assertApproximatelyEqual(
    current.finalState.financeSummary.netIncome,
    expected.finalState.financeSummary.netIncome,
    'finalState.financeSummary.netIncome',
  );
  assertApproximatelyEqual(
    current.finalState.financeSummary.totalPayroll,
    expected.finalState.financeSummary.totalPayroll,
    'finalState.financeSummary.totalPayroll',
  );
  assertApproximatelyEqual(
    current.finalState.financeSummary.lastTickRevenue,
    expected.finalState.financeSummary.lastTickRevenue,
    'finalState.financeSummary.lastTickRevenue',
  );
  assertApproximatelyEqual(
    current.finalState.financeSummary.lastTickExpenses,
    expected.finalState.financeSummary.lastTickExpenses,
    'finalState.financeSummary.lastTickExpenses',
  );

  assertApproximatelyEqual(
    current.financials.revenue,
    expected.financials.revenue,
    'financials.revenue',
  );
  assertApproximatelyEqual(
    current.financials.expenses,
    expected.financials.expenses,
    'financials.expenses',
  );
  assertApproximatelyEqual(current.financials.capex, expected.financials.capex, 'financials.capex');
  assertApproximatelyEqual(current.financials.opex, expected.financials.opex, 'financials.opex');
  assertApproximatelyEqual(
    current.financials.utilityCost,
    expected.financials.utilityCost,
    'financials.utilityCost',
  );
  assertApproximatelyEqual(
    current.financials.maintenanceCost,
    expected.financials.maintenanceCost,
    'financials.maintenanceCost',
  );
  assertApproximatelyEqual(
    current.financials.utilitiesConsumed.energyKwh,
    expected.financials.utilitiesConsumed.energyKwh,
    'financials.utilitiesConsumed.energyKwh',
  );
  assertApproximatelyEqual(
    current.financials.utilitiesConsumed.waterLiters,
    expected.financials.utilitiesConsumed.waterLiters,
    'financials.utilitiesConsumed.waterLiters',
  );
  assertApproximatelyEqual(
    current.financials.utilitiesConsumed.nutrientsGrams,
    expected.financials.utilitiesConsumed.nutrientsGrams,
    'financials.utilitiesConsumed.nutrientsGrams',
  );

  expect(current.events.dispatched).toBe(expected.events.dispatched);
  expect(current.events.counts).toEqual(expected.events.counts);

  expect(current.samples.length).toBe(expected.samples.length);
  for (let index = 0; index < current.samples.length; index += 1) {
    const currentSample = current.samples[index];
    const expectedSample = expected.samples[index];
    expect(currentSample.tick).toBe(expectedSample.tick);
    assertApproximatelyEqual(
      currentSample.biomassDelta,
      expectedSample.biomassDelta,
      `samples[${index}].biomassDelta`,
    );
    assertApproximatelyEqual(
      currentSample.avgHealth,
      expectedSample.avgHealth,
      `samples[${index}].avgHealth`,
    );
    assertApproximatelyEqual(
      currentSample.avgStress,
      expectedSample.avgStress,
      `samples[${index}].avgStress`,
    );
    assertApproximatelyEqual(
      currentSample.avgVpd,
      expectedSample.avgVpd,
      `samples[${index}].avgVpd`,
    );
    assertApproximatelyEqual(
      currentSample.cumulativeBiomassDelta,
      expectedSample.cumulativeBiomassDelta,
      `samples[${index}].cumulativeBiomassDelta`,
    );
    assertApproximatelyEqual(
      currentSample.cumulativeRevenue,
      expectedSample.cumulativeRevenue,
      `samples[${index}].cumulativeRevenue`,
    );
    assertApproximatelyEqual(
      currentSample.cumulativeExpenses,
      expectedSample.cumulativeExpenses,
      `samples[${index}].cumulativeExpenses`,
    );
    assertApproximatelyEqual(
      currentSample.cashOnHand,
      expectedSample.cashOnHand,
      `samples[${index}].cashOnHand`,
    );
    assertApproximatelyEqual(
      currentSample.waterRemaining,
      expectedSample.waterRemaining,
      `samples[${index}].waterRemaining`,
    );
    assertApproximatelyEqual(
      currentSample.nutrientsRemaining,
      expectedSample.nutrientsRemaining,
      `samples[${index}].nutrientsRemaining`,
    );
    expect(currentSample.eventCount).toBe(expectedSample.eventCount);
  }
};

describe('simulation loop golden run', () => {
  it('matches the KPI baseline over 200 in-game days', async () => {
    const summary = await runReferenceSimulation();
    if (shouldUpdateGolden()) {
      writeGolden(summary);
    }
    const golden = readGolden();
    compareSummaries(summary, golden);
  }, 120_000);
});
