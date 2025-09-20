import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';
import { useAppStore } from '../store';
import styles from './FinanceView.module.css';

export const FinanceView = () => {
  const { t } = useTranslation('simulation');
  const financeSummary = useAppStore((state) => state.financeSummary);
  const financeHistory = useAppStore((state) => state.financeHistory);
  const openModal = useAppStore((state) => state.openModal);

  const historyData = useMemo(() => financeHistory.slice(-60), [financeHistory]);
  const latestMaintenance = historyData.length
    ? historyData[historyData.length - 1].maintenanceDetails
    : [];

  const netIncomeSeries = useMemo(
    () =>
      historyData.map((entry) => ({
        tick: entry.tick,
        net: entry.netIncome,
        revenue: entry.revenue,
        expenses: entry.expenses,
      })),
    [historyData],
  );

  return (
    <section className={styles.financeView}>
      <header className={styles.header}>
        <div>
          <h2>{t('labels.finance')}</h2>
          <p className={styles.subheader}>{t('labels.financeDescription')}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() =>
              openModal({
                kind: 'createEntity',
                autoPause: true,
                payload: { entity: 'sellInventory' },
                title: t('modals.recordSaleTitle'),
              })
            }
          >
            {t('actions.recordSale')}
          </button>
          <button
            type="button"
            onClick={() =>
              openModal({
                kind: 'createEntity',
                autoPause: true,
                payload: { entity: 'setUtilityPrices' },
                title: t('modals.utilityPriceTitle'),
              })
            }
          >
            {t('actions.adjustUtilities')}
          </button>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <h3>{t('labels.cashOnHand')}</h3>
          <p className={styles.summaryValue}>
            {financeSummary?.cashOnHand.toLocaleString(undefined, { minimumFractionDigits: 2 }) ??
              '—'}
          </p>
          <p className={styles.summaryHint}>
            {t('labels.reservedCash', {
              value:
                financeSummary?.reservedCash?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                }) ?? '0',
            })}
          </p>
        </article>
        <article className={styles.summaryCard}>
          <h3>{t('labels.totalRevenue')}</h3>
          <p className={styles.summaryValue}>
            {financeSummary?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) ??
              '—'}
          </p>
          <p className={styles.summaryHint}>
            {t('labels.lastTickRevenue', {
              value: financeSummary?.lastTickRevenue?.toFixed(2) ?? '0.00',
            })}
          </p>
        </article>
        <article className={styles.summaryCard}>
          <h3>{t('labels.totalExpenses')}</h3>
          <p className={styles.summaryValue}>
            {financeSummary?.totalExpenses.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            }) ?? '—'}
          </p>
          <p className={styles.summaryHint}>
            {t('labels.lastTickExpenses', {
              value: financeSummary?.lastTickExpenses?.toFixed(2) ?? '0.00',
            })}
          </p>
        </article>
        <article className={styles.summaryCard}>
          <h3>{t('labels.netIncome')}</h3>
          <p className={styles.summaryValue}>
            {financeSummary?.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 }) ??
              '—'}
          </p>
          <p className={styles.summaryHint}>{t('labels.netIncomeHint')}</p>
        </article>
      </section>

      <section className={styles.chartSection}>
        <header>
          <h3>{t('labels.revenueVsExpenses')}</h3>
        </header>
        {netIncomeSeries.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noFinanceHistory')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={netIncomeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
              <XAxis dataKey="tick" stroke="rgba(148,163,184,0.7)" />
              <YAxis stroke="rgba(148,163,184,0.7)" />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(148,163,184,0.2)',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="rgba(34,197,94,0.85)"
                strokeWidth={2}
                dot={false}
                name={t('labels.revenue')}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="rgba(239,68,68,0.85)"
                strokeWidth={2}
                dot={false}
                name={t('labels.expenses')}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="rgba(59,130,246,0.9)"
                strokeWidth={2}
                dot={false}
                name={t('labels.netIncomeShort')}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className={styles.areaSection}>
        <header>
          <h3>{t('labels.utilityCosts')}</h3>
        </header>
        {historyData.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noFinanceHistory')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
              <XAxis dataKey="tick" stroke="rgba(148,163,184,0.7)" />
              <YAxis stroke="rgba(148,163,184,0.7)" />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(148,163,184,0.2)',
                }}
                formatter={(value: number, key: string) => [
                  `${value.toFixed(2)}`,
                  t(`labels.utility.${key}`),
                ]}
              />
              <Area
                type="monotone"
                dataKey="utilities.energy"
                stackId="1"
                stroke="#facc15"
                fill="rgba(250, 204, 21, 0.4)"
                name={t('labels.utility.energy')}
              />
              <Area
                type="monotone"
                dataKey="utilities.water"
                stackId="1"
                stroke="#38bdf8"
                fill="rgba(56, 189, 248, 0.45)"
                name={t('labels.utility.water')}
              />
              <Area
                type="monotone"
                dataKey="utilities.nutrients"
                stackId="1"
                stroke="#a855f7"
                fill="rgba(168, 85, 247, 0.4)"
                name={t('labels.utility.nutrients')}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className={styles.maintenanceSection}>
        <header>
          <h3>{t('labels.recentMaintenance')}</h3>
          <span className={styles.count}>
            {t('labels.count', { count: latestMaintenance.length })}
          </span>
        </header>
        {latestMaintenance.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noMaintenanceRecords')}</p>
        ) : (
          <div className={styles.maintenanceGrid}>
            {latestMaintenance.map((record) => (
              <article key={record.deviceId} className={styles.maintenanceCard}>
                <header>
                  <h4>{record.deviceId}</h4>
                  <span>{record.blueprintId}</span>
                </header>
                <dl>
                  <div>
                    <dt>{t('labels.cost')}</dt>
                    <dd>{record.totalCost.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>{t('labels.degradationMultiplier')}</dt>
                    <dd>{record.degradationMultiplier.toFixed(2)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.historySection}>
        <header>
          <h3>{t('labels.recentFinanceHistory')}</h3>
        </header>
        {historyData.length === 0 ? (
          <p className={styles.emptyState}>{t('labels.noFinanceHistory')}</p>
        ) : (
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>{t('labels.tick')}</th>
                <th>{t('labels.revenue')}</th>
                <th>{t('labels.expenses')}</th>
                <th>{t('labels.netIncomeShort')}</th>
                <th>{t('labels.capex')}</th>
                <th>{t('labels.opex')}</th>
              </tr>
            </thead>
            <tbody>
              {historyData
                .slice()
                .reverse()
                .map((entry) => (
                  <tr key={entry.tick}>
                    <td>#{entry.tick.toLocaleString()}</td>
                    <td>{entry.revenue.toFixed(2)}</td>
                    <td>{entry.expenses.toFixed(2)}</td>
                    <td className={entry.netIncome >= 0 ? styles.positive : styles.negative}>
                      {entry.netIncome.toFixed(2)}
                    </td>
                    <td>{entry.capex.toFixed(2)}</td>
                    <td>{entry.opex.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};
