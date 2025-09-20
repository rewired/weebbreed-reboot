import { createActor, setup } from 'xstate';
import { applyDevicesPhase } from './phases/applyDevices';
import { deriveEnvironmentPhase } from './phases/deriveEnvironment';
import { irrigationAndNutrientsPhase } from './phases/irrigationAndNutrients';
import { updatePlantsPhase } from './phases/updatePlants';
import { harvestAndInventoryPhase } from './phases/harvestAndInventory';
import { accountingPhase } from './phases/accounting';
import { commitPhase } from './phases/commit';
import type { TickContext } from './types';

const tickMachine = setup({
  types: {
    context: {} as TickContext,
    events: {} as { type: 'START' }
  },
  actions: {
    applyDevices: ({ context }) => {
      applyDevicesPhase(context);
    },
    deriveEnvironment: ({ context }) => {
      deriveEnvironmentPhase(context);
    },
    irrigationAndNutrients: ({ context }) => {
      irrigationAndNutrientsPhase(context);
    },
    updatePlants: ({ context }) => {
      updatePlantsPhase(context);
    },
    harvestAndInventory: ({ context }) => {
      harvestAndInventoryPhase(context);
    },
    accounting: ({ context }) => {
      accountingPhase(context);
    },
    commit: ({ context }) => {
      context.commitResult = commitPhase(context);
    }
  }
}).createMachine({
  id: 'tick',
  initial: 'applyDevices',
  context: ({ input }) => input,
  states: {
    applyDevices: {
      entry: 'applyDevices',
      always: 'deriveEnvironment'
    },
    deriveEnvironment: {
      entry: 'deriveEnvironment',
      always: 'irrigationAndNutrients'
    },
    irrigationAndNutrients: {
      entry: 'irrigationAndNutrients',
      always: 'updatePlants'
    },
    updatePlants: {
      entry: 'updatePlants',
      always: 'harvestAndInventory'
    },
    harvestAndInventory: {
      entry: 'harvestAndInventory',
      always: 'accounting'
    },
    accounting: {
      entry: 'accounting',
      always: 'commit'
    },
    commit: {
      entry: 'commit',
      type: 'final'
    }
  }
});

export const runTick = (context: TickContext) => {
  const actor = createActor(tickMachine, { input: context });
  actor.start();
  return actor.getSnapshot().context.commitResult;
};
