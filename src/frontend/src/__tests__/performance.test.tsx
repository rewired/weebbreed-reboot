import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore } from '@/store/simulation';
import type {
  SimulationSnapshot,
  SimulationUpdateEntry,
  SimulationTimeStatus,
} from '@/types/simulation';
import { quickstartSnapshot } from '@/data/mockTelemetry';

describe('telemetry history retention', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
  });

  const cloneSnapshot = (tick: number): SimulationSnapshot => {
    const snapshot = structuredClone(quickstartSnapshot) as SimulationSnapshot;
    snapshot.tick = tick;
    snapshot.clock = {
      ...snapshot.clock,
      tick,
      lastUpdatedAt: new Date().toISOString(),
    };
    return snapshot;
  };

  const timeStatusForTick = (tick: number): SimulationTimeStatus => ({
    running: false,
    paused: true,
    speed: 1,
    tick,
    targetTickRate: quickstartSnapshot.clock.targetTickRate,
  });

  it('caps zone history to 5k points', () => {
    const store = useSimulationStore.getState();
    store.hydrate({ snapshot: quickstartSnapshot });
    const zoneId = quickstartSnapshot.zones[0]!.id;

    for (let index = 0; index < 6000; index += 1) {
      const tick = quickstartSnapshot.clock.tick + index + 1;
      const update: SimulationUpdateEntry = {
        tick,
        ts: Date.now(),
        events: [],
        snapshot: cloneSnapshot(tick),
        time: timeStatusForTick(tick),
      };
      store.applyUpdate(update);
    }

    const history = useSimulationStore.getState().zoneHistory[zoneId];
    expect(history).toBeDefined();
    expect(history!.length).toBeLessThanOrEqual(5000);
  });
});
