import type { PlantStage } from '../../../shared/types/simulation';
import type { TickContext } from '../types';

const stageKey = (stage: PlantStage) => (stage === 'harvested' ? 'flowering' : stage);

export const irrigationAndNutrientsPhase = (ctx: TickContext) => {
  Object.values(ctx.simulation.zones).forEach((zone) => {
    if (zone.plantIds.length === 0) {
      return;
    }

    let waterDemand = 0;
    let nutrientDemand = 0;

    zone.plantIds.forEach((plantId) => {
      const plant = ctx.simulation.plants[plantId];
      if (!plant) return;
      const strain = ctx.blueprints.strains.get(plant.strainId);
      if (!strain) return;

      const key = stageKey(plant.stage);
      const waterCurve = strain.nutrientDemand.dailyWaterDemand_L_m2?.[key];
      if (waterCurve) {
        waterDemand += waterCurve * (zone.area / zone.plantIds.length) * (ctx.tickHours / 24);
      }

      const nutrientCurve = strain.nutrientDemand.dailyNutrientDemand[key];
      if (nutrientCurve) {
        nutrientDemand +=
          (nutrientCurve.nitrogen + nutrientCurve.phosphorus + nutrientCurve.potassium) *
          (ctx.tickHours / 24);
      }
    });

    ctx.events.push({
      type: 'zone.irrigationPlanned',
      tick: ctx.simulation.clock.tick,
      ts: Date.now(),
      payload: {
        zoneId: zone.id,
        waterDemand,
        nutrientDemand
      },
      level: 'info'
    });
  });
};
