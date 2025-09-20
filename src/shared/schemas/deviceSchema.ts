import type { JSONSchemaType } from 'ajv';
import type { DeviceBlueprint } from '../types/blueprints';

export const deviceSchema: JSONSchemaType<DeviceBlueprint> = {
  type: 'object',
  additionalProperties: true,
  required: ['id', 'name', 'kind'],
  properties: {
    id: { type: 'string' },
    slug: { type: 'string', nullable: true },
    name: { type: 'string' },
    kind: { type: 'string' },
    settings: {
      type: 'object',
      nullable: true,
      additionalProperties: true
    },
    coverageArea_m2: { type: 'number', nullable: true },
    airflow_m3_h: { type: 'number', nullable: true },
    coolingCapacity_kW: { type: 'number', nullable: true },
    power_kW: { type: 'number', nullable: true },
    ppfd_umol_m2_s: { type: 'number', nullable: true }
  }
};
