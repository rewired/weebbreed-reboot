const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = HOURS_PER_DAY * 60;

export { HOURS_PER_DAY, MINUTES_PER_DAY };

export const normaliseMinuteOfDay = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const wrapped = Math.floor(value % MINUTES_PER_DAY);
  return wrapped < 0 ? wrapped + MINUTES_PER_DAY : wrapped;
};

export const computeMinutesIntoDay = (tick: number, tickLengthMinutes: number): number => {
  const minutes = Math.max(tick, 0) * Math.max(tickLengthMinutes, 0);
  return normaliseMinuteOfDay(minutes);
};

export const computeDayIndex = (tick: number, ticksPerDay: number): number => {
  if (ticksPerDay <= 0) {
    return 0;
  }
  return Math.floor(Math.max(tick - 1, 0) / ticksPerDay);
};
