import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SimulationBridgeHandle } from '../hooks/useSimulationBridge';
import { useAppStore } from '../store';
import styles from './SimulationControls.module.css';

interface SimulationControlsProps {
  bridge: SimulationBridgeHandle;
}

export const SimulationControls = ({ bridge }: SimulationControlsProps) => {
  const { t } = useTranslation('simulation');
  const [tickLength, setTickLength] = useState(3);
  const openModal = useAppStore((state) => state.openModal);

  const handleTickLengthSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tickLength <= 0) {
      return;
    }

    bridge.sendControlCommand({ action: 'setTickLength', minutes: tickLength });
  };

  return (
    <section className={styles.controls}>
      <header className={styles.header}>
        <h2>{t('labels.controls')}</h2>
        <div className={styles.connectionActions}>
          <button type="button" onClick={bridge.connect} className={styles.ghostButton}>
            {t('controls.connect')}
          </button>
          <button type="button" onClick={bridge.disconnect} className={styles.ghostButton}>
            {t('controls.disconnect')}
          </button>
        </div>
      </header>
      <div className={styles.actions}>
        <button type="button" onClick={() => bridge.sendControlCommand({ action: 'play' })}>
          {t('controls.play')}
        </button>
        <button type="button" onClick={() => bridge.sendControlCommand({ action: 'pause' })}>
          {t('controls.pause')}
        </button>
        <button type="button" onClick={() => bridge.sendControlCommand({ action: 'step' })}>
          {t('controls.step')}
        </button>
        <button type="button" onClick={() => bridge.sendControlCommand({ action: 'fastForward' })}>
          {t('controls.fastForward')}
        </button>
        <button
          type="button"
          onClick={() => openModal({ kind: 'settings' })}
          className={styles.secondary}
        >
          {t('controls.openSettings')}
        </button>
      </div>
      <form className={styles.tickLength} onSubmit={handleTickLengthSubmit}>
        <label htmlFor="tick-length">{t('controls.tickLength')}</label>
        <div className={styles.tickLengthInputRow}>
          <input
            id="tick-length"
            name="tickLength"
            type="number"
            min={0.5}
            step={0.5}
            value={tickLength}
            onChange={(event) => setTickLength(Number(event.target.value))}
          />
          <button type="submit" className={styles.primary}>
            {t('controls.apply')}
          </button>
        </div>
      </form>
    </section>
  );
};
