import { describe, expect, it } from 'vitest';
import { runTick } from '../sim/tickStateMachine.js';
import type { TickContext } from '../sim/types.js';
import type { PhaseHandlers } from '../sim/tickStateMachine.js';

const phases = [
  'applyDevices',
  'deriveEnvironment',
  'irrigationAndNutrients',
  'updatePlants',
  'harvestAndInventory',
  'accounting',
  'commit'
] as const;

describe('tick state machine', () => {
  it('runs phases in the expected order', async () => {
    const order: string[] = [];
    const handlers = phases.reduce((acc, phase) => {
      acc[phase] = () => {
        order.push(phase);
      };
      return acc;
    }, {} as unknown as PhaseHandlers);

    const context: TickContext = {
      state: {
        tick: 0,
        tickLengthMinutes: 5,
        rngSeed: 'seed',
        zones: [],
        isPaused: false,
        accumulatedTimeMs: 0
      },
      tickHours: 0.0833,
      events: []
    };

    await runTick(handlers, context);
    expect(order).toEqual(phases);
  });
});
