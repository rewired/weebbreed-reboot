import type { PlantState } from '../../../shared/types/simulation';
import { clamp } from '../../../shared/utils/math';
import { advanceStageIfNeeded, updatePlant } from '../plantModel';
import type { TickContext } from '../types';

export const updatePlantsPhase = (ctx: TickContext) => {
  Object.values(ctx.simulation.plants).forEach((plant) => {
    const zone = Object.values(ctx.simulation.zones).find((z) => z.plantIds.includes(plant.id));
    if (!zone) return;
    const strain = ctx.blueprints.strains.get(plant.strainId);
    if (!strain) return;

    const nextStage = advanceStageIfNeeded(plant, strain, ctx.tickHours);
    if (nextStage !== plant.stage) {
      ctx.events.push({
        type: 'plant.stageChanged',
        tick: ctx.simulation.clock.tick,
        ts: Date.now(),
        payload: {
          plantId: plant.id,
          from: plant.stage,
          to: nextStage
        },
        level: 'info'
      });
      plant.stage = nextStage;
    }

    const result = updatePlant({
      plant,
      strain,
      environment: {
        temperature: zone.environment.temperature,
        humidity: zone.environment.humidity,
        co2: zone.environment.co2,
        ppfd: zone.environment.ppfd,
        zoneVolume: zone.volume
      },
      tickHours: ctx.tickHours
    });

    const growth = result.growthDryMatter;
    plant.ageDays += ctx.tickHours / 24;
    plant.biomassDryGrams = clamp(plant.biomassDryGrams + growth, 0, strain.growthModel.maxBiomassDry_g);
    plant.health = result.health;
    plant.stress = result.stress;
    plant.lastGrowthRate = growth / ctx.tickHours;

    zone.environment.humidity = clamp(zone.environment.humidity + result.transpirationRate * 0.001, 0, 1);
    zone.environment.co2 = clamp(zone.environment.co2 - growth * 10, 350, 2000);
  });
};
