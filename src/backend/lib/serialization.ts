import type { SimulationSnapshot, SimulationState, ZoneState } from '../../shared/domain.js';

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneZoneState(zone: ZoneState): ZoneState {
  return {
    ...zone,
    ambient: { ...zone.ambient },
    environment: { ...zone.environment },
    devices: zone.devices.map((device) => ({
      ...device,
      blueprint: deepClone(device.blueprint)
    })),
    plants: zone.plants.map((plant) => ({
      ...plant,
      strain: deepClone(plant.strain)
    }))
  };
}

interface SnapshotOptions {
  tick?: number;
  ts?: number;
}

export function createSimulationSnapshot(
  state: SimulationState,
  options: SnapshotOptions = {}
): SimulationSnapshot {
  const tick = options.tick ?? state.tick;
  const ts = options.ts ?? Date.now();
  return {
    tick,
    ts,
    zones: state.zones.map((zone) => cloneZoneState(zone))
  };
}

export { cloneZoneState };
