export const truncate = <T>(items: T[], limit: number): T[] => {
  if (items.length <= limit) {
    return items;
  }

  return items.slice(items.length - limit);
};

export const indexById = <T extends { id: string }>(items: T[]): Record<string, T> => {
  return items.reduce<Record<string, T>>((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});
};
