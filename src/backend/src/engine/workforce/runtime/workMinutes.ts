import type { EmployeeState } from '@/state/types.js';

export const computeEffectiveWorkMinutesPerTick = (
  employee: EmployeeState,
  tickLengthMinutes: number,
): number => {
  const baseMinutes = Number.isFinite(tickLengthMinutes) ? Math.max(tickLengthMinutes, 0) : 0;
  if (!Number.isFinite(employee.maxMinutesPerTick)) {
    return baseMinutes;
  }
  const cap = Math.max(employee.maxMinutesPerTick, 0);
  return Math.max(Math.min(baseMinutes, cap), 0);
};
