import type { CommandExecutionContext, CommandResult, ErrorCode } from '@/facade/index.js';
import { findZone } from '@/engine/world/stateSelectors.js';
import type { GameState, ZoneLightingState } from '@/state/types.js';

export interface AdjustLightingCycleResult {
  photoperiodHours: { on: number; off: number };
}

export interface LightingCycleServiceOptions {
  state: GameState;
}

const DEFAULT_LIGHT_HOURS = 18;
const MIN_LIGHT_HOURS = 1;
const MAX_LIGHT_HOURS = 23;
const MIN_DARK_HOURS = 1;
const LIGHT_DEVICE_KINDS = new Set(['Lamp']);

const ensureZoneLighting = (zone: { lighting?: ZoneLightingState }): ZoneLightingState => {
  if (!zone.lighting) {
    zone.lighting = {};
  }
  return zone.lighting;
};

const sanitizeLightHours = (value: unknown, warnings: string[]): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    warnings.push('Light period must be a finite number. Defaulting to 18 hours.');
    return DEFAULT_LIGHT_HOURS;
  }
  const rounded = Math.round(value);
  const clamped = Math.min(Math.max(rounded, MIN_LIGHT_HOURS), MAX_LIGHT_HOURS);
  if (clamped !== rounded) {
    warnings.push('Light period was clamped to the supported 1–23 hour range.');
  }
  return clamped;
};

const sanitizeDarkHours = (value: unknown, expected: number, warnings: string[]): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    warnings.push('Dark period was inferred from the light period to preserve a 24h cycle.');
    return expected;
  }
  const rounded = Math.round(value);
  const clamped = Math.min(Math.max(rounded, MIN_DARK_HOURS), MAX_LIGHT_HOURS);
  if (clamped !== rounded) {
    warnings.push('Dark period was clamped to the supported 1–23 hour range.');
  }
  if (Math.abs(clamped - expected) > 1e-3) {
    warnings.push('Dark period adjusted to maintain a 24-hour day length.');
    return expected;
  }
  return clamped;
};

export class LightingCycleService {
  private readonly state: GameState;

  constructor(options: LightingCycleServiceOptions) {
    this.state = options.state;
  }

  adjustLightingCycle(
    zoneId: string,
    photoperiodHours: { on: number; off: number },
    context: CommandExecutionContext,
  ): CommandResult<AdjustLightingCycleResult> {
    const lookup = findZone(this.state, zoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'devices.adjustLightingCycle',
        'zoneId',
      ]);
    }

    const { zone } = lookup;
    const hasLighting = zone.devices.some((device) => LIGHT_DEVICE_KINDS.has(device.kind));
    if (!hasLighting) {
      return this.failure(
        'ERR_INVALID_STATE',
        `Zone ${zoneId} does not have controllable lighting.`,
        ['devices.adjustLightingCycle', 'zoneId'],
      );
    }

    const warnings: string[] = [];
    const lightHours = sanitizeLightHours(photoperiodHours.on, warnings);
    const inferredDark = Math.max(24 - lightHours, MIN_DARK_HOURS);
    const darkHours = sanitizeDarkHours(photoperiodHours.off, inferredDark, warnings);

    const lighting = ensureZoneLighting(zone);
    lighting.photoperiodHours = { on: lightHours, off: darkHours };

    context.events.queue(
      'device.lightingCycleAdjusted',
      {
        zoneId,
        photoperiodHours: { on: lightHours, off: darkHours },
      },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: { photoperiodHours: { on: lightHours, off: darkHours } },
      warnings: warnings.length ? warnings : undefined,
    } satisfies CommandResult<AdjustLightingCycleResult>;
  }

  private failure<T = never>(code: ErrorCode, message: string, path: string[]): CommandResult<T> {
    return {
      ok: false,
      errors: [
        {
          code,
          message,
          path,
        },
      ],
    } satisfies CommandResult<T>;
  }
}

export default LightingCycleService;
