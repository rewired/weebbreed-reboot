import { useEffect, useRef, useState } from 'react';

/**
 * Returns a throttled version of the provided value. Updates are emitted at
 * most once per {@link intervalMs}. Subsequent updates within the interval are
 * scheduled to run after the remaining delay to avoid dropping the latest
 * value entirely.
 */
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const useThrottledValue = <T>(value: T, intervalMs = 500): T => {
  const [throttled, setThrottled] = useState<T>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const timestamp = now();
    const elapsed = timestamp - lastUpdateRef.current;

    const update = () => {
      setThrottled(value);
      lastUpdateRef.current = now();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (elapsed >= intervalMs) {
      update();
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(update, intervalMs - elapsed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [intervalMs, value]);

  return throttled;
};
