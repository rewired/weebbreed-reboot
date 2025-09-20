import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import type { SimulationEnvironmentSnapshot } from '../types/simulation';
import styles from './SimulationOverview.module.css';

const formatTimestamp = (timestamp: number) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch (error) {
    return String(timestamp);
  }
};

const normalizeEnv = (
  env?: SimulationEnvironmentSnapshot | SimulationEnvironmentSnapshot[],
): SimulationEnvironmentSnapshot[] => {
  if (!env) {
    return [];
  }

  return Array.isArray(env) ? env : [env];
};

export const SimulationOverview = () => {
  const { t } = useTranslation('simulation');
  const snapshot = useAppStore((state) => state.lastSnapshot);
  const lastTick = useAppStore((state) => state.lastTickCompleted);
  const plantCount = useAppStore((state) => Object.keys(state.plants).length);

  const environments = useMemo(() => normalizeEnv(snapshot?.env), [snapshot]);

  if (!snapshot) {
    return (
      <section className={styles.card}>
        <header className={styles.header}>
          <h2>{t('labels.overview')}</h2>
        </header>
        <p className={styles.placeholder}>{t('labels.noData')}</p>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <h2>{t('labels.overview')}</h2>
          <p className={styles.meta}>{t('labels.latestTick', { tick: snapshot.tick })}</p>
        </div>
        <div className={styles.metrics}>
          <div>
            <span className={styles.metricLabel}>{t('labels.tickTimestamp')}</span>
            <span className={styles.metricValue}>{formatTimestamp(snapshot.ts)}</span>
          </div>
          <div>
            <span className={styles.metricLabel}>{t('labels.plantCount')}</span>
            <span className={styles.metricValue}>{plantCount}</span>
          </div>
          {lastTick?.durationMs ? (
            <div>
              <span className={styles.metricLabel}>{t('labels.tickDuration')}</span>
              <span className={styles.metricValue}>{lastTick.durationMs.toFixed(1)} ms</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.environments}>
        {environments.map((env) => (
          <article key={env.zoneId} className={styles.environmentCard}>
            <header className={styles.environmentHeader}>
              <h3>{t('labels.zoneTitle', { zoneId: env.zoneId })}</h3>
            </header>
            <dl className={styles.environmentMetrics}>
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
