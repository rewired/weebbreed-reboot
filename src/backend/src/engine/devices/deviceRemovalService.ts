import {
  TEMPERATURE_DEVICE_KINDS,
  HUMIDITY_DEVICE_KINDS,
  CO2_DEVICE_KINDS,
  LIGHT_DEVICE_KINDS,
} from '@/constants/environment.js';
import type { CommandExecutionContext, CommandResult, ErrorCode } from '@/facade/index.js';
import { createError } from '@/facade/index.js';
import type { EventQueueFunction } from '@/lib/eventBus.js';
import type {
  GameState,
  RoomState,
  StructureState,
  ZoneControlState,
  ZoneState,
} from '@/state/types.js';

export interface DeviceRemovalResult {
  deviceId: string;
  warnings?: string[];
}

export interface DeviceRemovalServiceOptions {
  state: GameState;
}

interface DeviceLookup {
  structure: StructureState;
  room: RoomState;
  zone: ZoneState;
  deviceIndex: number;
}

export class DeviceRemovalService {
  private readonly state: GameState;

  constructor(options: DeviceRemovalServiceOptions) {
    this.state = options.state;
  }

  removeDevice(
    instanceId: string,
    context: CommandExecutionContext,
  ): CommandResult<DeviceRemovalResult> {
    const lookup = this.findDevice(instanceId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Device ${instanceId} was not found.`, [
        'devices.removeDevice',
        'instanceId',
      ]);
    }

    const { structure, room, zone, deviceIndex } = lookup;
    const [removed] = zone.devices.splice(deviceIndex, 1);
    if (!removed) {
      return this.failure('ERR_INVALID_STATE', `Device ${instanceId} could not be removed.`, [
        'devices.removeDevice',
        'instanceId',
      ]);
    }

    const warnings: string[] = [];
    this.releaseZoneControl(zone, warnings);

    const queueEvent: EventQueueFunction =
      context.events?.queue ?? ((() => undefined) as EventQueueFunction);

    const payload: Record<string, unknown> = {
      structureId: structure.id,
      roomId: room.id,
      zoneId: zone.id,
      deviceId: removed.id,
      blueprintId: removed.blueprintId,
    };
    if (warnings.length > 0) {
      payload.warnings = [...warnings];
    }

    queueEvent('device.removed', payload, context.tick, 'info');

    const resultWarnings = warnings.length > 0 ? [...warnings] : undefined;
    return {
      ok: true,
      data: {
        deviceId: removed.id,
        warnings: resultWarnings,
      },
      warnings: resultWarnings,
    } satisfies CommandResult<DeviceRemovalResult>;
  }

  private releaseZoneControl(zone: ZoneState, warnings: string[]): void {
    const control = this.ensureZoneControl(zone);
    const setpoints = control.setpoints ?? {};

    const hasTemperatureControl = zone.devices.some((device) =>
      TEMPERATURE_DEVICE_KINDS.has(device.kind),
    );
    if (!hasTemperatureControl && setpoints.temperature !== undefined) {
      delete setpoints.temperature;
      warnings.push(
        'Cleared temperature setpoint because the zone no longer has temperature control devices.',
      );
    }

    const hasHumidityControl = zone.devices.some((device) =>
      HUMIDITY_DEVICE_KINDS.has(device.kind),
    );
    if (!hasHumidityControl) {
      if (setpoints.humidity !== undefined) {
        delete setpoints.humidity;
        warnings.push(
          'Cleared humidity setpoint because the zone no longer has humidity control devices.',
        );
      }
      if (setpoints.vpd !== undefined) {
        delete setpoints.vpd;
        warnings.push(
          'Cleared VPD setpoint because the zone no longer has humidity control devices.',
        );
      }
    }

    const hasCo2Control = zone.devices.some((device) => CO2_DEVICE_KINDS.has(device.kind));
    if (!hasCo2Control && setpoints.co2 !== undefined) {
      delete setpoints.co2;
      warnings.push('Cleared CO₂ setpoint because the zone no longer has CO₂ control devices.');
    }

    const hasLighting = zone.devices.some((device) => LIGHT_DEVICE_KINDS.has(device.kind));
    if (!hasLighting && setpoints.ppfd !== undefined) {
      delete setpoints.ppfd;
      warnings.push('Cleared PPFD setpoint because the zone no longer has lighting devices.');
    }
  }

  private ensureZoneControl(zone: ZoneState): ZoneControlState {
    if (!zone.control) {
      zone.control = { setpoints: {} } as ZoneControlState;
    } else if (!zone.control.setpoints) {
      zone.control.setpoints = {};
    }
    return zone.control;
  }

  private findDevice(instanceId: string): DeviceLookup | undefined {
    for (const structure of this.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const deviceIndex = zone.devices.findIndex((device) => device.id === instanceId);
          if (deviceIndex >= 0) {
            return { structure, room, zone, deviceIndex } satisfies DeviceLookup;
          }
        }
      }
    }
    return undefined;
  }

  private failure<T = never>(code: ErrorCode, message: string, path: string[]): CommandResult<T> {
    return {
      ok: false,
      errors: [createError(code, message, path)],
    } satisfies CommandResult<T>;
  }
}

export default DeviceRemovalService;
