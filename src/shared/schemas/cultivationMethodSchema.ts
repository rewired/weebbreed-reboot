import type { JSONSchemaType } from 'ajv';
import type { CultivationMethodBlueprint } from '../types/blueprints';

export const cultivationMethodSchema: JSONSchemaType<CultivationMethodBlueprint> = {
  type: 'object',
  additionalProperties: true,
  required: ['id', 'name', 'areaPerPlant'],
  properties: {
    id: { type: 'string' },
    slug: { type: 'string', nullable: true },
    name: { type: 'string' },
    areaPerPlant: { type: 'number' },
    containerSpec: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      properties: {
        volumeL: { type: 'number', nullable: true }
      }
    }
  }
};
