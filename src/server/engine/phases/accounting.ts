import type { TickContext } from '../types';

export const accountingPhase = (ctx: TickContext) => {
  let energyKwh = 0;

  Object.values(ctx.simulation.devices).forEach((device) => {
    if (!device.isActive) return;
    const blueprint = ctx.blueprints.devices.get(device.blueprintId);
    if (!blueprint) return;
    const power = (blueprint.power_kW ?? (typeof blueprint.settings?.power === 'number' ? (blueprint.settings.power as number) : 0)) as number;
    energyKwh += power * ctx.tickHours;
  });

  ctx.events.push({
    type: 'finance.tick',
    tick: ctx.simulation.clock.tick,
    ts: Date.now(),
    payload: {
      energyKwh,
      operatingCost: energyKwh * 0.25
    },
    level: 'info'
  });
};
