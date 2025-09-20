import type { DeviceInstanceState, GameState } from '../../state/models.js';

export interface DeviceDegradationOptions {
  lambda?: number;
  exponent?: number;
  maintenanceEfficiencyCap?: number;
  maxWear?: number;
}

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const computeTickHours = (tickLengthMinutes: number): number => {
  if (!Number.isFinite(tickLengthMinutes) || tickLengthMinutes <= 0) {
    return 0;
  }
  return tickLengthMinutes / 60;
};

const DEFAULT_LAMBDA = 1e-5;
const DEFAULT_EXPONENT = 0.9;
const DEFAULT_MAINTENANCE_CAP = 0.98;
const DEFAULT_MAX_WEAR = 0.95;

export class DeviceDegradationService {
  private readonly lambda: number;

  private readonly exponent: number;

  private readonly maintenanceCap: number;

  private readonly maxWear: number;

  constructor(options: DeviceDegradationOptions = {}) {
    this.lambda = Number.isFinite(options.lambda) ? (options.lambda as number) : DEFAULT_LAMBDA;
    this.exponent = Number.isFinite(options.exponent)
      ? (options.exponent as number)
      : DEFAULT_EXPONENT;
    this.maintenanceCap = Number.isFinite(options.maintenanceEfficiencyCap)
      ? clamp(options.maintenanceEfficiencyCap as number, 0, 1)
      : DEFAULT_MAINTENANCE_CAP;
    this.maxWear = Number.isFinite(options.maxWear)
      ? clamp(options.maxWear as number, 0, 1)
      : DEFAULT_MAX_WEAR;
  }

  process(state: GameState, _tick: number, tickLengthMinutes: number): void {
    const tickHours = computeTickHours(tickLengthMinutes);

    for (const structure of state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          for (const device of zone.devices) {
            this.updateDevice(device, tickHours);
          }
        }
      }
    }
  }

  private updateDevice(device: DeviceInstanceState, tickHours: number): void {
    const maintenance = device.maintenance;
    const baseCondition = clamp(maintenance.condition ?? 0, 0, 1);
    const baseEfficiency = clamp(Math.min(baseCondition, this.maintenanceCap), 0, 1);

    if (device.status === 'maintenance') {
      maintenance.runtimeHoursAtLastService = Math.max(device.runtimeHours, 0);
      maintenance.degradation = 0;
      device.efficiency = baseEfficiency;
      return;
    }

    if (device.status === 'operational' && tickHours > 0) {
      device.runtimeHours = Math.max(device.runtimeHours + tickHours, 0);
    }

    const runtimeHours = Math.max(device.runtimeHours, 0);
    const marker = clamp(maintenance.runtimeHoursAtLastService ?? 0, 0, runtimeHours);
    if (marker !== maintenance.runtimeHoursAtLastService) {
      maintenance.runtimeHoursAtLastService = marker;
    }

    const hoursSinceService = Math.max(runtimeHours - marker, 0);
    const wear = this.computeWear(hoursSinceService);
    maintenance.degradation = wear;

    if (baseEfficiency <= 0) {
      device.efficiency = 0;
      return;
    }

    device.efficiency = clamp(baseEfficiency * (1 - wear), 0, baseEfficiency);
  }

  private computeWear(hours: number): number {
    if (!Number.isFinite(hours) || hours <= 0) {
      return 0;
    }

    const wear = this.lambda * Math.pow(hours, this.exponent);
    if (!Number.isFinite(wear) || wear <= 0) {
      return 0;
    }

    return clamp(wear, 0, this.maxWear);
  }
}
