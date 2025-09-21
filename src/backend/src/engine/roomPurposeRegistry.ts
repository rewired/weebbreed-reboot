import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import AjvConstructor, { type DefinedError, type JSONSchemaType } from 'ajv';

export interface RoomPurposeEconomy {
  areaCost?: number;
  baseRentPerTick?: number;
  [key: string]: unknown;
}

export interface RoomPurpose {
  id: string;
  kind: 'RoomPurpose';
  name: string;
  flags?: Record<string, boolean>;
  economy?: RoomPurposeEconomy;
  [key: string]: unknown;
}

export interface LoadRoomPurposesOptions {
  dataDirectory?: string;
}

const roomPurposeSchema: JSONSchemaType<RoomPurpose> = {
  type: 'object',
  required: ['id', 'kind', 'name'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    kind: { type: 'string', const: 'RoomPurpose' },
    name: { type: 'string', minLength: 1 },
    flags: {
      type: 'object',
      required: [],
      properties: {},
      additionalProperties: { type: 'boolean' },
    },
    economy: {
      type: 'object',
      required: [],
      properties: {
        areaCost: { type: 'number', minimum: 0 },
        baseRentPerTick: { type: 'number', minimum: 0 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: true,
};

const ajv = new AjvConstructor({ allErrors: true, strict: false });
ajv.addFormat('uuid', true);
const validateRoomPurpose = ajv.compile(roomPurposeSchema);

const roomPurposesById = new Map<string, RoomPurpose>();
const roomPurposesByName = new Map<string, RoomPurpose>();

const normalise = (value: string): string => value.trim().toLowerCase();
const normaliseId = (value: string): string => value.toLowerCase();

const formatErrors = (errors: DefinedError[] | null | undefined): string => {
  if (!errors || errors.length === 0) {
    return 'Unknown validation error';
  }
  return errors
    .map((error) => {
      const pathDescription = error.instancePath ? error.instancePath : '(root)';
      return `${pathDescription} ${error.message ?? ''}`.trim();
    })
    .join('; ');
};

const buildPattern = (dataDirectory: string): string =>
  path.join(dataDirectory, 'blueprints', 'roomPurposes', '*.json');

export const loadRoomPurposes = async (
  options: LoadRoomPurposesOptions = {},
): Promise<RoomPurpose[]> => {
  const dataDirectory = options.dataDirectory ?? path.resolve(process.cwd(), '..', '..', 'data');
  const pattern = buildPattern(dataDirectory);
  const files = await glob(pattern, { absolute: true });
  files.sort();

  const nextById = new Map<string, RoomPurpose>();
  const nextByName = new Map<string, RoomPurpose>();
  const idSources = new Map<string, string>();
  const nameSources = new Map<string, string>();

  for (const filePath of files) {
    let raw: unknown;
    try {
      const contents = await readFile(filePath, 'utf8');
      raw = JSON.parse(contents);
    } catch (error) {
      const cause = error as Error;
      throw new Error(`Failed to read room purpose blueprint at ${filePath}: ${cause.message}`);
    }

    if (!validateRoomPurpose(raw)) {
      throw new Error(
        `Invalid room purpose blueprint at ${filePath}: ${formatErrors(
          validateRoomPurpose.errors as DefinedError[] | null | undefined,
        )}`,
      );
    }

    const blueprint = raw as RoomPurpose;
    const idKey = normaliseId(blueprint.id);
    const existingIdSource = idSources.get(idKey);
    if (existingIdSource) {
      throw new Error(
        `Duplicate room purpose id "${blueprint.id}" in ${filePath} (already defined in ${existingIdSource}).`,
      );
    }

    const nameKey = normalise(blueprint.name);
    const existingNameSource = nameSources.get(nameKey);
    if (existingNameSource) {
      throw new Error(
        `Duplicate room purpose name "${blueprint.name}" in ${filePath} (already defined in ${existingNameSource}).`,
      );
    }

    nextById.set(idKey, blueprint);
    idSources.set(idKey, filePath);
    nextByName.set(nameKey, blueprint);
    nameSources.set(nameKey, filePath);
  }

  roomPurposesById.clear();
  roomPurposesByName.clear();
  for (const [id, blueprint] of nextById) {
    roomPurposesById.set(id, blueprint);
  }
  for (const [name, blueprint] of nextByName) {
    roomPurposesByName.set(name, blueprint);
  }

  return [...nextById.values()];
};

export const getPurposeById = (id: string): RoomPurpose | undefined => {
  return roomPurposesById.get(normaliseId(id));
};

export const getPurposeByName = (name: string): RoomPurpose | undefined => {
  return roomPurposesByName.get(normalise(name));
};
