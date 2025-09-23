import type { GameState, RoomState, StructureState, ZoneState } from '@/state/models.js';

export interface StructureLookupResult {
  structure: StructureState;
  index: number;
}

export interface RoomLookupResult extends StructureLookupResult {
  room: RoomState;
  roomIndex: number;
}

export interface ZoneLookupResult extends RoomLookupResult {
  zone: ZoneState;
  zoneIndex: number;
}

export const findStructure = (
  state: GameState,
  structureId: string,
): StructureLookupResult | undefined => {
  const index = state.structures.findIndex((entry) => entry.id === structureId);
  if (index < 0) {
    return undefined;
  }
  return { structure: state.structures[index]!, index } satisfies StructureLookupResult;
};

export const findRoom = (state: GameState, roomId: string): RoomLookupResult | undefined => {
  for (let structureIndex = 0; structureIndex < state.structures.length; structureIndex += 1) {
    const structure = state.structures[structureIndex]!;
    const roomIndex = structure.rooms.findIndex((candidate) => candidate.id === roomId);
    if (roomIndex >= 0) {
      return {
        structure,
        index: structureIndex,
        room: structure.rooms[roomIndex]!,
        roomIndex,
      } satisfies RoomLookupResult;
    }
  }
  return undefined;
};

export const findZone = (state: GameState, zoneId: string): ZoneLookupResult | undefined => {
  for (let structureIndex = 0; structureIndex < state.structures.length; structureIndex += 1) {
    const structure = state.structures[structureIndex]!;
    for (let roomIndex = 0; roomIndex < structure.rooms.length; roomIndex += 1) {
      const room = structure.rooms[roomIndex]!;
      const zoneIndex = room.zones.findIndex((candidate) => candidate.id === zoneId);
      if (zoneIndex >= 0) {
        return {
          structure,
          index: structureIndex,
          room,
          roomIndex,
          zone: room.zones[zoneIndex]!,
          zoneIndex,
        } satisfies ZoneLookupResult;
      }
    }
  }
  return undefined;
};
