import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardView } from './views/DashboardView.tsx';
import { useSimulationSocket } from './hooks/useSimulationSocket.ts';
import { SimulationControls } from './components/controls/SimulationControls.tsx';
import { useSimulationStore } from './store/simulationStore.ts';
import './styles/global.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4050';

export default function App(): JSX.Element {
  const { t } = useTranslation();
  const { sendControl } = useSimulationSocket(SOCKET_URL);
  const tick = useSimulationStore((state) => state.tick);

  const subtitle = useMemo(() => t('dashboard.tickLabel', { count: tick }), [t, tick]);

  return (
    <div className="app-shell" style={{ padding: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>{t('app.title')}</h1>
          <small>{subtitle}</small>
        </div>
        <SimulationControls onControl={sendControl} />
      </header>
      <main>
        <DashboardView />
      </main>
    </div>
  );
}
