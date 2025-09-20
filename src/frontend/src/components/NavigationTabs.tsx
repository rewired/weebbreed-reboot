import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import type { NavigationView } from '../store';
import styles from './NavigationTabs.module.css';

const tabs: NavigationView[] = ['overview', 'zones', 'plants', 'devices', 'settings'];

export const NavigationTabs = () => {
  const { t } = useTranslation('navigation');
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const goBack = useAppStore((state) => state.goBack);
  const history = useAppStore((state) => state.history);

  return (
    <nav className={styles.nav}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setCurrentView(tab)}
            className={`${styles.tab} ${tab === currentView ? styles.active : ''}`}
          >
            {t(tab)}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.historyButton}
        onClick={goBack}
        disabled={history.length === 0}
      >
        {t('goBack')}
      </button>
    </nav>
  );
};
