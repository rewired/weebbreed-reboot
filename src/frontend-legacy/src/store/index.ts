import { create } from 'zustand';
import { createModalSlice } from './slices/modalSlice';
import { createNavigationSlice } from './slices/navigationSlice';
import type { AppStoreState } from './types';

export const useAppStore = create<AppStoreState>()((...args) => ({
  ...createNavigationSlice(...args),
  ...createModalSlice(...args),
}));

export * from './gameStore';
export * from './zoneStore';
export * from './personnelStore';
export * from './types';
export * from './selectors';
