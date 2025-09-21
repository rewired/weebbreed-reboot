import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BlueprintRepository } from '../../data/blueprintRepository.js';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const shippedDataDirectory = path.join(repoRoot, 'data');

let loadPromise: Promise<BlueprintRepository> | null = null;

export const loadTestRoomPurposes = async (): Promise<BlueprintRepository> => {
  if (!loadPromise) {
    loadPromise = BlueprintRepository.loadFrom(shippedDataDirectory);
  }

  return loadPromise;
};

export const getShippedRoomPurposeDirectory = (): string => shippedDataDirectory;
