import type { SimulationPhaseContext } from './loop.js';

export type CommitPhaseHandler = (
  context: SimulationPhaseContext,
  tick: number,
) => Promise<number> | number;

export const defaultCommitPhase: CommitPhaseHandler = async (context, tick) => {
  const commitTimestamp = Date.now();
  context.state.clock.tick = tick;
  context.state.clock.lastUpdatedAt = new Date(commitTimestamp).toISOString();
  return commitTimestamp;
};
