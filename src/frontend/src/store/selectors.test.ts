import { describe, expect, it, vi } from 'vitest';

import {
  selectAlertCount,
  selectAlertEvents,
  selectRoomById,
  selectRoomByZoneId,
  selectRoomsByStructureId,
  selectRoomsGroupedByStructure,
  selectStructureById,
  selectStructureByRoomId,
  selectStructureByZoneId,
  selectZoneById,
  selectZonesByRoomId,
  selectZonesByStructureId,
  selectZonesGroupedByRoom,
  selectZonesGroupedByStructure,
} from './selectors';
import type { GameStoreState, ZoneStoreState } from './types';
import type {
  SimulationEvent,
  RoomSnapshot,
  StructureSnapshot,
  ZoneSnapshot,
} from '../types/simulation';

const createState = (events: SimulationEvent[]): GameStoreState => ({
  connectionStatus: 'idle',
  events,
  setConnectionStatus: vi.fn(),
  ingestUpdate: vi.fn(),
  appendEvents: vi.fn(),
  registerTickCompleted: vi.fn(),
  setCommandHandlers: vi.fn(),
  issueControlCommand: vi.fn(),
  requestTickLength: vi.fn(),
  reset: vi.fn(),
  sendControlCommand: undefined,
  sendConfigUpdate: undefined,
});

describe('alert selectors', () => {
  it('returns only warning and error events', () => {
    const warningEvent: SimulationEvent = { type: 'zone.thresholdCrossed', level: 'warning' };
    const errorEvent: SimulationEvent = { type: 'device.failed', level: 'error' };
    const infoEvent: SimulationEvent = { type: 'sim.tickCompleted', level: 'info' };
    const state = createState([warningEvent, infoEvent, errorEvent]);

    expect(selectAlertEvents(state)).toEqual([warningEvent, errorEvent]);
  });

  it('counts warning and error events', () => {
    const events: SimulationEvent[] = [
      { type: 'zone.thresholdCrossed', level: 'warning' },
      { type: 'device.failed', level: 'error' },
      { type: 'sim.tickCompleted', level: 'info' },
      { type: 'hr.hired', level: 'debug' },
      { type: 'market.saleCompleted' },
    ];
    const state = createState(events);

    expect(selectAlertCount(state)).toBe(2);
  });
});

const createZoneState = (overrides: Partial<ZoneStoreState> = {}): ZoneStoreState => ({
  structures: {},
  rooms: {},
  zones: {},
  devices: {},
  plants: {},
  timeline: [],
  financeSummary: undefined,
  financeHistory: [],
  lastSnapshotTimestamp: undefined,
  lastSnapshotTick: undefined,
  lastSetpoints: {},
  sendConfigUpdate: undefined,
  sendFacadeIntent: undefined,
  ingestUpdate: vi.fn(),
  recordFinanceTick: vi.fn(),
  setConfigHandler: vi.fn(),
  setIntentHandler: vi.fn(),
  sendSetpoint: vi.fn(),
  issueFacadeIntent: vi.fn(),
  updateStructureName: vi.fn(),
  updateRoomName: vi.fn(),
  updateZoneName: vi.fn(),
  duplicateRoom: vi.fn(),
  duplicateZone: vi.fn(),
  removeStructure: vi.fn(),
  removeRoom: vi.fn(),
  removeZone: vi.fn(),
  applyWater: vi.fn(),
  applyNutrients: vi.fn(),
  toggleDeviceGroup: vi.fn(),
  harvestPlanting: vi.fn(),
  harvestPlantings: vi.fn(),
  togglePlantingPlan: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

const createStructure = (id: string, roomIds: string[]): StructureSnapshot => ({
  id,
  name: id,
  status: 'active',
  footprint: { length: 10, width: 10, height: 5, area: 100, volume: 500 },
  rentPerTick: 120,
  roomIds,
});

const createRoom = (id: string, structureId: string, zoneIds: string[]): RoomSnapshot => ({
  id,
  name: id,
  structureId,
  structureName: structureId,
  purposeId: 'veg',
  purposeKind: 'vegetative',
  purposeName: 'Vegetation',
  area: 50,
  height: 3,
  volume: 150,
  cleanliness: 0.9,
  maintenanceLevel: 0.8,
  zoneIds,
});

const createZone = (id: string, structureId: string, roomId: string): ZoneSnapshot => ({
  id,
  name: id,
  structureId,
  structureName: structureId,
  roomId,
  roomName: roomId,
  area: 20,
  ceilingHeight: 3,
  volume: 60,
  cultivationMethodId: 'method',
  environment: { temperature: 24, relativeHumidity: 0.6, co2: 800, ppfd: 600, vpd: 1.2 },
  resources: {
    waterLiters: 100,
    nutrientSolutionLiters: 50,
    nutrientStrength: 0.8,
    substrateHealth: 0.9,
    reservoirLevel: 0.7,
    lastTranspirationLiters: 5,
  },
  metrics: {
    averageTemperature: 24,
    averageHumidity: 0.6,
    averageCo2: 800,
    averagePpfd: 600,
    stressLevel: 0.2,
    lastUpdatedTick: 10,
  },
  devices: [],
  plants: [],
  health: { diseases: 0, pests: 0, pendingTreatments: 0, appliedTreatments: 0 },
  lighting: { coverageRatio: 0.8 },
  supplyStatus: { dailyWaterConsumptionLiters: 10, dailyNutrientConsumptionLiters: 5 },
  plantingGroups: [],
  plantingPlan: null,
  deviceGroups: [],
});

describe('facility selectors', () => {
  const structures = {
    'structure-a': createStructure('structure-a', ['room-1']),
    'structure-b': createStructure('structure-b', ['room-2']),
  } satisfies Record<string, StructureSnapshot>;

  const rooms = {
    'room-1': createRoom('room-1', 'structure-a', ['zone-1', 'zone-2']),
    'room-2': createRoom('room-2', 'structure-b', ['zone-3']),
  } satisfies Record<string, RoomSnapshot>;

  const zones = {
    'zone-1': createZone('zone-1', 'structure-a', 'room-1'),
    'zone-2': createZone('zone-2', 'structure-a', 'room-1'),
    'zone-3': createZone('zone-3', 'structure-b', 'room-2'),
  } satisfies Record<string, ZoneSnapshot>;

  const state = createZoneState({ structures, rooms, zones });

  it('looks up entities by id', () => {
    expect(selectStructureById('structure-a')(state)).toBe(structures['structure-a']);
    expect(selectRoomById('room-1')(state)).toBe(rooms['room-1']);
    expect(selectZoneById('zone-2')(state)).toBe(zones['zone-2']);
  });

  it('finds parent entities by nested identifiers', () => {
    expect(selectStructureByRoomId('room-1')(state)).toBe(structures['structure-a']);
    expect(selectStructureByZoneId('zone-3')(state)).toBe(structures['structure-b']);
    expect(selectRoomByZoneId('zone-1')(state)).toBe(rooms['room-1']);
  });

  it('filters entities by structure and room', () => {
    expect(selectRoomsByStructureId('structure-a')(state)).toEqual([rooms['room-1']]);
    expect(selectZonesByStructureId('structure-a')(state)).toEqual([
      zones['zone-1'],
      zones['zone-2'],
    ]);
    expect(selectZonesByRoomId('room-1')(state)).toEqual([zones['zone-1'], zones['zone-2']]);
  });

  it('groups rooms and zones by their parents', () => {
    expect(selectRoomsGroupedByStructure(state)).toEqual({
      'structure-a': [rooms['room-1']],
      'structure-b': [rooms['room-2']],
    });
    expect(selectZonesGroupedByStructure(state)).toEqual({
      'structure-a': [zones['zone-1'], zones['zone-2']],
      'structure-b': [zones['zone-3']],
    });
    expect(selectZonesGroupedByRoom(state)).toEqual({
      'room-1': [zones['zone-1'], zones['zone-2']],
      'room-2': [zones['zone-3']],
    });
  });
});
