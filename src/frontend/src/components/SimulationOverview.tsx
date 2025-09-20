import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import styles from './SimulationOverview.module.css';

export const SimulationOverview = () => {
  const { t } = useTranslation('simulation');
  const snapshot = useAppStore((state) => state.lastSnapshot);
  const lastTick = useAppStore((state) => state.lastTickCompleted);
  const plantCount = useAppStore((state) => Object.keys(state.plants).length);
  const zones = useAppStore((state) => state.zones);

  const zoneEntries = useMemo(() => Object.values(zones), [zones]);

  const kpis = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return [
      {
        key: 'tick',
        label: t('labels.kpis.tick'),
        value: snapshot.tick.toLocaleString(),
      },
      {
        key: 'timestamp',
        label: t('labels.kpis.timestamp'),
        value: formatter.format(snapshot.ts),
      },
      {
        key: 'plants',
        label: t('labels.kpis.plants'),
        value: plantCount.toLocaleString(),
      },
      {
        key: 'duration',
        label: t('labels.kpis.tickDuration'),
        value: lastTick?.durationMs ? `${lastTick.durationMs.toFixed(1)} ms` : '—',
        hint: lastTick?.queuedTicks
          ? t('labels.kpis.queuedTicks', { count: lastTick.queuedTicks })
          : undefined,
      },
    ];
  }, [lastTick, plantCount, snapshot, t]);

  if (!snapshot) {
    return (
      <section className={styles.dashboard}>
        <header className={styles.header}>
          <div>
            <h2>{t('labels.overview')}</h2>
            <p className={styles.meta}>{t('labels.noData')}</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h2>{t('labels.overview')}</h2>
          <p className={styles.meta}>{t('labels.latestTick', { tick: snapshot.tick })}</p>
        </div>
      </header>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <article key={kpi.key} className={styles.kpiCard} aria-live="polite">
            <p className={styles.kpiLabel}>{kpi.label}</p>
            <p className={styles.kpiValue}>{kpi.value}</p>
            {kpi.hint ? <p className={styles.kpiHint}>{kpi.hint}</p> : null}
          </article>
        ))}
      </div>

      <div className={styles.zoneGrid}>
        {zoneEntries.map((env) => (
          <article key={env.zoneId} className={styles.zoneCard}>
            <header className={styles.zoneHeader}>
              <h3>{t('labels.zoneTitle', { zoneId: env.zoneId })}</h3>
            </header>
            <dl className={styles.zoneMetrics}>
              <div>
                <dt>{t('labels.temperature')}</dt>
                <dd>{env.temperature.toFixed(1)} °C</dd>
              </div>
              <div>
                <dt>{t('labels.humidity')}</dt>
                <dd>{(env.humidity * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt>{t('labels.co2')}</dt>
                <dd>{env.co2.toLocaleString()} ppm</dd>
              </div>
              <div>
                <dt>{t('labels.ppfd')}</dt>
                <dd>{env.ppfd.toFixed(0)} µmol·m⁻²·s⁻¹</dd>
              </div>
              <div>
                <dt>{t('labels.vpd')}</dt>
                <dd>{env.vpd?.toFixed(2) ?? '—'} kPa</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
};
