import { useMemo } from 'react';
import { Icon } from '@/components/common/Icon';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';

interface ProfitChartProps {
  bridge: SimulationBridge;
  timeRange: '1D' | '1W' | '1M' | '1Y';
}

interface ChartDataPoint {
  tick: number;
  revenue: number;
  expenses: number;
  profit: number;
  cumulativeProfit: number;
  label: string;
}

export const ProfitChart = ({
  bridge: _bridge, // eslint-disable-line @typescript-eslint/no-unused-vars
  timeRange,
}: ProfitChartProps) => {
  const snapshot = useSimulationStore((state) => state.snapshot);

  const chartData = useMemo(() => {
    if (!snapshot?.finances) {
      return {
        dataPoints: [],
        maxProfit: 0,
        minProfit: 0,
        profitTrend: 'stable' as 'up' | 'down' | 'stable',
        revenueGrowth: 0,
        expenseGrowth: 0,
      };
    }

    const finance = snapshot.finances;
    const currentTick = snapshot.clock.tick;

    // Calculate tick range based on timeRange
    let tickRange = 0;
    const ticksPerHour = Math.round(60 / snapshot.metadata.tickLengthMinutes);
    const ticksPerDay = ticksPerHour * 24;

    switch (timeRange) {
      case '1D':
        tickRange = ticksPerDay;
        break;
      case '1W':
        tickRange = ticksPerDay * 7;
        break;
      case '1M':
        tickRange = ticksPerDay * 30;
        break;
      case '1Y':
        tickRange = ticksPerDay * 365;
        break;
    }

    const startTick = Math.max(0, currentTick - tickRange);

    // Filter ledger entries within the time range
    const relevantEntries = finance.ledger.filter(
      (entry) => entry.tick >= startTick && entry.tick <= currentTick,
    );

    // Group entries by tick intervals for aggregation
    const intervalSize = Math.max(1, Math.floor(tickRange / 50)); // Limit to ~50 data points
    const dataPoints: ChartDataPoint[] = [];

    // Initialize running totals
    // Track cumulative values for trend analysis
    // let cumulativeRevenue = 0;
    // let cumulativeExpenses = 0;
    let cumulativeProfit = 0;

    // Aggregate data in intervals
    for (let tick = startTick; tick <= currentTick; tick += intervalSize) {
      const intervalEnd = Math.min(tick + intervalSize - 1, currentTick);
      const intervalEntries = relevantEntries.filter(
        (entry) => entry.tick >= tick && entry.tick <= intervalEnd,
      );

      const intervalRevenue = intervalEntries
        .filter((entry) => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);

      const intervalExpenses = intervalEntries
        .filter((entry) => entry.type === 'expense')
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

      const intervalProfit = intervalRevenue - intervalExpenses;

      // cumulativeRevenue += intervalRevenue;
      // cumulativeExpenses += intervalExpenses;
      cumulativeProfit += intervalProfit;

      // Create readable label based on timeRange
      let label = '';
      if (timeRange === '1D') {
        const hour = Math.floor((tick - startTick) / ticksPerHour) % 24;
        label = `${hour.toString().padStart(2, '0')}:00`;
      } else if (timeRange === '1W') {
        const day = Math.floor((tick - startTick) / ticksPerDay);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        label = dayNames[day % 7] || `Day ${day + 1}`;
      } else if (timeRange === '1M') {
        const day = Math.floor((tick - startTick) / ticksPerDay) + 1;
        label = `Day ${day}`;
      } else {
        const month = Math.floor((tick - startTick) / (ticksPerDay * 30)) + 1;
        label = `Month ${month}`;
      }

      dataPoints.push({
        tick: intervalEnd,
        revenue: intervalRevenue,
        expenses: intervalExpenses,
        profit: intervalProfit,
        cumulativeProfit,
        label,
      });
    }

    // Calculate metrics
    const profits = dataPoints.map((dp) => dp.profit);
    const maxProfit = Math.max(...profits, 0);
    const minProfit = Math.min(...profits, 0);

    // Determine trend
    let profitTrend: 'up' | 'down' | 'stable' = 'stable';
    if (dataPoints.length >= 2) {
      const recentProfit = dataPoints.slice(-3).reduce((sum, dp) => sum + dp.profit, 0);
      const earlierProfit = dataPoints.slice(0, 3).reduce((sum, dp) => sum + dp.profit, 0);
      if (recentProfit > earlierProfit * 1.1) profitTrend = 'up';
      else if (recentProfit < earlierProfit * 0.9) profitTrend = 'down';
    }

    // Calculate growth rates
    const revenueGrowth =
      dataPoints.length >= 2
        ? (dataPoints[dataPoints.length - 1].revenue / Math.max(dataPoints[0].revenue, 1) - 1) * 100
        : 0;

    const expenseGrowth =
      dataPoints.length >= 2
        ? (dataPoints[dataPoints.length - 1].expenses / Math.max(dataPoints[0].expenses, 1) - 1) *
          100
        : 0;

    return {
      dataPoints,
      maxProfit,
      minProfit,
      profitTrend,
      revenueGrowth,
      expenseGrowth,
    };
  }, [snapshot, timeRange]);

  const createSvgPath = (
    points: number[],
    maxValue: number,
    minValue: number,
    height: number,
  ): string => {
    if (points.length < 2) return '';

    const range = maxValue - minValue || 1;
    const width = 100; // SVG viewBox width percentage
    const stepX = width / (points.length - 1);

    const pathData = points
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - minValue) / range) * height;
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');

    return pathData;
  };

  if (chartData.dataPoints.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="trending_up" size={48} className="mx-auto mb-4 text-text-muted" />
        <p className="text-text-muted">No financial data available for the selected time range</p>
        <p className="text-text-muted text-sm mt-2">
          Financial performance will appear here as operations progress
        </p>
      </div>
    );
  }

  const chartHeight = 60;
  const profits = chartData.dataPoints.map((dp) => dp.profit);
  const revenues = chartData.dataPoints.map((dp) => dp.revenue);
  const expenses = chartData.dataPoints.map((dp) => dp.expenses);

  const maxValue = Math.max(...profits, ...revenues, 0);
  const minValue = Math.min(...profits, 0);

  const profitPath = createSvgPath(profits, maxValue, minValue, chartHeight);
  const revenuePath = createSvgPath(revenues, maxValue, minValue, chartHeight);
  const expensePath = createSvgPath(expenses, maxValue, minValue, chartHeight);

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
      {/* Chart Metrics */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-success rounded"></div>
            <span className="text-text-muted">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-danger rounded"></div>
            <span className="text-text-muted">Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary rounded"></div>
            <span className="text-text-muted">Profit</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon(chartData.profitTrend)}
          <span className="text-text-muted">Profit Trend</span>
        </div>
      </div>

      {/* Chart SVG */}
      <div className="relative h-64 bg-surface-muted/20 rounded-lg p-4">
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.1"
                opacity="0.1"
              />
            </pattern>
          </defs>
          <rect width="100" height={chartHeight} fill="url(#grid)" />

          {/* Zero line */}
          {minValue < 0 && (
            <line
              x1="0"
              y1={chartHeight - (-minValue / (maxValue - minValue)) * chartHeight}
              x2="100"
              y2={chartHeight - (-minValue / (maxValue - minValue)) * chartHeight}
              stroke="currentColor"
              strokeWidth="0.2"
              opacity="0.3"
              strokeDasharray="1,1"
            />
          )}

          {/* Revenue line */}
          <path d={revenuePath} fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.8" />

          {/* Expenses line */}
          <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.8" />

          {/* Profit line */}
          <path d={profitPath} fill="none" stroke="#3b82f6" strokeWidth="0.8" />

          {/* Profit area fill */}
          <path
            d={`${profitPath} L 100 ${chartHeight} L 0 ${chartHeight} Z`}
            fill="#3b82f6"
            opacity="0.1"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-text-muted">
          <span>€{maxValue.toLocaleString()}</span>
          <span>€{((maxValue + minValue) / 2).toLocaleString()}</span>
          <span>€{minValue.toLocaleString()}</span>
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-text-muted mt-2">
          <span>{chartData.dataPoints[0]?.label}</span>
          <span>{chartData.dataPoints[Math.floor(chartData.dataPoints.length / 2)]?.label}</span>
          <span>{chartData.dataPoints[chartData.dataPoints.length - 1]?.label}</span>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="text-xs uppercase tracking-wide text-success/80 mb-1">Revenue Growth</div>
          <div
            className={`text-lg font-semibold ${chartData.revenueGrowth >= 0 ? 'text-success' : 'text-danger'}`}
          >
            {chartData.revenueGrowth > 0 ? '+' : ''}
            {chartData.revenueGrowth.toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted">vs period start</div>
        </div>

        <div className="text-center p-3 rounded-lg bg-danger/10 border border-danger/20">
          <div className="text-xs uppercase tracking-wide text-danger/80 mb-1">Expense Growth</div>
          <div
            className={`text-lg font-semibold ${chartData.expenseGrowth <= 0 ? 'text-success' : 'text-danger'}`}
          >
            {chartData.expenseGrowth > 0 ? '+' : ''}
            {chartData.expenseGrowth.toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted">vs period start</div>
        </div>

        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="text-xs uppercase tracking-wide text-primary/80 mb-1">Final Profit</div>
          <div
            className={`text-lg font-semibold ${chartData.dataPoints[chartData.dataPoints.length - 1]?.cumulativeProfit >= 0 ? 'text-success' : 'text-danger'}`}
          >
            €
            {chartData.dataPoints[
              chartData.dataPoints.length - 1
            ]?.cumulativeProfit.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-text-muted">cumulative</div>
        </div>
      </div>
    </div>
  );
};
