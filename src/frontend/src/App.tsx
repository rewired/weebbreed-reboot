import { useEffect, useMemo, useState } from 'react';
import DashboardControls from '@/components/DashboardControls';
import Navigation from '@/components/Navigation';
import Panel from '@/components/Panel';
import TimeDisplay from '@/components/TimeDisplay';
import { useSimulationBridge } from '@/hooks/useSimulationBridge';
import { OFFLINE_BOOTSTRAP } from '@/fixtures/offlineBootstrap';
import DashboardOverview from '@/views/DashboardOverview';
import FinancesView from '@/views/FinancesView';
import PersonnelView from '@/views/PersonnelView';
import ZoneDetail from '@/views/ZoneDetail';
import {
  selectAlertCount,
  selectCurrentSpeed,
  selectCurrentTick,
  selectIsPaused,
  selectLastTickEvent,
  selectRecentEvents,
  selectTargetTickRate,
  useAppStore,
  useGameStore,
  usePersonnelStore,
  useZoneStore,
  type NavigationView,
} from '@/store';
import { formatInGameTime } from '@/store/utils/time';

const EVENT_LEVEL_CLASS: Record<string, string> = {
  debug: 'text-text-muted',
  info: 'text-text-secondary',
  warning: 'text-warning',
  error: 'text-danger',
};

const toRunState = (isPaused: boolean, speed: number): 'running' | 'paused' | 'fastForward' => {
  if (isPaused) {
    return 'paused';
  }
  if (speed > 1.01) {
    return 'fastForward';
  }
  return 'running';
};

const toTimeDisplayStatus = (
  runState: 'running' | 'paused' | 'fastForward',
): 'live' | 'paused' | 'fastForward' => {
  if (runState === 'paused') {
    return 'paused';
  }
  if (runState === 'fastForward') {
    return 'fastForward';
  }
  return 'live';
};

const formatTimestamp = (ts?: number) => {
  if (!ts) {
    return '—';
  }
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    console.warn('[App] Failed to format timestamp', error);
    return '—';
  }
};

const App = () => {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { connect, disconnect } = useSimulationBridge({ autoConnect: false });

  const ingestGameUpdate = useGameStore((state) => state.ingestUpdate);
  const ingestZoneUpdate = useZoneStore((state) => state.ingestUpdate);
  const ingestPersonnelUpdate = usePersonnelStore((state) => state.ingestUpdate);
  const recordFinanceTick = useZoneStore((state) => state.recordFinanceTick);
  const requestTickLength = useGameStore((state) => state.requestTickLength);
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);

  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const currentTick = useGameStore(selectCurrentTick);
  const lastClockSnapshot = useGameStore((state) => state.lastClockSnapshot);
  const lastTickEvent = useGameStore(selectLastTickEvent);
  const recentEvents = useGameStore(selectRecentEvents(12));
  const alertCount = useGameStore(selectAlertCount);
  const targetTickRate = useGameStore(selectTargetTickRate);
  const currentSpeed = useGameStore(selectCurrentSpeed);
  const isPaused = useGameStore(selectIsPaused);
  const tickLengthMinutes = useGameStore(
    (state) => state.lastRequestedTickLength ?? OFFLINE_BOOTSTRAP.tickLengthMinutes,
  );

  const structures = useZoneStore((state) => Object.values(state.structures));
  const rooms = useZoneStore((state) => Object.values(state.rooms));
  const zones = useZoneStore((state) => Object.values(state.zones));
  const plantCount = useZoneStore((state) => Object.values(state.plants).length);

  const personnel = usePersonnelStore((state) => state.personnel);
  const employeeCount = personnel?.employees?.length ?? 0;
  const applicantCount = personnel?.applicants?.length ?? 0;

  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const zonesLoaded = zones.length > 0;

  useEffect(() => {
    if (bootstrapped || zonesLoaded) {
      return;
    }

    ingestGameUpdate(OFFLINE_BOOTSTRAP.update);
    ingestZoneUpdate(OFFLINE_BOOTSTRAP.update);
    ingestPersonnelUpdate(OFFLINE_BOOTSTRAP.update);
    for (const entry of OFFLINE_BOOTSTRAP.financeHistory) {
      recordFinanceTick(entry);
    }
    requestTickLength(OFFLINE_BOOTSTRAP.tickLengthMinutes);
    setConnectionStatus('connected');
    setBootstrapped(true);
  }, [
    bootstrapped,
    zonesLoaded,
    ingestGameUpdate,
    ingestZoneUpdate,
    ingestPersonnelUpdate,
    recordFinanceTick,
    requestTickLength,
    setConnectionStatus,
  ]);

  const runState = toRunState(isPaused, currentSpeed);
  const timeDisplayStatus = toTimeDisplayStatus(runState);
  const connectionLabel =
    bootstrapped && connectionStatus === 'connected' ? 'connected (fixture)' : connectionStatus;

  const simulationTimeLabel = formatInGameTime(currentTick);
  const realTimeLabel = lastClockSnapshot
    ? new Date(lastClockSnapshot.lastUpdatedAt).toLocaleString()
    : undefined;

  const timeMeta = useMemo(
    () => [
      { label: 'Zones', value: zones.length.toLocaleString() },
      { label: 'Plants', value: plantCount.toLocaleString() },
      { label: 'Alerts', value: alertCount.toLocaleString() },
    ],
    [alertCount, plantCount, zones.length],
  );

  const navigationItems = useMemo(
    () => [
      { id: 'overview' as NavigationView, label: 'Overview' },
      {
        id: 'world' as NavigationView,
        label: 'Zones',
        badge: zones.length ? zones.length.toLocaleString() : undefined,
      },
      {
        id: 'personnel' as NavigationView,
        label: 'Personnel',
        badge: employeeCount ? employeeCount.toLocaleString() : undefined,
      },
      { id: 'finance' as NavigationView, label: 'Finances' },
    ],
    [employeeCount, zones.length],
  );

  const handleSelectView = (viewId: string) => {
    setCurrentView(viewId as NavigationView);
  };

  const issueControlCommand = useGameStore((state) => state.issueControlCommand);

  const handlePlay = () => issueControlCommand({ action: 'play' });
  const handlePause = () => issueControlCommand({ action: 'pause' });
  const handleStep = () => issueControlCommand({ action: 'step', ticks: 1 });
  const handleFastForward = () =>
    issueControlCommand({ action: 'fastForward', multiplier: Math.max(2, targetTickRate * 2) });
  const handleTickLengthChange = (minutes: number) => {
    requestTickLength(minutes);
  };

  const activeView = useMemo(() => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview />;
      case 'world':
        return <ZoneDetail />;
      case 'personnel':
        return <PersonnelView />;
      case 'finance':
        return <FinancesView />;
      default:
        return <DashboardOverview />;
    }
  }, [currentView]);

  const eventList = useMemo(() => {
    if (!recentEvents.length) {
      return (
        <p className="text-sm text-text-muted">
          No events recorded yet. Incoming telemetry will appear here.
        </p>
      );
    }

    return (
      <ul className="space-y-3">
        {recentEvents.map((event, index) => {
          const toneClass = EVENT_LEVEL_CLASS[event.level ?? 'info'] ?? EVENT_LEVEL_CLASS.info;
          return (
            <li key={`${event.ts ?? index}-${event.type}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-sm font-medium ${toneClass}`}>{event.type}</span>
                <span className="text-xs text-text-muted">{formatTimestamp(event.ts)}</span>
              </div>
              {event.message ? (
                <p className="text-sm text-text-secondary">{event.message}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }, [recentEvents]);

  const facilitySummary = useMemo(
    () => [
      { label: 'Structures', value: structures.length.toLocaleString() },
      { label: 'Rooms', value: rooms.length.toLocaleString() },
      { label: 'Zones', value: zones.length.toLocaleString() },
      { label: 'Plants', value: plantCount.toLocaleString() },
      { label: 'Employees', value: employeeCount.toLocaleString() },
      { label: 'Applicants', value: applicantCount.toLocaleString() },
    ],
    [applicantCount, employeeCount, plantCount, rooms.length, structures.length, zones.length],
  );

  const lastTickDuration = lastTickEvent?.durationMs
    ? `${lastTickEvent.durationMs.toFixed(0)} ms`
    : '—';

  return (
    <main className="min-h-screen bg-background font-sans text-text-primary">
      <div className="mx-auto max-w-layout space-y-8 px-6 py-10">
        <TimeDisplay
          tick={currentTick}
          simulationTimeLabel={simulationTimeLabel}
          realTimeLabel={realTimeLabel}
          status={timeDisplayStatus}
          tickLengthMinutes={Math.round(tickLengthMinutes)}
          meta={timeMeta}
          prefix={<span className="text-sm text-text-muted">Connection: {connectionLabel}</span>}
        />

        <DashboardControls
          state={runState}
          onPlay={handlePlay}
          onPause={handlePause}
          onStep={handleStep}
          onFastForward={handleFastForward}
          tickLengthMinutes={Math.round(tickLengthMinutes)}
          minTickLength={1}
          maxTickLength={120}
          onTickLengthChange={handleTickLengthChange}
          footer={`Target tick rate: ${targetTickRate.toFixed(1)}x • Last tick duration: ${lastTickDuration}`}
        />

        <Navigation
          items={navigationItems}
          activeItemId={currentView}
          onSelect={handleSelectView}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-6">{activeView}</div>
          <aside className="space-y-6">
            <Panel
              title="Simulation link"
              description="Socket bridge controls for the live simulation backend."
              padding="lg"
              variant="elevated"
            >
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-text-muted">Status</dt>
                  <dd className="font-medium text-text-primary">{connectionLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-text-muted">Target rate</dt>
                  <dd className="font-medium text-text-primary">{targetTickRate.toFixed(1)}x</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-text-muted">Speed</dt>
                  <dd className="font-medium text-text-primary">{currentSpeed.toFixed(2)}x</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={connect}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-accent/70 bg-accent/90 px-3 py-2 text-sm font-medium text-surface shadow-soft transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Connect
                </button>
                <button
                  type="button"
                  onClick={disconnect}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-border/70 bg-surfaceAlt px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Disconnect
                </button>
              </div>
            </Panel>

            <Panel title="Facility snapshot" padding="lg" variant="elevated">
              <dl className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                {facilitySummary.map((entry) => (
                  <div key={entry.label} className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-text-muted">
                      {entry.label}
                    </dt>
                    <dd className="text-base font-medium text-text-primary">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Event log" padding="lg" variant="elevated">
              {eventList}
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default App;
