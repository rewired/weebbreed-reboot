import { computeZoneDeviceDeltas } from './deviceEffects.js';
import {
  ClimateController,
  type ClimateControllerOptions,
  type ClimateControlSetpoints,
} from './climateController.js';
import type { GameState, RoomState, StructureState, ZoneState } from '@/state/models.js';
import type { SimulationPhaseContext } from '@/sim/loop.js';
import { approachTemperature } from '../../../../physio/temp.js';
import { approachRelativeHumidity } from '../../../../physio/rh.js';
import { approachCo2 } from '../../../../physio/co2.js';
import { computeVpd } from '../../../../physio/vpd.js';
import { getZoneGeometry, type ZoneGeometry } from '@/state/geometry.js';

export interface AmbientEnvironment {
  temperature: number;
  relativeHumidity: number;
  co2: number;
}

export interface SafetyClamps {
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number;
  maxHumidity: number;
  minCo2: number;
  maxCo2: number;
}

export interface NormalizationFactors {
  temperatureRate: number;
  humidityRate: number;
  co2Rate: number;
  airflowTemperatureFactor: number;
  airflowHumidityFactor: number;
  airflowCo2Factor: number;
  passiveAirChangesPerHour: number;
}

export interface ZoneEnvironmentOptions {
  ambient?: AmbientEnvironment;
  safety?: Partial<SafetyClamps>;
  normalization?: Partial<NormalizationFactors>;
  setpoints?: Partial<ClimateControlSetpoints>;
  controller?: ClimateControllerOptions;
}

interface DeviceEffectCacheEntry {
  airflow: number;
}

const DEFAULT_AMBIENT: AmbientEnvironment = {
  temperature: 20,
  relativeHumidity: 0.5,
  co2: 400,
};

const DEFAULT_SAFETY: SafetyClamps = {
  minTemperature: 10,
  maxTemperature: 40,
  minHumidity: 0,
  maxHumidity: 1,
  minCo2: 300,
  maxCo2: 1800,
};

const DEFAULT_NORMALIZATION: NormalizationFactors = {
  temperatureRate: 0.12,
  humidityRate: 0.08,
  co2Rate: 0.18,
  airflowTemperatureFactor: 0.25,
  airflowHumidityFactor: 0.2,
  airflowCo2Factor: 0.45,
  passiveAirChangesPerHour: 0.15,
};

const DEFAULT_SETPOINTS: ClimateControlSetpoints = {
  temperature: DEFAULT_AMBIENT.temperature,
  humidity: DEFAULT_AMBIENT.relativeHumidity,
  co2: DEFAULT_AMBIENT.co2,
};

const TEMPERATURE_DEVICE_KINDS = new Set(['ClimateUnit', 'HVAC']);
const HUMIDITY_DEVICE_KINDS = new Set(['HumidityControlUnit', 'Dehumidifier']);
const CO2_DEVICE_KINDS = new Set(['CO2Injector']);

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const computeTickHours = (tickLengthMinutes: number): number => {
  return Math.max(tickLengthMinutes, 0) / 60;
};

const resolveZoneGeometry = (
  structure: StructureState,
  room: RoomState,
  zone: ZoneState,
): ZoneGeometry => {
  const geometry = getZoneGeometry(structure, room, zone);
  return {
    area: Math.max(geometry.area, 0.0001),
    ceilingHeight: Math.max(geometry.ceilingHeight, 0.0001),
    volume: Math.max(geometry.volume, 0.0001),
  } satisfies ZoneGeometry;
};

const computeAirChangesPerHour = (
  airflow: number,
  volume: number,
  passiveAirChangesPerHour: number,
): number => {
  const ach = passiveAirChangesPerHour + airflow / Math.max(volume, 0.0001);
  return Math.max(ach, 0);
};

export class ZoneEnvironmentService {
  private readonly ambient: AmbientEnvironment;

  private readonly safety: SafetyClamps;

  private readonly normalization: NormalizationFactors;

  private readonly baseSetpoints: ClimateControlSetpoints;

  private readonly controllerOptions: ClimateControllerOptions;

  private readonly controllers = new Map<string, ClimateController>();

  private readonly deviceEffects = new Map<string, DeviceEffectCacheEntry>();

  constructor(options: ZoneEnvironmentOptions = {}) {
    this.ambient = {
      ...DEFAULT_AMBIENT,
      ...options.ambient,
    };

    this.safety = {
      ...DEFAULT_SAFETY,
      ...options.safety,
    };

    this.normalization = {
      ...DEFAULT_NORMALIZATION,
      ...options.normalization,
    } as NormalizationFactors;

    this.baseSetpoints = {
      ...DEFAULT_SETPOINTS,
      ...options.setpoints,
    } satisfies ClimateControlSetpoints;

    this.controllerOptions = options.controller ?? {};
  }

  applyDeviceDeltas(
    state: GameState,
    tickLengthMinutes: number,
    accounting?: SimulationPhaseContext['accounting'],
  ): void {
    const tickHours = computeTickHours(tickLengthMinutes);

    for (const structure of state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const geometry = resolveZoneGeometry(structure, room, zone);
          const controller = this.getController(zone.id);
          const setpoints = this.resolveSetpoints(zone);
          const powerLevels = controller.update(
            setpoints,
            {
              temperature: zone.environment.temperature,
              humidity: zone.environment.relativeHumidity,
              co2: zone.environment.co2,
            },
            tickLengthMinutes,
          );
          const effect = computeZoneDeviceDeltas(zone, geometry, {
            tickHours,
            powerLevels,
          });

          zone.environment.temperature += effect.temperatureDelta;
          zone.environment.relativeHumidity += effect.humidityDelta;
          zone.environment.co2 += effect.co2Delta;
          zone.environment.ppfd = Math.max(0, zone.environment.ppfd + effect.ppfdDelta);

          this.deviceEffects.set(zone.id, { airflow: effect.airflow });
          if (accounting && effect.energyKwh > 0) {
            accounting.recordUtility({ energyKwh: effect.energyKwh });
          }
        }
      }
    }
  }

  normalize(state: GameState, tickLengthMinutes: number): void {
    const tickHours = computeTickHours(tickLengthMinutes);

    for (const structure of state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const geometry = resolveZoneGeometry(structure, room, zone);
          const effect = this.deviceEffects.get(zone.id);
          const airflow = effect?.airflow ?? 0;
          const ach = computeAirChangesPerHour(
            airflow,
            geometry.volume,
            this.normalization.passiveAirChangesPerHour,
          );

          const temperatureRate =
            this.normalization.temperatureRate + this.normalization.airflowTemperatureFactor * ach;
          const humidityRate =
            this.normalization.humidityRate + this.normalization.airflowHumidityFactor * ach;
          const co2Rate = this.normalization.co2Rate + this.normalization.airflowCo2Factor * ach;

          zone.environment.temperature = clamp(
            approachTemperature(
              zone.environment.temperature,
              this.ambient.temperature,
              temperatureRate,
              tickHours,
            ),
            this.safety.minTemperature,
            this.safety.maxTemperature,
          );

          zone.environment.relativeHumidity = clamp(
            approachRelativeHumidity(
              zone.environment.relativeHumidity,
              this.ambient.relativeHumidity,
              humidityRate,
              tickHours,
            ),
            this.safety.minHumidity,
            this.safety.maxHumidity,
          );

          zone.environment.co2 = clamp(
            approachCo2(zone.environment.co2, this.ambient.co2, co2Rate, tickHours),
            this.safety.minCo2,
            this.safety.maxCo2,
          );

          zone.environment.vpd = computeVpd(
            zone.environment.temperature,
            zone.environment.relativeHumidity,
          );
        }
      }
    }

    this.deviceEffects.clear();
  }

  private getController(zoneId: string): ClimateController {
    let controller = this.controllers.get(zoneId);
    if (!controller) {
      controller = new ClimateController(this.controllerOptions);
      this.controllers.set(zoneId, controller);
    }
    return controller;
  }

  private resolveSetpoints(zone: ZoneState): ClimateControlSetpoints {
    let temperature = this.baseSetpoints.temperature;
    let humidity = this.baseSetpoints.humidity;
    let co2 = this.baseSetpoints.co2;

    for (const device of zone.devices) {
      if (device.status !== 'operational') {
        continue;
      }

      const settings = device.settings ?? {};

      if (TEMPERATURE_DEVICE_KINDS.has(device.kind)) {
        const targetTemperature = this.extractNumeric(settings.targetTemperature);
        if (targetTemperature !== undefined) {
          temperature = targetTemperature;
        } else {
          const range = this.extractTuple(settings.targetTemperatureRange);
          if (range) {
            const [low, high] = range;
            temperature = (low + high) / 2;
          }
        }
      }

      if (HUMIDITY_DEVICE_KINDS.has(device.kind)) {
        const targetHumidity = this.extractNumeric(settings.targetHumidity);
        if (targetHumidity !== undefined) {
          humidity = targetHumidity;
        }
      }

      if (CO2_DEVICE_KINDS.has(device.kind)) {
        const targetCo2 = this.extractNumeric(settings.targetCO2);
        if (targetCo2 !== undefined) {
          co2 = targetCo2;
        } else {
          const range = this.extractTuple(settings.targetCO2Range);
          if (range) {
            const [, upper] = range;
            if (upper !== undefined) {
              co2 = upper;
            }
          }
        }
      }
    }

    return {
      temperature,
      humidity,
      co2,
    };
  }

  private extractNumeric(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }
    return value;
  }

  private extractTuple(value: unknown): [number, number] | undefined {
    if (!Array.isArray(value) || value.length !== 2) {
      return undefined;
    }
    const [first, second] = value;
    if (typeof first !== 'number' || typeof second !== 'number') {
      return undefined;
    }
    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      return undefined;
    }
    return [first, second];
  }

  createApplyDevicePhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.applyDeviceDeltas(context.state, context.tickLengthMinutes, context.accounting);
    };
  }

  createNormalizationPhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.normalize(context.state, context.tickLengthMinutes);
    };
  }
}
