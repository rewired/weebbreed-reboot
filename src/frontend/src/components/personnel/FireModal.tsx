import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useSimulationStore } from '@/store/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import {
  getMoraleColor,
  getEnergyColor,
  getStatusColor,
  formatStatusDisplay,
  getRoleDisplayName,
} from './utils';

interface FireModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

const Feedback = ({ message }: { message: string }) => (
  <p className="text-sm text-danger">{message}</p>
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
    <Button variant="danger" onClick={onConfirm} disabled={confirmDisabled}>
      {confirmLabel}
    </Button>
  </div>
);

export const FireModal = ({ bridge, closeModal, context }: FireModalProps) => {
  const employeeId = typeof context?.employeeId === 'string' ? context.employeeId : null;
  const employee = useSimulationStore((state) =>
    employeeId
      ? (state.snapshot?.personnel.employees.find((item) => item.id === employeeId) ?? null)
      : null,
  );
  const snapshot = useSimulationStore((state) => state.snapshot);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!employee || !employeeId) {
    return (
      <p className="text-sm text-text-muted">
        Employee data unavailable. Select an employee to terminate.
      </p>
    );
  }

  const handleFire = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await bridge.sendIntent({
        domain: 'workforce',
        action: 'fireEmployee',
        payload: { employeeId },
      });
      if (!response.ok) {
        const warning = response.errors?.[0]?.message ?? response.warnings?.[0];
        setFeedback(warning ?? 'Termination rejected by workforce engine.');
        return;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to fire employee', error);
      setFeedback('Connection error while terminating employee.');
    } finally {
      setBusy(false);
    }
  };

  const confirmMatches = confirmation.trim().toLowerCase() === employee.name.toLowerCase();

  // Calculate termination impact
  const assignedStructure = employee.assignedStructureId
    ? snapshot?.structures.find((s) => s.id === employee.assignedStructureId)
    : null;

  const remainingEmployees = (snapshot?.personnel.employees.length ?? 1) - 1;
  const currentPayroll =
    snapshot?.personnel.employees.reduce((sum, emp) => sum + emp.salaryPerTick, 0) ?? 0;
  const newPayroll = currentPayroll - employee.salaryPerTick;

  return (
    <div className="grid gap-6 max-w-2xl">
      {/* Warning Header */}
      <div className="flex items-start gap-4 rounded-2xl border border-danger/40 bg-danger/5 p-4">
        <div className="flex-shrink-0">
          <div className="flex size-16 items-center justify-center rounded-full bg-danger/10">
            <Icon name="warning" size={32} className="text-danger" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-text">Terminate Employee</h3>
            <Badge tone="danger" className="text-xs">
              Permanent Action
            </Badge>
          </div>
          <p className="text-text-muted mt-1">
            You are about to permanently remove{' '}
            <strong className="text-text">{employee.name}</strong> from your workforce. This action
            cannot be undone.
          </p>
        </div>
      </div>

      {/* Employee Information */}
      <div className="rounded-xl border border-border/40 bg-surface-elevated/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="person" size={18} />
          <h4 className="font-semibold text-text">Employee Details</h4>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Name</span>
              <span className="font-medium text-text">{employee.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Role</span>
              <span className="text-text">{getRoleDisplayName(employee.role)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Status</span>
              <Badge tone={getStatusColor(employee.status)}>
                {formatStatusDisplay(employee.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Current Salary</span>
              <span className="font-medium text-text">
                €{employee.salaryPerTick.toLocaleString()}/tick
              </span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Morale</span>
              <Badge tone={getMoraleColor(employee.morale)}>
                {Math.round(employee.morale * 100)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Energy</span>
              <Badge tone={getEnergyColor(employee.energy)}>
                {Math.round(employee.energy * 100)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Assignment</span>
              <span className="text-text">
                {assignedStructure ? assignedStructure.name : 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Work Capacity</span>
              <span className="text-text">{employee.maxMinutesPerTick}min/tick</span>
            </div>
          </div>
        </div>
      </div>

      {/* Termination Impact */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="analytics" size={18} className="text-warning" />
          <h4 className="font-semibold text-text">Impact on Company</h4>
        </div>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Current Staff</span>
            <span className="font-medium text-text">
              {snapshot?.personnel.employees.length ?? 0} employees
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">After Termination</span>
            <span className="font-medium text-text">{remainingEmployees} employees</span>
          </div>
          <div className="flex items-center justify-between border-t border-warning/20 pt-2">
            <span className="text-text-muted">Current Payroll</span>
            <span className="font-medium text-text">€{currentPayroll.toLocaleString()}/tick</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-text">New Payroll</span>
            <span className="font-semibold text-success">€{newPayroll.toLocaleString()}/tick</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Savings</span>
            <span className="font-medium text-success">
              -€{employee.salaryPerTick.toLocaleString()}/tick
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Section */}
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
        <div className="flex items-start gap-3 mb-4">
          <Icon name="security" size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm text-text-muted">
            <p className="mb-2">
              <strong className="text-text">Safety Check Required:</strong> To confirm termination,
              please type the employee's full name exactly as shown below.
            </p>
            <p className="text-xs text-text-muted">
              This helps prevent accidental terminations and ensures you're acting intentionally.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-surface-muted/60 p-3 text-center">
            <span className="font-mono text-lg font-semibold text-text">{employee.name}</span>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Type the employee's name to confirm termination
            </span>
            <input
              type="text"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Enter employee name"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                confirmation && !confirmMatches
                  ? 'border-danger bg-danger/10 text-danger focus:border-danger'
                  : 'border-border/60 bg-surface-muted/50 text-text focus:border-primary'
              }`}
            />
            {confirmation && !confirmMatches && (
              <span className="text-xs text-danger">
                Name does not match. Please type "{employee.name}" exactly.
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Final Warning */}
      <div className="rounded-xl border border-danger/40 bg-danger/10 p-4">
        <div className="flex items-start gap-3">
          <Icon name="error" size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="mb-2 font-medium text-danger">
              ⚠️ This action is permanent and cannot be undone.
            </p>
            <p className="text-text-muted">
              {employee.name} will be immediately removed from your workforce and all assigned
              tasks. You will need to hire a replacement if this role is still needed.
            </p>
          </div>
        </div>
      </div>

      {feedback ? <Feedback message={feedback} /> : null}

      <ActionFooter
        onCancel={closeModal}
        onConfirm={handleFire}
        confirmLabel={busy ? 'Terminating…' : 'Terminate Employee'}
        confirmDisabled={!confirmMatches || busy}
        cancelDisabled={busy}
      />
    </div>
  );
};
