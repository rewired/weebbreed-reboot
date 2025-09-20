import type { StateCreator } from 'zustand';
import type { AppStoreState, NavigationSlice, NavigationView } from '../types';

const HISTORY_LIMIT = 10;

export const createNavigationSlice: StateCreator<AppStoreState, [], [], NavigationSlice> = (
  set,
) => ({
  currentView: 'overview',
  history: [],
  setCurrentView: (view: NavigationView) =>
    set((state) => {
      if (state.currentView === view) {
        return {};
      }

      const nextHistory = [...state.history, state.currentView];
      if (nextHistory.length > HISTORY_LIMIT) {
        nextHistory.shift();
      }

      return {
        currentView: view,
        history: nextHistory,
      };
    }),
  goBack: () =>
    set((state) => {
      if (state.history.length === 0) {
        return {};
      }

      const nextHistory = [...state.history];
      const previous = nextHistory.pop() ?? 'overview';

      return {
        currentView: previous,
        history: nextHistory,
      };
    }),
  clearHistory: () => set(() => ({ history: [] })),
});
