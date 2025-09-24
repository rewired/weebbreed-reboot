const TICKS_PER_DAY = 24;
const DAYS_PER_YEAR = 360;

export interface InGameDateParts {
  year: number;
  day: number;
  hour: number;
  minute: number;
}

const clampTick = (tick: number): number => {
  if (!Number.isFinite(tick)) {
    return 0;
  }
  return Math.max(0, Math.floor(tick));
};

export const getInGameDateParts = (tick: number): InGameDateParts => {
  const safeTick = clampTick(tick);
  const totalHours = safeTick;
  const totalDays = Math.floor(totalHours / TICKS_PER_DAY);
  const year = Math.floor(totalDays / DAYS_PER_YEAR) + 1;
  const day = (totalDays % DAYS_PER_YEAR) + 1;
  const hour = totalHours % TICKS_PER_DAY;

  return {
    year,
    day,
    hour,
    minute: 0,
  };
};

const pad = (value: number, length = 2): string => {
  return value.toString().padStart(length, '0');
};

export const formatInGameTime = (tick: number): string => {
  const parts = getInGameDateParts(tick);
  const dayLabel = parts.day >= 100 ? parts.day.toString() : pad(parts.day);
  return `Y${parts.year}, D${dayLabel}, ${pad(parts.hour)}:${pad(parts.minute)}`;
};
