import { useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';

export interface RenameStructureModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const RenameStructureModal = ({
  bridge,
  closeModal,
  context,
}: RenameStructureModalProps) => {
  const structureId = typeof context?.structureId === 'string' ? context.structureId : null;
  const currentName = typeof context?.currentName === 'string' ? context.currentName : '';
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!structureId) {
    return (
      <p className="text-sm text-text-muted">Select a structure before attempting to rename.</p>
    );
  }

  const handleRename = async () => {
    if (!name.trim()) {
      setFeedback('Name cannot be empty.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'world',
        action: 'renameStructure',
        payload: { structureId, name: name.trim() },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Rename rejected by facade.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to rename structure', error);
      setFeedback('Connection error while renaming structure.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Structure name
        </span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-border/60 bg-surface-muted/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRename}
        confirmLabel={busy ? 'Renaming…' : 'Rename structure'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
