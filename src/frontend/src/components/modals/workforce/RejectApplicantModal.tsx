import { useState } from 'react';
import { ActionFooter, Feedback } from '@/components/modals/common';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';

export interface RejectApplicantModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const RejectApplicantModal = ({
  bridge,
  closeModal,
  context,
}: RejectApplicantModalProps) => {
  const applicantId = typeof context?.applicantId === 'string' ? context.applicantId : null;
  const applicant = useSimulationStore((state) =>
    applicantId
      ? (state.snapshot?.personnel.applicants.find((item) => item.id === applicantId) ?? null)
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!applicant || !applicantId) {
    return (
      <p className="text-sm text-text-muted">
        Applicant data unavailable. Select an applicant to reject.
      </p>
    );
  }

  const handleReject = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'rejectApplicant',
        payload: { applicantId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Rejection failed.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to reject applicant', error);
      setFeedback('Connection error while rejecting applicant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-muted">
        Reject <span className="font-semibold text-text">{applicant.name}</span>'s application for
        the {applicant.desiredRole} position. They will be removed from the applicant pool.
      </p>
      {feedback ? <Feedback message={feedback} /> : null}
      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleReject}
        confirmLabel={busy ? 'Rejecting…' : 'Reject Applicant'}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
