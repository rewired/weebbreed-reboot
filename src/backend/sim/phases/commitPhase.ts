import type { TickContext } from '../types.js';
import { createSimulationSnapshot } from '../../lib/serialization.js';

export function commitPhase(context: TickContext): void {
  const { state, events } = context;
  const ts = Date.now();
  const snapshot = createSimulationSnapshot(state, { tick: state.tick + 1, ts });
  events.push({ type: 'sim.tickCompleted', payload: snapshot, tick: snapshot.tick, ts: snapshot.ts });
  state.tick = snapshot.tick;
}
