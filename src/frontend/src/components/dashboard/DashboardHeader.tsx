import { useMemo, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { Button, IconButton } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { useUIStore } from '@/store/ui';
import type { SimulationBridge } from '@/facade/systemFacade';

const speedPresets = [0.5, 1, 2, 5, 10];

interface DashboardHeaderProps {
  bridge: SimulationBridge;
}

export const DashboardHeader = ({ bridge }: DashboardHeaderProps) => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const timeStatus = useSimulationStore((state) => state.timeStatus);
  const connectionStatus = useSimulationStore((state) => state.connectionStatus);
  const openModal = useUIStore((state) => state.openModal);
  const notificationsUnread = useUIStore((state) => state.notificationsUnread);
  const incrementNotifications = useUIStore((state) => state.incrementNotifications);
  const markNotificationsRead = useUIStore((state) => state.markNotificationsRead);
  const goToStructures = useNavigationStore((state) => state.goToStructures);
  const [controlPending, setControlPending] = useState(false);
  const [speedPending, setSpeedPending] = useState<string | null>(null);

  const finance = snapshot?.finance;
  const totalPlants = useMemo(
    () => snapshot?.zones.reduce((sum, zone) => sum + zone.plants.length, 0) ?? 0,
    [snapshot?.zones],
  );
  const tickProgress = useMemo(() => {
    const tick = snapshot?.clock.tick ?? 0;
    return ((tick % 60) / 60) * 100;
  }, [snapshot?.clock.tick]);

  if (!snapshot) {
    return null;
  }

  const isPaused = timeStatus?.paused ?? snapshot.clock.isPaused;
  const currentSpeed = timeStatus?.speed ?? snapshot.clock.targetTickRate;

  const handlePlayPause = async () => {
    if (controlPending) {
      return;
    }
    setControlPending(true);
    try {
      const response = await bridge.sendControl(
        isPaused ? { action: 'play', gameSpeed: currentSpeed } : { action: 'pause' },
      );
      if (!response.ok) {
        incrementNotifications();
      }
    } catch (error) {
      console.error('Failed to toggle simulation state', error);
      incrementNotifications();
    } finally {
      setControlPending(false);
    }
  };

  return (
    <header className="flex w-full flex-col gap-6 rounded-3xl border border-border/60 bg-surface-elevated/60 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full border border-border/50 bg-surface-muted/80">
            <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
              <path
                className="fill-none stroke-border/30"
                strokeWidth={3.5}
                strokeLinecap="round"
                d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
              />
              <path
                className="fill-none stroke-primary"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeDasharray={`${tickProgress}, 100`}
                d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-text-muted">Tick</span>
            <span className="text-2xl font-semibold text-text">
              {snapshot.clock.tick.toLocaleString()}
            </span>
            <span className="text-xs text-text-muted">
              Target rate {snapshot.clock.targetTickRate}×
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-muted">Capital</span>
            <span className="text-lg font-semibold text-text">
              €{finance?.cashOnHand.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Cumulative yield
            </span>
            <span className="text-lg font-semibold text-text">
              {finance?.totalRevenue.toLocaleString()} g
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Planned capacity
            </span>
            <span className="text-lg font-semibold text-text">{totalPlants} plants</span>
          </div>
          <Badge tone={isPaused ? 'warning' : 'success'}>
            {isPaused ? 'Paused' : 'Running'} · {currentSpeed}×
          </Badge>
          <Badge tone={connectionStatus === 'connected' ? 'success' : 'warning'}>
            {connectionStatus === 'connected' ? 'Live' : 'Reconnecting…'}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={<Icon name={isPaused ? 'play_arrow' : 'pause'} />}
            onClick={handlePlayPause}
            disabled={controlPending}
          >
            {isPaused ? 'Start simulation' : 'Pause simulation'}
          </Button>
          <IconButton
            aria-label="Step one tick"
            disabled={controlPending}
            onClick={async () => {
              if (controlPending) {
                return;
              }
              setControlPending(true);
              try {
                const response = await bridge.sendControl({ action: 'step', ticks: 1 });
                if (!response.ok) {
                  incrementNotifications();
                }
              } catch (error) {
                console.error('Failed to step simulation', error);
                incrementNotifications();
              } finally {
                setControlPending(false);
              }
            }}
          >
            <Icon name="skip_next" />
          </IconButton>
          <div className="flex items-center gap-1 rounded-2xl border border-border/40 bg-surface-muted/60 p-1">
            {speedPresets.map((preset) => (
              <IconButton
                key={preset}
                size="sm"
                active={Math.abs(currentSpeed - preset) < 0.01}
                disabled={Boolean(speedPending) || controlPending}
                onClick={async () => {
                  if (speedPending || controlPending) {
                    return;
                  }
                  setSpeedPending(preset.toString());
                  try {
                    const response = await bridge.sendControl({
                      action: 'fastForward',
                      multiplier: preset,
                    });
                    if (!response.ok) {
                      incrementNotifications();
                    }
                  } catch (error) {
                    console.error('Failed to adjust simulation speed', error);
                    incrementNotifications();
                  } finally {
                    setSpeedPending(null);
                  }
                }}
              >
                <span className="text-xs font-semibold text-text">{preset}×</span>
              </IconButton>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon name="monitoring" />}
            onClick={goToStructures}
          >
            Structures
          </Button>
          <IconButton
            aria-label="Open notifications"
            onClick={() => {
              openModal({ id: 'notifications', type: 'notifications', title: 'Notifications' });
              markNotificationsRead();
            }}
          >
            <div className="relative">
              <Icon name="notifications" />
              {notificationsUnread ? (
                <span className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-black">
                  {notificationsUnread}
                </span>
              ) : null}
            </div>
          </IconButton>
          <IconButton
            aria-label="Open game menu"
            onClick={() =>
              openModal({
                id: 'game-menu',
                type: 'gameMenu',
                title: 'Game Menu',
                subtitle: 'Save, load, or export deterministic runs',
              })
            }
          >
            <Icon name="settings" />
          </IconButton>
        </div>
      </div>
    </header>
  );
};
