import { useMemo } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsBar from '@/components/MetricsBar';
import Panel from '@/components/Panel';
import { selectFinanceSummary, useZoneStore } from '@/store';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number | undefined) => currencyFormatter.format(value ?? 0);

const FinancesView = () => {
  const financeSummary = useZoneStore(selectFinanceSummary);
  const financeHistory = useZoneStore((state) => state.financeHistory);

  const chartData = useMemo(() => {
    return financeHistory.slice(-24).map((entry) => ({
      tick: entry.tick,
      ts: entry.ts,
      revenue: entry.revenue,
      expenses: entry.expenses,
      netIncome: entry.netIncome,
      capex: entry.capex,
      opex: entry.opex,
      maintenance: entry.maintenanceTotal,
      utilitiesTotal: entry.utilities.totalCost,
      utilitiesEnergy: entry.utilities.energy,
      utilitiesWater: entry.utilities.water,
      utilitiesNutrients: entry.utilities.nutrients,
    }));
  }, [financeHistory]);

  const hasHistory = chartData.length > 0;
  const recentEntries = useMemo(() => financeHistory.slice(-10).reverse(), [financeHistory]);
  const latestEntry = financeHistory.at(-1);

  const summaryMetrics = [
    {
      id: 'cash',
      label: 'Cash on hand',
      value: formatCurrency(financeSummary?.cashOnHand),
    },
    {
      id: 'net-income',
      label: 'Net income',
      value: formatCurrency(financeSummary?.netIncome),
      trend: financeSummary && financeSummary.netIncome >= 0 ? 'up' : 'down',
    },
    {
      id: 'total-revenue',
      label: 'Total revenue',
      value: formatCurrency(financeSummary?.totalRevenue),
    },
    {
      id: 'total-expenses',
      label: 'Total expenses',
      value: formatCurrency(financeSummary?.totalExpenses),
    },
  ];

  const headerStatus = financeSummary
    ? {
        label: financeSummary.netIncome >= 0 ? 'Profitable' : 'Operating at loss',
        tone: financeSummary.netIncome >= 0 ? 'positive' : 'warning',
        tooltip:
          financeSummary.netIncome >= 0
            ? 'Cumulative net income remains positive.'
            : 'Expenses exceed revenue; monitor costs closely.',
      }
    : undefined;

  const tooltipFormatter = (value: number | string) =>
    typeof value === 'number' ? formatCurrency(value) : value;
  const labelFormatter = (tick: number) => `Tick ${tick.toLocaleString()}`;

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Finances"
        subtitle="Track revenue, expenses, and resource costs to keep the grow operation solvent."
        status={headerStatus}
        meta={[
          { label: 'Last revenue', value: formatCurrency(financeSummary?.lastTickRevenue) },
          { label: 'Last expenses', value: formatCurrency(financeSummary?.lastTickExpenses) },
        ]}
      />

      <MetricsBar metrics={summaryMetrics} layout="compact" />

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Panel title="Revenue vs expenses" padding="lg" variant="elevated">
          {hasHistory ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="tick" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) =>
                    formatCurrency(typeof value === 'number' ? value : Number(value))
                  }
                  width={80}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#16a34a"
                  fill="#16a34a22"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#ef4444"
                  fill="#ef444422"
                />
                <Area
                  type="monotone"
                  dataKey="netIncome"
                  name="Net income"
                  stroke="#6366f1"
                  fill="#6366f122"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted">
              Financial history will appear after the first tick completes.
            </p>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Cost breakdown" padding="lg" variant="elevated">
            {hasHistory ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="tick" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(value) =>
                      formatCurrency(typeof value === 'number' ? value : Number(value))
                    }
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
                  <Legend />
                  <Bar dataKey="capex" name="CapEx" stackId="costs" fill="#f97316" />
                  <Bar dataKey="opex" name="OpEx" stackId="costs" fill="#14b8a6" />
                  <Bar dataKey="maintenance" name="Maintenance" stackId="costs" fill="#facc15" />
                  <Bar dataKey="utilitiesTotal" name="Utilities" stackId="costs" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-text-muted">
                Cost categories will populate as the simulation runs.
              </p>
            )}
          </Panel>

          <Panel title="Latest tick" padding="lg" variant="elevated">
            {latestEntry ? (
              <dl className="grid grid-cols-2 gap-4 text-sm text-text-secondary">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Tick</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {latestEntry.tick.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Net income</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {formatCurrency(latestEntry.netIncome)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Revenue</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {formatCurrency(latestEntry.revenue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Expenses</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {formatCurrency(latestEntry.expenses)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Utilities</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {formatCurrency(latestEntry.utilities.totalCost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Maintenance</dt>
                  <dd className="text-base font-medium text-text-primary">
                    {formatCurrency(latestEntry.maintenanceTotal)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-text-muted">Awaiting first financial snapshot.</p>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Recent financial ticks"
        description="Revenue, expenses, and cost drivers over the last 10 ticks."
        padding="lg"
        variant="elevated"
      >
        {recentEntries.length === 0 ? (
          <p className="text-sm text-text-muted">No historical data recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50 text-sm">
              <thead className="bg-surfaceAlt/70 text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Tick</th>
                  <th className="px-3 py-2 text-left">Revenue</th>
                  <th className="px-3 py-2 text-left">Expenses</th>
                  <th className="px-3 py-2 text-left">Net income</th>
                  <th className="px-3 py-2 text-left">CapEx</th>
                  <th className="px-3 py-2 text-left">OpEx</th>
                  <th className="px-3 py-2 text-left">Utilities</th>
                  <th className="px-3 py-2 text-left">Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-text-secondary">
                {recentEntries.map((entry) => (
                  <tr key={`${entry.tick}-${entry.ts}`}>
                    <td className="px-3 py-2 font-mono text-xs text-text-muted">
                      {entry.tick.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{formatCurrency(entry.revenue)}</td>
                    <td className="px-3 py-2">{formatCurrency(entry.expenses)}</td>
                    <td className="px-3 py-2">{formatCurrency(entry.netIncome)}</td>
                    <td className="px-3 py-2">{formatCurrency(entry.capex)}</td>
                    <td className="px-3 py-2">{formatCurrency(entry.opex)}</td>
                    <td className="px-3 py-2">{formatCurrency(entry.utilities.totalCost)}</td>
                    <td className="px-3 py-2">{formatCurrency(entry.maintenanceTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default FinancesView;
