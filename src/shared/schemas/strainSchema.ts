import type { JSONSchemaType } from 'ajv';
import type { StrainBlueprint } from '../types/blueprints';

export const strainSchema: JSONSchemaType<StrainBlueprint> = {
  type: 'object',
  additionalProperties: true,
  required: ['id', 'name', 'generalResilience', 'growthModel', 'environmentalPreferences', 'nutrientDemand', 'morphology'],
  properties: {
    id: { type: 'string' },
    slug: { type: 'string', nullable: true },
    name: { type: 'string' },
    generalResilience: { type: 'number' },
    growthModel: {
      type: 'object',
      additionalProperties: true,
      required: ['maxBiomassDry_g', 'baseLUE_gPerMol', 'phaseCapMultiplier', 'temperature'],
      properties: {
        maxBiomassDry_g: { type: 'number' },
        baseLUE_gPerMol: { type: 'number' },
        phaseCapMultiplier: {
          type: 'object',
          additionalProperties: { type: 'number' }
        },
        temperature: {
          type: 'object',
          additionalProperties: true,
          required: ['Q10', 'T_ref_C'],
          properties: {
            Q10: { type: 'number' },
            T_ref_C: { type: 'number' }
          }
        }
      }
    },
    environmentalPreferences: {
      type: 'object',
      additionalProperties: true,
      required: ['idealTemperature', 'idealHumidity', 'lightIntensity'],
      properties: {
        idealTemperature: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2
          }
        },
        idealHumidity: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2
          }
        },
        lightIntensity: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2
          }
        }
      }
    },
    nutrientDemand: {
      type: 'object',
      additionalProperties: true,
      required: ['dailyNutrientDemand'],
      properties: {
        dailyNutrientDemand: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            required: ['nitrogen', 'phosphorus', 'potassium'],
            properties: {
              nitrogen: { type: 'number' },
              phosphorus: { type: 'number' },
              potassium: { type: 'number' }
            },
            additionalProperties: true
          }
        },
        dailyWaterDemand_L_m2: {
          type: 'object',
          nullable: true,
          additionalProperties: { type: 'number' }
        }
      }
    },
    morphology: {
      type: 'object',
      additionalProperties: true,
      required: ['leafAreaIndex'],
      properties: {
        leafAreaIndex: { type: 'number' }
      }
    },
    phenology: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      properties: {
        stageLengthsDays: {
          type: 'object',
          nullable: true,
          additionalProperties: { type: 'number' }
        }
      }
    }
  }
};
