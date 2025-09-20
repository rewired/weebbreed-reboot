import { clamp } from '../../../shared/utils/math';
import { calculateVpd } from '../envPhysics';
import type { TickContext } from '../types';

export const deriveEnvironmentPhase = (ctx: TickContext) => {
  const mixRate = 0.05;
  Object.values(ctx.simulation.zones).forEach((zone) => {
    zone.environment.temperature = clamp(
      zone.environment.temperature + (ctx.ambient.temperature - zone.environment.temperature) * mixRate,
      10,
      40
    );
    zone.environment.humidity = clamp(
      zone.environment.humidity + (ctx.ambient.humidity - zone.environment.humidity) * mixRate,
      0,
      1
    );
    zone.environment.co2 = clamp(zone.environment.co2 + (ctx.ambient.co2 - zone.environment.co2) * mixRate, 350, 2000);
    zone.environment.vpd = calculateVpd({
      temperature: zone.environment.temperature,
      humidity: zone.environment.humidity
    });
  });
};
