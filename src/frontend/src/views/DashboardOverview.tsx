import Card from '@/components/Card';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsBar from '@/components/MetricsBar';
import Panel from '@/components/Panel';
import {
  selectAlertCount,
  selectCapital,
  selectCurrentTick,
  selectCumulativeYield,
  selectTimeStatus,
  useAppStore,
} from '@/store';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const DashboardOverview = () => {
  const timeStatus = useAppStore(selectTimeStatus);
  const currentTick = useAppStore(selectCurrentTick);
  const cashOnHand = useAppStore(selectCapital);
  const cumulativeYield = useAppStore(selectCumulativeYield);
  const alertCount = useAppStore(selectAlertCount);
  const structures = useAppStore((state) => Object.values(state.structures));
  const rooms = useAppStore((state) => Object.values(state.rooms));
  const zones = useAppStore((state) => Object.values(state.zones));
  const plants = useAppStore((state) => Object.values(state.plants));

  const headerStatus =
    timeStatus === undefined
      ? undefined
      : {
          label: timeStatus.paused ? 'Paused' : timeStatus.speed > 1 ? 'Fast forward' : 'Running',
          tone: timeStatus.paused ? 'warning' : 'positive',
          tooltip: timeStatus.paused
            ? 'Simulation is currently paused'
            : `Tick rate: ${timeStatus.targetTickRate.toFixed(0)}x (speed ${timeStatus.speed.toFixed(2)})`,
        };

  const overviewMetrics = [
    {
      id: 'tick',
      label: 'Current tick',
      value: currentTick,
    },
    {
      id: 'capital',
      label: 'Cash on hand',
      value: currencyFormatter.format(cashOnHand),
    },
    {
      id: 'yield',
      label: 'Cumulative dry yield',
      value: `${decimalFormatter.format(cumulativeYield)} g`,
    },
    {
      id: 'alerts',
      label: 'Active alerts',
      value: alertCount,
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Facility overview"
        subtitle="High-level snapshot of structures, rooms, and grow zones across the simulation."
        status={headerStatus}
        meta={[
          { label: 'Structures', value: structures.length.toLocaleString() },
          { label: 'Rooms', value: rooms.length.toLocaleString() },
          { label: 'Zones', value: zones.length.toLocaleString() },
          { label: 'Plants', value: plants.length.toLocaleString() },
        ]}
      />

      <MetricsBar metrics={overviewMetrics} layout="compact" />

      <Panel
        title="Zones"
        description="Live environment readings, resource levels, and stress indicators for each active zone."
        padding="lg"
        variant="elevated"
      >
        {zones.length === 0 ? (
          <p className="text-sm text-text-muted">
            No zones available yet. Create a zone to start monitoring.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {zones.map((zone) => {
              const stressLevel = Math.max(0, Math.min(zone.metrics.stressLevel ?? 0, 1));
              const lightingCoverage = zone.lighting?.coverageRatio;
              const plantingPlan = zone.plantingPlan;

              return (
                <Card
                  key={zone.id}
                  title={zone.name}
                  subtitle={`${zone.structureName} • ${zone.roomName}`}
                  metadata={[
                    { label: 'Area', value: `${decimalFormatter.format(zone.area)} m²` },
                    { label: 'Volume', value: `${decimalFormatter.format(zone.volume)} m³` },
                    { label: 'Plants', value: zone.plants.length.toLocaleString() },
                    {
                      label: 'Lighting coverage',
                      value:
                        lightingCoverage !== undefined
                          ? percentageFormatter.format(Math.max(0, Math.min(lightingCoverage, 1)))
                          : '—',
                    },
                  ]}
                  footer={`Last update: tick ${zone.metrics.lastUpdatedTick.toLocaleString()}`}
                >
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">Temperature</p>
                      <p className="text-base font-medium text-text-primary">
                        {zone.environment.temperature.toFixed(1)} °C
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">Humidity</p>
                      <p className="text-base font-medium text-text-primary">
                        {(zone.environment.relativeHumidity * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">CO₂</p>
                      <p className="text-base font-medium text-text-primary">
                        {zone.environment.co2.toLocaleString()} ppm
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">PPFD</p>
                      <p className="text-base font-medium text-text-primary">
                        {zone.environment.ppfd.toFixed(0)} μmol·m⁻²·s⁻¹
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">VPD proxy</p>
                      <p className="text-base font-medium text-text-primary">
                        {zone.environment.vpd.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">Plan</p>
                      <p className="text-base font-medium text-text-primary">
                        {plantingPlan
                          ? `${plantingPlan.count} × ${plantingPlan.strainId}`
                          : 'Manual'}
                      </p>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                        <span>Stress level</span>
                        <span>{percentageFormatter.format(stressLevel)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-border/30">
                        <div
                          className="h-2 rounded-full bg-warning"
                          style={{ width: `${Math.round(stressLevel * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default DashboardOverview;
