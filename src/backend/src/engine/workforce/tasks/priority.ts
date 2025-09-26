import type { TaskState } from '@/state/models.js';
import { clamp } from '../runtime/math.js';

export const PRIORITY_STEP = 10;
export const PRIORITY_MIN = 30;
export const PRIORITY_MAX = 100;

export const normalizePriority = (value: number): number => {
  if (!Number.isFinite(value)) {
    return PRIORITY_MIN;
  }
  const snapped = Math.round(value / PRIORITY_STEP) * PRIORITY_STEP;
  return clamp(snapped, PRIORITY_MIN, PRIORITY_MAX);
};

export const compareTasksByCreation = (left: TaskState, right: TaskState): number => {
  if (left.createdAtTick !== right.createdAtTick) {
    return left.createdAtTick - right.createdAtTick;
  }
  return left.id.localeCompare(right.id);
};
