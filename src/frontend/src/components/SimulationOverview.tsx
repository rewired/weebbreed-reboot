import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import styles from './SimulationOverview.module.css';

export const SimulationOverview = () => {
  const { t } = useTranslation('simulation');
  const snapshot = useAppStore((state) => state.lastSnapshot);
  const snapshotTimestamp = useAppStore((state) => state.lastSnapshotTimestamp);
  const lastTick = useAppStore((state) => state.lastTickCompleted);
  const plantCount = useAppStore((state) => Object.keys(state.plants).length);
  const zones = useAppStore((state) => state.zones);

  const zoneEntries = useMemo(() => Object.values(zones), [zones]);

  const kpis = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const formatter = snapshotTimestamp
      ? new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

    return [
      {
        key: 'tick',
        label: t('labels.kpis.tick'),
        value: snapshot.tick.toLocaleString(),
      },
      {
        key: 'timestamp',
        label: t('labels.kpis.timestamp'),
        value: formatter && snapshotTimestamp ? formatter.format(snapshotTimestamp) : '—',
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
  }, [lastTick, plantCount, snapshot, snapshotTimestamp, t]);

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
        {zoneEntries.map((zone) => (
          <article key={zone.id} className={styles.zoneCard}>
            <header className={styles.zoneHeader}>
              <h3>{zone.name}</h3>
              <p className={styles.zoneMeta}>
                {t('labels.zonePath', { room: zone.roomName, structure: zone.structureName })}
              </p>
            </header>
            <dl className={styles.zoneMetrics}>
              <div>
                <dt>{t('labels.temperature')}</dt>
                <dd>{zone.environment.temperature.toFixed(1)} °C</dd>
              </div>
              <div>
                <dt>{t('labels.humidity')}</dt>
                <dd>{(zone.environment.relativeHumidity * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt>{t('labels.co2')}</dt>
                <dd>{zone.environment.co2.toLocaleString()} ppm</dd>
              </div>
              <div>
                <dt>{t('labels.ppfd')}</dt>
                <dd>{zone.environment.ppfd.toFixed(0)} µmol·m⁻²·s⁻¹</dd>
              </div>
              <div>
                <dt>{t('labels.vpd')}</dt>
                <dd>{zone.environment.vpd.toFixed(2)} kPa</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
};
