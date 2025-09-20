export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;

export const roundTo = (value: number, decimals = 3): number =>
  Number.parseFloat(value.toFixed(decimals));
