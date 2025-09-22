import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SimulationBridgeHandle } from '@/hooks/useSimulationBridge';
import { useAppStore } from '@/store';
import styles from './SimulationControls.module.css';

interface SimulationControlsProps {
  bridge: SimulationBridgeHandle;
}

export const SimulationControls = ({ bridge }: SimulationControlsProps) => {
  const { t } = useTranslation('simulation');
  const issueControlCommand = useAppStore((state) => state.issueControlCommand);
  const requestTickLength = useAppStore((state) => state.requestTickLength);
  const sendSetpoint = useAppStore((state) => state.sendSetpoint);
  const lastSetpoints = useAppStore((state) => state.lastSetpoints);
  const lastRequestedTickLength = useAppStore((state) => state.lastRequestedTickLength);
  const openModal = useAppStore((state) => state.openModal);

  const [tickLength, setTickLength] = useState(lastRequestedTickLength ?? 3);
  const [setpointDrafts, setSetpointDrafts] = useState<Record<string, number>>({
    temperature: 24,
    humidity: 60,
    co2: 950,
    ppfd: 600,
  });

  const setpointFields = useMemo(
    () => [
      {
        target: 'temperature',
        label: t('controls.setpoints.temperature'),
        min: 10,
        max: 40,
        step: 0.5,
        unit: t('controls.units.temperature'),
        toDisplay: (value: number) => value,
        toPayload: (value: number) => value,
      },
      {
        target: 'humidity',
        label: t('controls.setpoints.humidity'),
        min: 30,
        max: 95,
        step: 1,
        unit: t('controls.units.humidity'),
        toDisplay: (value: number) => Math.round(value * 100),
        toPayload: (value: number) => value / 100,
      },
      {
        target: 'co2',
        label: t('controls.setpoints.co2'),
        min: 350,
        max: 1600,
        step: 10,
        unit: t('controls.units.co2'),
        toDisplay: (value: number) => value,
        toPayload: (value: number) => value,
      },
      {
        target: 'ppfd',
        label: t('controls.setpoints.ppfd'),
        min: 0,
        max: 1500,
        step: 10,
        unit: t('controls.units.ppfd'),
        toDisplay: (value: number) => value,
        toPayload: (value: number) => value,
      },
    ],
    [t],
  );

  useEffect(() => {
    if (typeof lastRequestedTickLength === 'number' && !Number.isNaN(lastRequestedTickLength)) {
      setTickLength(lastRequestedTickLength);
    }
  }, [lastRequestedTickLength]);

  useEffect(() => {
    setSetpointDrafts((drafts) => {
      const nextDrafts = { ...drafts };
      for (const field of setpointFields) {
        const value = lastSetpoints[field.target];
        if (typeof value === 'number' && !Number.isNaN(value)) {
          nextDrafts[field.target] = field.toDisplay(value);
        }
      }

      return nextDrafts;
    });
  }, [lastSetpoints, setpointFields]);

  const handleTickLengthSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tickLength <= 0) {
      return;
    }

    requestTickLength(tickLength);
  };

  const handleSetpointSubmit = (event: FormEvent<HTMLFormElement>, target: string) => {
    event.preventDefault();
    const value = setpointDrafts[target];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return;
    }

    const field = setpointFields.find((candidate) => candidate.target === target);
    if (!field) {
      return;
    }

    sendSetpoint(target, field.toPayload(value));
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
        <button type="button" onClick={() => issueControlCommand({ action: 'play' })}>
          {t('controls.play')}
        </button>
        <button type="button" onClick={() => issueControlCommand({ action: 'pause' })}>
          {t('controls.pause')}
        </button>
        <button type="button" onClick={() => issueControlCommand({ action: 'step' })}>
          {t('controls.step')}
        </button>
        <button type="button" onClick={() => issueControlCommand({ action: 'fastForward' })}>
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
        <div className={styles.tickLengthHeader}>
          <label htmlFor="tick-length-slider">{t('controls.tickLength')}</label>
          <span className={styles.tickLengthValue}>
            {t('controls.tickLengthValue', { minutes: tickLength })}
          </span>
        </div>
        <input
          id="tick-length-slider"
          name="tickLength"
          type="range"
          min={0.5}
          max={15}
          step={0.5}
          value={tickLength}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setTickLength(Number.isNaN(nextValue) ? tickLength : nextValue);
          }}
          aria-valuemin={0.5}
          aria-valuemax={15}
          aria-valuenow={tickLength}
          aria-valuetext={t('controls.tickLengthValue', { minutes: tickLength })}
          aria-label={t('controls.tickLength')}
        />
        <div className={styles.tickLengthInputRow}>
          <input
            id="tick-length"
            name="tickLengthInput"
            type="number"
            min={0.5}
            max={60}
            step={0.5}
            value={tickLength}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setTickLength(Number.isNaN(nextValue) ? tickLength : nextValue);
            }}
            aria-label={t('controls.tickLength')}
          />
          <button type="submit" className={styles.primary}>
            {t('controls.apply')}
          </button>
        </div>
      </form>

      <div className={styles.setpoints}>
        <h3>{t('controls.setpointHeader')}</h3>
        <div className={styles.setpointGrid}>
          {setpointFields.map((field) => (
            <form
              key={field.target}
              className={styles.setpointCard}
              onSubmit={(event) => handleSetpointSubmit(event, field.target)}
            >
              <label htmlFor={`setpoint-${field.target}`}>{field.label}</label>
              <div className={styles.setpointInputRow}>
                <input
                  id={`setpoint-${field.target}`}
                  name={field.target}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={setpointDrafts[field.target] ?? ''}
                  onChange={(event) =>
                    setSetpointDrafts((draft) => {
                      const nextValue = Number(event.target.value);
                      return {
                        ...draft,
                        [field.target]: Number.isNaN(nextValue)
                          ? (draft[field.target] ?? 0)
                          : nextValue,
                      };
                    })
                  }
                  aria-describedby={`setpoint-${field.target}-unit`}
                />
                <span id={`setpoint-${field.target}-unit`} className={styles.unit}>
                  {field.unit}
                </span>
                <button type="submit" className={styles.primary}>
                  {t('controls.apply')}
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
};
