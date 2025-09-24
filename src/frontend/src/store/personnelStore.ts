import { create } from 'zustand';
import type { FacadeIntentCommand, SimulationUpdateEntry } from '@/types/simulation';
import { mergeEvents } from './utils/events';
import type { PersonnelStoreState } from './types';

const MAX_HR_EVENTS = 200;

const extractHrEvents = (update: SimulationUpdateEntry) => {
  return update.events.filter((event) => event.type.startsWith('hr.'));
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sendIntent = (state: PersonnelStoreState, intent: FacadeIntentCommand) => {
  state.sendFacadeIntent?.(intent);
};

export const usePersonnelStore = create<PersonnelStoreState>()((set) => ({
  personnel: undefined,
  hrEvents: [],
  sendFacadeIntent: undefined,
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
  setIntentHandler: (handler) =>
    set(() => ({
      sendFacadeIntent: handler,
    })),
  hireCandidate: (candidateId, options) =>
    set((state) => {
      const candidate = state.personnel?.applicants?.find((item) => item.id === candidateId);
      const roleInput = options?.role ?? candidate?.desiredRole;
      const role = typeof roleInput === 'string' ? roleInput.trim() : '';
      if (!role) {
        return {};
      }

      const wageInput = options?.wage;
      const defaultWage = candidate?.expectedSalary;
      const wage = isFiniteNumber(wageInput) && wageInput >= 0 ? wageInput : defaultWage;

      const payload: Record<string, unknown> = {
        candidateId,
        role,
      };
      if (isFiniteNumber(wage) && wage >= 0) {
        payload.wage = wage;
      }

      sendIntent(state, {
        domain: 'workforce',
        action: 'hire',
        payload,
      });
      return {};
    }),
  fireEmployee: (employeeId) =>
    set((state) => {
      const exists = state.personnel?.employees?.some((employee) => employee.id === employeeId);
      if (!exists) {
        return {};
      }

      sendIntent(state, {
        domain: 'workforce',
        action: 'fire',
        payload: { employeeId },
      });
      return {};
    }),
  refreshCandidates: () =>
    set((state) => {
      sendIntent(state, {
        domain: 'workforce',
        action: 'refreshCandidates',
      });
      return {};
    }),
  reset: () =>
    set(() => ({
      personnel: undefined,
      hrEvents: [],
      sendFacadeIntent: undefined,
    })),
}));
