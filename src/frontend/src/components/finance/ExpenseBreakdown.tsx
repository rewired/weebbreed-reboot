import { useMemo } from 'react';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';

interface ExpenseBreakdownProps {
  bridge: SimulationBridge;
  timeRange: '1D' | '1W' | '1M' | '1Y';
}

interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  type: 'CapEx' | 'OpEx';
  trend: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
  subcategories?: ExpenseSubcategory[];
}

interface ExpenseSubcategory {
  name: string;
  amount: number;
  percentage: number;
  description: string;
}

export const ExpenseBreakdown = ({
  bridge: _bridge, // eslint-disable-line @typescript-eslint/no-unused-vars
  timeRange: _timeRange, // eslint-disable-line @typescript-eslint/no-unused-vars
}: ExpenseBreakdownProps) => {
  const snapshot = useSimulationStore((state) => state.snapshot);

  const expenseData = useMemo(() => {
    if (!snapshot?.finance) {
      return {
        categories: [],
        totalExpenses: 0,
        capexTotal: 0,
        opexTotal: 0,
        avgExpensePerTick: 0,
      };
    }

    const finance = snapshot.finance;
    const totalExpenses = finance.totalExpenses;

    // Since we don't have detailed ledger data in the frontend snapshot,
    // we'll create a simplified expense breakdown based on available data
    const categories: ExpenseCategory[] = [];

    if (totalExpenses > 0) {
      // Create a simplified breakdown showing total expenses
      // In a real implementation, this would be based on detailed accounting data
      categories.push({
        id: 'total-expenses',
        name: 'Total Expenses',
        amount: totalExpenses,
        percentage: 100,
        type: 'OpEx',
        trend: 'stable',
        icon: 'receipt',
        color: 'text-orange-400',
        subcategories: [
          {
            name: 'All Operational Costs',
            amount: totalExpenses,
            percentage: 100,
            description:
              'Combined operational expenses including utilities, maintenance, payroll, and other costs',
          },
        ],
      });
    }

    // Calculate averages
    const avgExpensePerTick = snapshot.clock.tick > 0 ? totalExpenses / snapshot.clock.tick : 0;

    // Sort categories by amount descending
    categories.sort((a, b) => b.amount - a.amount);

    return {
      categories,
      totalExpenses,
      capexTotal,
      opexTotal,
      avgExpensePerTick,
    };
  }, [snapshot]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <Icon name="trending_up" size={16} className="text-danger" />;
      case 'down':
        return <Icon name="trending_down" size={16} className="text-success" />;
      default:
        return <Icon name="trending_flat" size={16} className="text-text-muted" />;
    }
  };

  if (expenseData.categories.length === 0) {
    return (
      <div className="text-center py-6">
        <Icon name="receipt" size={32} className="mx-auto mb-3 text-text-muted" />
        <p className="text-text-muted text-sm">No expense data available</p>
        <p className="text-text-muted text-xs mt-1">
          Operating costs will appear here as your simulation progresses
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="text-center p-3 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <div className="text-xs uppercase tracking-wide text-blue-400/80 mb-1">CapEx Total</div>
          <div className="text-lg font-semibold text-blue-400">
            €{expenseData.capexTotal.toLocaleString()}
          </div>
          <div className="text-xs text-text-muted">
            {expenseData.totalExpenses > 0
              ? ((expenseData.capexTotal / expenseData.totalExpenses) * 100).toFixed(1)
              : 0}
            % of total
          </div>
        </div>

        <div className="text-center p-3 rounded-lg bg-orange-400/10 border border-orange-400/20">
          <div className="text-xs uppercase tracking-wide text-orange-400/80 mb-1">OpEx Total</div>
          <div className="text-lg font-semibold text-orange-400">
            €{expenseData.opexTotal.toLocaleString()}
          </div>
          <div className="text-xs text-text-muted">
            {expenseData.totalExpenses > 0
              ? ((expenseData.opexTotal / expenseData.totalExpenses) * 100).toFixed(1)
              : 0}
            % of total
          </div>
        </div>

        <div className="text-center p-3 rounded-lg bg-danger/10 border border-danger/20">
          <div className="text-xs uppercase tracking-wide text-danger/80 mb-1">Avg per Tick</div>
          <div className="text-lg font-semibold text-danger">
            €{expenseData.avgExpensePerTick.toFixed(2)}
          </div>
          <div className="text-xs text-text-muted">burn rate</div>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-medium text-text">
          <span>Expense Categories</span>
          <span>Amount</span>
        </div>

        {expenseData.categories.map((category) => (
          <div key={category.id} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface-muted/30 hover:bg-surface-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                  <Icon name={category.icon} size={24} className={category.color} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text">{category.name}</span>
                    <Badge
                      tone={category.type === 'CapEx' ? 'primary' : 'warning'}
                      className="text-xs"
                    >
                      {category.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-text-muted">
                      {category.percentage.toFixed(1)}% of total expenses
                    </span>
                    {getTrendIcon(category.trend)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-danger text-lg">
                  €{category.amount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Subcategories */}
            {category.subcategories && category.subcategories.length > 0 && (
              <div className="ml-6 space-y-2">
                {category.subcategories.map((sub, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-muted/20 hover:bg-surface-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-text text-sm">{sub.name}</div>
                      <div className="text-xs text-text-muted mt-1">{sub.description}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-text">€{sub.amount.toLocaleString()}</div>
                      <div className="text-xs text-text-muted">{sub.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cost Optimization Tips */}
      <div className="mt-6 p-4 rounded-lg bg-warning/5 border border-warning/20">
        <div className="flex items-start gap-3">
          <Icon name="tips_and_updates" size={20} className="text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-text mb-1">Cost Optimization Tips</div>
            <div className="text-text-muted space-y-1">
              <p>• Monitor utility costs - they can become significant as operations scale</p>
              <p>• Regular maintenance prevents more expensive emergency repairs</p>
              <p>• Consider automating repetitive tasks to reduce labor costs</p>
              {expenseData.opexTotal > expenseData.capexTotal && (
                <p>• High OpEx vs CapEx ratio - consider efficiency investments</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
