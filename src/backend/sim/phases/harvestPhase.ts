import type { TickContext } from '../types.js';

const HARVEST_THRESHOLD_G = 100;

export function harvestAndInventoryPhase(context: TickContext): void {
  const { state, events } = context;
  for (const zone of state.zones) {
    for (const plant of zone.plants) {
      if (plant.stage === 'harvest-ready' && plant.biomassDryGrams >= HARVEST_THRESHOLD_G) {
        events.push({
          type: 'plant.harvestReady',
          payload: { plantId: plant.id, biomassDryGrams: plant.biomassDryGrams },
          tick: state.tick,
          ts: Date.now(),
          level: 'info'
        });
      }
    }
  }
}
