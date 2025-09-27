export const formatNumber = (
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale?: string | string[],
): string => {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    ...options,
  });

  return formatter.format(value);
};
