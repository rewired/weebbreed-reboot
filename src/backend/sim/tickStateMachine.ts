import { createMachine, createActor } from 'xstate';
import type { TickContext, PhaseHandler } from './types.js';

export type TickPhaseName =
  | 'applyDevices'
  | 'deriveEnvironment'
  | 'irrigationAndNutrients'
  | 'updatePlants'
  | 'harvestAndInventory'
  | 'accounting'
  | 'commit';

export type PhaseHandlers = Record<TickPhaseName, PhaseHandler>;

const machine = createMachine({
  id: 'tick-machine',
  initial: 'applyDevices',
  events: [{ type: 'NEXT' }, { type: 'ERROR' }],
  states: {
    applyDevices: {
      on: {
        NEXT: 'deriveEnvironment',
        ERROR: 'error'
      }
    },
    deriveEnvironment: {
      on: {
        NEXT: 'irrigationAndNutrients',
        ERROR: 'error'
      }
    },
    irrigationAndNutrients: {
      on: {
        NEXT: 'updatePlants',
        ERROR: 'error'
      }
    },
    updatePlants: {
      on: {
        NEXT: 'harvestAndInventory',
        ERROR: 'error'
      }
    },
    harvestAndInventory: {
      on: {
        NEXT: 'accounting',
        ERROR: 'error'
      }
    },
    accounting: {
      on: {
        NEXT: 'commit',
        ERROR: 'error'
      }
    },
    commit: {
      type: 'final'
    },
    error: {
      type: 'final'
    }
  }
});

const phaseSequence: TickPhaseName[] = [
  'applyDevices',
  'deriveEnvironment',
  'irrigationAndNutrients',
  'updatePlants',
  'harvestAndInventory',
  'accounting',
  'commit'
];

export async function runTick(handlers: PhaseHandlers, tickContext: TickContext): Promise<void> {
  const actor = createActor(machine).start();
  let error: unknown;

  try {
    for (const phase of phaseSequence) {
      const snapshot = actor.getSnapshot();
      if (snapshot.value !== phase) {
        throw new Error(`Unexpected phase order: expected ${phase}, got ${String(snapshot.value)}`);
      }
      await Promise.resolve(handlers[phase](tickContext));
      if (phase !== 'commit') {
        actor.send({ type: 'NEXT' });
      }
    }
  } catch (err) {
    error = err;
  }

  const finalState = actor.getSnapshot();
  actor.stop();

  if (error) {
    throw error;
  }

  if (finalState.status !== 'done') {
    throw new Error('Tick did not reach final state');
  }
}
