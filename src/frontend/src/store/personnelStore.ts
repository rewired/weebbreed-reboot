import { create } from 'zustand';
import type { SimulationUpdateEntry } from '@/types/simulation';
import { mergeEvents } from './utils/events';
import type { PersonnelStoreState } from './types';

const MAX_HR_EVENTS = 200;

const extractHrEvents = (update: SimulationUpdateEntry) => {
  return update.events.filter((event) => event.type.startsWith('hr.'));
};

export const usePersonnelStore = create<PersonnelStoreState>()((set) => ({
  personnel: undefined,
  hrEvents: [],
  ingestUpdate: (update: SimulationUpdateEntry) =>
    set((state) => ({
      personnel: update.snapshot.personnel,
      hrEvents: (() => {
        const hrEvents = extractHrEvents(update);
        return hrEvents.length
          ? mergeEvents(state.hrEvents, hrEvents, MAX_HR_EVENTS)
          : state.hrEvents;
      })(),
    })),
  recordHREvent: (event) =>
    set((state) => ({
      hrEvents: mergeEvents(state.hrEvents, [event], MAX_HR_EVENTS),
    })),
  reset: () =>
    set(() => ({
      personnel: undefined,
      hrEvents: [],
    })),
}));
