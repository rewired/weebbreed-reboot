import { useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useNavigationStore } from '@/store/navigation';
import { useSimulationStore } from '@/store/simulation';

export interface DeleteZoneModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const DeleteZoneModal = ({ bridge, closeModal, context }: DeleteZoneModalProps) => {
  const zoneId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zone = useSimulationStore((state) =>
    zoneId ? (state.snapshot?.zones.find((item) => item.id === zoneId) ?? null) : null,
  );
  const openRoom = useNavigationStore((state) => state.openRoom);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!zone || !zoneId) {
    return (
      <p className="text-sm text-text-muted">Zone data unavailable. Select a zone to remove.</p>
    );
  }

  const handleDelete = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'deleteZone',
        payload: { zoneId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Deletion rejected by facade.');
        return;
      }
      openRoom(zone.structureId, zone.roomId);
      closeModal();
    } catch (error) {
      console.error('Failed to delete zone', error);
      setFeedback('Connection error while deleting zone.');
    } finally {
      setBusy(false);
    }
  };

  const confirmMatches = confirmation.trim() === zone.name;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Removing <span className="font-semibold text-text">{zone.name}</span> deletes plants,
        devices, and cultivation history. Type the zone name to confirm.
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder={zone.name}
        className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDelete}
        confirmLabel={busy ? 'Removing…' : 'Remove zone'}
        confirmDisabled={!confirmMatches || busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
