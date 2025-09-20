import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { EnvironmentSample } from '../store/simulationStore';

interface EnvironmentChartsProps {
  samples: EnvironmentSample[];
}

const formatTimestamp = (value: number) => new Date(value).toLocaleTimeString();

export const EnvironmentCharts = ({ samples }: EnvironmentChartsProps) => {
  const { t } = useTranslation();
  const grouped = useMemo(() => {
    const map = new Map<string, EnvironmentSample[]>();
    samples.forEach((sample) => {
      const list = map.get(sample.zoneId) ?? [];
      list.push(sample);
      map.set(sample.zoneId, list);
    });
    return Array.from(map.entries());
  }, [samples]);

  return (
    <div className="charts">
      {grouped.map(([zoneId, data]) => (
        <div className="charts__panel" key={zoneId}>
          <h3>{t('metrics.environment')} — {zoneId}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ts" tickFormatter={formatTimestamp} minTickGap={32} />
              <YAxis yAxisId="left" domain={[0, 'auto']} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} />
              <Tooltip labelFormatter={(value) => formatTimestamp(Number(value))} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="temperature" name={t('chart.temperature')} stroke="#ef4444" dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="humidity" name={t('chart.humidity')} stroke="#22c55e" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="co2" name={t('chart.co2')} stroke="#0ea5e9" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="ppfd" name={t('chart.ppfd')} stroke="#f97316" dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="vpd" name={t('chart.vpd')} stroke="#6366f1" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
};
