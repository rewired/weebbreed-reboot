import { beforeAll, describe, expect, it } from 'vitest';
import { EventBus } from '../lib/eventBus.js';
import { SimulationLoop } from './loop.js';
import { createInitialState } from '../stateFactory.js';
import {
  createBlueprintRepositoryStub,
  createCultivationMethodBlueprint,
  createDeviceBlueprint,
  createDevicePriceMap,
  createStateFactoryContext,
  createStrainBlueprint,
  createStrainPriceMap,
  createStructureBlueprint,
} from '../testing/fixtures.js';
import { createPhenologyConfig } from '../engine/plants/phenology.js';
import type { PhenologyState } from '../engine/plants/phenology.js';
import { updatePlantGrowth } from '../engine/plants/growthModel.js';
import type { BlueprintRepository } from '../../data/blueprintRepository.js';
import type { SimulationPhaseContext } from './loop.js';
import { loadTestRoomPurposes } from '../testing/loadTestRoomPurposes.js';

beforeAll(async () => {
  await loadTestRoomPurposes();
});

interface TickMetrics {
  biomassDelta: number;
  avgVpd: number;
  avgStress: number;
  avgHealth: number;
}

const buildRepository = () => {
  const strain = createStrainBlueprint();
  const method = createCultivationMethodBlueprint();
  const lamp = createDeviceBlueprint({
    kind: 'Lamp',
    settings: { coverageArea: 12, ppfd: 900, power: 0.8 },
  });
  const hvac = createDeviceBlueprint({
    kind: 'ClimateUnit',
    settings: {
      airflow: 400,
      coverageArea: 12,
      targetTemperature: 24,
      targetTemperatureRange: [23, 25],
    },
  });
  const dehumidifier = createDeviceBlueprint({ kind: 'Dehumidifier', settings: { airflow: 180 } });

  return createBlueprintRepositoryStub({
    strains: [strain],
    cultivationMethods: [method],
    devices: [lamp, hvac, dehumidifier],
    devicePrices: createDevicePriceMap([
      [
        lamp.id,
        {
          capitalExpenditure: 720,
          baseMaintenanceCostPerTick: 0.002,
          costIncreasePer1000Ticks: 0.0004,
        },
      ],
      [
        hvac.id,
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
    ]),
    strainPrices: createStrainPriceMap([[strain.id, { seedPrice: 0.6, harvestPricePerGram: 4.2 }]]),
  });
};

const createPlantPhaseHandler = (
  repository: BlueprintRepository,
  phenologies: Map<string, PhenologyState>,
  metrics: Map<number, TickMetrics>,
) => {
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
            return result.plant;
          });
          zone.plants = updatedPlants;
        }
      }
    }

    const normaliser = plantCount > 0 ? plantCount : 1;
    metrics.set(context.tick, {
      biomassDelta,
      avgVpd: vpdSum / normaliser,
      avgStress: stressSum / normaliser,
      avgHealth: healthSum / normaliser,
    });

    if (plantCount > 0) {
      const averageVpd = vpdSum / plantCount;
      for (const structure of context.state.structures) {
        for (const room of structure.rooms) {
          for (const zone of room.zones) {
            zone.environment.vpd = averageVpd;
          }
        }
      }
    }
  };
};

describe('integration scenarios', () => {
  it('dark run keeps biomass near zero growth', async () => {
    const repository = buildRepository();
    const context = createStateFactoryContext('dark-run', {
      repository,
      structureBlueprints: [
        createStructureBlueprint({ footprint: { length: 12, width: 6, height: 4 } }),
      ],
    });
    const state = await createInitialState(context);
    const zone = state.structures[0].rooms[0].zones[0];

    zone.environment.ppfd = 0;
    for (const device of zone.devices) {
      if (device.kind === 'Lamp') {
        device.settings.ppfd = 0;
        device.settings.power = 0;
      }
    }

    const phenologies = new Map<string, PhenologyState>();
    const metrics = new Map<number, TickMetrics>();
    const loop = new SimulationLoop({
      state,
      eventBus: new EventBus(),
      phases: {
        applyDevices: () => undefined,
        deriveEnvironment: () => undefined,
        updatePlants: createPlantPhaseHandler(repository, phenologies, metrics),
      },
    });

    const ticks = 24;
    const deltas: number[] = [];
    for (let index = 0; index < ticks; index += 1) {
      const result = await loop.processTick();
      const tickDelta = metrics.get(result.tick)?.biomassDelta ?? 0;
      deltas.push(tickDelta);
      expect(result.events.every((event) => event.type === 'plant.healthAlert')).toBe(true);
    }

    for (const delta of deltas) {
      expect(Math.abs(delta)).toBeLessThan(0.1);
    }

    const finalBiomass = state.structures
      .flatMap((structure) => structure.rooms)
      .flatMap((room) => room.zones)
      .flatMap((zone) => zone.plants)
      .reduce((sum, plant) => sum + plant.biomassDryGrams, 0);

    expect(finalBiomass).toBeLessThan(0.01);
  });

  it('dry air increases VPD and stress compared to baseline', async () => {
    const repository = buildRepository();
    const context = createStateFactoryContext('dry-air', {
      repository,
      structureBlueprints: [
        createStructureBlueprint({ footprint: { length: 12, width: 6, height: 4 } }),
      ],
    });
    const state = await createInitialState(context);
    const zone = state.structures[0].rooms[0].zones[0];

    zone.environment.temperature = 26;
    zone.environment.relativeHumidity = 0.62;

    const phenologies = new Map<string, PhenologyState>();
    const metrics = new Map<number, TickMetrics>();
    const loop = new SimulationLoop({
      state,
      eventBus: new EventBus(),
      phases: {
        applyDevices: () => undefined,
        deriveEnvironment: () => undefined,
        updatePlants: createPlantPhaseHandler(repository, phenologies, metrics),
      },
    });

    const baseline = await loop.processTick();
    const baselineMetrics = metrics.get(baseline.tick);
    expect(baselineMetrics).toBeDefined();

    zone.environment.relativeHumidity = 0.52;
    const dry = await loop.processTick();
    const dryMetrics = metrics.get(dry.tick);

    expect(dryMetrics).toBeDefined();
    expect(dryMetrics!.avgVpd).toBeGreaterThan(baselineMetrics!.avgVpd);
    expect(dryMetrics!.avgStress).toBeGreaterThan(baselineMetrics!.avgStress);
    expect(dryMetrics!.avgHealth).toBeLessThan(baselineMetrics!.avgHealth);
  });

  it('additional lighting overcomes coverage limits for PPFD', async () => {
    const repositorySingle = buildRepository();
    const contextSingle = createStateFactoryContext('coverage', {
      repository: repositorySingle,
      structureBlueprints: [
        createStructureBlueprint({ footprint: { length: 12, width: 6, height: 4 } }),
      ],
    });
    const stateSingle = await createInitialState(contextSingle);
    const zoneSingle = stateSingle.structures[0].rooms[0].zones[0];
    zoneSingle.environment.ppfd = 0;

    const loopSingle = new SimulationLoop({
      state: stateSingle,
      eventBus: new EventBus(),
    });
    await loopSingle.processTick();
    const ppfdSingle = zoneSingle.environment.ppfd;
    expect(ppfdSingle).toBeGreaterThan(0);

    const repositoryDouble = buildRepository();
    const contextDouble = createStateFactoryContext('coverage', {
      repository: repositoryDouble,
      structureBlueprints: [
        createStructureBlueprint({ footprint: { length: 12, width: 6, height: 4 } }),
      ],
    });
    const stateDouble = await createInitialState(contextDouble);
    const zoneDouble = stateDouble.structures[0].rooms[0].zones[0];
    zoneDouble.environment.ppfd = 0;
    const lamp = zoneDouble.devices.find((device) => device.kind === 'Lamp');
    if (lamp) {
      zoneDouble.devices.push({ ...lamp, id: `${lamp.id}-extra` });
    }

    const loopDouble = new SimulationLoop({
      state: stateDouble,
      eventBus: new EventBus(),
    });
    await loopDouble.processTick();
    const ppfdDouble = zoneDouble.environment.ppfd;

    expect(ppfdDouble).toBeGreaterThan(ppfdSingle * 1.8);
    if (lamp?.settings?.ppfd) {
      expect(ppfdDouble).toBeLessThanOrEqual(lamp.settings.ppfd * 2);
    }
  });
});
