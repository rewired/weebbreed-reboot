import { useMemo } from 'react';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';

interface RevenueBreakdownProps {
  bridge: SimulationBridge;
  timeRange: '1D' | '1W' | '1M' | '1Y';
}

interface RevenueSource {
  id: string;
  category: string;
  description: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export const RevenueBreakdown = ({
  bridge: _bridge, // eslint-disable-line @typescript-eslint/no-unused-vars
  timeRange: _timeRange, // eslint-disable-line @typescript-eslint/no-unused-vars
}: RevenueBreakdownProps) => {
  const snapshot = useSimulationStore((state) => state.snapshot);

  const revenueData = useMemo(() => {
    if (!snapshot?.finances) {
      return {
        sources: [],
        totalRevenue: 0,
        avgRevenuePerTick: 0,
        topPerformer: null,
      };
    }

    const finance = snapshot.finances;
    const totalRevenue = finance.summary.totalRevenue;

    // Analyze ledger entries for revenue breakdown
    const revenueEntries = finance.ledger.filter(
      (entry) => entry.type === 'income' && entry.category === 'sales',
    );

    // Group by description/strain for detailed analysis
    const revenueBySource = revenueEntries.reduce(
      (acc, entry) => {
        const key = entry.description || 'Unknown';
        if (!acc[key]) {
          acc[key] = {
            amount: 0,
            count: 0,
            lastTick: 0,
          };
        }
        acc[key].amount += entry.amount;
        acc[key].count += 1;
        acc[key].lastTick = Math.max(acc[key].lastTick, entry.tick);
        return acc;
      },
      {} as Record<string, { amount: number; count: number; lastTick: number }>,
    );

    // Calculate harvest-based revenue
    const harvestRevenue =
      snapshot.inventory?.harvest?.reduce((sum, batch) => {
        // Estimate revenue from harvest quality and weight
        const basePrice = 8.5; // Base price per gram
        const qualityMultiplier = Math.max(0.5, Math.min(2.0, batch.quality || 1));
        const estimatedValue = batch.weightGrams * basePrice * qualityMultiplier;
        return sum + estimatedValue;
      }, 0) || 0;

    const sources: RevenueSource[] = [];

    // Add harvest revenue
    if (harvestRevenue > 0) {
      sources.push({
        id: 'harvest-sales',
        category: 'Product Sales',
        description: 'Harvest Sales',
        amount: harvestRevenue,
        percentage: totalRevenue > 0 ? (harvestRevenue / totalRevenue) * 100 : 0,
        trend: 'stable',
        trendValue: 0,
      });
    }

    // Add other revenue sources from ledger
    Object.entries(revenueBySource).forEach(([description, data]) => {
      if (data.amount > 0) {
        sources.push({
          id: `revenue-${description.toLowerCase().replace(/\s+/g, '-')}`,
          category: 'Other Income',
          description,
          amount: data.amount,
          percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
          trend: 'stable',
          trendValue: 0,
        });
      }
    });

    // Sort by amount descending
    sources.sort((a, b) => b.amount - a.amount);

    const avgRevenuePerTick = snapshot.clock.tick > 0 ? totalRevenue / snapshot.clock.tick : 0;

    return {
      sources,
      totalRevenue,
      avgRevenuePerTick,
      topPerformer: sources[0] || null,
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

  if (revenueData.sources.length === 0) {
    return (
      <div className="text-center py-6">
        <Icon name="receipt_long" size={32} className="mx-auto mb-3 text-text-muted" />
        <p className="text-text-muted text-sm">No revenue data available</p>
        <p className="text-text-muted text-xs mt-1">
          Start harvesting and selling products to see revenue breakdown
        </p>
      </div>
    );
  }

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
            {revenueData.topPerformer?.percentage.toFixed(1)}%
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

        {revenueData.sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between p-3 rounded-lg bg-surface-muted/30 hover:bg-surface-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <Icon
                  name={source.category === 'Product Sales' ? 'inventory_2' : 'account_balance'}
                  size={20}
                  className="text-text-muted"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text truncate">{source.description}</span>
                  <Badge
                    tone={source.category === 'Product Sales' ? 'success' : 'default'}
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
                  className={`text-xs ${source.trend === 'up' ? 'text-success' : source.trend === 'down' ? 'text-danger' : 'text-text-muted'}`}
                >
                  {source.trendValue > 0 ? '+' : ''}
                  {source.trendValue.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Market Insights */}
      <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Icon name="lightbulb" size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-text mb-1">Market Insights</div>
            <div className="text-text-muted space-y-1">
              {revenueData.topPerformer && (
                <p>
                  • <strong>{revenueData.topPerformer.description}</strong> is your top revenue
                  source at {revenueData.topPerformer.percentage.toFixed(1)}%
                </p>
              )}
              <p>• Focus on high-quality harvests to maximize revenue per gram</p>
              <p>• Consider expanding successful strains and cultivation methods</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
