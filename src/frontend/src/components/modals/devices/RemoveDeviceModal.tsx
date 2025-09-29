import { useMemo, useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';

export interface RemoveDeviceModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const RemoveDeviceModal = ({ bridge, closeModal, context }: RemoveDeviceModalProps) => {
  const instanceId = typeof context?.deviceId === 'string' ? context.deviceId : null;
  const zones = useSimulationStore((state) => state.snapshot?.zones ?? []);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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

  const handleRemove = async () => {
    if (!instanceId) {
      setFeedback('Device context missing. Close the modal and retry.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    setWarnings([]);
    try {
      const response = await bridge.devices.removeDevice({ instanceId });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Device removal rejected by facade.');
        return;
      }
      if (response.warnings?.length) {
        setWarnings(response.warnings);
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to remove device', error);
      setFeedback('Connection error while removing device.');
    } finally {
      setBusy(false);
    }
  };

  if (!instanceId) {
    return <p className="text-sm text-text-muted">Device context unavailable.</p>;
  }

  return (
    <div className="grid gap-4 text-sm">
      <p className="text-text">
        Remove <span className="font-semibold">{deviceContext?.device.name ?? 'this device'}</span>
        {deviceContext?.zone ? ` from ${deviceContext.zone.name}` : null}? This action cannot be
        undone.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      {warnings.map((warning) => (
        <Feedback key={warning} message={warning} />
      ))}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRemove}
        confirmLabel={busy ? 'Deleting…' : 'Delete device'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
