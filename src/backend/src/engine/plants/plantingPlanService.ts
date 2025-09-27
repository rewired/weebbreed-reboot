import { generateId } from '@/state/initialization/common.js';
import type { RngService, RngStream } from '@/lib/rng.js';
import {
  type CommandExecutionContext,
  type CommandResult,
  type ErrorCode,
} from '@/facade/index.js';
import type { GameState, TaskState } from '@/state/models.js';
import { findZone } from '@/engine/world/stateSelectors.js';

export interface PlantingPlanToggleResult {
  enabled: boolean;
}

export interface PlantingPlanServiceOptions {
  state: GameState;
  rng: RngService;
}

export class PlantingPlanService {
  private readonly state: GameState;

  private readonly taskStream: RngStream;

  constructor(options: PlantingPlanServiceOptions) {
    this.state = options.state;
    this.taskStream = options.rng.getStream('world.tasks');
  }

  togglePlantingPlan(
    zoneId: string,
    enabled: boolean,
    context: CommandExecutionContext,
  ): CommandResult<PlantingPlanToggleResult> {
    const lookup = findZone(this.state, zoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'plants.togglePlantingPlan',
        'zoneId',
      ]);
    }

    const { structure, room, zone } = lookup;
    const plan = zone.plantingPlan;
    if (!plan) {
      return this.failure('ERR_INVALID_STATE', `Zone ${zoneId} does not have a planting plan.`, [
        'plants.togglePlantingPlan',
        'plantingPlan',
      ]);
    }

    if (plan.enabled === enabled) {
      return {
        ok: true,
        data: { enabled },
        warnings: ['Planting plan already in requested state.'],
      } satisfies CommandResult<PlantingPlanToggleResult>;
    }

    plan.enabled = enabled;

    const taskId = this.createTaskId();
    const task: TaskState = {
      id: taskId,
      definitionId: 'plants.togglePlantingPlan',
      status: 'pending',
      priority: 5,
      createdAtTick: context.tick,
      location: {
        structureId: structure.id,
        roomId: room.id,
        zoneId,
      },
      metadata: {
        zoneId,
        enabled,
        plantingPlanId: plan.id,
      },
    } satisfies TaskState;

    this.state.tasks.backlog.push(task);
    zone.activeTaskIds.push(taskId);

    context.events.queue(
      'plant.plantingPlanToggled',
      { zoneId, enabled, plantingPlanId: plan.id },
      context.tick,
      'info',
    );

    return { ok: true, data: { enabled } } satisfies CommandResult<PlantingPlanToggleResult>;
  }

  private createTaskId(): string {
    return generateId(this.taskStream, 'task');
  }

  private failure<T = never>(code: ErrorCode, message: string, path: string[]): CommandResult<T> {
    return {
      ok: false,
      errors: [
        {
          code,
          message,
          path,
        },
      ],
    };
  }
}

export default PlantingPlanService;
