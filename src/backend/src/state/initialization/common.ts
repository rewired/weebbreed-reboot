import { promises as fs } from 'fs';
import type { RngStream } from '../../lib/rng.js';

export const generateId = (stream: RngStream, prefix: string, length = 10): string =>
  `${prefix}_${stream.nextString(length)}`;

export const readJsonFile = async <T>(filePath: string): Promise<T | undefined> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause.code === 'ENOENT') {
      return undefined;
    }
    throw new Error(`Failed to read JSON file at ${filePath}: ${cause.message}`);
  }
};
