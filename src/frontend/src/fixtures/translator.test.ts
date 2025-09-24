import { describe, expect, it } from 'vitest';
import { translateClickDummyGameData } from './translator';
import type { ClickDummyGameData } from './types';

const SAMPLE_DATA: ClickDummyGameData = {
  globalStats: {
    time: 'Day 7, 14:00 (Tick 158)',
    balance: 99875420,
    dailyOpex: 12450,
    water: '1,500 L',
  },
  structures: [
    {
      id: 'struct-1',
      name: 'Medium Warehouse 1',
      footprint: { width: 100, length: 50, height: 10 },
      totalArea: 5000,
      usedArea: 400,
      dailyCost: 1850,
      rooms: [
        {
          id: 'room-1',
          name: 'Grow Room A',
          purpose: 'growroom',
          area: 200,
          zones: [
            {
              id: 'zone-1',
              name: 'Zone A1',
              method: 'Sea of Green',
              area: 50,
              maxPlants: 20,
              strain: 'OG Kush',
              phase: 'Flowering (Day 23)',
              estYield: 25,
              stress: 0.15,
              kpis: [
                { title: 'PPFD', value: '882', unit: 'µmol/m²/s', target: 900, status: 'optimal' },
                { title: 'VPD', value: '1.2', unit: 'kPa', target: 1.1, status: 'warning' },
                {
                  title: 'Temperature',
                  value: '25.2 °C',
                  unit: '°C',
                  target: 25,
                  status: 'optimal',
                },
                { title: 'Humidity', value: '52 %', unit: '%', target: 50, status: 'optimal' },
                {
                  title: 'CO₂ level',
                  value: '1,180',
                  unit: 'ppm',
                  target: 1200,
                  status: 'warning',
                },
                {
                  title: 'Water reserve',
                  value: '1,200 L',
                  unit: 'L',
                  target: 1000,
                  status: 'warning',
                },
                {
                  title: 'Nutrient solution',
                  value: '480 L',
                  unit: 'L',
                  target: 450,
                  status: 'warning',
                },
                {
                  title: 'Nutrient strength',
                  value: '90 %',
                  unit: '%',
                  target: 100,
                  status: 'warning',
                },
                {
                  title: 'Reservoir level',
                  value: '68%',
                  unit: '%',
                  target: 70,
                  status: 'warning',
                },
                {
                  title: 'Substrate health',
                  value: '82 %',
                  unit: '%',
                  target: 90,
                  status: 'warning',
                },
                { title: 'Transpiration', value: '14 L', unit: 'L', target: 12, status: 'warning' },
                { title: 'Stress level', value: '45 %', unit: '%', target: 30, status: 'warning' },
                { title: 'Pending treatments', value: '3', unit: '', target: 0, status: 'danger' },
                { title: 'Applied treatments', value: '1', unit: '', target: 0, status: 'warning' },
                { title: 'Disease incidents', value: '2', unit: '', target: 0, status: 'danger' },
                { title: 'Pest sightings', value: '1', unit: '', target: 0, status: 'warning' },
                { title: 'Re-entry wait', value: '12', unit: 'h', target: 0, status: 'warning' },
                {
                  title: 'Pre-harvest interval',
                  value: '2',
                  unit: 'days',
                  target: 0,
                  status: 'warning',
                },
                {
                  title: 'Daily water consumption',
                  value: '180',
                  unit: 'L/day',
                  target: 150,
                  status: 'warning',
                },
                {
                  title: 'Daily nutrient consumption',
                  value: '90',
                  unit: 'L/day',
                  target: 80,
                  status: 'warning',
                },
                { title: 'DLI', value: '32', unit: 'mol/m²/d', target: 30, status: 'optimal' },
              ],
              plants: [
                {
                  id: 'plant-1',
                  name: 'OG Kush',
                  stress: 12,
                  status: 'healthy',
                  health: 95,
                  progress: 60,
                  harvestable: false,
                },
              ],
              devices: [{ id: 'device-1', name: 'Sunstream Pro LED', type: 'Lighting' }],
              controls: {
                temperature: { value: 24.5, min: 15, max: 35, target: 25 },
                humidity: { value: 52, min: 30, max: 80, target: 50 },
                co2: { value: 1150, min: 400, max: 2000, target: 1200 },
                light: { power: 98, on: true, cycle: '12h/12h' },
              },
            },
          ],
        },
      ],
    },
  ],
  availableStructures: [],
  employees: [
    {
      id: 'emp-1',
      name: 'Alice',
      desiredRole: 'Gardener',
      assignment: 'struct-1',
      skills: { Cultivation: 4 },
      traits: ['Hard Worker'],
      expectedSalary: 34000,
    },
  ],
  candidates: [
    {
      id: 'cand-1',
      name: 'Frank',
      desiredRole: 'Technician',
      expectedSalary: 42000,
      skills: { Electronics: 4 },
      traits: ['Detail-Oriented'],
    },
  ],
  finance: {
    netIncome7d: 191920,
    opex7d: 90650,
    capex7d: 325000,
    revenue: { total: 282570, breakdown: [] },
    opex: { total: 90650, breakdown: [] },
    capex: { total: 325000, breakdown: [] },
  },
  events: [],
};

describe('translateClickDummyGameData', () => {
  it('normalizes zone data into SimulationSnapshot structures', () => {
    const { snapshot } = translateClickDummyGameData(SAMPLE_DATA);

    expect(snapshot.tick).toBe(158);
    expect(snapshot.structures).toHaveLength(1);
    expect(snapshot.structures[0].footprint.area).toBeCloseTo(5000);
    expect(snapshot.structures[0].rentPerTick).toBeCloseTo(1850 / 24, 6);

    expect(snapshot.rooms).toHaveLength(1);
    expect(snapshot.rooms[0].purposeKind).toBe('growroom');

    expect(snapshot.zones).toHaveLength(1);
    const [zone] = snapshot.zones;
    expect(zone.environment.temperature).toBeCloseTo(25.2, 5);
    expect(zone.environment.relativeHumidity).toBeCloseTo(0.52, 5);
    expect(zone.environment.co2).toBeCloseTo(1180, 5);
    expect(zone.environment.vpd).toBeCloseTo(1.2, 5);
    expect(zone.lighting?.photoperiodHours?.on).toBe(12);
    expect(zone.lighting?.dli).toBeCloseTo(32, 5);
    expect(zone.lighting?.averagePpfd).toBeCloseTo(882, 5);

    expect(zone.resources.waterLiters).toBeCloseTo(1200, 5);
    expect(zone.resources.nutrientSolutionLiters).toBeCloseTo(480, 5);
    expect(zone.resources.nutrientStrength).toBeCloseTo(0.9, 5);
    expect(zone.resources.reservoirLevel).toBeCloseTo(0.68, 5);
    expect(zone.resources.substrateHealth).toBeCloseTo(0.82, 5);
    expect(zone.resources.lastTranspirationLiters).toBeCloseTo(14, 5);

    expect(zone.metrics.averageTemperature).toBeCloseTo(25.2, 5);
    expect(zone.metrics.averageHumidity).toBeCloseTo(0.52, 5);
    expect(zone.metrics.averageCo2).toBeCloseTo(1180, 5);
    expect(zone.metrics.averagePpfd).toBeCloseTo(882, 5);
    expect(zone.metrics.stressLevel).toBeCloseTo(0.45, 5);

    expect(zone.supplyStatus?.dailyWaterConsumptionLiters).toBeCloseTo(180, 5);
    expect(zone.supplyStatus?.dailyNutrientConsumptionLiters).toBeCloseTo(90, 5);

    expect(zone.health.diseases).toBe(2);
    expect(zone.health.pests).toBe(1);
    expect(zone.health.pendingTreatments).toBe(3);
    expect(zone.health.appliedTreatments).toBe(1);
    expect(zone.health.reentryRestrictedUntilTick).toBe(170);
    expect(zone.health.preHarvestRestrictedUntilTick).toBe(206);

    expect(zone.plants).toHaveLength(1);
    const [plant] = zone.plants;
    expect(plant.health).toBeCloseTo(0.95, 5);
    expect(plant.strainId).toBe('strain:og-kush');
    expect(plant.stage).toBe('flowering');

    expect(zone.devices).toHaveLength(1);
    expect(zone.devices[0].blueprintId).toBe('device:lighting:sunstream-pro-led');
  });

  it('converts personnel and finance fields to per-tick units', () => {
    const { snapshot, financeHistory } = translateClickDummyGameData(SAMPLE_DATA);

    expect(snapshot.personnel.employees[0].salaryPerTick).toBeCloseTo(34000 / 2080, 5);
    expect(snapshot.personnel.applicants[0].expectedSalary).toBeCloseTo(42000 / 2080, 5);

    expect(financeHistory).toHaveLength(snapshot.tick + 1);
    const aggregated = financeHistory.reduce(
      (totals, entry) => {
        totals.revenue += entry.revenue;
        totals.opex += entry.opex;
        totals.capex += entry.capex;
        return totals;
      },
      { revenue: 0, opex: 0, capex: 0 },
    );

    expect(aggregated.revenue).toBeCloseTo(snapshot.finance.totalRevenue, 5);
    expect(aggregated.opex + aggregated.capex).toBeCloseTo(snapshot.finance.totalExpenses, 5);
    expect(snapshot.finance.netIncome).toBeCloseTo(
      snapshot.finance.totalRevenue - snapshot.finance.totalExpenses,
      5,
    );

    const lastMaintenance = financeHistory[financeHistory.length - 1]?.maintenanceDetails ?? [];
    if (lastMaintenance.length) {
      expect(lastMaintenance[0].blueprintId).toBeDefined();
    }
  });
});
