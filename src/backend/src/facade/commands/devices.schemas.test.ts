import { describe, expect, it } from 'vitest';
import { schemas } from './devices.js';
import { deviceSettingsSchema } from './commonSchemas.js';

const SAMPLE_UUID = '11111111-1111-4111-8111-111111111111';

describe('device command schemas', () => {
  it('accepts recognized device settings during install', () => {
    const result = schemas.installDeviceSchema.parse({
      targetId: SAMPLE_UUID,
      deviceId: '22222222-2222-4222-8222-222222222222',
      settings: {
        power: 0.8,
        targetTemperatureRange: [21, 26],
      },
    });

    expect(result.settings).toEqual({ power: 0.8, targetTemperatureRange: [21, 26] });
  });

  it('allows partial patches that define at least one setting', () => {
    const result = schemas.updateDeviceSchema.parse({
      instanceId: SAMPLE_UUID,
      settings: {
        targetHumidity: 0.62,
      },
    });

    expect(result.settings).toEqual({ targetHumidity: 0.62 });
  });

  it('rejects unknown device setting keys', () => {
    const result = deviceSettingsSchema.safeParse({
      targetTemperature: 24,
      TargetHumidity: 0.61,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'custom',
        path: ['TargetHumidity'],
        message: 'Unrecognized setting "TargetHumidity". Did you mean "targetHumidity"?',
      }),
    ]);
  });

  it('rejects non-numeric device settings', () => {
    const result = deviceSettingsSchema.safeParse({
      power: 'high' as unknown as number,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'invalid_type',
        message: 'Value must be a number.',
        path: ['power'],
      }),
    ]);
  });

  it('rejects patches without defined values', () => {
    const emptyResult = schemas.updateDeviceSchema.safeParse({
      instanceId: SAMPLE_UUID,
      settings: {},
    });

    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error?.issues).toEqual([
      expect.objectContaining({
        message: 'Settings patch must include at least one property.',
        path: ['settings'],
      }),
    ]);

    const undefinedResult = schemas.updateDeviceSchema.safeParse({
      instanceId: SAMPLE_UUID,
      settings: {
        power: undefined,
      },
    });

    expect(undefinedResult.success).toBe(false);
    expect(undefinedResult.error?.issues).toEqual([
      expect.objectContaining({
        message: 'Settings patch must include at least one property.',
        path: ['settings'],
      }),
    ]);
  });
});
