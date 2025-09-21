import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './App.module.css';
import { EventLog } from './components/EventLog';
import { ModalRoot } from './components/ModalRoot';
import { SimulationControls } from './components/SimulationControls';
import { SimulationOverview } from './components/SimulationOverview';
import { TelemetryCharts } from './components/TelemetryCharts';
import { TelemetryTable } from './components/TelemetryTable';
import { WorldExplorer } from './components/WorldExplorer';
import { PersonnelView } from './components/PersonnelView';
import { FinanceView } from './components/FinanceView';
import { Dashboard } from './components/Dashboard';
import { NavigationTabs } from './components/NavigationTabs';
import { useSimulationBridge } from './hooks/useSimulationBridge';
import { SOCKET_URL } from './config/socket';
import { useAppStore } from './store';

const PlaceholderView = ({ translationKey }: { translationKey: string }) => {
  const { t } = useTranslation('simulation');

  return (
    <section className={styles.placeholder}>
      <h2>{t('labels.inDevelopment')}</h2>
      <p>{t(translationKey)}</p>
    </section>
  );
};

const App = () => {
  const currentView = useAppStore((state) => state.currentView);
  const bridge = useSimulationBridge({ autoConnect: true, url: SOCKET_URL });

  return (
    <div className={styles.app}>
      <Dashboard bridge={bridge} />
      <NavigationTabs />

      <main className={styles.main}>
        {currentView === 'overview' ? (
          <Fragment>
            <SimulationControls bridge={bridge} />
            <SimulationOverview />
            <TelemetryCharts />
            <TelemetryTable />
            <EventLog />
          </Fragment>
        ) : null}

        {currentView === 'world' ? <WorldExplorer /> : null}

        {currentView === 'personnel' ? <PersonnelView /> : null}

        {currentView === 'finance' ? <FinanceView /> : null}

        {currentView === 'settings' ? (
          <PlaceholderView translationKey="views.settingsDescription" />
        ) : null}
      </main>

      <ModalRoot />
    </div>
  );
};

export default App;
