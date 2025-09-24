import type { ReactNode } from 'react';

export type BreakdownListItem = {
  id: string;
  label: string;
  value: number;
  description?: ReactNode;
};

export type BreakdownListProps = {
  items: BreakdownListItem[];
  total?: number;
  valueFormatter?: (value: number) => ReactNode;
  emptyPlaceholder?: ReactNode;
};

const defaultFormatter = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: value < 1 ? 2 : 0,
  }).format(value);

const BreakdownList = ({
  items,
  total,
  valueFormatter = defaultFormatter,
  emptyPlaceholder = 'No data available for the selected range.',
}: BreakdownListProps) => {
  const computedTotal =
    typeof total === 'number'
      ? total
      : items.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0);

  if (!items.length || computedTotal <= 0) {
    return <p className="text-sm text-text-muted">{emptyPlaceholder}</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const share = computedTotal > 0 ? Math.max(item.value / computedTotal, 0) : 0;
        const width = `${Math.max(share * 100, item.value > 0 ? 4 : 0)}%`;
        return (
          <li key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-text-primary">{item.label}</span>
              <span className="flex items-baseline gap-2 font-mono text-xs text-text-secondary">
                <span>{valueFormatter(item.value)}</span>
                <span className="rounded bg-surfaceAlt/80 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-text-muted">
                  {(share * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surfaceAlt/60">
              <div className="h-full rounded-full bg-accent/70" style={{ width }} />
            </div>
            {item.description ? (
              <p className="text-xs text-text-muted">{item.description}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export default BreakdownList;
