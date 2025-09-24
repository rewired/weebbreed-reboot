import { useMemo, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsBar from '@/components/MetricsBar';
import Panel from '@/components/Panel';
import { BreakdownList } from '@/components/panels';
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

const TIME_RANGE_OPTIONS = [
  { id: '24', label: '24 ticks', ticks: 24 },
  { id: '72', label: '72 ticks', ticks: 72 },
  { id: '168', label: '168 ticks', ticks: 168 },
  { id: '720', label: '720 ticks', ticks: 720 },
] as const;

const FinancesView = () => {
  const financeSummary = useZoneStore(selectFinanceSummary);
  const financeHistory = useZoneStore((state) => state.financeHistory);
  const devices = useZoneStore((state) => state.devices);
  const [selectedRangeId, setSelectedRangeId] = useState<(typeof TIME_RANGE_OPTIONS)[number]['id']>(
    TIME_RANGE_OPTIONS[0].id,
  );

  const selectedRange = useMemo(
    () =>
      TIME_RANGE_OPTIONS.find((option) => option.id === selectedRangeId) ?? TIME_RANGE_OPTIONS[0],
    [selectedRangeId],
  );

  const rangeEntries = useMemo(() => {
    if (!financeHistory.length) {
      return [] as typeof financeHistory;
    }
    const limit = Math.max(selectedRange.ticks, 1);
    return financeHistory.slice(-limit);
  }, [financeHistory, selectedRange.ticks]);

  const chartData = useMemo(() => {
    return rangeEntries.map((entry) => ({
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
  }, [rangeEntries]);

  const hasHistory = chartData.length > 0;
  const recentEntries = useMemo(() => financeHistory.slice(-10).reverse(), [financeHistory]);
  const latestEntry = financeHistory.at(-1);

  const rangeTotals = useMemo(() => {
    const aggregates = {
      revenue: 0,
      expenses: 0,
      netIncome: 0,
      capex: 0,
      opex: 0,
      maintenance: 0,
      labor: 0,
      utilities: {
        total: 0,
        energy: 0,
        water: 0,
        nutrients: 0,
      },
      maintenanceByDevice: new Map<string, { total: number; blueprintId: string }>(),
    };

    for (const entry of rangeEntries) {
      aggregates.revenue += entry.revenue;
      aggregates.expenses += entry.expenses;
      aggregates.netIncome += entry.netIncome;
      aggregates.capex += entry.capex;
      aggregates.opex += entry.opex;
      aggregates.maintenance += entry.maintenanceTotal;

      aggregates.utilities.energy += entry.utilities.energy;
      aggregates.utilities.water += entry.utilities.water;
      aggregates.utilities.nutrients += entry.utilities.nutrients;
      const utilitiesTotal = entry.utilities.totalCost;
      if (!Number.isNaN(utilitiesTotal)) {
        aggregates.utilities.total += utilitiesTotal;
      }

      const labor = entry.opex - entry.maintenanceTotal - entry.utilities.totalCost;
      if (Number.isFinite(labor) && labor > 0) {
        aggregates.labor += labor;
      }

      for (const detail of entry.maintenanceDetails) {
        if (!detail) {
          continue;
        }
        const existing = aggregates.maintenanceByDevice.get(detail.deviceId);
        const total = (existing?.total ?? 0) + detail.totalCost;
        aggregates.maintenanceByDevice.set(detail.deviceId, {
          blueprintId: detail.blueprintId,
          total,
        });
      }
    }

    if (aggregates.utilities.total <= 0) {
      aggregates.utilities.total =
        aggregates.utilities.energy + aggregates.utilities.water + aggregates.utilities.nutrients;
    }

    const maintenanceBreakdown = Array.from(aggregates.maintenanceByDevice.entries())
      .map(([deviceId, value]) => ({
        deviceId,
        blueprintId: value.blueprintId,
        value: value.total,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      totalRevenue: aggregates.revenue,
      totalExpenses: aggregates.expenses,
      totalNetIncome: aggregates.netIncome,
      totalCapex: aggregates.capex,
      totalOpex: aggregates.opex,
      totalMaintenance: aggregates.maintenance,
      totalLabor: aggregates.labor,
      utilities: aggregates.utilities,
      maintenanceBreakdown,
    };
  }, [rangeEntries]);

  const operatingExpenseItems = useMemo(
    () =>
      [
        { id: 'labor', label: 'Labor', value: rangeTotals.totalLabor },
        { id: 'maintenance', label: 'Maintenance', value: rangeTotals.totalMaintenance },
        { id: 'utilities', label: 'Utilities', value: rangeTotals.utilities.total },
      ].filter((item) => item.value > 0),
    [rangeTotals.totalLabor, rangeTotals.totalMaintenance, rangeTotals.utilities.total],
  );

  const utilitiesItems = useMemo(
    () =>
      [
        { id: 'energy', label: 'Energy', value: rangeTotals.utilities.energy },
        { id: 'water', label: 'Water', value: rangeTotals.utilities.water },
        { id: 'nutrients', label: 'Nutrients', value: rangeTotals.utilities.nutrients },
      ].filter((item) => item.value > 0),
    [rangeTotals.utilities.energy, rangeTotals.utilities.nutrients, rangeTotals.utilities.water],
  );

  const maintenanceItems = useMemo(
    () =>
      rangeTotals.maintenanceBreakdown.slice(0, 6).map((item) => {
        const device = devices[item.deviceId];
        const label = device?.name ?? device?.kind ?? item.deviceId;
        const blueprintLabel = device?.blueprintId ?? item.blueprintId;
        return {
          id: item.deviceId,
          label,
          value: item.value,
          description: blueprintLabel ? `Blueprint: ${blueprintLabel}` : undefined,
        };
      }),
    [devices, rangeTotals.maintenanceBreakdown],
  );

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

      <div className="space-y-3 rounded-lg border border-border/60 bg-surface/60 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Time range
            </p>
            <p className="text-sm text-text-secondary">
              Showing last {rangeEntries.length.toLocaleString()}{' '}
              {rangeEntries.length === 1 ? 'tick' : 'ticks'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TIME_RANGE_OPTIONS.map((option) => {
              const isActive = option.id === selectedRange.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedRangeId(option.id)}
                  aria-pressed={isActive}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-surfaceElevated text-text-primary shadow-soft'
                      : 'bg-surfaceAlt/70 text-text-muted hover:text-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Revenue</p>
            <p className="text-base font-semibold text-text-primary">
              {formatCurrency(rangeTotals.totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Expenses</p>
            <p className="text-base font-semibold text-text-primary">
              {formatCurrency(rangeTotals.totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Net income</p>
            <p
              className={`text-base font-semibold ${
                rangeTotals.totalNetIncome >= 0 ? 'text-positive' : 'text-warning'
              }`}
            >
              {formatCurrency(rangeTotals.totalNetIncome)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Capital expenses</p>
            <p className="text-base font-semibold text-text-primary">
              {formatCurrency(rangeTotals.totalCapex)}
            </p>
          </div>
        </div>
      </div>

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

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Operating expense breakdown"
          description="Distribution of labor, maintenance, and utilities costs for the selected range."
          padding="lg"
          variant="elevated"
        >
          <BreakdownList
            items={operatingExpenseItems}
            total={rangeTotals.totalOpex}
            valueFormatter={(value) => formatCurrency(value)}
            emptyPlaceholder="No operating expense data yet."
          />
        </Panel>
        <Panel
          title="Utilities breakdown"
          description="Energy, water, and nutrient spend across the time window."
          padding="lg"
          variant="elevated"
        >
          <BreakdownList
            items={utilitiesItems}
            total={rangeTotals.utilities.total}
            valueFormatter={(value) => formatCurrency(value)}
            emptyPlaceholder="Utilities costs have not been recorded for this range."
          />
        </Panel>
        <Panel
          title="Maintenance by device"
          description="Top devices incurring maintenance during the selected ticks."
          padding="lg"
          variant="elevated"
        >
          <BreakdownList
            items={maintenanceItems}
            total={rangeTotals.totalMaintenance}
            valueFormatter={(value) => formatCurrency(value)}
            emptyPlaceholder="No maintenance spend tracked in this window."
          />
        </Panel>
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
