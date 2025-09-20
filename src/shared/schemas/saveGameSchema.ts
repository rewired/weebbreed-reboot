import type { JSONSchemaType } from 'ajv';
import type { SaveGame } from '../types/saveGame';

export const saveGameSchema: JSONSchemaType<SaveGame> = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'version', 'createdAt', 'tickLengthMinutes', 'rngSeed', 'state'],
  properties: {
    kind: { type: 'string', const: 'WeedBreedSave' },
    version: { type: 'string' },
    createdAt: { type: 'string' },
    tickLengthMinutes: { type: 'number' },
    rngSeed: { type: 'string' },
    state: {
      type: 'object',
      additionalProperties: true
    }
  }
};
