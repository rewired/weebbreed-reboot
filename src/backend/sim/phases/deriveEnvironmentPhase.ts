import { mixTowardsAmbient } from '../../engine/envPhysics.js';
import type { TickContext } from '../types.js';

function sumAirflow(zone: TickContext['state']['zones'][number]): number {
  return zone.devices
    .filter((device) => device.isActive)
    .reduce((total, device) => total + (device.blueprint.settings.airflow ?? 0), 0);
}

export function deriveEnvironmentPhase(context: TickContext): void {
  const { state, tickHours } = context;
  for (const zone of state.zones) {
    const airflow = sumAirflow(zone);
    zone.environment = mixTowardsAmbient(zone.environment, zone.ambient, airflow, tickHours);
  }
}
