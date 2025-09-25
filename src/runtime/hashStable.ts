const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

type Primitive = string | number | boolean | null;

type Jsonish = Primitive | Jsonish[] | { [key: string]: Jsonish };

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const normaliseValue = (value: unknown): Jsonish => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return value > 0 ? 'Infinity' : value < 0 ? '-Infinity' : 'NaN';
    }
    return Number.isInteger(value) ? value : Number(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normaliseValue(item));
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, normaliseValue(nested)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result: Record<string, Jsonish> = {};
    for (const [key, nested] of entries) {
      result[key] = nested;
    }
    return result;
  }
  return String(value);
};

const stableStringify = (value: Jsonish): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value)
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(',');
  return `{${entries}}`;
};

export const hashStable = (input: unknown): string => {
  const serialised = stableStringify(normaliseValue(input));
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < serialised.length; index += 1) {
    hash ^= serialised.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash.toString(36);
};

export const stableCanonicalString = (input: unknown): string =>
  stableStringify(normaliseValue(input));
