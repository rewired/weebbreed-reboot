import type { EmployeeState } from '@/state/models.js';
import { MINUTES_PER_DAY, normaliseMinuteOfDay } from '../runtime/dayCycle.js';

export const computeShiftStartMinute = (shift: EmployeeState['shift']): number => {
  const overlap = Math.max(shift.overlapMinutes, 0);
  return normaliseMinuteOfDay(shift.startHour * 60 - overlap);
};

export const computeShiftEndMinute = (shift: EmployeeState['shift']): number => {
  const start = computeShiftStartMinute(shift);
  const duration = Math.max(shift.durationHours * 60, 0);
  const overlap = Math.max(shift.overlapMinutes, 0);
  return normaliseMinuteOfDay(start + duration + overlap);
};

export const isShiftActiveAtMinute = (
  shift: EmployeeState['shift'] | undefined,
  minuteOfDay: number,
): boolean => {
  if (!shift) {
    return true;
  }
  const duration = Math.max(shift.durationHours * 60, 0);
  if (duration >= MINUTES_PER_DAY) {
    return true;
  }
  const start = computeShiftStartMinute(shift);
  const end = computeShiftEndMinute(shift);
  if (start < end) {
    return minuteOfDay >= start && minuteOfDay < end;
  }
  return minuteOfDay >= start || minuteOfDay < end;
};
