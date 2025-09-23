import { generateId } from '@/state/initialization/common.js';
import type { RngService, RngStream } from '@/lib/rng.js';
import {
  type CommandExecutionContext,
  type CommandResult,
  type ErrorCode,
} from '@/facade/index.js';
import type { GameState, TaskState } from '@/state/models.js';
import { findZone } from '@/engine/world/stateSelectors.js';

export interface DeviceGroupToggleResult {
  deviceIds: string[];
}

export interface DeviceGroupServiceOptions {
  state: GameState;
  rng: RngService;
}

export class DeviceGroupService {
  private readonly state: GameState;

  private readonly taskStream: RngStream;

  constructor(options: DeviceGroupServiceOptions) {
    this.state = options.state;
    this.taskStream = options.rng.getStream('world.tasks');
  }

  toggleDeviceGroup(
    zoneId: string,
    kind: string,
    enabled: boolean,
    context: CommandExecutionContext,
  ): CommandResult<DeviceGroupToggleResult> {
    const lookup = findZone(this.state, zoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'devices.toggleDeviceGroup',
        'zoneId',
      ]);
    }

    const { structure, room, zone } = lookup;
    const candidates = zone.devices.filter((device) => device.kind === kind);
    if (candidates.length === 0) {
      return this.failure('ERR_NOT_FOUND', `No devices of kind ${kind} found in zone ${zoneId}.`, [
        'devices.toggleDeviceGroup',
        'kind',
      ]);
    }

    const targetStatus = enabled ? 'operational' : 'offline';
    const changed: string[] = [];

    for (const device of candidates) {
      if (device.status === targetStatus) {
        continue;
      }
      device.status = targetStatus;
      changed.push(device.id);
    }

    if (changed.length > 0) {
      const taskId = this.createTaskId();
      const task: TaskState = {
        id: taskId,
        definitionId: 'device.toggleGroup',
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
          kind,
          enabled,
          deviceIds: [...changed],
        },
      } satisfies TaskState;

      this.state.tasks.backlog.push(task);
      zone.activeTaskIds.push(taskId);
    }

    context.events.queue(
      'device.groupToggled',
      { zoneId, kind, enabled, deviceIds: [...changed] },
      context.tick,
      'info',
    );

    if (changed.length === 0) {
      return {
        ok: true,
        data: { deviceIds: [] },
        warnings: ['Device group already in requested state.'],
      } satisfies CommandResult<DeviceGroupToggleResult>;
    }

    return {
      ok: true,
      data: { deviceIds: changed },
    } satisfies CommandResult<DeviceGroupToggleResult>;
  }

  private createTaskId(): string {
    return generateId(this.taskStream, 'task');
  }

  private failure(code: ErrorCode, message: string, path: string[]): CommandResult {
    return {
      ok: false,
      errors: [
        {
          code,
          message,
          path,
        },
      ],
    } satisfies CommandResult;
  }
}

export default DeviceGroupService;
