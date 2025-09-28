type ClassValue = string | number | null | undefined | boolean | ClassDictionary | ClassValue[];

type ClassDictionary = Record<string, unknown>;

const appendClass = (accumulator: string[], value: ClassValue): void => {
  if (!value) {
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    accumulator.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      appendClass(accumulator, entry);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const [key, condition] of Object.entries(value as ClassDictionary)) {
      if (condition) {
        accumulator.push(key);
      }
    }
  }
};

export const clsx = (...values: ClassValue[]): string => {
  const classes: string[] = [];
  for (const value of values) {
    appendClass(classes, value);
  }
  return classes.join(' ');
};

export default clsx;
