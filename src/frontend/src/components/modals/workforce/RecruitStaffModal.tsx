import { useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';

export interface RecruitStaffModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
}

export const RecruitStaffModal = ({ bridge, closeModal }: RecruitStaffModalProps) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRecruit = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'generateApplicants',
        payload: { count: 5 },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Failed to recruit new staff.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to recruit staff', error);
      setFeedback('Connection error while recruiting staff.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Generate new job applicants for available positions. The workforce engine will create
        candidates with randomized skills, traits, and salary expectations based on current company
        needs.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleRecruit}
        confirmLabel={busy ? 'Recruiting…' : 'Generate Applicants'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
