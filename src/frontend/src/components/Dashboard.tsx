import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SimulationBridgeHandle } from '../hooks/useSimulationBridge';
import { useAppStore } from '../store';
import type { NavigationView } from '../store';
import {
  selectAlertCount,
  selectCapital,
  selectCurrentSpeed,
  selectCurrentTick,
  selectCumulativeYield,
  selectIsPaused,
  selectLastTickEvent,
  selectRecentEvents,
  selectTargetTickRate,
} from '../store/selectors';
import { formatInGameTime } from '../store/utils/time';
import styles from './Dashboard.module.css';

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10];

type ViewButton = { view: NavigationView; icon: string; translationKey: string };

const VIEW_BUTTONS: ViewButton[] = [
  { view: 'overview', icon: 'dashboard', translationKey: 'navigation:overview' },
  { view: 'world', icon: 'travel_explore', translationKey: 'navigation:world' },
  { view: 'finance', icon: 'monitoring', translationKey: 'navigation:finance' },
  { view: 'personnel', icon: 'groups', translationKey: 'navigation:personnel' },
  { view: 'settings', icon: 'tune', translationKey: 'navigation:settings' },
];

const circumferenceForRadius = (radius: number) => 2 * Math.PI * radius;

interface DashboardProps {
  bridge: SimulationBridgeHandle;
}

const useRecentEvents = (limit: number) => {
  const selector = useMemo(() => selectRecentEvents(limit), [limit]);
  return useAppStore(selector);
};

export const Dashboard = ({ bridge }: DashboardProps) => {
  const { t } = useTranslation(['simulation', 'navigation']);
  const capital = useAppStore(selectCapital);
  const cumulativeYield = useAppStore(selectCumulativeYield);
  const currentTick = useAppStore(selectCurrentTick);
  const isPaused = useAppStore(selectIsPaused);
  const targetTickRate = useAppStore(selectTargetTickRate);
  const currentSpeed = useAppStore(selectCurrentSpeed);
  const alertCount = useAppStore(selectAlertCount);
  const recentEvents = useRecentEvents(5);
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const issueControlCommand = useAppStore((state) => state.issueControlCommand);

  const lastTickEvent = useAppStore(selectLastTickEvent);
  const [tickProgress, setTickProgress] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
      }),
    [],
  );

  const integerFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const tickCircumference = useMemo(() => circumferenceForRadius(20), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let animationFrame: number;

    const updateProgress = () => {
      if (!lastTickEvent || isPaused || !targetTickRate || targetTickRate <= 0) {
        setTickProgress((previous) => (previous === 0 ? previous : 0));
      } else {
        const effectiveRate = Math.max(targetTickRate * Math.max(currentSpeed, 0), 0.0001);
        const expectedInterval = 1000 / effectiveRate;
        const elapsed = Date.now() - lastTickEvent.ts;
        const nextProgress = Math.max(0, Math.min(elapsed / expectedInterval, 1));
        setTickProgress((previous) => {
          if (Math.abs(previous - nextProgress) < 0.02) {
            return previous;
          }
          return nextProgress;
        });
      }

      animationFrame = window.requestAnimationFrame(updateProgress);
    };

    animationFrame = window.requestAnimationFrame(updateProgress);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [currentSpeed, isPaused, lastTickEvent, targetTickRate]);

  useEffect(() => {
    if (!lastTickEvent) {
      setTickProgress(0);
      return;
    }
    setTickProgress(0);
  }, [lastTickEvent]);

  const formattedCapital = currencyFormatter.format(capital);
  const formattedYield = `${numberFormatter.format(cumulativeYield)} g`;
  const formattedClock = formatInGameTime(currentTick);
  const formattedTickLabel = integerFormatter.format(currentTick);
  const unreadCount = alertCount;
  const strokeDashoffset = tickCircumference * (1 - Math.min(Math.max(tickProgress, 0), 1));

  const togglePlay = () => {
    issueControlCommand({ action: 'play', gameSpeed: currentSpeed || 1 });
  };

  const pause = () => {
    issueControlCommand({ action: 'pause' });
  };

  const handleSpeedChange = (speed: number) => {
    issueControlCommand({ action: 'play', gameSpeed: speed });
  };

  const handleViewSelect = (view: NavigationView) => {
    setCurrentView(view);
  };

  const closeOverlays = () => {
    setNotificationsOpen(false);
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        closeOverlays();
        return;
      }
      if (!target.closest(`.${styles.popover}`) && !target.closest(`.${styles.menu}`)) {
        closeOverlays();
      }
    };

    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);

  return (
    <header className={styles.dashboard}>
      <div className={styles.metricsGroup}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{t('simulation:dashboard.capital')}</span>
          <span className={styles.metricValue}>{formattedCapital}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{t('simulation:dashboard.cumulativeYield')}</span>
          <span className={styles.metricValue}>{formattedYield}</span>
        </div>
        <div className={`${styles.metric} ${styles.clockMetric}`}>
          <span className={styles.metricLabel}>{t('simulation:dashboard.clock')}</span>
          <div className={styles.clockDisplay}>
            <svg className={styles.tickRing} viewBox="0 0 48 48" aria-hidden>
              <circle className={styles.tickTrack} cx="24" cy="24" r="20" />
              <circle
                className={styles.tickProgress}
                cx="24"
                cy="24"
                r="20"
                strokeDasharray={tickCircumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className={styles.clockText}>
              <span className={styles.clockTime}>{formattedClock}</span>
              <span className={styles.clockTick}>
                {t('simulation:dashboard.tickLabel', { value: formattedTickLabel })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.controlsGroup}>
        <div className={styles.connectionStatus}>
          <span className={`${styles.connectionDot} ${styles[bridge.status] ?? ''}`} aria-hidden />
          <span className={styles.connectionLabel}>
            {t(`simulation:connection.${bridge.status}`)}
            {bridge.socketId ? ` · ${bridge.socketId}` : ''}
          </span>
        </div>
        <div
          className={styles.playbackControls}
          role="group"
          aria-label={t('simulation:dashboard.playbackLabel')}
        >
          <button
            type="button"
            onClick={togglePlay}
            className={`${styles.iconButton} ${!isPaused ? styles.active : ''}`}
            aria-pressed={!isPaused}
            aria-label={t('simulation:controls.play')}
          >
            <span className="material-symbols-outlined">play_circle</span>
          </button>
          <button
            type="button"
            onClick={pause}
            className={`${styles.iconButton} ${isPaused ? styles.active : ''}`}
            aria-pressed={isPaused}
            aria-label={t('simulation:controls.pause')}
          >
            <span className="material-symbols-outlined">pause_circle</span>
          </button>
        </div>
        <div
          className={styles.speedControls}
          role="group"
          aria-label={t('simulation:dashboard.speedLabel')}
        >
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleSpeedChange(speed)}
              className={`${styles.speedButton} ${Math.abs(currentSpeed - speed) < 0.01 ? styles.active : ''}`}
            >
              {speed}x
            </button>
          ))}
        </div>
        <div
          className={styles.viewSwitchers}
          role="group"
          aria-label={t('simulation:dashboard.viewsLabel')}
        >
          {VIEW_BUTTONS.map((button) => (
            <button
              key={button.view}
              type="button"
              onClick={() => handleViewSelect(button.view)}
              className={`${styles.iconButton} ${currentView === button.view ? styles.active : ''}`}
              aria-pressed={currentView === button.view}
              aria-label={t(button.translationKey)}
            >
              <span className="material-symbols-outlined">{button.icon}</span>
            </button>
          ))}
        </div>
        <div className={styles.popoverAnchor}>
          <button
            type="button"
            className={`${styles.iconButton} ${notificationsOpen ? styles.active : ''}`}
            aria-haspopup="true"
            aria-expanded={notificationsOpen}
            onClick={(event) => {
              event.stopPropagation();
              setNotificationsOpen((open) => !open);
              setMenuOpen(false);
            }}
            aria-label={t('simulation:dashboard.notifications')}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? (
              <span className={styles.notificationsBadge}>{unreadCount}</span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div
              className={`${styles.popover} ${styles.notifications}`}
              role="dialog"
              aria-label={t('simulation:dashboard.notifications')}
            >
              {recentEvents.length === 0 ? (
                <p>{t('simulation:dashboard.noNotifications')}</p>
              ) : (
                <ul>
                  {recentEvents.map((event) => (
                    <li key={`${event.type}-${event.tick}-${event.ts}`}>
                      {event.message ?? event.type}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
        <div className={styles.menuAnchor}>
          <button
            type="button"
            className={`${styles.iconButton} ${menuOpen ? styles.active : ''}`}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            aria-label={t('simulation:dashboard.menuLabel')}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          {menuOpen ? (
            <div className={`${styles.menu} ${styles.popover}`} role="menu">
              <button type="button" role="menuitem" onClick={closeOverlays}>
                {t('simulation:dashboard.menu.save')}
              </button>
              <button type="button" role="menuitem" onClick={closeOverlays}>
                {t('simulation:dashboard.menu.load')}
              </button>
              <button type="button" role="menuitem" onClick={closeOverlays}>
                {t('simulation:dashboard.menu.export')}
              </button>
              <button type="button" role="menuitem" onClick={closeOverlays}>
                {t('simulation:dashboard.menu.reset')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
