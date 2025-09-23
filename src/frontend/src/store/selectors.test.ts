import { describe, expect, it, vi } from 'vitest';

import { selectAlertCount, selectAlertEvents } from './selectors';
import type { GameStoreState } from './types';
import type { SimulationEvent } from '../types/simulation';

const createState = (events: SimulationEvent[]): GameStoreState => ({
  connectionStatus: 'idle',
  events,
  setConnectionStatus: vi.fn(),
  ingestUpdate: vi.fn(),
  appendEvents: vi.fn(),
  registerTickCompleted: vi.fn(),
  setCommandHandlers: vi.fn(),
  issueControlCommand: vi.fn(),
  requestTickLength: vi.fn(),
  reset: vi.fn(),
  sendControlCommand: undefined,
  sendConfigUpdate: undefined,
});

describe('alert selectors', () => {
  it('returns only warning and error events', () => {
    const warningEvent: SimulationEvent = { type: 'zone.thresholdCrossed', level: 'warning' };
    const errorEvent: SimulationEvent = { type: 'device.failed', level: 'error' };
    const infoEvent: SimulationEvent = { type: 'sim.tickCompleted', level: 'info' };
    const state = createState([warningEvent, infoEvent, errorEvent]);

    expect(selectAlertEvents(state)).toEqual([warningEvent, errorEvent]);
  });

  it('counts warning and error events', () => {
    const events: SimulationEvent[] = [
      { type: 'zone.thresholdCrossed', level: 'warning' },
      { type: 'device.failed', level: 'error' },
      { type: 'sim.tickCompleted', level: 'info' },
      { type: 'hr.hired', level: 'debug' },
      { type: 'market.saleCompleted' },
    ];
    const state = createState(events);

    expect(selectAlertCount(state)).toBe(2);
  });
});
