import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import {
  getSkillColor,
  getSkillDescription,
  formatSkillLevel,
  getRoleDisplayName,
  getGenderIcon,
} from './utils';

interface HireModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

const Feedback = ({ message }: { message: string }) => (
  <p className="text-sm text-warning">{message}</p>
);

const ActionFooter = ({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  cancelDisabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled: boolean;
  cancelDisabled: boolean;
}) => (
  <div className="flex justify-end gap-2">
    <Button variant="ghost" onClick={onCancel} disabled={cancelDisabled}>
      Cancel
    </Button>
    <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>
      {confirmLabel}
    </Button>
  </div>
);

export const HireModal = ({ bridge, closeModal, context }: HireModalProps) => {
  const applicantId = typeof context?.applicantId === 'string' ? context.applicantId : null;
  const applicant = useSimulationStore((state) =>
    applicantId
      ? (state.snapshot?.personnel.applicants.find((item) => item.id === applicantId) ?? null)
      : null,
  );
  const snapshot = useSimulationStore((state) => state.snapshot);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!applicant || !applicantId) {
    return (
      <p className="text-sm text-text-muted">
        Applicant data unavailable. Select an applicant before hiring.
      </p>
    );
  }

  const handleHire = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'hireApplicant',
        payload: { applicantId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Hiring rejected by workforce engine.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to hire applicant', error);
      setFeedback('Connection error while hiring applicant.');
    } finally {
      setBusy(false);
    }
  };

  const skillEntries = Object.entries(applicant.skills).filter(([, level]) => level && level > 0);
  const averageSkillLevel =
    skillEntries.length > 0
      ? skillEntries.reduce((sum, [, level]) => sum + level, 0) / skillEntries.length
      : 0;

  const currentEmployeeCount = snapshot?.personnel.employees.length ?? 0;
  const currentPayroll =
    snapshot?.personnel.employees.reduce((sum, emp) => sum + emp.salaryPerTick, 0) ?? 0;
  const newPayrollTotal = currentPayroll + applicant.expectedSalary;

  return (
    <div className="grid gap-6 max-w-2xl">
      {/* Candidate Header */}
      <div className="flex items-start gap-4 rounded-2xl border border-border/40 bg-surface-elevated/60 p-4">
        <div className="flex-shrink-0">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Icon name={getGenderIcon(applicant.gender)} size={32} className="text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-text">{applicant.name}</h3>
            {applicant.gender && (
              <Badge tone="default" className="text-xs">
                {applicant.gender.charAt(0).toUpperCase() + applicant.gender.slice(1)}
              </Badge>
            )}
          </div>
          <p className="text-text-muted">{getRoleDisplayName(applicant.desiredRole)}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Icon name="payments" size={16} className="text-text-muted" />
              <span className="font-semibold text-text">
                €{applicant.expectedSalary.toLocaleString()}/tick
              </span>
            </div>
            {skillEntries.length > 0 && (
              <div className="flex items-center gap-1">
                <Icon name="star" size={16} className="text-warning" />
                <span className="text-sm text-text-muted">
                  Avg. {formatSkillLevel(averageSkillLevel)} ({skillEntries.length} skills)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills & Traits */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Skills Section */}
        {skillEntries.length > 0 && (
          <div className="rounded-xl border border-border/30 bg-surface-muted/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="star" size={18} className="text-warning" />
              <h4 className="font-semibold text-text">Skills & Experience</h4>
            </div>
            <div className="space-y-3">
              {skillEntries.map(([skill, level]) => (
                <div key={skill} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text">{skill}</span>
                    <span className="text-xs text-text-muted">{getSkillDescription(level)}</span>
                  </div>
                  <Badge tone={getSkillColor(level)} className="font-mono">
                    {formatSkillLevel(level)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Traits Section */}
        <div className="rounded-xl border border-border/30 bg-surface-muted/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="psychology" size={18} className="text-primary" />
            <h4 className="font-semibold text-text">Traits & Personality</h4>
          </div>
          {applicant.traits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {applicant.traits.map((trait) => (
                <Badge key={trait} tone="default" className="text-xs">
                  {trait}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No specific traits identified</p>
          )}
        </div>
      </div>

      {/* Hiring Impact */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="analytics" size={18} className="text-warning" />
          <h4 className="font-semibold text-text">Impact on Company</h4>
        </div>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Current Staff Count</span>
            <span className="font-medium text-text">{currentEmployeeCount} employees</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Current Payroll</span>
            <span className="font-medium text-text">€{currentPayroll.toLocaleString()}/tick</span>
          </div>
          <div className="flex items-center justify-between border-t border-warning/20 pt-2">
            <span className="font-medium text-text">New Payroll Total</span>
            <span className="font-semibold text-warning">
              €{newPayrollTotal.toLocaleString()}/tick
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Payroll Increase</span>
            <span className="font-medium text-warning">
              +€{applicant.expectedSalary.toLocaleString()}/tick
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      {applicant.personalSeed && (
        <div className="rounded-xl border border-border/30 bg-surface-muted/20 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Icon name="fingerprint" size={16} className="text-text-muted" />
              <span className="text-text-muted">Candidate ID</span>
            </div>
            <span className="font-mono text-xs text-text">
              {applicant.personalSeed.slice(0, 12)}...
            </span>
          </div>
        </div>
      )}

      {/* Hiring Confirmation */}
      <div className="rounded-xl border border-success/30 bg-success/5 p-4">
        <div className="flex items-start gap-3">
          <Icon name="info" size={20} className="text-success flex-shrink-0 mt-0.5" />
          <div className="text-sm text-text-muted">
            <p className="mb-2">
              <strong className="text-text">Hiring {applicant.name}</strong> will immediately add
              them to your workforce. Their salary will be deducted from company funds each tick.
            </p>
            <p>This action cannot be undone, but you can terminate employees later if needed.</p>
          </div>
        </div>
      </div>

      {feedback ? <Feedback message={feedback} /> : null}

      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleHire}
        confirmLabel={busy ? 'Hiring…' : `Hire ${applicant.name}`}
        confirmDisabled={busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
