import { describe, expect, it } from 'vitest';
import { getZoneGeometry, validateStructureGeometry } from './geometry.js';
import type { RoomState, StructureState, ZoneState } from './models.js';

const createZone = (overrides: Partial<ZoneState> = {}): ZoneState => ({
  id: 'zone-1',
  roomId: 'room-1',
  name: 'Zone 1',
  cultivationMethodId: 'method-1',
  strainId: 'strain-1',
  area: 60,
  ceilingHeight: 4,
  volume: 240,
  environment: {
    temperature: 24,
    relativeHumidity: 0.6,
    co2: 900,
    ppfd: 500,
    vpd: 1.2,
  },
  resources: {
    waterLiters: 500,
    nutrientSolutionLiters: 250,
    nutrientStrength: 1,
    substrateHealth: 1,
    reservoirLevel: 0.75,
    lastTranspirationLiters: 0,
  },
  plants: [],
  devices: [],
  metrics: {
    averageTemperature: 24,
    averageHumidity: 0.6,
    averageCo2: 900,
    averagePpfd: 500,
    stressLevel: 0,
    lastUpdatedTick: 0,
  },
  control: { setpoints: {} },
  health: { plantHealth: {}, pendingTreatments: [], appliedTreatments: [] },
  activeTaskIds: [],
  ...overrides,
});

const createRoom = (overrides: Partial<RoomState> = {}): RoomState => {
  const zones = overrides.zones ?? [createZone()];
  return {
    id: 'room-1',
    structureId: 'structure-1',
    name: 'Grow Room',
    purposeId: 'purpose-1',
    area: 60,
    height: 4,
    volume: 240,
    cleanliness: 1,
    maintenanceLevel: 1,
    ...overrides,
    zones,
  };
};

const createStructure = (overrides: Partial<StructureState> = {}): StructureState => {
  const rooms = overrides.rooms ?? [createRoom()];
  return {
    id: 'structure-1',
    blueprintId: 'structure-blueprint',
    name: 'Structure 1',
    status: 'active',
    footprint: { length: 10, width: 10, height: 4, area: 100, volume: 400 },
    rentPerTick: 0,
    upfrontCostPaid: 0,
    ...overrides,
    rooms,
  };
};

describe('geometry validation', () => {
  it('accepts structures whose room and zone geometry fit within the footprint', () => {
    const structure = createStructure();
    expect(() => validateStructureGeometry(structure)).not.toThrow();
    const room = structure.rooms[0]!;
    const zone = room.zones[0]!;
    const geometry = getZoneGeometry(structure, room, zone);
    expect(geometry.area).toBe(zone.area);
    expect(geometry.volume).toBe(zone.volume);
    expect(geometry.ceilingHeight).toBe(zone.ceilingHeight);
  });

  it('rejects zone layouts that exceed the enclosing room area', () => {
    const zone = createZone({ area: 80, volume: 320 });
    const room = createRoom({ zones: [zone] });
    const structure = createStructure({ rooms: [room] });
    expect(() => validateStructureGeometry(structure)).toThrow(/zone areas/i);
    expect(() => getZoneGeometry(structure, room, zone)).toThrow(/zone areas/i);
  });

  it('rejects room layouts that exceed the structure footprint area', () => {
    const room = createRoom({ area: 70 });
    const otherRoom = createRoom({ id: 'room-2', area: 50, zones: [createZone({ id: 'zone-2' })] });
    const structure = createStructure({ rooms: [room, otherRoom] });
    expect(() => validateStructureGeometry(structure)).toThrow(/footprint area/i);
  });

  it('rejects zone ceiling heights that exceed the room height', () => {
    const zone = createZone({ ceilingHeight: 5, volume: 300 });
    const room = createRoom({ zones: [zone] });
    const structure = createStructure({ rooms: [room] });
    expect(() => validateStructureGeometry(structure)).toThrow(/ceiling height/i);
  });
});
