import { generateId } from '@/state/initialization/common.js';
import { DEFAULT_MAINTENANCE_INTERVAL_TICKS } from '@/constants/world.js';
import type { RngService, RngStream } from '@/lib/rng.js';
import type { EventQueueFunction } from '@/lib/eventBus.js';
import {
  type CommandExecutionContext,
  type CommandResult,
  type ErrorCode,
  createError,
} from '@/facade/index.js';
import type { GameState, DeviceInstanceState, ZoneState } from '@/state/types.js';
import type { DeviceBlueprint } from '@/data/schemas/deviceSchema.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import { addDeviceToZone } from '@/state/devices.js';
import { findZone } from '@/engine/world/stateSelectors.js';
import { isDeviceCompatibleWithRoomPurpose } from '@/state/initialization/blueprints.js';

export interface DeviceInstallationResult {
  deviceId: string;
  warnings?: string[];
}

export interface DeviceInstallationServiceOptions {
  state: GameState;
  rng: RngService;
  repository: BlueprintRepository;
}

const DEVICE_INSTALL_STREAM_ID = 'world.devices.install';

const cloneSettings = (settings: Record<string, unknown> | undefined) => {
  if (!settings) {
    return {} as Record<string, unknown>;
  }
  return JSON.parse(JSON.stringify(settings)) as Record<string, unknown>;
};

export class DeviceInstallationService {
  private readonly state: GameState;

  private readonly repository: BlueprintRepository;

  private readonly idStream: RngStream;

  constructor(options: DeviceInstallationServiceOptions) {
    this.state = options.state;
    this.repository = options.repository;
    this.idStream = options.rng.getStream(DEVICE_INSTALL_STREAM_ID);
  }

  installDevice(
    targetZoneId: string,
    deviceBlueprintId: string,
    overrideSettings: Record<string, unknown> | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DeviceInstallationResult> {
    const lookup = findZone(this.state, targetZoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${targetZoneId} was not found.`, [
        'devices.installDevice',
        'targetId',
      ]);
    }

    const blueprint = this.repository.getDevice(deviceBlueprintId);
    if (!blueprint) {
      return this.failure('ERR_NOT_FOUND', `Device blueprint ${deviceBlueprintId} was not found.`, [
        'devices.installDevice',
        'deviceId',
      ]);
    }

    const roomPurpose = this.repository.getRoomPurpose?.(lookup.room.purposeId);
    const purposeSlug = roomPurpose?.kind ?? roomPurpose?.id;
    if (purposeSlug && !isDeviceCompatibleWithRoomPurpose(blueprint, purposeSlug)) {
      return this.failure(
        'ERR_INVALID_STATE',
        `Device ${blueprint.name} is not compatible with room purpose "${purposeSlug}".`,
        ['devices.installDevice', 'deviceId'],
      );
    }

    const instance = this.createDeviceInstance(blueprint, lookup.zone, overrideSettings);
    const result = addDeviceToZone(lookup.zone, instance);

    if (!result.added || !result.device) {
      const warning = result.warnings[0];
      const message = warning?.message ?? 'Unable to install device in the requested zone.';
      return this.failure('ERR_INVALID_STATE', message, ['devices.installDevice']);
    }

    const warnings = result.warnings.map((issue) => issue.message);

    const queueEvent: EventQueueFunction =
      context.events?.queue ?? ((() => undefined) as EventQueueFunction);

    queueEvent(
      'device.installed',
      {
        zoneId: lookup.zone.id,
        deviceId: result.device.id,
        blueprintId: blueprint.id,
        warnings: warnings.length > 0 ? [...warnings] : undefined,
      },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: {
        deviceId: result.device.id,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    } satisfies CommandResult<DeviceInstallationResult>;
  }

  private createDeviceInstance(
    blueprint: DeviceBlueprint,
    zone: ZoneState,
    overrideSettings: Record<string, unknown> | undefined,
  ): DeviceInstanceState {
    const settings = { ...cloneSettings(blueprint.settings), ...(overrideSettings ?? {}) };
    const quality = Number.isFinite(blueprint.quality) ? Number(blueprint.quality) : 1;
    const sanitizedQuality = Math.max(0, Math.min(1, quality || 1));

    return {
      id: generateId(this.idStream, 'device'),
      blueprintId: blueprint.id,
      kind: blueprint.kind,
      name: blueprint.name,
      zoneId: zone.id,
      status: 'operational',
      efficiency: sanitizedQuality,
      runtimeHours: 0,
      maintenance: {
        lastServiceTick: 0,
        nextDueTick: DEFAULT_MAINTENANCE_INTERVAL_TICKS,
        condition: sanitizedQuality,
        runtimeHoursAtLastService: 0,
        degradation: 0,
      },
      settings,
    } satisfies DeviceInstanceState;
  }

  private failure<T = never>(code: ErrorCode, message: string, path: string[]): CommandResult<T> {
    return {
      ok: false,
      errors: [createError(code, message, path)],
    } satisfies CommandResult<T>;
  }
}

export default DeviceInstallationService;
