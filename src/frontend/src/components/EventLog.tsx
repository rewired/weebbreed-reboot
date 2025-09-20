import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import styles from './EventLog.module.css';

const severityToClass: Record<string, string> = {
  debug: styles.debug,
  info: styles.info,
  warning: styles.warning,
  error: styles.error,
};

export const EventLog = () => {
  const { t } = useTranslation('simulation');
  const events = useAppStore((state) => state.events);

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h2>{t('labels.eventLog')}</h2>
        <span className={styles.count}>{t('labels.totalEvents', { count: events.length })}</span>
      </header>
      {events.length === 0 ? (
        <p className={styles.empty}>{t('events.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {events
            .slice()
            .reverse()
            .map((event) => {
              const severityClass = event.severity ? severityToClass[event.severity] : styles.info;
              return (
                <li
                  key={`${event.type}-${event.tick ?? 'unknown'}-${event.ts ?? Math.random()}`}
                  className={severityClass}
                >
                  <div className={styles.eventHeader}>
                    <span className={styles.eventType}>{event.type}</span>
                    {event.tick !== undefined ? (
                      <span className={styles.eventMeta}>#{event.tick}</span>
                    ) : null}
                  </div>
                  {event.message ? <p className={styles.message}>{event.message}</p> : null}
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
};
