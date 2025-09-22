import path from 'path';
import type {
  EmployeeRole,
  SkillName,
  StructureState,
  TaskDefinition,
  TaskDefinitionMap,
  TaskSystemState,
  TaskState,
} from '../models.js';
import type { RngStream } from '@/lib/rng.js';
import { generateId, readJsonFile } from './common.js';

interface RawTaskDefinition {
  costModel: {
    basis: string;
    laborMinutes: number;
  };
  priority: number;
  requiredRole: string;
  requiredSkill: string;
  minSkillLevel: number;
  description: string;
}

export const loadTaskDefinitions = async (dataDirectory: string): Promise<TaskDefinitionMap> => {
  const configFile = path.join(dataDirectory, 'configs', 'task_definitions.json');
  const raw = await readJsonFile<Record<string, RawTaskDefinition>>(configFile);

  if (!raw) {
    return {};
  }

  const definitions: TaskDefinitionMap = {};
  for (const [id, value] of Object.entries(raw)) {
    const basis = value.costModel?.basis as TaskDefinition['costModel']['basis'] | undefined;
    definitions[id] = {
      id,
      costModel: {
        basis: basis ?? 'perAction',
        laborMinutes: value.costModel?.laborMinutes ?? 0,
      },
      priority: value.priority,
      requiredRole: value.requiredRole as EmployeeRole,
      requiredSkill: value.requiredSkill as SkillName,
      minSkillLevel: value.minSkillLevel,
      description: value.description,
    } satisfies TaskDefinition;
  }

  return definitions;
};

export const createTasks = (
  structure: StructureState,
  room: StructureState['rooms'][number],
  zone: StructureState['rooms'][number]['zones'][number],
  plantCount: number,
  definitions: TaskDefinitionMap | undefined,
  idStream: RngStream,
): TaskSystemState => {
  const backlog: TaskState[] = [];
  const createTask = (
    definitionId: string,
    fallbackPriority: number,
    metadata: Record<string, unknown>,
  ) => {
    const definition = definitions?.[definitionId];
    backlog.push({
      id: generateId(idStream, 'task'),
      definitionId,
      status: 'pending',
      priority: definition?.priority ?? fallbackPriority,
      createdAtTick: 0,
      dueTick: definition ? Math.round(definition.priority * 4) : undefined,
      location: {
        structureId: structure.id,
        roomId: room.id,
        zoneId: zone.id,
      },
      metadata: {
        zoneName: zone.name,
        structureName: structure.name,
        ...(definition ? { description: definition.description } : {}),
        ...metadata,
      },
    });
  };

  createTask('execute_planting_plan', 5, { plantCount });
  createTask('refill_supplies_water', 4, {});
  createTask('maintain_device', 3, { deviceCount: zone.devices.length });

  return {
    backlog,
    active: [],
    completed: [],
    cancelled: [],
  };
};
