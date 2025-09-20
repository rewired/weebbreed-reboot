import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SimulationControlMessage } from '../../hooks/useSimulationSocket.ts';

interface SimulationControlsProps {
  onControl: (message: SimulationControlMessage) => void;
}

export function SimulationControls({ onControl }: SimulationControlsProps): JSX.Element {
  const { t } = useTranslation();
  const [tickLength, setTickLength] = useState(5);
  const [speed, setSpeed] = useState(1);

  const sendControl = (action: SimulationControlMessage['action'], extra?: Partial<SimulationControlMessage>) => {
    onControl({ action, ...extra });
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <button onClick={() => sendControl('play')}>{t('controls.play')}</button>
      <button onClick={() => sendControl('pause')}>{t('controls.pause')}</button>
      <button onClick={() => sendControl('step')}>{t('controls.step')}</button>
      <button onClick={() => sendControl('fastForward', { speed: speed * 2 })}>{t('controls.fastForward')}</button>
      <label>
        {t('controls.tickLength')}
        <input
          type="number"
          min={1}
          value={tickLength}
          onChange={(event) => {
            const value = Number(event.target.value);
            setTickLength(value);
            sendControl('setTickLength', { minutes: value });
          }}
          style={{ marginLeft: '0.5rem', width: '4rem' }}
        />
      </label>
      <label>
        {t('controls.speed')}
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.5}
          value={speed}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSpeed(value);
            sendControl('fastForward', { speed: value });
          }}
          style={{ marginLeft: '0.5rem' }}
        />
      </label>
    </div>
  );
}
