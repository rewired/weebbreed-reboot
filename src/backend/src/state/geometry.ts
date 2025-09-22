import type { RoomState, StructureState, ZoneState } from './models.js';

export interface ZoneGeometry {
  area: number;
  ceilingHeight: number;
  volume: number;
}

const EPSILON = 1e-6;

const sumAreas = <T>(items: readonly T[], selector: (item: T) => number): number => {
  return items.reduce((accumulator, item) => accumulator + selector(item), 0);
};

const assertNonNegative = (value: number, message: string): void => {
  if (value < -EPSILON) {
    throw new Error(message);
  }
};

const assertNotExceeding = (value: number, limit: number, message: string): void => {
  if (value - limit > EPSILON) {
    throw new Error(message);
  }
};

const assertApproximatelyEqual = (value: number, expected: number, message: string): void => {
  if (Math.abs(value - expected) > EPSILON) {
    throw new Error(message);
  }
};

export const validateStructureGeometry = (structure: StructureState): void => {
  const structureArea = Math.max(structure.footprint.area, 0);
  const structureHeight = Math.max(structure.footprint.height, 0);
  const totalRoomArea = sumAreas(structure.rooms, (room) => room.area);

  assertNotExceeding(
    totalRoomArea,
    structureArea,
    `Structure ${structure.id} room area ${totalRoomArea.toFixed(4)} exceeds footprint area ${structureArea.toFixed(4)}`,
  );

  for (const room of structure.rooms) {
    assertNonNegative(room.area, `Room ${room.id} area must be non-negative`);
    assertNonNegative(room.height, `Room ${room.id} height must be non-negative`);
    assertNonNegative(room.volume, `Room ${room.id} volume must be non-negative`);
    assertApproximatelyEqual(
      room.volume,
      room.area * room.height,
      `Room ${room.id} volume must equal area × height`,
    );
    assertNotExceeding(
      room.height,
      structureHeight,
      `Room ${room.id} height ${room.height.toFixed(4)} exceeds structure ceiling ${structureHeight.toFixed(4)}`,
    );

    const totalZoneArea = sumAreas(room.zones, (zone) => zone.area);
    assertNotExceeding(
      totalZoneArea,
      room.area,
      `Zone areas in room ${room.id} total ${totalZoneArea.toFixed(4)} which exceeds room area ${room.area.toFixed(4)}`,
    );

    for (const zone of room.zones) {
      assertNonNegative(zone.area, `Zone ${zone.id} area must be non-negative`);
      assertNonNegative(zone.ceilingHeight, `Zone ${zone.id} ceiling height must be non-negative`);
      assertNonNegative(zone.volume, `Zone ${zone.id} volume must be non-negative`);
      assertNotExceeding(
        zone.ceilingHeight,
        room.height,
        `Zone ${zone.id} ceiling height ${zone.ceilingHeight.toFixed(4)} exceeds room height ${room.height.toFixed(4)}`,
      );
      assertNotExceeding(
        zone.ceilingHeight,
        structureHeight,
        `Zone ${zone.id} ceiling height ${zone.ceilingHeight.toFixed(4)} exceeds structure ceiling ${structureHeight.toFixed(4)}`,
      );
      assertApproximatelyEqual(
        zone.volume,
        zone.area * zone.ceilingHeight,
        `Zone ${zone.id} volume must equal area × ceiling height`,
      );
    }
  }
};

export const getZoneGeometry = (
  structure: StructureState,
  room: RoomState,
  zone: ZoneState,
): ZoneGeometry => {
  const structureArea = Math.max(structure.footprint.area, 0);
  const structureHeight = Math.max(structure.footprint.height, 0);

  const totalRoomArea = sumAreas(structure.rooms, (candidate) => candidate.area);
  assertNotExceeding(
    totalRoomArea,
    structureArea,
    `Structure ${structure.id} room area ${totalRoomArea.toFixed(4)} exceeds footprint area ${structureArea.toFixed(4)}`,
  );

  assertNonNegative(room.area, `Room ${room.id} area must be non-negative`);
  assertNonNegative(room.height, `Room ${room.id} height must be non-negative`);
  assertNotExceeding(
    room.height,
    structureHeight,
    `Room ${room.id} height ${room.height.toFixed(4)} exceeds structure ceiling ${structureHeight.toFixed(4)}`,
  );
  assertApproximatelyEqual(
    room.volume,
    room.area * room.height,
    `Room ${room.id} volume must equal area × height`,
  );

  const totalZoneArea = sumAreas(room.zones, (candidate) => candidate.area);
  assertNotExceeding(
    totalZoneArea,
    room.area,
    `Zone areas in room ${room.id} total ${totalZoneArea.toFixed(4)} which exceeds room area ${room.area.toFixed(4)}`,
  );

  assertNonNegative(zone.area, `Zone ${zone.id} area must be non-negative`);
  assertNonNegative(zone.ceilingHeight, `Zone ${zone.id} ceiling height must be non-negative`);
  assertNonNegative(zone.volume, `Zone ${zone.id} volume must be non-negative`);
  assertNotExceeding(
    zone.ceilingHeight,
    room.height,
    `Zone ${zone.id} ceiling height ${zone.ceilingHeight.toFixed(4)} exceeds room height ${room.height.toFixed(4)}`,
  );
  assertNotExceeding(
    zone.ceilingHeight,
    structureHeight,
    `Zone ${zone.id} ceiling height ${zone.ceilingHeight.toFixed(4)} exceeds structure ceiling ${structureHeight.toFixed(4)}`,
  );
  assertApproximatelyEqual(
    zone.volume,
    zone.area * zone.ceilingHeight,
    `Zone ${zone.id} volume must equal area × ceiling height`,
  );

  return {
    area: zone.area,
    ceilingHeight: zone.ceilingHeight,
    volume: zone.volume,
  };
};
