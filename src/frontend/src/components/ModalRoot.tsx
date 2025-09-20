import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SimulationBridgeHandle } from '../hooks/useSimulationBridge';
import { useAppStore } from '../store';
import styles from './ModalRoot.module.css';

interface ModalRootProps {
  bridge: SimulationBridgeHandle;
}

export const ModalRoot = ({ bridge }: ModalRootProps) => {
  const { t } = useTranslation('simulation');
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const [target, setTarget] = useState('temperature');
  const [value, setValue] = useState(24);

  if (!activeModal) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    bridge.sendControlCommand({ action: 'setSetpoint', target, value });
    closeModal();
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={closeModal}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2>{activeModal.title ?? t('modals.settingsTitle')}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeModal}
            aria-label={t('modals.close')}
          >
            ×
          </button>
        </header>
        <p className={styles.description}>
          {activeModal.description ?? t('modals.settingsDescription')}
        </p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="setpoint-target">
            {t('modals.setpointTarget')}
          </label>
          <select
            id="setpoint-target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={styles.select}
          >
            <option value="temperature">{t('labels.temperature')}</option>
            <option value="humidity">{t('labels.humidity')}</option>
            <option value="co2">{t('labels.co2')}</option>
            <option value="ppfd">{t('labels.ppfd')}</option>
          </select>

          <label className={styles.label} htmlFor="setpoint-value">
            {t('modals.setpointValue')}
          </label>
          <input
            id="setpoint-value"
            type="number"
            step={0.5}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
          />

          <div className={styles.actions}>
            <button type="button" onClick={closeModal} className={styles.cancel}>
              {t('modals.cancel')}
            </button>
            <button type="submit" className={styles.confirm}>
              {t('modals.apply')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
