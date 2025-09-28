import { useMemo } from 'react';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import type { FinanceLedgerCategory, FinanceLedgerEntrySnapshot } from '@/types/simulation';

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
  categoryKey: FinanceLedgerCategory;
  subcategories?: ExpenseSubcategory[];
}

interface ExpenseSubcategory {
  name: string;
  amount: number;
  percentage: number;
  description: string;
}

interface ExpenseSummary {
  categories: ExpenseCategory[];
  totalExpenses: number;
  capexTotal: number;
  opexTotal: number;
  avgExpensePerTick: number;
}

const CATEGORY_META: Record<
  FinanceLedgerCategory,
  { label: string; icon: string; color: string; type: 'CapEx' | 'OpEx' }
> = {
  capital: {
    label: 'Capital Investments',
    icon: 'payments',
    color: 'text-emerald-400',
    type: 'CapEx',
  },
  structure: {
    label: 'Structures & Facilities',
    icon: 'warehouse',
    color: 'text-blue-400',
    type: 'CapEx',
  },
  device: {
    label: 'Equipment Purchases',
    icon: 'precision_manufacturing',
    color: 'text-purple-400',
    type: 'CapEx',
  },
  inventory: {
    label: 'Inventory Stock',
    icon: 'inventory_2',
    color: 'text-teal-400',
    type: 'CapEx',
  },
  rent: { label: 'Rent & Leasing', icon: 'home_work', color: 'text-orange-400', type: 'OpEx' },
  utilities: { label: 'Utilities', icon: 'bolt', color: 'text-yellow-400', type: 'OpEx' },
  payroll: { label: 'Payroll', icon: 'groups', color: 'text-rose-400', type: 'OpEx' },
  maintenance: { label: 'Maintenance', icon: 'build', color: 'text-indigo-400', type: 'OpEx' },
  sales: { label: 'Sales Adjustments', icon: 'sell', color: 'text-sky-400', type: 'OpEx' },
  loan: { label: 'Loan Servicing', icon: 'receipt_long', color: 'text-amber-500', type: 'OpEx' },
  other: { label: 'Other Expenses', icon: 'category', color: 'text-gray-400', type: 'OpEx' },
};

const normaliseExpenseEntry = (
  entry: FinanceLedgerEntrySnapshot,
): FinanceLedgerEntrySnapshot | null => {
  if (!entry || entry.type !== 'expense') {
    return null;
  }
  const amount = Number.isFinite(entry.amount) ? Math.abs(entry.amount) : 0;
  if (amount <= 0) {
    return null;
  }
  const description = entry.description?.trim() ?? '';
  return {
    ...entry,
    amount,
    description:
      description.length > 0
        ? description
        : (CATEGORY_META[entry.category]?.label ?? entry.category),
  };
};

export const ExpenseBreakdown = ({
  bridge: _bridge, // eslint-disable-line @typescript-eslint/no-unused-vars
  timeRange: _timeRange, // eslint-disable-line @typescript-eslint/no-unused-vars
}: ExpenseBreakdownProps) => {
  const snapshot = useSimulationStore((state) => state.snapshot);

  const expenseData = useMemo<ExpenseSummary>(() => {
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
    const ledgerEntries = Array.isArray(finance.ledger) ? finance.ledger : [];
    const normalisedEntries = ledgerEntries
      .map(normaliseExpenseEntry)
      .filter((entry): entry is FinanceLedgerEntrySnapshot => entry !== null);

    const ledgerTotal = normalisedEntries.reduce((total, entry) => total + entry.amount, 0);
    const totalExpenses = Math.max(finance.totalExpenses ?? 0, ledgerTotal);
    const denominator = ledgerTotal > 0 ? ledgerTotal : totalExpenses;

    if (normalisedEntries.length === 0) {
      if (totalExpenses <= 0) {
        return {
          categories: [],
          totalExpenses: 0,
          capexTotal: 0,
          opexTotal: 0,
          avgExpensePerTick: 0,
        };
      }

      return {
        categories: [
          {
            id: 'total-expenses',
            name: 'Total Expenses',
            amount: totalExpenses,
            percentage: 100,
            type: 'OpEx',
            trend: 'stable',
            icon: 'receipt',
            color: 'text-orange-400',
            categoryKey: 'other',
            subcategories: [
              {
                name: 'Operational spending',
                amount: totalExpenses,
                percentage: 100,
                description: 'Aggregated expenses (ledger data unavailable)',
              },
            ],
          },
        ],
        totalExpenses,
        capexTotal: 0,
        opexTotal: totalExpenses,
        avgExpensePerTick: snapshot.clock.tick > 0 ? totalExpenses / snapshot.clock.tick : 0,
      };
    }

    const byCategory = normalisedEntries.reduce<
      Map<FinanceLedgerCategory, { amount: number; entries: FinanceLedgerEntrySnapshot[] }>
    >((acc, entry) => {
      const bucket = acc.get(entry.category) ?? { amount: 0, entries: [] };
      bucket.amount += entry.amount;
      bucket.entries.push(entry);
      acc.set(entry.category, bucket);
      return acc;
    }, new Map());

    const categories: ExpenseCategory[] = Array.from(byCategory.entries()).map(
      ([category, data]) => {
        const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
        const lastTickAmount = data.entries
          .filter((entry) => entry.tick === snapshot.clock.tick)
          .reduce((total, entry) => total + entry.amount, 0);
        const trend: ExpenseCategory['trend'] = lastTickAmount > 0 ? 'up' : 'stable';
        const trendValue = denominator > 0 ? (lastTickAmount / denominator) * 100 : 0;
        const subcategoryTotals = data.entries.reduce<Map<string, number>>((acc, entry) => {
          const key = entry.description;
          acc.set(key, (acc.get(key) ?? 0) + entry.amount);
          return acc;
        }, new Map());
        const subcategories: ExpenseSubcategory[] = Array.from(subcategoryTotals.entries())
          .map(([name, amount]) => ({
            name,
            amount,
            percentage: data.amount > 0 ? (amount / data.amount) * 100 : 0,
            description: name,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        return {
          id: `expense-${category}`,
          name: meta.label,
          amount: data.amount,
          percentage: denominator > 0 ? (data.amount / denominator) * 100 : 0,
          type: meta.type,
          trend,
          icon: meta.icon,
          color: meta.color,
          categoryKey: category,
          subcategories,
          trendValue,
        } satisfies ExpenseCategory & { trendValue: number };
      },
    );

    categories.sort((a, b) => b.amount - a.amount);

    let capexTotal = 0;
    let opexTotal = 0;
    for (const category of categories) {
      const meta = CATEGORY_META[category.categoryKey] ?? CATEGORY_META.other;
      if (meta.type === 'CapEx') {
        capexTotal += category.amount;
      } else {
        opexTotal += category.amount;
      }
    }

    const avgExpensePerTick = snapshot.clock.tick > 0 ? totalExpenses / snapshot.clock.tick : 0;

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
                      tone={category.type === 'CapEx' ? 'danger' : 'warning'}
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
