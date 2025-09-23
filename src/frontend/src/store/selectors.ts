import type { GameStoreState, ZoneStoreState } from './types';

export const selectFinanceSummary = (state: ZoneStoreState) => state.financeSummary;

export const selectCapital = (state: ZoneStoreState): number => {
  return state.financeSummary?.cashOnHand ?? 0;
};

export const selectCumulativeYield = (state: ZoneStoreState): number => {
  return Object.values(state.plants).reduce(
    (total, plant) => total + (plant.yieldDryGrams ?? 0),
    0,
  );
};

export const selectCurrentTick = (state: GameStoreState): number => {
  return state.timeStatus?.tick ?? state.lastSnapshotTick ?? 0;
};

export const selectTimeStatus = (state: GameStoreState) => state.timeStatus;

export const selectLastTickEvent = (state: GameStoreState) => state.lastTickCompleted;

export const selectIsPaused = (state: GameStoreState): boolean => {
  if (state.timeStatus) {
    return Boolean(state.timeStatus.paused);
  }
  if (state.lastClockSnapshot) {
    return state.lastClockSnapshot.isPaused;
  }
  return true;
};

export const selectTargetTickRate = (state: GameStoreState): number => {
  if (state.timeStatus) {
    return state.timeStatus.targetTickRate;
  }
  if (state.lastClockSnapshot) {
    return state.lastClockSnapshot.targetTickRate;
  }
  return 1;
};

export const selectCurrentSpeed = (state: GameStoreState): number => {
  if (state.timeStatus) {
    return state.timeStatus.speed;
  }
  if (state.lastClockSnapshot) {
    return state.lastClockSnapshot.targetTickRate;
  }
  return 1;
};

export const selectAlertEvents = (state: GameStoreState) => {
  return state.events.filter((event) => event.level === 'warning' || event.level === 'error');
};

export const selectRecentEvents = (limit: number) => (state: GameStoreState) => {
  if (limit <= 0) {
    return [];
  }
  return state.events.slice(-limit).reverse();
};

export const selectAlertCount = (state: GameStoreState): number => {
  return state.events.reduce((count, event) => {
    return count + (event.level === 'warning' || event.level === 'error' ? 1 : 0);
  }, 0);
};

export const selectZoneById = (zoneId?: string) => (state: ZoneStoreState) => {
  return zoneId ? state.zones[zoneId] : undefined;
};
