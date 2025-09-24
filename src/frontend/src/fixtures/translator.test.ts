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
    const snapshot = translateClickDummyGameData(SAMPLE_DATA);

    expect(snapshot.tick).toBe(158);
    expect(snapshot.structures).toHaveLength(1);
    expect(snapshot.structures[0].footprint.area).toBeCloseTo(5000);
    expect(snapshot.structures[0].rentPerTick).toBeCloseTo(1850 / 24, 6);

    expect(snapshot.rooms).toHaveLength(1);
    expect(snapshot.rooms[0].purposeKind).toBe('growroom');

    expect(snapshot.zones).toHaveLength(1);
    const [zone] = snapshot.zones;
    expect(zone.environment.relativeHumidity).toBeCloseTo(0.52, 5);
    expect(zone.environment.vpd).toBeCloseTo(1.2, 5);
    expect(zone.lighting?.photoperiodHours?.on).toBe(12);
    expect(zone.lighting?.dli).toBeGreaterThan(0);

    expect(zone.plants).toHaveLength(1);
    const [plant] = zone.plants;
    expect(plant.health).toBeCloseTo(0.95, 5);
    expect(plant.strainId).toBe('strain:og-kush');
  });

  it('converts personnel and finance fields to per-tick units', () => {
    const snapshot = translateClickDummyGameData(SAMPLE_DATA);

    expect(snapshot.personnel.employees[0].salaryPerTick).toBeCloseTo(34000 / 2080, 5);
    expect(snapshot.personnel.applicants[0].expectedSalary).toBeCloseTo(42000 / 2080, 5);

    const ticksPerWeek = 7 * 24; // tick length defaults to 60 minutes
    expect(snapshot.finance.lastTickRevenue).toBeCloseTo(282570 / ticksPerWeek, 5);
    expect(snapshot.finance.totalExpenses).toBe(90650 + 325000);
  });
});
