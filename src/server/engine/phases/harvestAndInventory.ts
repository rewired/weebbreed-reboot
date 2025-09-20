import type { TickContext } from '../types';

export const harvestAndInventoryPhase = (ctx: TickContext) => {
  Object.values(ctx.simulation.plants).forEach((plant) => {
    const strain = ctx.blueprints.strains.get(plant.strainId);
    if (!strain) return;
    if (plant.stage === 'flowering' && plant.biomassDryGrams >= strain.growthModel.maxBiomassDry_g * 0.95) {
      ctx.events.push({
        type: 'plant.harvestReady',
        tick: ctx.simulation.clock.tick,
        ts: Date.now(),
        payload: {
          plantId: plant.id,
          biomass: plant.biomassDryGrams
        },
        level: 'info'
      });
      plant.stage = 'harvested';
    }
  });
};
