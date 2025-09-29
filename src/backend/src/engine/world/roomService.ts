import type { CostAccountingService } from '@/engine/economy/costAccounting.js';
import type {
  CommandExecutionContext,
  CommandResult,
  CreateRoomIntent,
  ErrorCode,
} from '@/facade/index.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import { findRoom, findStructure } from './stateSelectors.js';
import { validateStructureGeometry } from '@/state/geometry.js';
import type { GameState, RoomState } from '@/state/models.js';
import { deriveDuplicateName } from './worldDefaults.js';
import type { RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import { resolveRoomPurposeId } from '@/engine/roomPurposes/index.js';
import type { ZoneService, DevicePurchaseMap } from './zoneService.js';

export interface CreateRoomResult {
  roomId: string;
}

export interface DuplicateRoomResult {
  roomId: string;
}

export type FailureFactory = <T>(
  code: ErrorCode,
  message: string,
  path: string[],
) => CommandResult<T>;

export interface RoomServiceDependencies {
  state: GameState;
  costAccounting: CostAccountingService;
  repository: BlueprintRepository;
  createId: (prefix: string) => string;
  roomPurposeSource?: RoomPurposeSource;
  zoneService: Pick<ZoneService, 'cloneZone'>;
  failure: FailureFactory;
}

export interface RoomService {
  createRoom(
    intent: CreateRoomIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateRoomResult>;
  duplicateRoom(
    roomId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateRoomResult>;
  cloneRoom(
    room: RoomState,
    structureId: string,
    context: CommandExecutionContext,
    options?: { forcedName?: string; recordPurchases?: boolean },
  ): { room: RoomState; purchases: DevicePurchaseMap };
}

const mergePurchaseMaps = (target: DevicePurchaseMap, source: DevicePurchaseMap): void => {
  for (const [blueprintId, quantity] of source.entries()) {
    const previous = target.get(blueprintId) ?? 0;
    target.set(blueprintId, previous + quantity);
  }
};

export const createRoomService = (deps: RoomServiceDependencies): RoomService => {
  const createRoom = (
    intent: CreateRoomIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateRoomResult> => {
    const { structureId, room } = intent;
    const lookup = findStructure(deps.state, structureId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.createRoom',
        'structureId',
      ]);
    }

    const structure = lookup.structure;

    if (!deps.roomPurposeSource) {
      return deps.failure('ERR_INVALID_STATE', 'Room purpose registry is not configured.', [
        'world.createRoom',
        'room.purpose',
      ]);
    }

    let purposeId: string;
    try {
      purposeId = resolveRoomPurposeId(deps.roomPurposeSource, room.purpose);
    } catch (error) {
      return deps.failure('ERR_NOT_FOUND', `Unknown room purpose: ${room.purpose}`, [
        'world.createRoom',
        'room.purpose',
      ]);
    }

    const totalExistingArea = structure.rooms.reduce((sum, current) => sum + current.area, 0);
    if (totalExistingArea + room.area > structure.footprint.area) {
      return deps.failure(
        'ERR_CONFLICT',
        'Adding the room would exceed the structure footprint area.',
        ['world.createRoom', 'room.area'],
      );
    }

    const height = room.height ?? 2.5;
    const newRoom: RoomState = {
      id: deps.createId('room'),
      structureId,
      name: room.name.trim(),
      purposeId,
      area: room.area,
      height,
      volume: room.area * height,
      cleanliness: 1,
      maintenanceLevel: 1,
      zones: [],
    } satisfies RoomState;

    structure.rooms.push(newRoom);
    validateStructureGeometry(structure);

    context.events.queue(
      'world.roomCreated',
      { roomId: newRoom.id, structureId, name: newRoom.name },
      context.tick,
      'info',
    );

    return { ok: true, data: { roomId: newRoom.id } } satisfies CommandResult<CreateRoomResult>;
  };

  const cloneRoom = (
    room: RoomState,
    structureId: string,
    context: CommandExecutionContext,
    options?: { forcedName?: string; recordPurchases?: boolean },
  ): { room: RoomState; purchases: DevicePurchaseMap } => {
    const forcedName = options?.forcedName;
    const shouldRecord = options?.recordPurchases ?? false;
    const newRoomId = deps.createId('room');
    const zones: RoomState['zones'] = [];
    const purchases: DevicePurchaseMap = new Map();

    for (const zone of room.zones) {
      const { zone: clonedZone, purchases: zonePurchases } = deps.zoneService.cloneZone(
        zone,
        structureId,
        newRoomId,
        context,
        {
          forcedName: forcedName ? zone.name : undefined,
          recordPurchases: shouldRecord,
        },
      );
      zones.push(clonedZone);
      mergePurchaseMaps(purchases, zonePurchases);
    }

    const clonedRoom: RoomState = {
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

    return { room: clonedRoom, purchases };
  };

  const duplicateRoom = (
    roomId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateRoomResult> => {
    const lookup = findRoom(deps.state, roomId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Room ${roomId} was not found.`, [
        'world.duplicateRoom',
        'roomId',
      ]);
    }

    const { structure, room } = lookup;
    const totalArea = structure.rooms.reduce((sum, current) => sum + current.area, 0);
    if (totalArea + room.area - structure.footprint.area > 1e-6) {
      return deps.failure(
        'ERR_CONFLICT',
        'Duplicating the room would exceed the structure footprint.',
        ['world.duplicateRoom', 'roomId'],
      );
    }

    const forcedName = desiredName?.trim().length ? desiredName.trim() : undefined;
    const { room: newRoom } = cloneRoom(room, structure.id, context, {
      forcedName,
      recordPurchases: true,
    });

    structure.rooms.push(newRoom);
    validateStructureGeometry(structure);

    context.events.queue(
      'world.roomDuplicated',
      { roomId: newRoom.id, sourceRoomId: roomId, structureId: structure.id },
      context.tick,
      'info',
    );

    return { ok: true, data: { roomId: newRoom.id } } satisfies CommandResult<DuplicateRoomResult>;
  };

  return {
    createRoom,
    duplicateRoom,
    cloneRoom,
  };
};
