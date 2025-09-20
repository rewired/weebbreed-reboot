import type { DeviceBlueprint } from '../../../shared/types/blueprints';
import type { ZoneState } from '../../../shared/types/simulation';
import { clamp } from '../../../shared/utils/math';
import type { TickContext } from '../types';

const getSettingNumber = (blueprint: DeviceBlueprint, key: string): number | undefined => {
  const value = blueprint.settings?.[key];
  return typeof value === 'number' ? value : undefined;
};

const applyLamp = (zone: ZoneState, blueprint: DeviceBlueprint, tickHours: number) => {
  const coverage = blueprint.coverageArea_m2 ?? getSettingNumber(blueprint, 'coverageArea') ?? zone.area;
  const coverageFactor = clamp(coverage / zone.area, 0, 1);
  const ppfd = blueprint.ppfd_umol_m2_s ?? getSettingNumber(blueprint, 'ppfd') ?? 0;
  const power = blueprint.power_kW ?? getSettingNumber(blueprint, 'power') ?? 0.5;

  zone.environment.ppfd += ppfd * coverageFactor;
  zone.environment.temperature += power * 0.8 * tickHours;
  zone.environment.humidity = clamp(zone.environment.humidity - 0.01 * tickHours, 0, 1);
};

const applyClimateUnit = (zone: ZoneState, blueprint: DeviceBlueprint, tickHours: number, ambientTemperature: number, target?: number) => {
  const setpoint = target ?? getSettingNumber(blueprint, 'targetTemperature') ?? ambientTemperature;
  const coolingCapacity = blueprint.coolingCapacity_kW ?? getSettingNumber(blueprint, 'coolingCapacity') ?? 1;
  const airflow = blueprint.airflow_m3_h ?? getSettingNumber(blueprint, 'airflow') ?? 250;
  const mixFactor = clamp(airflow / (zone.volume * 2), 0, 1);

  const delta = setpoint - zone.environment.temperature;
  zone.environment.temperature += clamp(delta, -coolingCapacity, coolingCapacity) * tickHours * 0.2;
  zone.environment.humidity = clamp(zone.environment.humidity - 0.02 * mixFactor * tickHours, 0, 1);
};

const applyDehumidifier = (zone: ZoneState, blueprint: DeviceBlueprint, tickHours: number) => {
  const capacity = getSettingNumber(blueprint, 'moistureRemoval') ?? 0.05;
  zone.environment.humidity = clamp(zone.environment.humidity - capacity * tickHours, 0, 1);
};

const applyCo2Injector = (zone: ZoneState, blueprint: DeviceBlueprint, target?: number) => {
  const setpoint = target ?? getSettingNumber(blueprint, 'targetCO2') ?? 1000;
  const pulse = getSettingNumber(blueprint, 'pulsePpmPerTick') ?? 80;
  if (zone.environment.co2 < setpoint) {
    zone.environment.co2 = Math.min(zone.environment.co2 + pulse, setpoint);
  }
};

const applyVentilation = (zone: ZoneState, blueprint: DeviceBlueprint, ambient: { temperature: number; humidity: number; co2: number }, tickHours: number) => {
  const airflow = blueprint.airflow_m3_h ?? getSettingNumber(blueprint, 'airflow') ?? 150;
  const exchangeFactor = clamp((airflow * tickHours) / zone.volume, 0, 1);
  zone.environment.temperature += (ambient.temperature - zone.environment.temperature) * exchangeFactor;
  zone.environment.humidity += (ambient.humidity - zone.environment.humidity) * exchangeFactor;
  zone.environment.co2 += (ambient.co2 - zone.environment.co2) * exchangeFactor;
  zone.environment.ppfd *= 1 - exchangeFactor * 0.1;
};

export const applyDevicesPhase = (ctx: TickContext) => {
  const tickHours = ctx.tickHours;
  Object.values(ctx.simulation.zones).forEach((zone) => {
    zone.environment.ppfd = 0;
    for (const deviceId of zone.deviceIds) {
      const deviceState = ctx.simulation.devices[deviceId];
      if (!deviceState || !deviceState.isActive) continue;
      const blueprint = ctx.blueprints.devices.get(deviceState.blueprintId);
      if (!blueprint) continue;

      const kind = blueprint.kind.toLowerCase();
      if (kind.includes('lamp') || blueprint.ppfd_umol_m2_s) {
        applyLamp(zone, blueprint, tickHours);
      } else if (kind.includes('climate') || blueprint.coolingCapacity_kW) {
        applyClimateUnit(zone, blueprint, tickHours, ctx.ambient.temperature, ctx.setpoints.temperature);
      } else if (kind.includes('dehumid')) {
        applyDehumidifier(zone, blueprint, tickHours);
      } else if (kind.includes('co2')) {
        applyCo2Injector(zone, blueprint, ctx.setpoints.co2);
      } else if (kind.includes('vent')) {
        applyVentilation(zone, blueprint, ctx.ambient, tickHours);
      }
    }

    if (ctx.setpoints.ppfd !== undefined) {
      const diff = ctx.setpoints.ppfd - zone.environment.ppfd;
      zone.environment.ppfd += diff * 0.3;
    }
    if (ctx.setpoints.humidity !== undefined) {
      const diff = ctx.setpoints.humidity - zone.environment.humidity;
      zone.environment.humidity += diff * 0.2;
    }
  });
};
