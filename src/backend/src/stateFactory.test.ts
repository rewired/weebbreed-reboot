import { describe, expect, it } from 'vitest';
import type { TaskDefinitionMap } from './state/models.js';
import { createInitialState } from './stateFactory.js';
import {
  createBlueprintRepositoryStub,
  createCultivationMethodBlueprint,
  createDeviceBlueprint,
  createDevicePriceMap,
  createStateFactoryContext,
  createStrainBlueprint,
  createStrainPriceMap,
  createStructureBlueprint,
} from './testing/fixtures.js';

describe('createInitialState', () => {
  it('initialises backlog tasks using provided definitions', async () => {
    const strain = createStrainBlueprint();
    const method = createCultivationMethodBlueprint({ areaPerPlant: 1.2 });
    const lamp = createDeviceBlueprint({ kind: 'Lamp', settings: { coverageArea: 10, ppfd: 750 } });
    const hvac = createDeviceBlueprint({
      kind: 'ClimateUnit',
      settings: {
        airflow: 360,
        coverageArea: 12,
        targetTemperature: 24,
        targetTemperatureRange: [23, 25],
      },
    });

    const repository = createBlueprintRepositoryStub({
      strains: [strain],
      cultivationMethods: [method],
      devices: [lamp, hvac],
      devicePrices: createDevicePriceMap([
        [
          lamp.id,
          {
            capitalExpenditure: 650,
            baseMaintenanceCostPerTick: 0.002,
            costIncreasePer1000Ticks: 0.0005,
          },
        ],
        [
          hvac.id,
          {
            capitalExpenditure: 1200,
            baseMaintenanceCostPerTick: 0.0025,
            costIncreasePer1000Ticks: 0.0007,
          },
        ],
      ]),
      strainPrices: createStrainPriceMap([
        [strain.id, { seedPrice: 0.6, harvestPricePerGram: 4.1 }],
      ]),
    });

    const taskDefinitions: TaskDefinitionMap = {
      execute_planting_plan: {
        id: 'execute_planting_plan',
        costModel: { basis: 'perAction', laborMinutes: 120 },
        priority: 8,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 2,
        description: 'Execute planting plan',
      },
      refill_supplies_water: {
        id: 'refill_supplies_water',
        costModel: { basis: 'perAction', laborMinutes: 45 },
        priority: 6,
        requiredRole: 'Operator',
        requiredSkill: 'Logistics',
        minSkillLevel: 1,
        description: 'Refill the water reservoir',
      },
      maintain_device: {
        id: 'maintain_device',
        costModel: { basis: 'perAction', laborMinutes: 180 },
        priority: 5,
        requiredRole: 'Technician',
        requiredSkill: 'Maintenance',
        minSkillLevel: 3,
        description: 'Maintain installed devices',
      },
    };

    const context = createStateFactoryContext('task-seed', {
      repository,
      structureBlueprints: [
        createStructureBlueprint({ footprint: { length: 10, width: 6, height: 4 } }),
      ],
      taskDefinitions,
    });

    const state = await createInitialState(context);

    expect(state.tasks.backlog).toHaveLength(3);
    const byDefinition = Object.fromEntries(
      state.tasks.backlog.map((task) => [task.definitionId, task]),
    ) as Record<string, (typeof state.tasks.backlog)[number]>;

    const planting = byDefinition.execute_planting_plan;
    expect(planting.priority).toBe(taskDefinitions.execute_planting_plan.priority);
    expect(planting.dueTick).toBe(Math.round(taskDefinitions.execute_planting_plan.priority * 4));
    expect(planting.metadata).toMatchObject({ description: 'Execute planting plan' });

    const refill = byDefinition.refill_supplies_water;
    expect(refill.priority).toBe(taskDefinitions.refill_supplies_water.priority);
    expect(refill.metadata).toMatchObject({
      zoneName: 'Zone A',
      structureName: 'Reference Warehouse',
    });

    const maintenance = byDefinition.maintain_device;
    expect(maintenance.priority).toBe(taskDefinitions.maintain_device.priority);
    expect(maintenance.metadata).toMatchObject({ deviceCount: expect.any(Number) });
  });

  it('produces deterministic ids and ordering for identical seeds', async () => {
    const contextFactory = () =>
      createStateFactoryContext('deterministic-seed', {
        repository: createBlueprintRepositoryStub(),
        structureBlueprints: [createStructureBlueprint()],
      });

    const firstState = await createInitialState(contextFactory());
    const secondState = await createInitialState(contextFactory());

    expect(firstState.tasks.backlog).toEqual(secondState.tasks.backlog);

    const firstZone = firstState.structures[0]?.rooms[0]?.zones[0];
    const secondZone = secondState.structures[0]?.rooms[0]?.zones[0];
    expect(firstZone).toBeDefined();
    expect(secondZone).toBeDefined();

    const firstPlantIds = firstZone?.plants.map((plant) => plant.id);
    const secondPlantIds = secondZone?.plants.map((plant) => plant.id);
    expect(firstPlantIds).toEqual(secondPlantIds);

    const firstDeviceIds = firstZone?.devices.map((device) => device.id);
    const secondDeviceIds = secondZone?.devices.map((device) => device.id);
    expect(firstDeviceIds).toEqual(secondDeviceIds);
  });
});
