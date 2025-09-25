import { generateId } from '@/state/initialization/common.js';
import type { RngService, RngStream } from '@/lib/rng.js';
import { CostAccountingService, type TickAccumulator } from '@/engine/economy/costAccounting.js';
import {
  type CommandExecutionContext,
  type CommandResult,
  type ErrorCode,
} from '@/facade/index.js';
import {
  type GameState,
  type StructureState,
  type RoomState,
  type ZoneState,
  type ZoneResourceState,
  type ZoneMetricState,
  type ZoneHealthState,
} from '@/state/models.js';
import { validateStructureGeometry } from '@/state/geometry.js';
import { findStructure, findRoom, findZone, type ZoneLookupResult } from './stateSelectors.js';

const DEFAULT_ZONE_RESERVOIR_LEVEL = 0.75;
const DEFAULT_ZONE_WATER_LITERS = 800;
const DEFAULT_ZONE_NUTRIENT_LITERS = 400;
const DEFAULT_MAINTENANCE_INTERVAL_TICKS = 24 * 30;

const deriveDuplicateName = (original: string, fallbackSuffix: string): string => {
  const trimmed = original.trim();
  if (trimmed.length === 0) {
    return fallbackSuffix;
  }
  if (trimmed.toLowerCase().includes('copy')) {
    return trimmed;
  }
  return `${trimmed} Copy`;
};

const cloneMetrics = (source: ZoneMetricState, tick: number): ZoneMetricState => ({
  averageTemperature: source.averageTemperature,
  averageHumidity: source.averageHumidity,
  averageCo2: source.averageCo2,
  averagePpfd: source.averagePpfd,
  stressLevel: source.stressLevel,
  lastUpdatedTick: tick,
});

const createDefaultResources = (): ZoneResourceState => ({
  waterLiters: DEFAULT_ZONE_WATER_LITERS,
  nutrientSolutionLiters: DEFAULT_ZONE_NUTRIENT_LITERS,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: DEFAULT_ZONE_RESERVOIR_LEVEL,
  lastTranspirationLiters: 0,
});

const createEmptyHealth = (): ZoneHealthState => ({
  plantHealth: {},
  pendingTreatments: [],
  appliedTreatments: [],
});

const cloneEnvironment = (environment: ZoneState['environment']): ZoneState['environment'] => {
  return {
    temperature: environment.temperature,
    relativeHumidity: environment.relativeHumidity,
    co2: environment.co2,
    ppfd: environment.ppfd,
    vpd: environment.vpd,
  };
};

const cloneControl = (control: ZoneState['control'] | undefined): ZoneState['control'] => {
  if (!control) {
    return { setpoints: {} } satisfies ZoneState['control'];
  }
  const setpoints = control.setpoints ?? {};
  return {
    setpoints: {
      temperature: setpoints.temperature,
      humidity: setpoints.humidity,
      co2: setpoints.co2,
      ppfd: setpoints.ppfd,
      vpd: setpoints.vpd,
    },
  } satisfies ZoneState['control'];
};

const deepCloneSettings = (settings: Record<string, unknown>): Record<string, unknown> => {
  return JSON.parse(JSON.stringify(settings));
};

type DevicePurchaseMap = Map<string, number>;

export interface DuplicateStructureResult {
  structureId: string;
}

export interface DuplicateRoomResult {
  roomId: string;
}

export interface DuplicateZoneResult {
  zoneId: string;
}

export interface WorldServiceOptions {
  state: GameState;
  rng: RngService;
  costAccounting: CostAccountingService;
}

export class WorldService {
  private readonly state: GameState;

  private readonly idStream: RngStream;

  private readonly costAccounting: CostAccountingService;

  constructor(options: WorldServiceOptions) {
    this.state = options.state;
    this.costAccounting = options.costAccounting;
    this.idStream = options.rng.getStream('world.structures');
  }

  renameStructure(
    structureId: string,
    name: string,
    context: CommandExecutionContext,
  ): CommandResult {
    const lookup = findStructure(this.state, structureId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.renameStructure',
        'structureId',
      ]);
    }

    const trimmedName = name.trim();
    lookup.structure.name = trimmedName;

    context.events.queue(
      'world.structureRenamed',
      { structureId, name: trimmedName },
      context.tick,
      'info',
    );
    return { ok: true } satisfies CommandResult;
  }

  rentStructure(
    structureId: string,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> {
    const blueprint = this.state.blueprints.structures.find((s) => s.id === structureId);
    if (!blueprint) {
      return this.failure('ERR_NOT_FOUND', `Structure blueprint ${structureId} not found.`, [
        'world.rentStructure',
        'structureId',
      ]);
    }

    const existing = this.state.structures.find((s) => s.blueprintId === structureId);
    if (existing) {
      return this.failure('ERR_CONFLICT', `Structure ${structureId} is already rented.`, [
        'world.rentStructure',
        'structureId',
      ]);
    }

    const newStructure: StructureState = {
      id: this.createId('structure'),
      blueprintId: blueprint.id,
      name: blueprint.name,
      status: 'active',
      footprint: { ...blueprint.footprint },
      rooms: [],
      rentPerTick: blueprint.rentPerTick,
      upfrontCostPaid: 0,
      notes: undefined,
    };

    this.state.structures.push(newStructure);

    const accumulator = this.costAccounting.createAccumulator();
    this.costAccounting.recordRent(
      this.state,
      newStructure.rentPerTick,
      context.tick,
      new Date().toISOString(),
      accumulator,
      context.events,
      `Rented new structure: ${newStructure.name}`,
    );
    this.applyAccumulator(accumulator);

    context.events.queue(
      'world.structureRented',
      { structureId: newStructure.id, name: newStructure.name },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: { structureId: newStructure.id },
    } satisfies CommandResult<DuplicateStructureResult>;
  }

  deleteStructure(structureId: string, context: CommandExecutionContext): CommandResult {
    const lookup = findStructure(this.state, structureId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.deleteStructure',
        'structureId',
      ]);
    }

    const [removed] = this.state.structures.splice(lookup.index, 1);
    if (removed) {
      for (const room of removed.rooms) {
        for (const zone of room.zones) {
          zone.activeTaskIds = [];
        }
      }
      this.removeTasksForStructure(structureId);
    }

    context.events.queue('world.structureDeleted', { structureId }, context.tick, 'info');
    return { ok: true } satisfies CommandResult;
  }

  duplicateStructure(
    structureId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> {
    const lookup = findStructure(this.state, structureId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.duplicateStructure',
        'structureId',
      ]);
    }

    const source = lookup.structure;
    const newStructureId = this.createId('structure');
    const duplicateName = desiredName?.trim().length
      ? desiredName.trim()
      : deriveDuplicateName(source.name, 'Structure Copy');
    const rooms: StructureState['rooms'] = [];
    const purchaseMap: DevicePurchaseMap = new Map();

    for (const room of source.rooms) {
      rooms.push(this.cloneRoom(room, newStructureId, purchaseMap, context));
    }

    const duplicated: StructureState = {
      id: newStructureId,
      blueprintId: source.blueprintId,
      name: duplicateName,
      status: 'active',
      footprint: { ...source.footprint },
      rooms,
      rentPerTick: source.rentPerTick,
      upfrontCostPaid: 0,
      notes: undefined,
    } satisfies StructureState;

    validateStructureGeometry(duplicated);
    this.state.structures.push(duplicated);

    this.recordDevicePurchases(purchaseMap, context, `Structure duplication from ${structureId}`);

    context.events.queue(
      'world.structureDuplicated',
      { structureId: newStructureId, sourceStructureId: structureId, name: duplicateName },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: { structureId: newStructureId },
    } satisfies CommandResult<DuplicateStructureResult>;
  }

  duplicateRoom(
    roomId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateRoomResult> {
    const lookup = findRoom(this.state, roomId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Room ${roomId} was not found.`, [
        'world.duplicateRoom',
        'roomId',
      ]);
    }

    const { structure, room } = lookup;
    const totalArea = structure.rooms.reduce((sum, current) => sum + current.area, 0);
    if (totalArea + room.area - structure.footprint.area > 1e-6) {
      return this.failure(
        'ERR_CONFLICT',
        'Duplicating the room would exceed the structure footprint.',
        ['world.duplicateRoom', 'roomId'],
      );
    }

    const purchaseMap: DevicePurchaseMap = new Map();
    const newRoom = this.cloneRoom(
      room,
      structure.id,
      purchaseMap,
      context,
      desiredName?.trim().length ? desiredName.trim() : deriveDuplicateName(room.name, 'Room Copy'),
    );

    structure.rooms.push(newRoom);
    validateStructureGeometry(structure);

    this.recordDevicePurchases(purchaseMap, context, `Room duplication from ${roomId}`);

    context.events.queue(
      'world.roomDuplicated',
      { roomId: newRoom.id, sourceRoomId: roomId, structureId: structure.id },
      context.tick,
      'info',
    );

    return { ok: true, data: { roomId: newRoom.id } } satisfies CommandResult<DuplicateRoomResult>;
  }

  duplicateZone(
    zoneId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateZoneResult> {
    const lookup = findZone(this.state, zoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'world.duplicateZone',
        'zoneId',
      ]);
    }

    const { structure, room, zone } = lookup;
    const totalZoneArea = room.zones.reduce((sum, current) => sum + current.area, 0);
    if (totalZoneArea + zone.area - room.area > 1e-6) {
      return this.failure('ERR_CONFLICT', 'Duplicating the zone would exceed the room area.', [
        'world.duplicateZone',
        'zoneId',
      ]);
    }

    const purchaseMap: DevicePurchaseMap = new Map();
    const newZone = this.cloneZone(
      zone,
      structure.id,
      room.id,
      purchaseMap,
      context,
      desiredName?.trim().length ? desiredName.trim() : deriveDuplicateName(zone.name, 'Zone Copy'),
    );

    room.zones.push(newZone);
    validateStructureGeometry(structure);

    this.recordDevicePurchases(purchaseMap, context, `Zone duplication from ${zoneId}`);

    context.events.queue(
      'world.zoneDuplicated',
      {
        zoneId: newZone.id,
        sourceZoneId: zoneId,
        roomId: room.id,
        structureId: structure.id,
      },
      context.tick,
      'info',
    );

    return { ok: true, data: { zoneId: newZone.id } } satisfies CommandResult<DuplicateZoneResult>;
  }

  private cloneRoom(
    room: RoomState,
    structureId: string,
    purchaseMap: DevicePurchaseMap,
    context: CommandExecutionContext,
    forcedName?: string,
  ): RoomState {
    const newRoomId = this.createId('room');
    const zones: RoomState['zones'] = [];

    for (const zone of room.zones) {
      zones.push(
        this.cloneZone(
          zone,
          structureId,
          newRoomId,
          purchaseMap,
          context,
          forcedName ? zone.name : undefined,
        ),
      );
    }

    return {
      id: newRoomId,
      structureId,
      name: forcedName ?? deriveDuplicateName(room.name, 'Room Copy'),
      purposeId: room.purposeId,
      area: room.area,
      height: room.height,
      volume: room.volume,
      cleanliness: room.cleanliness,
      maintenanceLevel: room.maintenanceLevel,
      zones,
    } satisfies RoomState;
  }

  private cloneZone(
    zone: ZoneState,
    structureId: string,
    roomId: string,
    purchaseMap: DevicePurchaseMap,
    context: CommandExecutionContext,
    forcedName?: string,
  ): ZoneState {
    const newZoneId = this.createId('zone');
    const devices: ZoneState['devices'] = [];

    for (const device of zone.devices) {
      const cloned = {
        id: this.createId('device'),
        blueprintId: device.blueprintId,
        kind: device.kind,
        name: device.name,
        zoneId: newZoneId,
        status: 'operational',
        efficiency: device.efficiency,
        runtimeHours: 0,
        maintenance: {
          lastServiceTick: context.tick,
          nextDueTick: context.tick + DEFAULT_MAINTENANCE_INTERVAL_TICKS,
          condition: 1,
          runtimeHoursAtLastService: 0,
          degradation: 0,
        },
        settings: deepCloneSettings(device.settings),
      } satisfies ZoneState['devices'][number];

      devices.push(cloned);
      const previous = purchaseMap.get(device.blueprintId) ?? 0;
      purchaseMap.set(device.blueprintId, previous + 1);
    }

    const environment = cloneEnvironment(zone.environment);
    const metrics = cloneMetrics(zone.metrics, context.tick);

    return {
      id: newZoneId,
      roomId,
      name: forcedName ?? deriveDuplicateName(zone.name, 'Zone Copy'),
      cultivationMethodId: zone.cultivationMethodId,
      strainId: zone.strainId,
      area: zone.area,
      ceilingHeight: zone.ceilingHeight,
      volume: zone.volume,
      environment,
      resources: createDefaultResources(),
      plants: [],
      devices,
      metrics,
      control: cloneControl(zone.control),
      health: createEmptyHealth(),
      activeTaskIds: [],
      plantingPlan: undefined,
    } satisfies ZoneState;
  }

  private recordDevicePurchases(
    purchases: DevicePurchaseMap,
    context: CommandExecutionContext,
    description: string,
  ): void {
    if (purchases.size === 0) {
      return;
    }

    const accumulator = this.costAccounting.createAccumulator();
    const timestamp = new Date().toISOString();
    for (const [blueprintId, quantity] of purchases.entries()) {
      this.costAccounting.recordDevicePurchase(
        this.state,
        blueprintId,
        quantity,
        context.tick,
        timestamp,
        accumulator,
        context.events,
        description,
      );
    }
    this.applyAccumulator(accumulator);
  }

  private applyAccumulator(accumulator: TickAccumulator): void {
    const summary = this.state.finances.summary;
    summary.totalRevenue += accumulator.revenue;
    summary.totalExpenses += accumulator.expenses;
    summary.totalMaintenance += accumulator.maintenance;
    summary.totalPayroll += accumulator.payroll;
    summary.lastTickRevenue = accumulator.revenue;
    summary.lastTickExpenses = accumulator.expenses;
    summary.netIncome = summary.totalRevenue - summary.totalExpenses;
  }

  private removeTasksForStructure(structureId: string): void {
    const filterTasks = (collection: typeof this.state.tasks.backlog) =>
      collection.filter((task) => task.location?.structureId !== structureId);

    this.state.tasks.backlog = filterTasks(this.state.tasks.backlog);
    this.state.tasks.active = filterTasks(this.state.tasks.active);
    this.state.tasks.completed = filterTasks(this.state.tasks.completed);
    this.state.tasks.cancelled = filterTasks(this.state.tasks.cancelled);
  }

  private createId(prefix: string): string {
    return generateId(this.idStream, prefix);
  }

  private failure(code: ErrorCode, message: string, path: string[]): CommandResult {
    return {
      ok: false,
      errors: [
        {
          code,
          message,
          path,
        },
      ],
    } satisfies CommandResult;
  }
}

export const requireZoneLookup = (lookup: ZoneLookupResult | undefined): ZoneLookupResult => {
  if (!lookup) {
    throw new Error('Zone lookup failed.');
  }
  return lookup;
};

export default WorldService;
