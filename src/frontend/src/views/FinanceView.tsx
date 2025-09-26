import { useMemo, useState } from 'react';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { useSimulationStore } from '@/store/simulation';
import { RevenueBreakdown } from '@/components/finance/RevenueBreakdown';
import { ExpenseBreakdown } from '@/components/finance/ExpenseBreakdown';
import { ProfitChart } from '@/components/finance/ProfitChart';
import { UtilityPricing } from '@/components/finance/UtilityPricing';
import type { SimulationBridge } from '@/facade/systemFacade';

type TimeRange = '1D' | '1W' | '1M' | '1Y';

interface FinanceViewProps {
  bridge: SimulationBridge;
}

export const FinanceView = ({ bridge }: FinanceViewProps) => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const [timeRange, setTimeRange] = useState<TimeRange>('1W');
  const [expandedSections, setExpandedSections] = useState({
    revenue: false,
    expenses: false,
    utilities: false,
  });

  const finance = snapshot?.finance;

  const financialMetrics = useMemo(() => {
    if (!finance || !snapshot) {
      return {
        cashOnHand: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        profitMargin: 0,
        burnRate: 0,
        runwayDays: 0,
      };
    }

    const profitMargin =
      finance.totalRevenue > 0 ? (finance.netIncome / finance.totalRevenue) * 100 : 0;

    // Estimate burn rate from recent expenses (last tick expenses * ticks per day)
    // Note: Using a default tick length since metadata.tickLengthMinutes is not in snapshot
    const tickLengthMinutes = 15; // Default tick length
    const ticksPerDay = Math.round(24 / (tickLengthMinutes / 60));
    const burnRate = finance.lastTickExpenses * ticksPerDay;
    const runwayDays = burnRate > 0 ? Math.floor(finance.cashOnHand / burnRate) : Infinity;

    return {
      cashOnHand: finance.cashOnHand,
      totalRevenue: finance.totalRevenue,
      totalExpenses: finance.totalExpenses,
      netIncome: finance.netIncome,
      profitMargin,
      burnRate,
      runwayDays,
    };
  }, [finance, snapshot]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Icon name="trending_down" size={48} className="mx-auto mb-4 text-text-muted" />
          <p className="text-text-muted">Waiting for simulation data...</p>
        </div>
      </div>
    );
  }

  if (!finance) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Icon name="trending_down" size={48} className="mx-auto mb-4 text-text-muted" />
          <p className="text-text-muted">Financial data not available</p>
          <p className="text-xs text-text-muted mt-2">
            Debug: snapshot exists but finance field is missing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text">Financial Dashboard</h2>
          <p className="text-sm text-text-muted">Revenue, expenses, and profitability analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-2xl border border-border/40 bg-surface-muted/60 p-1">
            {(['1D', '1W', '1M', '1Y'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? 'primary' : 'ghost'}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Cash on Hand" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon name="account_balance_wallet" size={32} className="text-success" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-text">
                €{financialMetrics.cashOnHand.toLocaleString()}
              </span>
              <span className="text-sm text-text-muted">Available capital</span>
            </div>
          </div>
        </Card>

        <Card title="Total Revenue" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon name="trending_up" size={32} className="text-primary" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-text">
                €{financialMetrics.totalRevenue.toLocaleString()}
              </span>
              <span className="text-sm text-text-muted">All-time earnings</span>
            </div>
          </div>
        </Card>

        <Card title="Net Income" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon
              name={financialMetrics.netIncome >= 0 ? 'trending_up' : 'trending_down'}
              size={32}
              className={financialMetrics.netIncome >= 0 ? 'text-success' : 'text-danger'}
            />
            <div className="flex flex-col">
              <span
                className={`text-2xl font-semibold ${financialMetrics.netIncome >= 0 ? 'text-success' : 'text-danger'}`}
              >
                €{financialMetrics.netIncome.toLocaleString()}
              </span>
              <span className="text-sm text-text-muted">
                {financialMetrics.profitMargin.toFixed(1)}% margin
              </span>
            </div>
          </div>
        </Card>

        <Card title="Runway" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon name="schedule" size={32} className="text-warning" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-text">
                {financialMetrics.runwayDays === Infinity
                  ? '∞'
                  : Math.max(0, financialMetrics.runwayDays)}
              </span>
              <span className="text-sm text-text-muted">
                {financialMetrics.runwayDays === Infinity ? 'Self-sustaining' : 'Days remaining'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Profit Chart */}
      <Card title="Financial Performance" className="bg-surface-elevated/60">
        <ProfitChart bridge={bridge} timeRange={timeRange} />
      </Card>

      {/* Revenue & Expense Breakdown */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Revenue Section */}
        <Card
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="receipt_long" size={20} className="text-success" />
                <span>Revenue Breakdown</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={<Icon name={expandedSections.revenue ? 'expand_less' : 'expand_more'} />}
                onClick={() => toggleSection('revenue')}
              >
                {expandedSections.revenue ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          }
          className="bg-surface-elevated/60"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total Revenue</span>
              <span className="text-lg font-semibold text-success">
                €{financialMetrics.totalRevenue.toLocaleString()}
              </span>
            </div>
            {expandedSections.revenue && <RevenueBreakdown bridge={bridge} timeRange={timeRange} />}
          </div>
        </Card>

        {/* Expenses Section */}
        <Card
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="receipt" size={20} className="text-danger" />
                <span>Expense Breakdown</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={<Icon name={expandedSections.expenses ? 'expand_less' : 'expand_more'} />}
                onClick={() => toggleSection('expenses')}
              >
                {expandedSections.expenses ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          }
          className="bg-surface-elevated/60"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total Expenses</span>
              <span className="text-lg font-semibold text-danger">
                €{financialMetrics.totalExpenses.toLocaleString()}
              </span>
            </div>
            {expandedSections.expenses && (
              <ExpenseBreakdown bridge={bridge} timeRange={timeRange} />
            )}
          </div>
        </Card>
      </div>

      {/* Utility Pricing */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="settings" size={20} className="text-primary" />
              <span>Utility Pricing</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              icon={<Icon name={expandedSections.utilities ? 'expand_less' : 'expand_more'} />}
              onClick={() => toggleSection('utilities')}
            >
              {expandedSections.utilities ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        }
        className="bg-surface-elevated/60"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Adjust electricity, water, and nutrient costs to reflect market pricing
          </p>
          {expandedSections.utilities && <UtilityPricing bridge={bridge} />}
        </div>
      </Card>
    </div>
  );
};
