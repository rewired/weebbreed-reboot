import type { TickContext } from '../types.js';

const ELECTRICITY_COST_PER_KWH = 0.22;
const WATER_COST_PER_L = 0.002;

export function accountingPhase(context: TickContext): void {
  const { state, tickHours, events } = context;
  let totalEnergyKWh = 0;
  let totalWaterL = 0;
  for (const zone of state.zones) {
    const zoneEnergy = zone.devices
      .filter((device) => device.isActive)
      .reduce((sum, device) => sum + (device.blueprint.settings.power ?? 0) * tickHours, 0);
    totalEnergyKWh += zoneEnergy;
    totalWaterL += zone.lastWaterSupplied_L ?? 0;
  }
  const energyCost = totalEnergyKWh * ELECTRICITY_COST_PER_KWH;
  const waterCost = totalWaterL * WATER_COST_PER_L;
  events.push({
    type: 'accounting.tick',
    payload: {
      energyKWh: totalEnergyKWh,
      waterLiters: totalWaterL,
      cost: {
        energy: energyCost,
        water: waterCost,
        total: energyCost + waterCost
      }
    },
    tick: state.tick,
    ts: Date.now()
  });
}
