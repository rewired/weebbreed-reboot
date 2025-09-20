import type { TickContext } from '../types.js';
import { estimateWaterDemand } from '../../engine/plantModel.js';

export function irrigationAndNutrientsPhase(context: TickContext): void {
  const { state, tickHours, events } = context;
  for (const zone of state.zones) {
    let waterDemand = 0;
    for (const plant of zone.plants) {
      waterDemand += estimateWaterDemand(plant.strain, plant.stage, zone.area, zone.plants.length, tickHours);
    }
    const available = zone.irrigationReservoir_L;
    const supplied = Math.min(available, waterDemand);
    zone.irrigationReservoir_L = Math.max(0, available - supplied);
    zone.lastIrrigationSatisfaction = waterDemand > 0 ? supplied / waterDemand : 1;
    zone.nutrientSatisfaction = zone.lastIrrigationSatisfaction;
    zone.lastWaterSupplied_L = supplied;
    if (zone.lastIrrigationSatisfaction < 0.5) {
      events.push({
        type: 'zone.irrigationLow',
        payload: { zoneId: zone.id, satisfaction: zone.lastIrrigationSatisfaction },
        tick: state.tick,
        ts: Date.now(),
        level: 'warning'
      });
    }
  }
}
