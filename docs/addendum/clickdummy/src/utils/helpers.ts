/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Structure, GameData, Zone } from '../types/domain';

export const getStructureYield = (structure?: Structure): number => {
  if (!structure) return 0;
  return structure.rooms.reduce((roomSum, room) => {
    return roomSum + room.zones.reduce((zoneSum, zone) => zoneSum + (zone.estYield || 0), 0);
  }, 0);
};

export const getZoneAvgProgress = (zone: Zone): number => {
  if (!zone.plants || zone.plants.length === 0) return 0;
  const activePhases = ['flowering', 'vegetative'];
  const isInActivePhase = activePhases.some((p) => zone.phase.toLowerCase().includes(p));
  if (!isInActivePhase) return 0;

  const totalProgress = zone.plants.reduce((sum, p) => sum + (p.progress || 0), 0);
  return totalProgress / zone.plants.length;
};

// --- STATE FINDERS ---
export const findStructureForRoom = (roomId: string, data: GameData): Structure | undefined =>
  data.structures.find((s) => s.rooms.some((r) => r.id === roomId));

export const findRoomById = (roomId: string, data: GameData) => {
  for (const structure of data.structures) {
    const room = structure.rooms.find((r) => r.id === roomId);
    if (room) return room;
  }
  return null;
};

export const findZoneById = (zoneId: string, data: GameData) => {
  for (const structure of data.structures) {
    for (const room of structure.rooms) {
      const zone = room.zones.find((z) => z.id === zoneId);
      if (zone) return zone;
    }
  }
  return null;
};

export const findParentRoomForZone = (zoneId: string, data: GameData) => {
  for (const structure of data.structures) {
    for (const room of structure.rooms) {
      if (room.zones.some((z) => z.id === zoneId)) return room;
    }
  }
  return null;
};
