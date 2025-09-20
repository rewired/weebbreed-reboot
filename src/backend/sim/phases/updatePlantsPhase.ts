import type { TickContext } from '../types.js';
import { updatePlant } from '../../engine/plantModel.js';

export function updatePlantsPhase(context: TickContext): void {
  const { state, tickHours, events } = context;
  for (const zone of state.zones) {
    const updatedPlants = [];
    for (const plant of zone.plants) {
      const result = updatePlant(
        { plant, zoneArea: zone.area, environment: zone.environment, tickHours },
        zone.plants.length
      );
      const baselineGrowth = result.updatedPlant.biomassDryGrams - plant.biomassDryGrams;
      const waterFactor = zone.lastIrrigationSatisfaction;
      const adjustedGrowth = baselineGrowth * waterFactor;
      result.updatedPlant.biomassDryGrams = Math.max(plant.biomassDryGrams, plant.biomassDryGrams + adjustedGrowth);
      result.updatedPlant.lastTickPhotosynthesis_g = adjustedGrowth;
      result.updatedPlant.transpiredWater_L *= waterFactor;
      if (result.stageChanged) {
        events.push({
          type: 'plant.stageChanged',
          payload: { plantId: result.updatedPlant.id, ...result.stageChanged },
          tick: state.tick,
          ts: Date.now()
        });
      }
      updatedPlants.push(result.updatedPlant);
    }
    zone.plants = updatedPlants;
  }
}
