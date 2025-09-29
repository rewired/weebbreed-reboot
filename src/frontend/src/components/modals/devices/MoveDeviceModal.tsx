import { useEffect, useMemo, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';

export interface MoveDeviceModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const MoveDeviceModal = ({ bridge, closeModal, context }: MoveDeviceModalProps) => {
  const instanceId = typeof context?.deviceId === 'string' ? context.deviceId : null;
  const currentZoneId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zones = useSimulationStore((state) => state.snapshot?.zones ?? []);
  const [targetZoneId, setTargetZoneId] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const zoneOptions = useMemo(
    () =>
      zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
      })),
    [zones],
  );

  useEffect(() => {
    if (!zoneOptions.length) {
      setTargetZoneId('');
      return;
    }
    setTargetZoneId((previous) => {
      if (previous && zoneOptions.some((zone) => zone.id === previous)) {
        return previous;
      }
      const fallback =
        zoneOptions.find((zone) => zone.id !== currentZoneId)?.id ?? zoneOptions[0]!.id;
      return fallback;
    });
  }, [zoneOptions, currentZoneId]);

  const deviceContext = useMemo(() => {
    if (!instanceId) {
      return null;
    }
    for (const zone of zones) {
      const device = zone.devices.find((item) => item.id === instanceId);
      if (device) {
        return { device, zone };
      }
    }
    return null;
  }, [instanceId, zones]);

  const hasDestination = zoneOptions.some((zone) => zone.id !== currentZoneId);
  const selectedZoneName = zoneOptions.find((zone) => zone.id === targetZoneId)?.name ?? '';

  const handleMove = async () => {
    if (!instanceId) {
      setFeedback('Device context missing. Close the modal and retry.');
      return;
    }
    if (!targetZoneId) {
      setFeedback('Select a destination zone to continue.');
      return;
    }
    if (targetZoneId === currentZoneId) {
      setFeedback('Select a different zone to move the device.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    setWarnings([]);
    try {
      const response = await bridge.devices.moveDevice({
        instanceId,
        targetZoneId,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Device move rejected by facade.');
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to move device', error);
      setFeedback('Connection error while moving device.');
    } finally {
      setBusy(false);
    }
  };

  if (!instanceId) {
    return <p className="text-sm text-text-muted">Device context unavailable.</p>;
  }

  if (!zones.length) {
    return <p className="text-sm text-text-muted">No zones available. Load simulation data.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <p className="text-text">
          Move <span className="font-semibold">{deviceContext?.device.name ?? 'device'}</span> from{' '}
          {deviceContext?.zone.name ?? 'current zone'}.
        </p>
        <label className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Destination zone
          </span>
          <select
            className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            value={targetZoneId}
            onChange={(event) => setTargetZoneId(event.target.value)}
            disabled={!hasDestination || busy}
          >
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
          {!hasDestination ? (
            <span className="text-xs text-warning">
              No other zones available. Create another zone before moving this device.
            </span>
          ) : null}
          {selectedZoneName && targetZoneId === currentZoneId ? (
            <span className="text-xs text-warning">
              {selectedZoneName} is the current zone. Choose a different destination.
            </span>
          ) : null}
        </label>
      </div>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleMove}
        confirmLabel={busy ? 'Moving…' : 'Move device'}
        confirmDisabled={busy || !hasDestination || !targetZoneId || targetZoneId === currentZoneId}
        cancelDisabled={busy}
      />
    </div>
  );
};
