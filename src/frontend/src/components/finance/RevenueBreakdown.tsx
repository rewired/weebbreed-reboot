import { useMemo } from 'react';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { FinanceLedgerCategory, FinanceLedgerEntrySnapshot } from '@/types/simulation';

interface RevenueBreakdownProps {
  bridge: SimulationBridge;
  timeRange: '1D' | '1W' | '1M' | '1Y';
}

interface RevenueSource {
  id: string;
  category: string;
  categoryKey: FinanceLedgerCategory;
  description: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface RevenueBySourceEntry {
  amount: number;
  count: number;
  lastTick: number;
}

interface RevenueAnalysis {
  sources: RevenueSource[];
  totalRevenue: number;
  avgRevenuePerTick: number;
  topPerformer: RevenueSource;
  hasLedgerDetails: boolean;
}

const createPlaceholderSource = (
  description: string,
  amount: number,
  totalRevenue: number,
  categoryKey: FinanceLedgerCategory,
): RevenueSource => ({
  id: `placeholder-${description.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'revenue'}`,
  category: 'Revenue',
  categoryKey,
  description,
  amount,
  percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
  trend: 'stable',
  trendValue: 0,
});

const categoryLabels: Record<FinanceLedgerCategory, string> = {
  sales: 'Sales',
  capital: 'Capital',
  structure: 'Structure',
  device: 'Devices',
  inventory: 'Inventory',
  rent: 'Rent',
  utilities: 'Utilities',
  payroll: 'Payroll',
  maintenance: 'Maintenance',
  loan: 'Loans',
  other: 'Other',
};

const normaliseLedgerEntry = (
  entry: FinanceLedgerEntrySnapshot,
): FinanceLedgerEntrySnapshot | null => {
  if (!entry || entry.type !== 'income') {
    return null;
  }
  const amount = Number.isFinite(entry.amount) ? entry.amount : 0;
  if (amount <= 0) {
    return null;
  }
  const description = entry.description?.trim() ?? '';
  return {
    ...entry,
    amount,
    description:
      description.length > 0 ? description : (categoryLabels[entry.category] ?? entry.category),
  };
};

export const RevenueBreakdown = ({
  bridge: _bridge, // eslint-disable-line @typescript-eslint/no-unused-vars
  timeRange: _timeRange, // eslint-disable-line @typescript-eslint/no-unused-vars
}: RevenueBreakdownProps) => {
  const snapshot = useSimulationStore((state) => state.snapshot);

  const revenueData = useMemo<RevenueAnalysis>(() => {
    if (!snapshot?.finance) {
      const placeholderTopPerformer = createPlaceholderSource(
        'No revenue recorded yet',
        0,
        0,
        'other',
      );
      return {
        sources: [],
        totalRevenue: 0,
        avgRevenuePerTick: 0,
        topPerformer: placeholderTopPerformer,
        hasLedgerDetails: false,
      };
    }

    const finance = snapshot.finance;
    const ledgerEntries = Array.isArray(finance.ledger) ? finance.ledger : [];
    const normalisedEntries = ledgerEntries
      .map(normaliseLedgerEntry)
      .filter((entry): entry is FinanceLedgerEntrySnapshot => entry !== null);

    const totalRevenue = Math.max(finance.totalRevenue ?? 0, 0);
    const ledgerRevenue = normalisedEntries.reduce((total, entry) => total + entry.amount, 0);
    const effectiveTotalRevenue = ledgerRevenue > 0 ? ledgerRevenue : totalRevenue;
    const ticksElapsed = snapshot.clock.tick;
    const avgRevenuePerTick = ticksElapsed > 0 ? effectiveTotalRevenue / ticksElapsed : 0;

    const revenueBySource = normalisedEntries.reduce<
      Record<
        string,
        RevenueBySourceEntry & {
          category: FinanceLedgerCategory;
          description: string;
        }
      >
    >((acc, entry) => {
      const key = `${entry.category}::${entry.description}`;
      if (!acc[key]) {
        acc[key] = {
          amount: 0,
          count: 0,
          lastTick: 0,
          category: entry.category,
          description: entry.description,
        };
      }
      acc[key].amount += entry.amount;
      acc[key].count += 1;
      if (entry.tick >= 0) {
        acc[key].lastTick = Math.max(acc[key].lastTick, entry.tick);
      }
      return acc;
    }, {});

    const sources: RevenueSource[] = Object.entries(revenueBySource).map(([key, data]) => {
      const slug =
        key
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'revenue-source';
      const lastTickAmount = normalisedEntries
        .filter(
          (entry) =>
            entry.category === data.category &&
            entry.description === data.description &&
            entry.tick === snapshot.clock.tick,
        )
        .reduce((total, entry) => total + entry.amount, 0);
      const denominator = ledgerRevenue > 0 ? ledgerRevenue : effectiveTotalRevenue;
      const trendValue = denominator > 0 ? (lastTickAmount / denominator) * 100 : 0;
      const trend: RevenueSource['trend'] = lastTickAmount > 0 ? 'up' : 'stable';
      return {
        id: `revenue-${slug}`,
        category: categoryLabels[data.category] ?? data.category,
        categoryKey: data.category,
        description: data.description,
        amount: data.amount,
        percentage: denominator > 0 ? (data.amount / denominator) * 100 : 0,
        trend,
        trendValue,
      } satisfies RevenueSource;
    });

    const hasLedgerDetails = sources.length > 0;

    if (!hasLedgerDetails) {
      const lastTickRevenue = Math.max(finance.lastTickRevenue ?? 0, 0);
      const priorRevenue = Math.max(totalRevenue - lastTickRevenue, 0);

      if (lastTickRevenue > 0) {
        sources.push(
          createPlaceholderSource(
            'Last tick revenue',
            lastTickRevenue,
            totalRevenue || lastTickRevenue,
            'sales',
          ),
        );
      }

      if (priorRevenue > 0) {
        sources.push(
          createPlaceholderSource('Cumulative revenue', priorRevenue, totalRevenue, 'other'),
        );
      }
    }

    sources.sort((a, b) => b.amount - a.amount);

    const topPerformer = sources[0]
      ? sources[0]
      : createPlaceholderSource(
          totalRevenue > 0 ? 'Revenue recognised' : 'No revenue recorded yet',
          totalRevenue,
          totalRevenue,
          'other',
        );

    return {
      sources,
      totalRevenue: effectiveTotalRevenue,
      avgRevenuePerTick,
      topPerformer,
      hasLedgerDetails,
    };
  }, [snapshot]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <Icon name="trending_up" size={16} className="text-success" />;
      case 'down':
        return <Icon name="trending_down" size={16} className="text-danger" />;
      default:
        return <Icon name="trending_flat" size={16} className="text-text-muted" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="text-xs uppercase tracking-wide text-success/80 mb-1">
            Average Revenue
          </div>
          <div className="text-lg font-semibold text-success">
            €{revenueData.avgRevenuePerTick.toFixed(2)}
          </div>
          <div className="text-xs text-text-muted">per tick</div>
        </div>

        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="text-xs uppercase tracking-wide text-primary/80 mb-1">
            Revenue Sources
          </div>
          <div className="text-lg font-semibold text-primary">{revenueData.sources.length}</div>
          <div className="text-xs text-text-muted">categories</div>
        </div>

        <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
          <div className="text-xs uppercase tracking-wide text-warning/80 mb-1">Top Performer</div>
          <div className="text-lg font-semibold text-warning">
            {revenueData.topPerformer.percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted">of total</div>
        </div>
      </div>

      {/* Revenue Sources List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm font-medium text-text">
          <span>Revenue Sources</span>
          <span>Amount</span>
        </div>

        {!revenueData.hasLedgerDetails && revenueData.sources.length > 0 && (
          <div className="text-xs text-text-muted bg-surface-muted/40 border border-surface-muted/60 rounded-md px-3 py-2">
            Detailed ledger data is not yet available. Showing summary revenue totals instead.
          </div>
        )}

        {revenueData.sources.length === 0 ? (
          <div className="text-center py-6">
            <Icon name="receipt_long" size={32} className="mx-auto mb-3 text-text-muted" />
            <p className="text-text-muted text-sm">No revenue data available</p>
            <p className="text-text-muted text-xs mt-1">
              Start harvesting and selling products to see revenue breakdown
            </p>
          </div>
        ) : (
          revenueData.sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-muted/30 hover:bg-surface-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                  <Icon
                    name={source.categoryKey === 'sales' ? 'inventory_2' : 'account_balance'}
                    size={20}
                    className="text-text-muted"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text truncate">{source.description}</span>
                    <Badge
                      tone={source.categoryKey === 'sales' ? 'success' : 'default'}
                      className="text-xs"
                    >
                      {source.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">
                      {source.percentage.toFixed(1)}% of total
                    </span>
                    {getTrendIcon(source.trend)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-success">€{source.amount.toLocaleString()}</div>
                {source.trendValue !== 0 && (
                  <div
                    className={`text-xs ${
                      source.trend === 'up'
                        ? 'text-success'
                        : source.trend === 'down'
                          ? 'text-danger'
                          : 'text-text-muted'
                    }`}
                  >
                    {source.trendValue > 0 ? '+' : ''}
                    {source.trendValue.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Market Insights */}
      <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Icon name="lightbulb" size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-text mb-1">Market Insights</div>
            <div className="text-text-muted space-y-1">
              <p>
                • <strong>{revenueData.topPerformer.description}</strong> leads your revenue mix at{' '}
                {revenueData.topPerformer.percentage.toFixed(1)}%
              </p>
              <p>• Focus on high-quality harvests to maximize revenue per gram</p>
              <p>• Consider expanding successful strains and cultivation methods</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
