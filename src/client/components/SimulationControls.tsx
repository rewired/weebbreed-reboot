import { useState } from 'react';
import type { SimulationControlEvent } from '../../shared/types/events';
import { useTranslation } from 'react-i18next';

interface SimulationControlsProps {
  onControl: (event: SimulationControlEvent) => void;
}

export const SimulationControls = ({ onControl }: SimulationControlsProps) => {
  const { t } = useTranslation();
  const [tickLength, setTickLength] = useState(1);
  const [fastForward, setFastForward] = useState(5);
  const [temperature, setTemperature] = useState(24);
  const [humidity, setHumidity] = useState(0.6);
  const [co2, setCo2] = useState(900);
  const [ppfd, setPpfd] = useState(600);

  const send = (event: SimulationControlEvent) => onControl(event);

  return (
    <section className="controls">
      <div className="controls__row">
        <button type="button" onClick={() => send({ type: 'simulationControl', action: 'play' })}>
          {t('controls.play')}
        </button>
        <button type="button" onClick={() => send({ type: 'simulationControl', action: 'pause' })}>
          {t('controls.pause')}
        </button>
        <button type="button" onClick={() => send({ type: 'simulationControl', action: 'step' })}>
          {t('controls.step')}
        </button>
        <button
          type="button"
          onClick={() => send({ type: 'simulationControl', action: 'fastForward', multiplier: fastForward })}
        >
          {t('controls.fastForward')} ×{fastForward}
        </button>
        <input
          type="number"
          min={1}
          value={fastForward}
          onChange={(event) => {
            const value = Number.parseFloat(event.target.value);
            if (Number.isNaN(value)) return;
            setFastForward(value);
            send({ type: 'simulationControl', action: 'fastForward', multiplier: value });
          }}
        />
      </div>
      <div className="controls__row">
        <label>
          {t('controls.tickLength')}
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={tickLength}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isNaN(value)) return;
              setTickLength(value);
              send({ type: 'simulationControl', action: 'setTickLength', minutes: value });
            }}
          />
        </label>
        <label>
          {t('controls.setpoint.temperature')}
          <input
            type="number"
            value={temperature}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isNaN(value)) return;
              setTemperature(value);
              send({ type: 'simulationControl', action: 'setSetpoint', target: 'temperature', value });
            }}
          />
        </label>
        <label>
          {t('controls.setpoint.humidity')}
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={humidity}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isNaN(value)) return;
              setHumidity(value);
              send({ type: 'simulationControl', action: 'setSetpoint', target: 'humidity', value });
            }}
          />
        </label>
        <label>
          {t('controls.setpoint.co2')}
          <input
            type="number"
            value={co2}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isNaN(value)) return;
              setCo2(value);
              send({ type: 'simulationControl', action: 'setSetpoint', target: 'co2', value });
            }}
          />
        </label>
        <label>
          {t('controls.setpoint.ppfd')}
          <input
            type="number"
            value={ppfd}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isNaN(value)) return;
              setPpfd(value);
              send({ type: 'simulationControl', action: 'setSetpoint', target: 'ppfd', value });
            }}
          />
        </label>
      </div>
    </section>
  );
};
