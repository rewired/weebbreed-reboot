import { useTranslation } from 'react-i18next';
import { useSimulationStore } from '../store/simulationStore.ts';
import { EnvironmentChart } from '../components/charts/EnvironmentChart.tsx';
import { PlantTable } from '../components/tables/PlantTable.tsx';
import { EventList } from '../components/events/EventList.tsx';

export function DashboardView(): JSX.Element {
  const { t } = useTranslation();
  const zones = useSimulationStore((state) => state.zones);
  const environmentHistory = useSimulationStore((state) => state.environmentHistory);
  const events = useSimulationStore((state) => state.events);

  return (
    <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
      <section>
        <h2>{t('dashboard.environment')}</h2>
        {zones.map((zone) => (
          <div key={zone.id} style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>{zone.name}</h3>
            <EnvironmentChart data={environmentHistory[zone.id] ?? []} />
          </div>
        ))}
      </section>
      <section>
        <h2>{t('dashboard.plants')}</h2>
        <PlantTable zones={zones} />
      </section>
      <section>
        <h2>{t('dashboard.events')}</h2>
        <EventList events={events} />
      </section>
    </div>
  );
}
