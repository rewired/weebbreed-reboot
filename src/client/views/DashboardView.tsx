import { useTranslation } from 'react-i18next';
import { SimulationControls } from '../components/SimulationControls';
import { EnvironmentCharts } from '../components/EnvironmentCharts';
import { PlantTable } from '../components/PlantTable';
import { EventLog } from '../components/EventLog';
import { useSimulationSocket } from '../hooks/useSimulationSocket';
import { useSimulationStore } from '../store/simulationStore';

export const DashboardView = () => {
  const { t } = useTranslation();
  const { sendControl } = useSimulationSocket();
  const envHistory = useSimulationStore((state) => state.envHistory);
  const plants = useSimulationStore((state) => state.plants);
  const events = useSimulationStore((state) => state.events);
  const tick = useSimulationStore((state) => state.tick);
  const isConnected = useSimulationStore((state) => state.isConnected);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>{t('app.title')}</h1>
          <p>
            Tick: {tick} · {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </header>
      <SimulationControls onControl={sendControl} />
      <main className="dashboard__content">
        <EnvironmentCharts samples={envHistory} />
        <div className="dashboard__tables">
          <PlantTable plants={plants} />
          <EventLog events={events} />
        </div>
      </main>
    </div>
  );
};
