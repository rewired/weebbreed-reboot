export type RoomPurposeSlug = string;

export interface RoomPurposeEconomy {
  areaCost?: number;
  baseRentPerTick?: number;
  [key: string]: unknown;
}

export interface RoomPurpose {
  id: string;
  kind: RoomPurposeSlug;
  name: string;
  description?: string;
  flags?: Record<string, boolean>;
  economy?: RoomPurposeEconomy;
  [key: string]: unknown;
}

export interface RoomPurposeSource {
  listRoomPurposes(): RoomPurpose[];
  getRoomPurpose?(id: string): RoomPurpose | undefined;
}

export type RoomPurposeLookupMode = 'id' | 'name' | 'kind';

export interface RoomPurposeLookupOptions {
  by?: RoomPurposeLookupMode;
}

const normalizeId = (value: string): string => value.trim().toLowerCase();
const normalizeName = (value: string): string => value.trim().toLowerCase();
const normalizeKind = (value: string): string => value.trim().toLowerCase();

const getRoomPurposes = (source: RoomPurposeSource): RoomPurpose[] => {
  const purposes = source.listRoomPurposes();
  return Array.isArray(purposes) ? purposes : [];
};

export const listRoomPurposes = (source: RoomPurposeSource): RoomPurpose[] => {
  return getRoomPurposes(source);
};

export const getRoomPurpose = (
  source: RoomPurposeSource,
  value: string,
  options: RoomPurposeLookupOptions = {},
): RoomPurpose | undefined => {
  const mode: RoomPurposeLookupMode = options.by ?? 'id';
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (mode === 'id' && source.getRoomPurpose) {
    const direct = source.getRoomPurpose(trimmed);
    if (direct) {
      return direct;
    }
    const normalizedId = normalizeId(trimmed);
    if (normalizedId !== trimmed) {
      const normalizedDirect = source.getRoomPurpose(normalizedId);
      if (normalizedDirect) {
        return normalizedDirect;
      }
    }
  }

  const purposes = getRoomPurposes(source);
  const matcher = mode === 'id' ? normalizeId : mode === 'name' ? normalizeName : normalizeKind;
  const target = matcher(trimmed);

  for (const purpose of purposes) {
    const candidate =
      mode === 'id'
        ? matcher(purpose.id)
        : mode === 'name'
          ? matcher(purpose.name)
          : matcher(purpose.kind);
    if (candidate === target) {
      return purpose;
    }
  }

  return undefined;
};

export const requireRoomPurpose = (
  source: RoomPurposeSource,
  value: string,
  options: RoomPurposeLookupOptions = {},
): RoomPurpose => {
  const mode: RoomPurposeLookupMode = options.by ?? 'id';
  const purpose = getRoomPurpose(source, value, options);
  if (!purpose) {
    const descriptor = mode === 'name' ? 'name' : mode === 'kind' ? 'slug' : 'id';
    throw new Error(`Unknown room purpose ${descriptor} "${value}".`);
  }
  return purpose;
};

export const resolveRoomPurposeId = (source: RoomPurposeSource, name: string): string => {
  return requireRoomPurpose(source, name, { by: 'name' }).id;
};

export const getRoomPurposeById = (
  source: RoomPurposeSource,
  id: string,
): RoomPurpose | undefined => getRoomPurpose(source, id, { by: 'id' });

export const getRoomPurposeByName = (
  source: RoomPurposeSource,
  name: string,
): RoomPurpose | undefined => getRoomPurpose(source, name, { by: 'name' });

export const requireRoomPurposeById = (source: RoomPurposeSource, id: string): RoomPurpose =>
  requireRoomPurpose(source, id, { by: 'id' });

export const requireRoomPurposeByName = (source: RoomPurposeSource, name: string): RoomPurpose =>
  requireRoomPurpose(source, name, { by: 'name' });

export const getRoomPurposeByKind = (
  source: RoomPurposeSource,
  kind: RoomPurposeSlug,
): RoomPurpose | undefined => getRoomPurpose(source, kind, { by: 'kind' });

export const requireRoomPurposeByKind = (
  source: RoomPurposeSource,
  kind: RoomPurposeSlug,
): RoomPurpose => requireRoomPurpose(source, kind, { by: 'kind' });
