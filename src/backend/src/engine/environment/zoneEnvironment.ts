import { computeZoneDeviceDeltas, type ZoneGeometry } from './deviceEffects.js';
import type { GameState, RoomState } from '../../state/models.js';
import type { SimulationPhaseContext } from '../../sim/loop.js';

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

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const computeTickHours = (tickLengthMinutes: number): number => {
  return Math.max(tickLengthMinutes, 0) / 60;
};

const computeZoneGeometry = (room: RoomState): ZoneGeometry => {
  const zoneCount = Math.max(room.zones.length, 1);
  const area = room.area / zoneCount;
  const volume = room.volume / zoneCount;
  return {
    area: Math.max(area, 0.0001),
    volume: Math.max(volume, 0.0001),
  };
};

const exponentialMix = (
  current: number,
  target: number,
  rate: number,
  tickHours: number,
): number => {
  if (tickHours <= 0 || rate <= 0) {
    return current;
  }
  const decay = Math.exp(-rate * tickHours);
  return target + (current - target) * decay;
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
  }

  applyDeviceDeltas(state: GameState, tickLengthMinutes: number): void {
    const tickHours = computeTickHours(tickLengthMinutes);

    for (const structure of state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const geometry = computeZoneGeometry(room);
          const effect = computeZoneDeviceDeltas(zone, geometry, { tickHours });

          zone.environment.temperature += effect.temperatureDelta;
          zone.environment.relativeHumidity += effect.humidityDelta;
          zone.environment.co2 += effect.co2Delta;
          zone.environment.ppfd = Math.max(0, zone.environment.ppfd + effect.ppfdDelta);

          this.deviceEffects.set(zone.id, { airflow: effect.airflow });
        }
      }
    }
  }

  normalize(state: GameState, tickLengthMinutes: number): void {
    const tickHours = computeTickHours(tickLengthMinutes);

    for (const structure of state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const geometry = computeZoneGeometry(room);
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
            exponentialMix(
              zone.environment.temperature,
              this.ambient.temperature,
              temperatureRate,
              tickHours,
            ),
            this.safety.minTemperature,
            this.safety.maxTemperature,
          );

          zone.environment.relativeHumidity = clamp(
            exponentialMix(
              zone.environment.relativeHumidity,
              this.ambient.relativeHumidity,
              humidityRate,
              tickHours,
            ),
            this.safety.minHumidity,
            this.safety.maxHumidity,
          );

          zone.environment.co2 = clamp(
            exponentialMix(zone.environment.co2, this.ambient.co2, co2Rate, tickHours),
            this.safety.minCo2,
            this.safety.maxCo2,
          );
        }
      }
    }

    this.deviceEffects.clear();
  }

  createApplyDevicePhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.applyDeviceDeltas(context.state, context.tickLengthMinutes);
    };
  }

  createNormalizationPhaseHandler() {
    return (context: SimulationPhaseContext) => {
      this.normalize(context.state, context.tickLengthMinutes);
    };
  }
}
