import type { GameState, RoomState, StructureState, ZoneState } from './types.js';

const structuredCloneImpl = (
  globalThis as typeof globalThis & {
    structuredClone?: <T>(value: T) => T;
  }
).structuredClone;

export const cloneStateValue = <T>(value: T): T => {
  if (typeof structuredCloneImpl === 'function') {
    return structuredCloneImpl(value);
  }
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

export const cloneZoneState = (zone: ZoneState): ZoneState => cloneStateValue(zone);

export const cloneRoomState = (room: RoomState): RoomState => cloneStateValue(room);

export const cloneStructureState = (structure: StructureState): StructureState =>
  cloneStateValue(structure);

export const cloneStructureTree = (structures: readonly StructureState[]): StructureState[] =>
  cloneStateValue(structures);

export interface MutableStateSnapshot {
  structures: StructureState[];
}

export const captureMutableStateSnapshot = (state: GameState): MutableStateSnapshot => ({
  structures: cloneStructureTree(state.structures),
});

const copyNumberRecord = <T extends Record<string, number>>(target: T, source: T): void => {
  for (const key of Object.keys(target) as (keyof T)[]) {
    if (!(key in source)) {
      delete target[key];
    }
  }
  for (const [key, value] of Object.entries(source) as [keyof T, number][]) {
    target[key] = value;
  }
};

const copyOptionalNumberRecord = <T extends Record<string, number | undefined>>(
  target: T,
  source: T,
): void => {
  for (const key of Object.keys(target) as (keyof T)[]) {
    if (!(key in source)) {
      delete target[key];
    }
  }
  for (const [key, value] of Object.entries(source) as [keyof T, number | undefined][]) {
    if (value === undefined) {
      delete target[key];
    } else {
      target[key] = value;
    }
  }
};

const replaceArray = <T>(target: T[], source: readonly T[]): void => {
  const next = cloneStateValue(source);
  target.splice(0, target.length, ...next);
};

const applyZoneHealth = (target: ZoneState['health'], source: ZoneState['health']): void => {
  target.reentryRestrictedUntilTick = source.reentryRestrictedUntilTick;
  target.preHarvestRestrictedUntilTick = source.preHarvestRestrictedUntilTick;
  target.plantHealth = cloneStateValue(source.plantHealth);
  replaceArray(target.pendingTreatments, source.pendingTreatments);
  replaceArray(target.appliedTreatments, source.appliedTreatments);
};

const applyZoneControl = (target: ZoneState['control'], source: ZoneState['control']): void => {
  copyOptionalNumberRecord(target.setpoints, source.setpoints);
};

const applyZoneLighting = (
  target: ZoneState,
  sourceLighting: ZoneState['lighting'] | undefined,
): void => {
  if (sourceLighting === undefined) {
    delete target.lighting;
    return;
  }
  if (!target.lighting) {
    target.lighting = cloneStateValue(sourceLighting);
    return;
  }
  const targetLighting = target.lighting;
  for (const key of Object.keys(targetLighting) as (keyof ZoneState['lighting'])[]) {
    if (!(key in sourceLighting)) {
      delete targetLighting[key];
    }
  }
  for (const [key, value] of Object.entries(sourceLighting) as [
    keyof ZoneState['lighting'],
    number | { on: number; off: number },
  ][]) {
    targetLighting[key] = cloneStateValue(value);
  }
};

const applyZoneState = (target: ZoneState, source: ZoneState): void => {
  const {
    environment,
    resources,
    metrics,
    control,
    lighting,
    health,
    plants,
    devices,
    activeTaskIds,
    plantingPlan,
    cultivation,
    ...rest
  } = source;

  Object.assign(target, rest);

  copyNumberRecord(target.environment, environment);
  copyNumberRecord(target.resources, resources);
  copyNumberRecord(target.metrics, metrics);
  applyZoneControl(target.control, control);
  applyZoneLighting(target, lighting);
  applyZoneHealth(target.health, health);
  replaceArray(target.plants, plants);
  replaceArray(target.devices, devices);
  replaceArray(target.activeTaskIds, activeTaskIds);
  target.plantingPlan = cloneStateValue(plantingPlan ?? null) ?? null;
  target.cultivation = cloneStateValue(cultivation);
};

const applyZones = (targetZones: ZoneState[], sourceZones: readonly ZoneState[]): void => {
  const existing = new Map(targetZones.map((zone) => [zone.id, zone]));
  const ordered: ZoneState[] = [];
  for (const zone of sourceZones) {
    const current = existing.get(zone.id);
    if (current) {
      applyZoneState(current, zone);
      ordered.push(current);
      existing.delete(zone.id);
    } else {
      ordered.push(cloneZoneState(zone));
    }
  }
  targetZones.splice(0, targetZones.length, ...ordered);
};

const applyRoomState = (target: RoomState, source: RoomState): void => {
  const { zones, ...rest } = source;
  Object.assign(target, rest);
  applyZones(target.zones, zones);
};

const applyRooms = (targetRooms: RoomState[], sourceRooms: readonly RoomState[]): void => {
  const existing = new Map(targetRooms.map((room) => [room.id, room]));
  const ordered: RoomState[] = [];
  for (const room of sourceRooms) {
    const current = existing.get(room.id);
    if (current) {
      applyRoomState(current, room);
      ordered.push(current);
      existing.delete(room.id);
    } else {
      ordered.push(cloneRoomState(room));
    }
  }
  targetRooms.splice(0, targetRooms.length, ...ordered);
};

const applyStructureState = (target: StructureState, source: StructureState): void => {
  const { rooms, ...rest } = source;
  Object.assign(target, rest);
  applyRooms(target.rooms, rooms);
};

const applyStructureTree = (state: GameState, structures: readonly StructureState[]): void => {
  const existing = new Map(state.structures.map((structure) => [structure.id, structure]));
  const ordered: StructureState[] = [];
  for (const structure of structures) {
    const current = existing.get(structure.id);
    if (current) {
      applyStructureState(current, structure);
      ordered.push(current);
      existing.delete(structure.id);
    } else {
      ordered.push(cloneStructureState(structure));
    }
  }
  state.structures.splice(0, state.structures.length, ...ordered);
};

export const restoreMutableStateSnapshot = (
  state: GameState,
  snapshot: MutableStateSnapshot,
): void => {
  applyStructureTree(state, snapshot.structures);
};

export interface MutableStateView {
  draft: GameState;
  snapshot: MutableStateSnapshot;
  commit(): void;
}

export const createMutableStateView = (state: GameState): MutableStateView => {
  const snapshot = captureMutableStateSnapshot(state);
  const draftStructures = cloneStructureTree(state.structures);
  const draft: GameState = {
    ...state,
    structures: draftStructures,
  };

  return {
    draft,
    snapshot,
    commit: () => {
      applyStructureTree(state, draftStructures);
    },
  } satisfies MutableStateView;
};
