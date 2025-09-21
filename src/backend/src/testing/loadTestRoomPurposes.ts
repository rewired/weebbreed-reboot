import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRoomPurposes } from '../engine/roomPurposeRegistry.js';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const shippedDataDirectory = path.join(repoRoot, 'data');

let loadPromise: Promise<void> | null = null;

export const loadTestRoomPurposes = async (): Promise<void> => {
  if (!loadPromise) {
    loadPromise = loadRoomPurposes({ dataDirectory: shippedDataDirectory });
  }

  await loadPromise;
};

export const getShippedRoomPurposeDirectory = (): string => shippedDataDirectory;
