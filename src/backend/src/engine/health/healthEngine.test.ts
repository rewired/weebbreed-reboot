import { beforeAll, describe, expect, it } from 'vitest';
import { PlantHealthEngine } from './healthEngine.js';
import type { DiseaseBalancingConfig, PestBalancingConfig, TreatmentOption } from './models.js';
import { createEventCollector, type SimulationEvent } from '@/lib/eventBus.js';
import { resolveRoomPurposeId } from '../roomPurposes/index.js';
import { loadTestRoomPurposes } from '@/testing/loadTestRoomPurposes.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import {
  DISEASE_DETECTION_THRESHOLD,
  DISEASE_SPREAD_THRESHOLD,
  PEST_DETECTION_THRESHOLD,
  PEST_SPREAD_THRESHOLD,
} from '@/constants/health.js';
import type {
  DiseaseState,
  GameState,
  PestState,
  PlantState,
  RoomState,
  StructureState,
  ZoneEnvironmentState,
  ZoneHealthState,
  ZoneMetricState,
  ZoneResourceState,
  ZoneState,
} from '@/state/models.js';
import type { AccountingPhaseTools, SimulationPhaseContext } from '@/sim/loop.js';

const diseaseBalancing: DiseaseBalancingConfig = {
  global: {
    baseDailyInfectionMultiplier: 1,
    baseRecoveryMultiplier: 1,
    maxConcurrentDiseases: 2,
    symptomDelayDays: { min: 1, max: 1 },
  },
  phaseMultipliers: {
    seedling: { infection: 1, degeneration: 1, recovery: 1 },
    vegetation: { infection: 1, degeneration: 1, recovery: 1 },
    earlyFlower: { infection: 1.1, degeneration: 1.1, recovery: 0.95 },
    lateFlower: { infection: 1.3, degeneration: 1.4, recovery: 0.8 },
    ripening: { infection: 1.05, degeneration: 1.2, recovery: 0.85 },
  },
  treatmentEfficacy: {
    biological: { infectionMultiplier: 0.85, degenerationMultiplier: 0.9, recoveryMultiplier: 1.1 },
    cultural: { infectionMultiplier: 0.95, degenerationMultiplier: 1, recoveryMultiplier: 1 },
    mechanical: {
      infectionMultiplier: 0.9,
      degenerationMultiplier: 0.95,
      recoveryMultiplier: 1.05,
    },
    chemical: { infectionMultiplier: 0.7, degenerationMultiplier: 0.8, recoveryMultiplier: 1.15 },
    physical: { infectionMultiplier: 0.9, degenerationMultiplier: 0.95, recoveryMultiplier: 1.05 },
  },
  caps: {
    minDailyDegeneration: 0,
    maxDailyDegeneration: 0.3,
    minDailyRecovery: 0,
    maxDailyRecovery: 0.3,
  },
};

const pestBalancing: PestBalancingConfig = {
  global: {
    baseDailyReproductionMultiplier: 1,
    baseDailyMortalityMultiplier: 1,
    baseDamageMultiplier: 1,
    maxConcurrentPests: 2,
  },
  phaseMultipliers: {
    seedling: { reproduction: 1.05, mortality: 0.95, damage: 1.05 },
    vegetation: { reproduction: 1, mortality: 1, damage: 1 },
    earlyFlower: { reproduction: 1.05, mortality: 0.95, damage: 1.15 },
    lateFlower: { reproduction: 1.1, mortality: 0.9, damage: 1.3 },
    ripening: { reproduction: 0.95, mortality: 0.95, damage: 1.25 },
  },
  controlEfficacy: {
    biological: { reproductionMultiplier: 0.8, mortalityMultiplier: 1.2, damageMultiplier: 0.9 },
    cultural: { reproductionMultiplier: 0.9, mortalityMultiplier: 1.05, damageMultiplier: 0.95 },
    mechanical: { reproductionMultiplier: 0.85, mortalityMultiplier: 1.1, damageMultiplier: 0.9 },
    chemical: { reproductionMultiplier: 0.7, mortalityMultiplier: 1.3, damageMultiplier: 0.8 },
    physical: { reproductionMultiplier: 0.9, mortalityMultiplier: 1.05, damageMultiplier: 0.95 },
  },
  caps: {
    minDailyReproduction: 0,
    maxDailyReproduction: 0.6,
    minDailyMortality: 0,
    maxDailyMortality: 0.6,
    minDailyDamage: 0,
    maxDailyDamage: 0.4,
  },
};

const treatmentOptions: TreatmentOption[] = [
  {
    id: 'bio-boost',
    name: 'Predator release',
    category: 'biological',
    targets: ['disease', 'pest'],
    efficacy: {
      disease: {
        infectionMultiplier: 0.5,
        degenerationMultiplier: 0.6,
        recoveryMultiplier: 1.5,
      },
      pest: {
        reproductionMultiplier: 0.6,
        mortalityMultiplier: 1.4,
        damageMultiplier: 0.7,
      },
    },
    cooldownDays: 1,
    effectDurationDays: 1,
    reentryIntervalTicks: 4,
    preHarvestIntervalTicks: 6,
  },
];

const createEnvironment = (): ZoneEnvironmentState => ({
  temperature: 25,
  relativeHumidity: 0.6,
  co2: 800,
  ppfd: 600,
  vpd: 1.2,
});

const createResources = (): ZoneResourceState => ({
  waterLiters: 500,
  nutrientSolutionLiters: 250,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: 0.6,
  lastTranspirationLiters: 0,
});

const createMetrics = (environment: ZoneEnvironmentState): ZoneMetricState => ({
  averageTemperature: environment.temperature,
  averageHumidity: environment.relativeHumidity,
  averageCo2: environment.co2,
  averagePpfd: environment.ppfd,
  stressLevel: 0.1,
  lastUpdatedTick: 0,
});

const createPlant = (overrides: Partial<PlantState> = {}): PlantState => ({
  id: overrides.id ?? 'plant-1',
  strainId: 'strain-1',
  zoneId: 'zone-1',
  stage: 'flowering',
  plantedAtTick: 0,
  ageInHours: 0,
  health: 0.85,
  stress: 0.15,
  biomassDryGrams: 120,
  heightMeters: 0.6,
  canopyCover: 0.3,
  yieldDryGrams: 0,
  quality: 0.8,
  lastMeasurementTick: 0,
  ...overrides,
});

const createZoneHealth = (plants: PlantState[]): ZoneHealthState => {
  const plantHealth = Object.fromEntries(
    plants.map((plant) => [plant.id, { diseases: [], pests: [] }]),
  );
  return {
    plantHealth,
    pendingTreatments: [],
    appliedTreatments: [],
  } satisfies ZoneHealthState;
};

let growRoomPurposeId: string;
let repository: BlueprintRepository;

beforeAll(async () => {
  repository = await loadTestRoomPurposes();
  growRoomPurposeId = resolveRoomPurposeId(repository, 'Grow Room');
});

const createGameState = (): GameState => {
  const createdAt = '2024-01-01T00:00:00.000Z';
  const environment = createEnvironment();
  const plantA = createPlant({ id: 'plant-a' });
  const plantB = createPlant({ id: 'plant-b' });
  const plants = [plantA, plantB];
  const zone: ZoneState = {
    id: 'zone-1',
    roomId: 'room-1',
    name: 'Zone 1',
    cultivationMethodId: 'method-1',
    strainId: 'strain-1',
    area: 40,
    ceilingHeight: 3,
    volume: 120,
    environment,
    resources: createResources(),
    plants,
    devices: [],
    metrics: createMetrics(environment),
    control: { setpoints: {} },
    health: createZoneHealth(plants),
    activeTaskIds: [],
  };
  const room: RoomState = {
    id: 'room-1',
    structureId: 'structure-1',
    name: 'Grow Room',
    purposeId: growRoomPurposeId,
    area: 40,
    height: 3,
    volume: 120,
    zones: [zone],
    cleanliness: 0.9,
    maintenanceLevel: 0.9,
  };
  const structure: StructureState = {
    id: 'structure-1',
    blueprintId: 'structure-blueprint',
    name: 'Structure One',
    status: 'active',
    footprint: {
      length: 10,
      width: 4,
      height: 3,
      area: 40,
      volume: 120,
    },
    rooms: [room],
    rentPerTick: 0,
    upfrontCostPaid: 0,
  };

  return {
    metadata: {
      gameId: 'game-1',
      createdAt,
      seed: 'seed',
      difficulty: 'normal',
      simulationVersion: '0.0.0',
      tickLengthMinutes: 60,
      economics: {
        initialCapital: 0,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0,
        rentPerSqmRoomPerTick: 0,
      },
    },
    clock: {
      tick: 0,
      isPaused: false,
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      targetTickRate: 1,
    },
    structures: [structure],
    inventory: {
      resources: {
        waterLiters: 0,
        nutrientsGrams: 0,
        co2Kg: 0,
        substrateKg: 0,
        packagingUnits: 0,
        sparePartsValue: 0,
      },
      seeds: [],
      devices: [],
      harvest: [],
      consumables: {},
    },
    finances: {
      cashOnHand: 0,
      reservedCash: 0,
      outstandingLoans: [],
      ledger: [],
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        totalPayroll: 0,
        totalMaintenance: 0,
        netIncome: 0,
        lastTickRevenue: 0,
        lastTickExpenses: 0,
      },
    },
    personnel: {
      employees: [],
      applicants: [],
      trainingPrograms: [],
      overallMorale: 0,
    },
    tasks: {
      backlog: [],
      active: [],
      completed: [],
      cancelled: [],
    },
    notes: [],
  } satisfies GameState;
};

const accountingTools: AccountingPhaseTools = {
  recordUtility: () => undefined,
  recordDevicePurchase: () => undefined,
};

const createContext = (
  state: GameState,
  tick: number,
  events: SimulationEvent[],
): SimulationPhaseContext => ({
  state,
  tick,
  tickLengthMinutes: state.metadata.tickLengthMinutes,
  phase: 'updatePlants',
  events: createEventCollector(events, tick),
  accounting: accountingTools,
});

describe('PlantHealthEngine', () => {
  it('runs detection → progression → treatment → recovery and enforces restrictions', () => {
    const state = createGameState();
    const [structure] = state.structures;
    if (!structure) throw new Error('Expected structure in game state');
    const [room] = structure.rooms;
    if (!room) throw new Error('Expected room in structure');
    const [zone] = room.zones;
    if (!zone) throw new Error('Expected zone in room');
    const [plant, secondaryPlant] = zone.plants;
    if (!plant || !secondaryPlant) throw new Error('Expected at least two plants in zone');
    const initialDiseaseSeverity = DISEASE_DETECTION_THRESHOLD + 0.02;
    const initialDiseaseInfection = Math.max(DISEASE_SPREAD_THRESHOLD - 0.2, 0.1);
    const initialPestPopulation = Math.max(PEST_SPREAD_THRESHOLD, PEST_DETECTION_THRESHOLD + 0.38);

    const disease: DiseaseState = {
      id: 'disease-1',
      pathogenId: 'powdery-mildew',
      severity: initialDiseaseSeverity,
      infection: initialDiseaseInfection,
      detected: false,
      symptomTimerTicks: 0,
      spreadCooldownTicks: 1,
      baseInfectionRatePerDay: 0.3,
      baseRecoveryRatePerDay: 0.05,
      baseDegenerationRatePerDay: 0.1,
      phaseOverride: 'lateFlower',
      activeTreatments: [],
    };
    const pest: PestState = {
      id: 'pest-1',
      pestId: 'spider-mites',
      population: initialPestPopulation,
      damage: 0.2,
      detected: false,
      symptomTimerTicks: 0,
      spreadCooldownTicks: 1,
      baseReproductionRatePerDay: 0.25,
      baseMortalityRatePerDay: 0.08,
      baseDamageRatePerDay: 0.12,
      phaseOverride: 'lateFlower',
      activeTreatments: [],
    };

    zone.health.plantHealth[plant.id] = { diseases: [disease], pests: [pest] };
    zone.health.plantHealth[secondaryPlant.id] = { diseases: [], pests: [] };

    const engine = new PlantHealthEngine({
      diseaseBalancing,
      pestBalancing,
      treatmentOptions,
    });

    const tick1Events: SimulationEvent[] = [];
    const context1 = createContext(state, 1, tick1Events);
    engine.runDetection(context1);
    expect(tick1Events.some((event) => event.type === 'pest.detected')).toBe(true);

    engine.runProgression(context1);
    const infectionAfterTick1 = disease.infection;
    const severityAfterTick1 = disease.severity;
    const pestPopulationAfterTick1 = pest.population;
    expect(infectionAfterTick1).toBeGreaterThan(initialDiseaseInfection);
    expect(severityAfterTick1).toBeGreaterThan(initialDiseaseSeverity);
    expect(pestPopulationAfterTick1).toBeGreaterThan(initialPestPopulation);

    zone.health.pendingTreatments.push({
      optionId: 'bio-boost',
      target: 'disease',
      plantIds: [plant.id],
      scheduledTick: 2,
    });
    zone.health.pendingTreatments.push({
      optionId: 'bio-boost',
      target: 'pest',
      plantIds: [plant.id],
      scheduledTick: 2,
    });

    const tick2Events: SimulationEvent[] = [];
    const context2 = createContext(state, 2, tick2Events);
    engine.runDetection(context2);
    engine.runProgression(context2);
    const infectionBeforeTreatment = disease.infection;
    const pestBeforeTreatment = pest.population;

    engine.runTreatmentApplication(context2);
    expect(tick2Events.some((event) => event.type === 'treatment.applied')).toBe(true);
    expect(zone.health.reentryRestrictedUntilTick).toBe(2 + 4);
    expect(zone.health.preHarvestRestrictedUntilTick).toBe(2 + 6);
    expect(zone.health.appliedTreatments).toHaveLength(2);
    expect(zone.health.pendingTreatments).toHaveLength(0);

    const tick3Events: SimulationEvent[] = [];
    const context3 = createContext(state, 3, tick3Events);
    engine.runProgression(context3);
    const infectionAfterTreatment = disease.infection;
    const pestAfterTreatment = pest.population;

    const infectionDeltaBefore = infectionBeforeTreatment - infectionAfterTick1;
    const infectionDeltaAfter = infectionAfterTreatment - infectionBeforeTreatment;
    expect(infectionDeltaAfter).toBeLessThan(infectionDeltaBefore);

    const pestDeltaBefore = pestBeforeTreatment - pestPopulationAfterTick1;
    const pestDeltaAfter = pestAfterTreatment - pestBeforeTreatment;
    expect(pestDeltaAfter).toBeLessThan(pestDeltaBefore);

    disease.infection = DISEASE_SPREAD_THRESHOLD + 0.2;
    disease.lastSpreadTick = 0;
    pest.population = PEST_SPREAD_THRESHOLD + 0.2;
    pest.lastSpreadTick = 0;

    engine.runSpread(context3);

    const secondaryHealth = zone.health.plantHealth[secondaryPlant.id];
    expect(secondaryHealth.diseases.length).toBeGreaterThan(0);
    expect(secondaryHealth.pests.length).toBeGreaterThan(0);
    const [secondaryDisease] = secondaryHealth.diseases;
    if (!secondaryDisease) throw new Error('Expected secondary disease entry');
    const [secondaryPest] = secondaryHealth.pests;
    if (!secondaryPest) throw new Error('Expected secondary pest entry');
    expect(secondaryDisease.detected).toBe(false);
    expect(secondaryPest.detected).toBe(false);
  });
});
