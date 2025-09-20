import { create } from 'zustand';
import { createModalSlice } from './slices/modalSlice';
import { createNavigationSlice } from './slices/navigationSlice';
import { createSimulationSlice } from './slices/simulationSlice';
import type { AppStoreState } from './types';

export const useAppStore = create<AppStoreState>()((...args) => ({
  ...createSimulationSlice(...args),
  ...createNavigationSlice(...args),
  ...createModalSlice(...args),
}));

export * from './types';
