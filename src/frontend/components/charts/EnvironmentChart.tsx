import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { EnvironmentPoint } from '../../store/simulationStore.ts';

interface EnvironmentChartProps {
  data: EnvironmentPoint[];
}

export function EnvironmentChart({ data }: EnvironmentChartProps): JSX.Element {
  const formatted = data.map((point) => ({
    ...point,
    time: new Date(point.ts).toLocaleTimeString()
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatted} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="time" stroke="#94a3b8" />
        <YAxis yAxisId="left" stroke="#f97316" domain={['auto', 'auto']} />
        <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" domain={[0, 'auto']} />
        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
        <Legend />
        <Line type="monotone" dataKey="temperature" stroke="#f97316" name="Temperature (°C)" yAxisId="left" dot={false} />
        <Line type="monotone" dataKey="humidity" stroke="#38bdf8" name="Humidity" yAxisId="right" dot={false} />
        <Line type="monotone" dataKey="vpd" stroke="#22d3ee" name="VPD" yAxisId="right" strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="ppfd" stroke="#c084fc" name="PPFD" yAxisId="right" strokeDasharray="2 2" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
