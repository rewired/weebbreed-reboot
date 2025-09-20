import { applyEnvironmentDelta, accumulateDeviceEffects } from '../../engine/envPhysics.js';
import type { TickContext } from '../types.js';

export function applyDevicesPhase(context: TickContext): void {
  const { state, tickHours } = context;
  for (const zone of state.zones) {
    const delta = accumulateDeviceEffects(zone.devices.filter((device) => device.isActive), zone.environment, {
      tickHours,
      zoneVolume: zone.volume,
      zoneArea: zone.area
    });
    zone.environment = applyEnvironmentDelta(zone.environment, delta);
  }
}
