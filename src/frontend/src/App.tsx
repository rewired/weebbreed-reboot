import { useEffect, useMemo, useState } from 'react';
import DashboardControls from '@/components/DashboardControls';
import DashboardHeader from '@/components/DashboardHeader';
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

const VIEW_LABELS: Record<NavigationView, string> = {
  overview: 'Overview',
  world: 'Structures',
  personnel: 'Personnel',
  finance: 'Finances',
  settings: 'Settings',
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

const resolveConnectionTone = (status: string): 'default' | 'positive' | 'warning' | 'danger' => {
  switch (status) {
    case 'connected':
      return 'positive';
    case 'connecting':
      return 'warning';
    case 'error':
    case 'disconnected':
      return 'danger';
    default:
      return 'default';
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

  const structuresMap = useZoneStore((state) => state.structures);
  const roomsMap = useZoneStore((state) => state.rooms);
  const zonesMap = useZoneStore((state) => state.zones);
  const plantCount = useZoneStore((state) => Object.keys(state.plants).length);

  const personnel = usePersonnelStore((state) => state.personnel);
  const employeeCount = personnel?.employees?.length ?? 0;
  const applicantCount = personnel?.applicants?.length ?? 0;

  const currentView = useAppStore((state) => state.currentView);
  const selectedStructureId = useAppStore((state) => state.selectedStructureId);
  const selectedRoomId = useAppStore((state) => state.selectedRoomId);
  const selectedZoneId = useAppStore((state) => state.selectedZoneId);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const selectStructure = useAppStore((state) => state.selectStructure);
  const selectRoom = useAppStore((state) => state.selectRoom);
  const selectZone = useAppStore((state) => state.selectZone);
  const resetSelection = useAppStore((state) => state.resetSelection);
  const navigateUp = useAppStore((state) => state.navigateUp);

  const zonesLoaded = Object.keys(zonesMap).length > 0;

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
    bootstrapped && connectionStatus === 'connected' ? 'Connected (fixture)' : connectionStatus;

  const simulationTimeLabel = formatInGameTime(currentTick);
  const realTimeLabel = lastClockSnapshot
    ? new Date(lastClockSnapshot.lastUpdatedAt).toLocaleString()
    : undefined;

  const timeMeta = useMemo(
    () => [
      { label: 'Zones', value: Object.keys(zonesMap).length.toLocaleString() },
      { label: 'Plants', value: plantCount.toLocaleString() },
      { label: 'Alerts', value: alertCount.toLocaleString() },
    ],
    [alertCount, plantCount, zonesMap],
  );

  const structures = useMemo(
    () =>
      Object.values(structuresMap)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [structuresMap],
  );

  const roomsByStructure = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    for (const room of Object.values(roomsMap)) {
      grouped[room.structureId] ??= [];
      grouped[room.structureId].push(room.id);
    }
    for (const structureId of Object.keys(grouped)) {
      grouped[structureId].sort((a, b) => roomsMap[a].name.localeCompare(roomsMap[b].name));
    }
    return grouped;
  }, [roomsMap]);

  const zonesByRoom = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    for (const zone of Object.values(zonesMap)) {
      grouped[zone.roomId] ??= [];
      grouped[zone.roomId].push(zone.id);
    }
    for (const roomId of Object.keys(grouped)) {
      grouped[roomId].sort((a, b) => zonesMap[a].name.localeCompare(zonesMap[b].name));
    }
    return grouped;
  }, [zonesMap]);

  const navigationItems = useMemo(
    () => [
      { id: 'overview' as NavigationView, label: VIEW_LABELS.overview },
      {
        id: 'world' as NavigationView,
        label: VIEW_LABELS.world,
        badge: Object.keys(zonesMap).length
          ? Object.keys(zonesMap).length.toLocaleString()
          : undefined,
      },
      {
        id: 'personnel' as NavigationView,
        label: VIEW_LABELS.personnel,
        badge: employeeCount ? employeeCount.toLocaleString() : undefined,
      },
      { id: 'finance' as NavigationView, label: VIEW_LABELS.finance },
    ],
    [employeeCount, zonesMap],
  );

  const handleSelectView = (viewId: string) => {
    setCurrentView(viewId as NavigationView);
    if (viewId !== 'world') {
      resetSelection();
    }
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

  const tickerEvents = useMemo(() => recentEvents.slice(0, 4), [recentEvents]);

  const facilitySummary = useMemo(
    () => [
      { label: 'Structures', value: structures.length.toLocaleString() },
      { label: 'Rooms', value: Object.keys(roomsMap).length.toLocaleString() },
      { label: 'Zones', value: Object.keys(zonesMap).length.toLocaleString() },
      { label: 'Plants', value: plantCount.toLocaleString() },
      { label: 'Employees', value: employeeCount.toLocaleString() },
      { label: 'Applicants', value: applicantCount.toLocaleString() },
    ],
    [applicantCount, employeeCount, plantCount, roomsMap, structures.length, zonesMap],
  );

  const lastTickDuration = lastTickEvent?.durationMs
    ? `${lastTickEvent.durationMs.toFixed(0)} ms`
    : '—';

  const breadcrumbItems = useMemo(() => {
    if (currentView === 'world') {
      const items: { id: string; label: string; onClick?: () => void; current?: boolean }[] = [];
      items.push({
        id: 'world-root',
        label: VIEW_LABELS.world,
        onClick:
          selectedStructureId || selectedRoomId || selectedZoneId
            ? () => {
                setCurrentView('world');
                resetSelection();
              }
            : undefined,
        current: !selectedStructureId,
      });

      if (selectedStructureId) {
        const structureId = selectedStructureId;
        const structure = structuresMap[structureId];
        items.push({
          id: `structure-${structureId}`,
          label: structure?.name ?? 'Structure',
          onClick: selectedRoomId ? () => selectStructure(structureId) : undefined,
          current: !selectedRoomId,
        });
      }

      if (selectedRoomId) {
        const roomId = selectedRoomId;
        const room = roomsMap[roomId];
        items.push({
          id: `room-${roomId}`,
          label: room?.name ?? 'Room',
          onClick: selectedZoneId ? () => selectRoom(roomId) : undefined,
          current: !selectedZoneId,
        });
      }

      if (selectedZoneId) {
        const zoneId = selectedZoneId;
        const zone = zonesMap[zoneId];
        items.push({
          id: `zone-${zoneId}`,
          label: zone?.name ?? 'Zone',
          current: true,
        });
      }

      return items;
    }

    const viewLabel = VIEW_LABELS[currentView] ?? VIEW_LABELS.overview;
    return [
      {
        id: `view-${currentView}`,
        label: viewLabel,
        current: true,
      },
    ];
  }, [
    currentView,
    selectedStructureId,
    selectedRoomId,
    selectedZoneId,
    structuresMap,
    roomsMap,
    zonesMap,
    setCurrentView,
    resetSelection,
    selectStructure,
    selectRoom,
  ]);

  const canNavigateUp =
    currentView === 'world' && Boolean(selectedStructureId || selectedRoomId || selectedZoneId);

  const structureTree = useMemo(() => {
    if (!structures.length) {
      return (
        <p className="text-sm text-text-muted">
          No structures available. Load a snapshot to begin.
        </p>
      );
    }

    return structures.map((structure) => {
      const structureRooms = roomsByStructure[structure.id] ?? [];
      const structureZoneCount = structureRooms.reduce(
        (total, roomId) => total + (zonesByRoom[roomId]?.length ?? 0),
        0,
      );
      const isStructureSelected = selectedStructureId === structure.id;
      const containsSelection =
        (selectedRoomId && structureRooms.includes(selectedRoomId)) ||
        (selectedZoneId &&
          structureRooms.some((roomId) => zonesByRoom[roomId]?.includes(selectedZoneId)));
      const isExpanded = !selectedStructureId || isStructureSelected || containsSelection;

      return (
        <div key={structure.id} className="space-y-2">
          <button
            type="button"
            onClick={() => selectStructure(structure.id)}
            className={[
              'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium transition',
              isStructureSelected
                ? 'border-accent bg-accent/20 text-text-primary shadow-soft'
                : 'border-transparent text-text-muted hover:border-border/50 hover:bg-surfaceAlt/80 hover:text-text-primary',
            ].join(' ')}
            aria-pressed={isStructureSelected}
          >
            <span className="truncate">{structure.name}</span>
            <span className="ml-3 inline-flex items-center justify-center rounded-full border border-border/50 px-2 py-0.5 text-xs text-text-secondary">
              {structureZoneCount} zones
            </span>
          </button>
          {isExpanded ? (
            <div className="ml-3 space-y-1 border-l border-border/40 pl-3">
              {structureRooms.length ? (
                structureRooms.map((roomId) => {
                  const room = roomsMap[roomId];
                  if (!room) {
                    return null;
                  }
                  const roomZones = zonesByRoom[roomId] ?? [];
                  const isRoomSelected = selectedRoomId === roomId;
                  const roomContainsSelection = selectedZoneId
                    ? roomZones.includes(selectedZoneId)
                    : false;
                  const roomExpanded = isRoomSelected || roomContainsSelection;

                  return (
                    <div key={room.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => selectRoom(room.id)}
                        className={[
                          'flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-sm transition',
                          isRoomSelected
                            ? 'border-accent bg-accent/10 text-text-primary shadow-soft'
                            : 'border-transparent text-text-secondary hover:border-border/40 hover:bg-surfaceAlt/70 hover:text-text-primary',
                        ].join(' ')}
                        aria-pressed={isRoomSelected}
                      >
                        <span className="truncate">{room.name}</span>
                        <span className="ml-2 text-xs text-text-muted">
                          {roomZones.length} zones
                        </span>
                      </button>
                      {roomZones.length && roomExpanded ? (
                        <ul className="ml-3 space-y-1 border-l border-border/30 pl-3">
                          {roomZones.map((zoneId) => {
                            const zone = zonesMap[zoneId];
                            if (!zone) {
                              return null;
                            }
                            const isZoneSelected = selectedZoneId === zone.id;
                            return (
                              <li key={zone.id}>
                                <button
                                  type="button"
                                  onClick={() => selectZone(zone.id)}
                                  className={[
                                    'flex w-full items-center justify-between rounded-md border px-3 py-1 text-xs transition',
                                    isZoneSelected
                                      ? 'border-accent bg-accent/10 text-text-primary shadow-soft'
                                      : 'border-transparent text-text-muted hover:border-border/30 hover:bg-surfaceAlt/60 hover:text-text-primary',
                                  ].join(' ')}
                                  aria-pressed={isZoneSelected}
                                >
                                  <span className="truncate">{zone.name}</span>
                                  <span className="ml-2 text-[0.65rem] uppercase tracking-wide text-text-muted">
                                    {zone.environment.temperature.toFixed(0)}°C
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="px-3 py-1 text-xs text-text-muted">No rooms available.</p>
              )}
            </div>
          ) : null}
        </div>
      );
    });
  }, [
    structures,
    roomsByStructure,
    zonesByRoom,
    roomsMap,
    zonesMap,
    selectedStructureId,
    selectedRoomId,
    selectedZoneId,
    selectStructure,
    selectRoom,
    selectZone,
  ]);

  return (
    <main className="min-h-screen bg-background font-sans text-text-primary">
      <div className="grid min-h-screen grid-cols-[minmax(260px,320px)_1fr] grid-rows-[auto_1fr]">
        <aside className="col-start-1 row-span-full border-r border-border/40 bg-surfaceAlt/60">
          <div className="flex h-full flex-col">
            <div className="space-y-4 px-5 py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Facility
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('world');
                    resetSelection();
                  }}
                  className="text-xs font-medium text-accent transition hover:text-accent/80"
                >
                  All structures
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto pr-1 text-sm text-text-secondary">
                {structureTree}
              </div>
            </div>
          </div>
        </aside>

        <header className="col-start-2 row-start-1 border-b border-border/40 bg-surface/80 px-8 py-6 backdrop-blur">
          <DashboardHeader
            title="Simulation control"
            subtitle="Monitor facility telemetry, drive the simulation loop, and jump between operational views."
            status={{
              label: connectionLabel,
              tone: resolveConnectionTone(connectionStatus),
            }}
            actions={
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
                className="border-none bg-transparent p-0 shadow-none"
              />
            }
            meta={facilitySummary}
            className="border border-border/50"
          >
            <div className="space-y-6">
              <TimeDisplay
                tick={currentTick}
                simulationTimeLabel={simulationTimeLabel}
                realTimeLabel={realTimeLabel}
                status={timeDisplayStatus}
                tickLengthMinutes={Math.round(tickLengthMinutes)}
                meta={timeMeta}
                prefix={
                  <span className="text-sm text-text-muted">Connection: {connectionLabel}</span>
                }
                className="border-none bg-transparent p-0 shadow-none"
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={navigateUp}
                    disabled={!canNavigateUp}
                    className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition disabled:opacity-40 hover:border-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span aria-hidden="true">←</span>
                    Up one level
                  </button>
                  <nav
                    className="flex flex-wrap items-center gap-2 text-sm text-text-secondary"
                    aria-label="Breadcrumb"
                  >
                    {breadcrumbItems.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        {item.onClick ? (
                          <button
                            type="button"
                            onClick={item.onClick}
                            className="text-sm font-medium text-accent transition hover:text-accent/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            {item.label}
                          </button>
                        ) : (
                          <span
                            className={`text-sm font-medium ${item.current ? 'text-text-primary' : 'text-text-secondary'}`}
                          >
                            {item.label}
                          </span>
                        )}
                        {index < breadcrumbItems.length - 1 ? (
                          <span className="text-xs text-text-muted">/</span>
                        ) : null}
                      </div>
                    ))}
                  </nav>
                </div>

                <Navigation
                  items={navigationItems}
                  activeItemId={currentView}
                  onSelect={handleSelectView}
                  className="border-border/50 bg-surfaceAlt/60"
                />
              </div>

              <section
                className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surfaceAlt/60 p-4 text-sm text-text-secondary shadow-soft"
                aria-label="Recent events"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Event ticker
                  </span>
                  <span className="text-xs text-text-muted">
                    Latest updates from the simulation loop.
                  </span>
                </div>
                {tickerEvents.length ? (
                  <ul className="flex flex-wrap items-center gap-4">
                    {tickerEvents.map((event, index) => {
                      const toneClass =
                        EVENT_LEVEL_CLASS[event.level ?? 'info'] ?? EVENT_LEVEL_CLASS.info;
                      return (
                        <li key={`${event.ts ?? index}-ticker`} className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold uppercase tracking-wide ${toneClass}`}
                          >
                            {event.type}
                          </span>
                          <span className="text-xs text-text-muted">
                            {formatTimestamp(event.ts)}
                          </span>
                          {event.message ? (
                            <span className="text-xs text-text-secondary">{event.message}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted">
                    No telemetry events recorded in the last ticks.
                  </p>
                )}
              </section>
            </div>
          </DashboardHeader>
        </header>

        <section className="col-start-2 row-start-2 overflow-y-auto">
          <div className="mx-auto flex h-full max-w-layout flex-col gap-8 px-8 py-10">
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
                      <dd className="font-medium text-text-primary">
                        {targetTickRate.toFixed(1)}x
                      </dd>
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

                <Panel title="Event log" padding="lg" variant="elevated">
                  {eventList}
                </Panel>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default App;
