import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { RngService } from '../../lib/rng.js';
import type {
  StructureState,
  ZoneHealthState,
  ZoneMetricState,
  ZoneResourceState,
  ZoneEnvironmentState,
  DeviceInstanceState,
} from '../models.js';
import { createTasks, loadTaskDefinitions } from './tasks.js';

describe('state/initialization/tasks', () => {
  it('loads task definitions from configuration files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wb-tasks-'));
    try {
      const configDir = path.join(tempDir, 'configs');
      await fs.mkdir(configDir, { recursive: true });
      const definitions = {
        execute_planting_plan: {
          costModel: { basis: 'perAction', laborMinutes: 90 },
          priority: 6,
          requiredRole: 'Gardener',
          requiredSkill: 'Gardening',
          minSkillLevel: 2,
          description: 'Plant seeds',
        },
      } satisfies Record<string, unknown>;

      await fs.writeFile(
        path.join(configDir, 'task_definitions.json'),
        JSON.stringify(definitions),
      );

      const loaded = await loadTaskDefinitions(tempDir);
      expect(loaded.execute_planting_plan?.priority).toBe(6);
      expect(loaded.execute_planting_plan?.costModel.laborMinutes).toBe(90);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates seed tasks with metadata populated from structure context', () => {
    const rng = new RngService('task-seeding');
    const idStream = rng.getStream('ids');

    const environment: ZoneEnvironmentState = {
      temperature: 24,
      relativeHumidity: 0.6,
      co2: 900,
      ppfd: 550,
      vpd: 1.2,
    };
    const resources: ZoneResourceState = {
      waterLiters: 800,
      nutrientSolutionLiters: 400,
      nutrientStrength: 1,
      substrateHealth: 1,
      reservoirLevel: 0.75,
    };
    const metrics: ZoneMetricState = {
      averageTemperature: 24,
      averageHumidity: 0.6,
      averageCo2: 900,
      averagePpfd: 550,
      stressLevel: 0,
      lastUpdatedTick: 0,
    };
    const health: ZoneHealthState = {
      plantHealth: {},
      pendingTreatments: [],
      appliedTreatments: [],
    };
    const device: DeviceInstanceState = {
      id: 'device-1',
      blueprintId: 'blueprint-1',
      kind: 'Lamp',
      name: 'Test Lamp',
      zoneId: 'zone-1',
      status: 'operational',
      efficiency: 1,
      runtimeHours: 0,
      maintenance: {
        lastServiceTick: 0,
        nextDueTick: 240,
        condition: 1,
        runtimeHoursAtLastService: 0,
        degradation: 0,
      },
      settings: {},
    };

    const zone = {
      id: 'zone-1',
      roomId: 'room-1',
      name: 'Zone Test',
      cultivationMethodId: 'method-1',
      strainId: 'strain-1',
      environment,
      resources,
      plants: [],
      devices: [device],
      metrics,
      health,
      activeTaskIds: [],
    } as StructureState['rooms'][number]['zones'][number];

    const room = {
      id: 'room-1',
      structureId: 'structure-1',
      name: 'Room Test',
      purposeId: 'growroom',
      area: 60,
      height: 4,
      volume: 240,
      zones: [zone],
      cleanliness: 1,
      maintenanceLevel: 1,
    } as StructureState['rooms'][number];

    const structure: StructureState = {
      id: 'structure-1',
      blueprintId: 'structure-blueprint',
      name: 'Structure Test',
      status: 'active',
      footprint: { length: 10, width: 6, height: 4, area: 60, volume: 240 },
      rooms: [room],
      rentPerTick: 0,
      upfrontCostPaid: 0,
    };

    const definitions = {
      execute_planting_plan: {
        id: 'execute_planting_plan',
        costModel: { basis: 'perAction', laborMinutes: 120 },
        priority: 7,
        requiredRole: 'Gardener',
        requiredSkill: 'Gardening',
        minSkillLevel: 2,
        description: 'Execute planting',
      },
      maintain_device: {
        id: 'maintain_device',
        costModel: { basis: 'perAction', laborMinutes: 60 },
        priority: 5,
        requiredRole: 'Technician',
        requiredSkill: 'Maintenance',
        minSkillLevel: 2,
        description: 'Maintain devices',
      },
    };

    const tasks = createTasks(structure, room, zone, 12, definitions, idStream);

    expect(tasks.backlog).toHaveLength(3);
    const plantingTask = tasks.backlog.find(
      (task) => task.definitionId === 'execute_planting_plan',
    );
    expect(plantingTask?.priority).toBe(7);
    expect(plantingTask?.metadata).toMatchObject({
      structureName: 'Structure Test',
      zoneName: 'Zone Test',
    });
    const maintenanceTask = tasks.backlog.find((task) => task.definitionId === 'maintain_device');
    expect(maintenanceTask?.metadata).toMatchObject({ deviceCount: 1 });
  });
});
