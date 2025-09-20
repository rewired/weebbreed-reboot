import type { SimulationSnapshot } from '../../../shared/types/simulation';
import type { TickContext } from '../types';

export interface CommitResult {
  snapshot: SimulationSnapshot;
}

export const commitPhase = (ctx: TickContext): CommitResult => {
  const clock = ctx.simulation.clock;
  clock.tick += 1;
  clock.lastTickCompletedAt = Date.now();

  const snapshot: SimulationSnapshot = {
    clock: { ...clock },
    zones: Object.values(ctx.simulation.zones).map((zone) => ({ ...zone, environment: { ...zone.environment } })),
    plants: Object.values(ctx.simulation.plants).map((plant) => ({ ...plant })),
    devices: Object.values(ctx.simulation.devices).map((device) => ({ ...device }))
  };

  return { snapshot };
};
