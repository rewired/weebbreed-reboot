import type { SimulationEvent, SimulationUpdateEntry } from '@/types/simulation';
import type { FinanceTickEntry } from '@/store/types';
import { CLICKDUMMY_SAMPLE } from './sampleClickDummyData';
import { translateClickDummyGameData } from './translator';

const OFFLINE_TICK_LENGTH_MINUTES = 60;
const OFFLINE_START_DATE = '2025-01-01T00:00:00.000Z';

const { snapshot, financeHistory } = translateClickDummyGameData(CLICKDUMMY_SAMPLE, {
  tickLengthMinutes: OFFLINE_TICK_LENGTH_MINUTES,
  startDate: OFFLINE_START_DATE,
  isPaused: true,
  targetTickRate: 1,
});

const resolveTimestamp = (isoString: string): number => {
  const parsed = Date.parse(isoString);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const eventTimestamp = resolveTimestamp(snapshot.clock.lastUpdatedAt);

const createOfflineEvents = (): SimulationEvent[] => {
  const events: SimulationEvent[] = [
    {
      type: 'sim.offlineFixtureLoaded',
      level: 'info',
      message: 'Loaded offline clickdummy fixture for preview.',
      tick: snapshot.tick,
      ts: eventTimestamp,
    },
  ];

  const primaryZone = snapshot.zones[0];
  if (primaryZone) {
    events.push({
      type: 'zone.thresholdCrossed',
      level: 'warning',
      message: 'Zone VPD exceeds configured target.',
      zoneId: primaryZone.id,
      tick: snapshot.tick,
      ts: eventTimestamp,
      payload: {
        metric: 'vpd',
        value: primaryZone.environment.vpd,
        target: 1.1,
      },
    });
  }

  return events;
};

const offlineUpdate: SimulationUpdateEntry = {
  tick: snapshot.tick,
  ts: eventTimestamp,
  events: createOfflineEvents(),
  snapshot,
  time: {
    running: !snapshot.clock.isPaused,
    paused: snapshot.clock.isPaused,
    speed: snapshot.clock.isPaused ? 0 : 1,
    tick: snapshot.clock.tick,
    targetTickRate: snapshot.clock.targetTickRate,
  },
};

export interface OfflineBootstrapPayload {
  tickLengthMinutes: number;
  update: SimulationUpdateEntry;
  financeHistory: FinanceTickEntry[];
}

export const OFFLINE_BOOTSTRAP: OfflineBootstrapPayload = {
  tickLengthMinutes: OFFLINE_TICK_LENGTH_MINUTES,
  update: offlineUpdate,
  financeHistory,
};
