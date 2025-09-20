import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useThrottledValue } from '../hooks/useThrottledValue';
import { useAppStore } from '../store';
import type { SimulationTimelineEntry } from '../store';
import styles from './TelemetryCharts.module.css';

const MAX_POINTS = 120;

const average = (values: Array<number | undefined>): number | undefined => {
  const filtered = values.filter(
    (value): value is number => typeof value === 'number' && !Number.isNaN(value),
  );
  if (!filtered.length) {
    return undefined;
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
};

const downsample = (
  entries: SimulationTimelineEntry[],
  limit: number,
): SimulationTimelineEntry[] => {
  if (entries.length <= limit) {
    return entries;
  }

  const bucketSize = Math.ceil(entries.length / limit);
  const buckets: SimulationTimelineEntry[] = [];

  for (let index = 0; index < entries.length; index += bucketSize) {
    const bucket = entries.slice(index, index + bucketSize);
    const last = bucket[bucket.length - 1];
    buckets.push({
      tick: last.tick,
      ts: Math.round(bucket.reduce((sum, item) => sum + item.ts, 0) / bucket.length),
      zoneId: last.zoneId,
      temperature: average(bucket.map((item) => item.temperature)),
      humidity: average(bucket.map((item) => item.humidity)),
      vpd: average(bucket.map((item) => item.vpd)),
      ppfd: average(bucket.map((item) => item.ppfd)),
      co2: average(bucket.map((item) => item.co2)),
    });
  }

  return buckets;
};

interface ChartPoint {
  ts: number;
  tick: number;
  temperature?: number;
  humidityPercent?: number;
  vpd?: number;
  ppfd?: number;
  co2?: number;
}

const toChartPoints = (entries: SimulationTimelineEntry[]): ChartPoint[] =>
  downsample(entries, MAX_POINTS).map((entry) => ({
    ts: entry.ts,
    tick: entry.tick,
    temperature: entry.temperature,
    humidityPercent: typeof entry.humidity === 'number' ? entry.humidity * 100 : undefined,
    vpd: entry.vpd,
    ppfd: entry.ppfd,
    co2: entry.co2,
  }));

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

export const TelemetryCharts = () => {
  const { t } = useTranslation('simulation');
  const timeline = useAppStore((state) => state.timeline);
  const throttledTimeline = useThrottledValue(timeline, 500);

  const groupedByZone = useMemo(() => {
    const zones = new Map<string, SimulationTimelineEntry[]>();

    for (const entry of throttledTimeline) {
      const zoneId = entry.zoneId ?? 'global';
      const current = zones.get(zoneId) ?? [];
      current.push(entry);
      zones.set(zoneId, current);
    }

    return Array.from(zones.entries()).map(([zoneId, entries]) => ({
      zoneId,
      points: toChartPoints(entries),
    }));
  }, [throttledTimeline]);

  if (!groupedByZone.length) {
    return (
      <section className={styles.telemetry}>
        <header className={styles.header}>
          <h2>{t('charts.title')}</h2>
        </header>
        <p className={styles.placeholder}>{t('charts.noData')}</p>
      </section>
    );
  }

  return (
    <section className={styles.telemetry}>
      <header className={styles.header}>
        <h2>{t('charts.title')}</h2>
        <p className={styles.subtitle}>{t('charts.subtitle')}</p>
      </header>
      <div className={styles.zoneCharts}>
        {groupedByZone.map(({ zoneId, points }) => (
          <article key={zoneId} className={styles.zoneChartCard}>
            <header className={styles.zoneChartHeader}>
              <h3>{t('charts.zoneTitle', { zoneId })}</h3>
              <span className={styles.zoneSampleCount}>
                {t('charts.samples', { count: points.length })}
              </span>
            </header>
            <div className={styles.chartGrid}>
              <div className={styles.chartWrapper}>
                <h4>{t('charts.temperatureHumidity')}</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={points} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                    <XAxis
                      dataKey="ts"
                      tickFormatter={formatTime}
                      minTickGap={32}
                      stroke="rgba(148, 163, 184, 0.7)"
                    />
                    <YAxis
                      yAxisId="temperature"
                      stroke="rgba(248, 250, 252, 0.7)"
                      label={{
                        value: t('charts.axis.temperature'),
                        angle: -90,
                        position: 'insideLeft',
                      }}
                      domain={[0, 'auto']}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="humidity"
                      orientation="right"
                      stroke="rgba(96, 165, 250, 0.7)"
                      label={{
                        value: t('charts.axis.humidity'),
                        angle: -90,
                        position: 'insideRight',
                      }}
                      domain={[0, 100]}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        `${t('charts.tooltip.tick')} ${formatTime(value as number)}`
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      yAxisId="temperature"
                      dataKey="temperature"
                      name={t('labels.temperature')}
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      yAxisId="humidity"
                      dataKey="humidityPercent"
                      name={t('labels.humidity')}
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.chartWrapper}>
                <h4>{t('charts.vpdLight')}</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={points} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                    <XAxis
                      dataKey="ts"
                      tickFormatter={formatTime}
                      minTickGap={32}
                      stroke="rgba(148, 163, 184, 0.7)"
                    />
                    <YAxis
                      yAxisId="vpd"
                      stroke="rgba(248, 250, 252, 0.7)"
                      label={{ value: t('charts.axis.vpd'), angle: -90, position: 'insideLeft' }}
                      allowDecimals
                    />
                    <YAxis
                      yAxisId="ppfd"
                      orientation="right"
                      stroke="rgba(190, 242, 100, 0.7)"
                      label={{ value: t('charts.axis.ppfd'), angle: -90, position: 'insideRight' }}
                      allowDecimals
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        `${t('charts.tooltip.tick')} ${formatTime(value as number)}`
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      yAxisId="vpd"
                      dataKey="vpd"
                      name={t('labels.vpd')}
                      stroke="#facc15"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      yAxisId="ppfd"
                      dataKey="ppfd"
                      name={t('labels.ppfd')}
                      stroke="#bef264"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
