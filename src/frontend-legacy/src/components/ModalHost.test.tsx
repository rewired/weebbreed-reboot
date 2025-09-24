import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppStoreState, ZoneStoreState } from '@/store';
import type { RoomSnapshot, StructureSnapshot, ZoneSnapshot } from '@/types/simulation';

const buildStructure = (overrides: Partial<StructureSnapshot> = {}): StructureSnapshot => ({
  id: 'structure-1',
  name: 'North Facility',
  status: 'active',
  footprint: { length: 30, width: 15, height: 6, area: 450, volume: 2700 },
  rentPerTick: 1250,
  roomIds: [],
  ...overrides,
});

const buildRoom = (overrides: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
  id: 'room-1',
  name: 'Propagation room',
  structureId: 'structure-1',
  structureName: 'North Facility',
  purposeId: 'purpose:growroom',
  purposeKind: 'growroom',
  purposeName: 'Grow room',
  purposeFlags: {},
  area: 120,
  height: 6,
  volume: 720,
  cleanliness: 0.92,
  maintenanceLevel: 0.88,
  zoneIds: [],
  ...overrides,
});

const buildZone = (overrides: Partial<ZoneSnapshot> = {}): ZoneSnapshot => ({
  id: 'zone-1',
  name: 'Propagation bench',
  structureId: 'structure-1',
  structureName: 'North Facility',
  roomId: 'room-1',
  roomName: 'Propagation room',
  area: 40,
  ceilingHeight: 6,
  volume: 240,
  cultivationMethodId: 'method:sea-of-green',
  environment: {
    temperature: 24,
    relativeHumidity: 0.62,
    co2: 980,
    ppfd: 540,
    vpd: 1.2,
  },
  resources: {
    waterLiters: 120,
    nutrientSolutionLiters: 80,
    nutrientStrength: 1,
    substrateHealth: 0.9,
    reservoirLevel: 0.7,
    lastTranspirationLiters: 2,
  },
  metrics: {
    averageTemperature: 24,
    averageHumidity: 0.62,
    averageCo2: 980,
    averagePpfd: 540,
    stressLevel: 0.1,
    lastUpdatedTick: 42,
  },
  devices: [],
  plants: [],
  health: {
    diseases: 0,
    pests: 0,
    pendingTreatments: 0,
    appliedTreatments: 0,
  },
  ...overrides,
});

describe('ModalHost world management flows', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const loadModalHost = async () => {
    const [componentModule, storeModule] = await Promise.all([
      import('./ModalHost'),
      import('@/store'),
    ]);

    return {
      ModalHost: componentModule.default,
      useAppStore: storeModule.useAppStore,
      useZoneStore: storeModule.useZoneStore,
    };
  };

  it('dispatches createRoom intent when the CreateRoomModal form submits', async () => {
    const { ModalHost, useAppStore, useZoneStore } = await loadModalHost();
    const structure = buildStructure();
    const createRoom = vi.fn<ZoneStoreState['createRoom']>();
    const closeModal = vi.fn<AppStoreState['closeModal']>();

    act(() => {
      useZoneStore.setState({
        structures: { [structure.id]: structure },
        rooms: {},
        zones: {},
        plants: {},
        createRoom,
      });
      useAppStore.setState({
        activeModal: {
          kind: 'createRoom',
          title: 'Add room',
          payload: { structureId: structure.id },
        },
        closeModal,
      });
    });

    render(<ModalHost />);

    const submitButton = screen.getByRole('button', { name: 'Create room' });

    fireEvent.click(submitButton);

    expect(createRoom).toHaveBeenCalledTimes(1);
    const [structureId, options] = createRoom.mock.calls[0];
    expect(structureId).toBe(structure.id);
    expect(options).toMatchObject({
      name: expect.any(String),
      purposeId: expect.any(String),
      area: expect.any(Number),
    });
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('dispatches createZone intent when confirming the CreateZoneModal', async () => {
    const { ModalHost, useAppStore, useZoneStore } = await loadModalHost();
    const structure = buildStructure();
    const room = buildRoom();
    const createZone = vi.fn<ZoneStoreState['createZone']>();
    const closeModal = vi.fn<AppStoreState['closeModal']>();

    act(() => {
      useZoneStore.setState({
        structures: { [structure.id]: structure },
        rooms: { [room.id]: room },
        zones: {},
        plants: {},
        createZone,
      });
      useAppStore.setState({
        activeModal: {
          kind: 'createZone',
          title: 'Add zone',
          payload: { roomId: room.id },
        },
        closeModal,
      });
    });

    render(<ModalHost />);

    const submitButton = screen.getByRole('button', { name: 'Create zone' });

    fireEvent.click(submitButton);

    expect(createZone).toHaveBeenCalledTimes(1);
    const [roomId, options] = createZone.mock.calls[0];
    expect(roomId).toBe(room.id);
    expect(options).toMatchObject({
      name: expect.any(String),
      area: expect.any(Number),
    });
    expect(options.methodId).toBeDefined();
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('invokes rentStructure when confirming the RentStructureModal', async () => {
    const { ModalHost, useAppStore, useZoneStore } = await loadModalHost();
    const structure = buildStructure();
    const rooms = [buildRoom({ id: 'room-2', name: 'Drying room' })];
    const rentStructure = vi.fn<ZoneStoreState['rentStructure']>();
    const closeModal = vi.fn<AppStoreState['closeModal']>();

    act(() => {
      useZoneStore.setState({
        structures: { [structure.id]: { ...structure, roomIds: rooms.map((room) => room.id) } },
        rooms: Object.fromEntries(rooms.map((room) => [room.id, room])),
        zones: {},
        plants: {},
        rentStructure,
      });
      useAppStore.setState({
        activeModal: {
          kind: 'rentStructure',
          title: 'Rent facility',
          payload: { structureId: structure.id },
        },
        closeModal,
      });
    });

    render(<ModalHost />);

    fireEvent.click(screen.getByRole('button', { name: 'Rent structure' }));

    expect(rentStructure).toHaveBeenCalledTimes(1);
    expect(rentStructure).toHaveBeenCalledWith(structure.id);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('dispatches duplicateStructure with the default name when submitted', async () => {
    const { ModalHost, useAppStore, useZoneStore } = await loadModalHost();
    const structure = buildStructure();
    const rooms = [buildRoom({ id: 'room-10', name: 'Flower room', zoneIds: ['zone-10'] })];
    const zones = [
      buildZone({
        id: 'zone-10',
        name: 'Flower bench',
        structureId: structure.id,
        roomId: rooms[0].id,
      }),
    ];
    const duplicateStructure = vi.fn<ZoneStoreState['duplicateStructure']>();
    const closeModal = vi.fn<AppStoreState['closeModal']>();

    act(() => {
      useZoneStore.setState({
        structures: { [structure.id]: { ...structure, roomIds: rooms.map((room) => room.id) } },
        rooms: Object.fromEntries(rooms.map((room) => [room.id, room])),
        zones: Object.fromEntries(zones.map((zone) => [zone.id, zone])),
        plants: {},
        duplicateStructure,
      });
      useAppStore.setState({
        activeModal: {
          kind: 'duplicateStructure',
          title: 'Duplicate structure',
          payload: { structureId: structure.id },
        },
        closeModal,
      });
    });

    render(<ModalHost />);

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate structure' }));

    expect(duplicateStructure).toHaveBeenCalledTimes(1);
    const [structureId, options] = duplicateStructure.mock.calls[0];
    expect(structureId).toBe(structure.id);
    expect(options).toEqual({ name: `${structure.name} copy` });
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
