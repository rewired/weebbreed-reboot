import { useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useNavigationStore } from '@/store/navigation';
import { useSimulationStore } from '@/store/simulation';

export interface DuplicateZoneModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const DuplicateZoneModal = ({ bridge, closeModal, context }: DuplicateZoneModalProps) => {
  const zoneId = typeof context?.zoneId === 'string' ? context.zoneId : null;
  const zone = useSimulationStore((state) =>
    zoneId ? (state.snapshot?.zones.find((item) => item.id === zoneId) ?? null) : null,
  );
  const openZone = useNavigationStore((state) => state.openZone);
  const [nameOverride, setNameOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!zone || !zoneId) {
    return (
      <p className="text-sm text-text-muted">Zone data unavailable. Select a zone to clone.</p>
    );
  }

  const handleDuplicate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { zoneId };
      if (nameOverride.trim()) {
        payload.name = nameOverride.trim();
      }
      const response = await bridge.sendIntent<{ zoneId?: string }>({
        domain: 'world',
        action: 'duplicateZone',
        payload,
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Duplication rejected by facade.');
        return;
      }
      const newZoneId = response.data?.zoneId;
      if (newZoneId) {
        openZone(zone.structureId, zone.roomId, newZoneId);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to duplicate zone', error);
      setFeedback('Connection error while duplicating zone.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Duplicate <span className="font-semibold text-text">{zone.name}</span> including devices and
        cultivation setup. Provide a new name if desired.
      </p>
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Zone name
        </span>
        <input
          type="text"
          value={nameOverride}
          onChange={(event) => setNameOverride(event.target.value)}
          placeholder={`${zone.name} Copy`}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleDuplicate}
        confirmLabel={busy ? 'Duplicating…' : 'Duplicate zone'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
