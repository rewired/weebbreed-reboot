import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './App.module.css';
import { EventLog } from './components/EventLog';
import { ModalRoot } from './components/ModalRoot';
import { NavigationTabs } from './components/NavigationTabs';
import { SimulationControls } from './components/SimulationControls';
import { SimulationOverview } from './components/SimulationOverview';
import { TelemetryCharts } from './components/TelemetryCharts';
import { TelemetryTable } from './components/TelemetryTable';
import { useSimulationBridge } from './hooks/useSimulationBridge';
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
  const { t } = useTranslation(['common', 'simulation']);
  const currentView = useAppStore((state) => state.currentView);
  const bridge = useSimulationBridge({ autoConnect: true });

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('common:appTitle')}</h1>
          <p className={styles.subtitle}>{t('common:tagline')}</p>
        </div>
        <div className={styles.status}>
          <span className={styles.statusLabel}>{t('simulation:labels.connectionStatus')}</span>
          <span className={`${styles.statusValue} ${styles[bridge.status] ?? ''}`}>
            {t(`simulation:connection.${bridge.status}`)}
            {bridge.socketId ? ` · ${bridge.socketId}` : ''}
          </span>
        </div>
      </header>

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

        {currentView === 'zones' ? (
          <PlaceholderView translationKey="views.zonesComingSoon" />
        ) : null}

        {currentView === 'plants' ? (
          <PlaceholderView translationKey="views.plantsComingSoon" />
        ) : null}

        {currentView === 'devices' ? (
          <PlaceholderView translationKey="views.devicesComingSoon" />
        ) : null}

        {currentView === 'settings' ? (
          <PlaceholderView translationKey="views.settingsDescription" />
        ) : null}
      </main>

      <ModalRoot bridge={bridge} />
    </div>
  );
};

export default App;
