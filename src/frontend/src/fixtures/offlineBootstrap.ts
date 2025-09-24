import type {
  SimulationEvent,
  SimulationSnapshot,
  SimulationUpdateEntry,
} from '@/types/simulation';
import type { FinanceTickEntry } from '@/store/types';
import { CLICKDUMMY_SEED, createClickDummyFixture } from './clickDummyFactories';
import type { FixtureTranslationOptions } from './translator';
import { translateClickDummyGameData } from './translator';

const OFFLINE_TICK_LENGTH_MINUTES = 60;
const OFFLINE_START_DATE = '2025-01-01T00:00:00.000Z';

const resolveTimestamp = (isoString: string): number => {
  const parsed = Date.parse(isoString);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const createOfflineEvents = (
  snapshot: SimulationSnapshot,
  eventTimestamp: number,
): SimulationEvent[] => {
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

export interface OfflineBootstrapOptions extends FixtureTranslationOptions {
  seed?: number | string;
}

export interface OfflineBootstrapPayload {
  tickLengthMinutes: number;
  update: SimulationUpdateEntry;
  financeHistory: FinanceTickEntry[];
}

export const createOfflineBootstrapPayload = (
  options: OfflineBootstrapOptions = {},
): OfflineBootstrapPayload => {
  const {
    seed = CLICKDUMMY_SEED,
    tickLengthMinutes = OFFLINE_TICK_LENGTH_MINUTES,
    startDate = OFFLINE_START_DATE,
    isPaused = true,
    targetTickRate = 1,
    roomPurposes,
  } = options;

  const { data: clickDummyData } = createClickDummyFixture({ seed });

  const { snapshot, financeHistory } = translateClickDummyGameData(clickDummyData, {
    tickLengthMinutes,
    startDate,
    isPaused,
    targetTickRate,
    roomPurposes,
  });

  const eventTimestamp = resolveTimestamp(snapshot.clock.lastUpdatedAt);

  const update: SimulationUpdateEntry = {
    tick: snapshot.tick,
    ts: eventTimestamp,
    events: createOfflineEvents(snapshot, eventTimestamp),
    snapshot,
    time: {
      running: !snapshot.clock.isPaused,
      paused: snapshot.clock.isPaused,
      speed: snapshot.clock.isPaused ? 0 : 1,
      tick: snapshot.clock.tick,
      targetTickRate: snapshot.clock.targetTickRate,
    },
  };

  return {
    tickLengthMinutes,
    update,
    financeHistory,
  };
};

export const OFFLINE_BOOTSTRAP = createOfflineBootstrapPayload();
