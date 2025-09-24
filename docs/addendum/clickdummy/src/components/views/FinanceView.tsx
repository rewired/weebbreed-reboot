/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { GameData } from '../../types/domain';
import { StatCard } from '../common/StatCard';
import { DollarIcon, ChevronDownIcon, ChevronRightIcon } from '../common/Icons';

// SUB-COMPONENT
const CollapsibleCard = ({
  title,
  total,
  children,
}: {
  title: string;
  total: number;
  children: React.ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="bg-stone-800/30 rounded-lg">
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex justify-between items-center p-4 text-left hover:bg-stone-700/20 rounded-t-lg transition-colors"
      >
        <h3 className="text-xl font-semibold text-stone-100">{title}</h3>
        <div className="flex items-center space-x-4">
          <span className="text-lg font-semibold text-stone-200">{total.toLocaleString()} €</span>
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-stone-700/50">
          <ul className="space-y-2 text-sm">{children}</ul>
        </div>
      )}
    </div>
  );
};

// MAIN COMPONENT
export const FinanceView = ({ gameData }: { gameData: GameData }) => {
  const { finance, globalStats } = gameData;
  const [timeRange, setTimeRange] = useState('1w');
  const timeRangeLabels: Record<string, string> = {
    '1d': '1D',
    '1w': '1W',
    '1m': '1M',
    '1y': '1Y',
  };
  const timeRangeFullLabels: Record<string, string> = {
    '1d': '1 Day',
    '1w': '1 Week',
    '1m': '1 Month',
    '1y': '1 Year',
  };

  const displayFinanceData = useMemo(() => {
    const timeMultipliers: Record<string, number> = {
      '1d': 1 / 7,
      '1w': 1,
      '1m': 30 / 7,
      '1y': 52,
    };
    const multiplier = timeMultipliers[timeRange];
    const base = finance;

    const scale = (value: number) => Math.round(value * multiplier);

    return {
      revenue: {
        total: scale(base.revenue.total),
        breakdown: base.revenue.breakdown.map((item) => ({ ...item, amount: scale(item.amount) })),
      },
      opex: {
        total: scale(base.opex.total),
        breakdown: base.opex.breakdown.map((item) => ({ ...item, amount: scale(item.amount) })),
      },
      capex: {
        total: scale(base.capex.total),
        breakdown: base.capex.breakdown.map((item) => ({ ...item, amount: scale(item.amount) })),
      },
    };
  }, [finance, timeRange]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-stone-100">Financial Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<DollarIcon />}
          title="Total Balance"
          value={globalStats.balance.toLocaleString()}
          unit="€"
          color="green"
        />
        <StatCard
          icon={<span className="material-icons-outlined align-middle text-2xl">trending_up</span>}
          title="Net Income (7d)"
          value={finance.netIncome7d.toLocaleString()}
          unit="€"
          color="cyan"
        />
        <StatCard
          icon={<span className="material-icons-outlined align-middle text-2xl">receipt_long</span>}
          title="OpEx (7d)"
          value={finance.opex7d.toLocaleString()}
          unit="€"
          color="yellow"
        />
        <StatCard
          icon={
            <span className="material-icons-outlined align-middle text-2xl">account_balance</span>
          }
          title="CapEx (7d)"
          value={finance.capex7d.toLocaleString()}
          unit="€"
          color="orange"
        />
      </div>

      <div className="flex justify-end items-center space-x-2">
        {Object.keys(timeRangeLabels).map((key) => (
          <button
            key={key}
            onClick={() => setTimeRange(key)}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeRange === key ? 'bg-lime-600 text-white' : 'bg-stone-700 hover:bg-stone-600 text-stone-300'}`}
          >
            {timeRangeLabels[key]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <CollapsibleCard
          title={`Revenue (${timeRangeFullLabels[timeRange]})`}
          total={displayFinanceData.revenue.total}
        >
          {displayFinanceData.revenue.breakdown.map((item, i) => (
            <li key={i} className="flex justify-between p-2 rounded-md hover:bg-stone-700/30">
              <span className="text-stone-300">{item.item}</span>
              <span className="font-semibold text-green-400">{item.amount.toLocaleString()} €</span>
            </li>
          ))}
        </CollapsibleCard>
        <CollapsibleCard
          title={`Operational Expenses (${timeRangeFullLabels[timeRange]})`}
          total={displayFinanceData.opex.total}
        >
          {displayFinanceData.opex.breakdown.map((item, i) => (
            <li key={i} className="flex justify-between p-2 rounded-md hover:bg-stone-700/30">
              <span className="text-stone-300">{item.item}</span>
              <span className="font-semibold text-yellow-400">
                {item.amount.toLocaleString()} €
              </span>
            </li>
          ))}
        </CollapsibleCard>
        <CollapsibleCard
          title={`Capital Expenses (${timeRangeFullLabels[timeRange]})`}
          total={displayFinanceData.capex.total}
        >
          {displayFinanceData.capex.breakdown.map((item, i) => (
            <li key={i} className="flex justify-between p-2 rounded-md hover:bg-stone-700/30">
              <span className="text-stone-300">{item.item}</span>
              <span className="font-semibold text-orange-400">
                {item.amount.toLocaleString()} €
              </span>
            </li>
          ))}
        </CollapsibleCard>
      </div>
    </div>
  );
};
