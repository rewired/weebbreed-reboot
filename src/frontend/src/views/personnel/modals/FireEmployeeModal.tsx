import Modal from '@/components/Modal';
import type { EmployeeSnapshot } from '@/types/simulation';

export type FireEmployeeModalProps = {
  employee: EmployeeSnapshot;
  structureName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const clampRatio = (value: unknown) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(value, 1));
};

const FireEmployeeModal = ({
  employee,
  structureName,
  onConfirm,
  onCancel,
  title,
  description,
}: FireEmployeeModalProps) => {
  const morale = clampRatio(employee.morale);
  const energy = clampRatio(employee.energy);

  return (
    <Modal
      isOpen
      title={title ?? `Fire ${employee.name}?`}
      description={description ?? 'Confirm termination to remove this employee from your roster.'}
      onClose={onCancel}
      size="sm"
      actions={[
        { label: 'Cancel', onClick: onCancel, variant: 'secondary' },
        { label: 'Fire employee', onClick: onConfirm, variant: 'danger' },
      ]}
    >
      <div className="space-y-4 text-sm text-text-secondary">
        <p>
          {employee.name} currently serves as a{' '}
          <span className="font-semibold text-text-primary">{employee.role}</span>
          {structureName ? (
            <>
              {' '}
              assigned to <span className="font-semibold text-text-primary">{structureName}</span>
            </>
          ) : null}
          .
        </p>
        <dl className="grid grid-cols-1 gap-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Salary
            </dt>
            <dd className="text-base font-medium text-text-primary">
              {employee.salaryPerTick.toLocaleString(undefined, { maximumFractionDigits: 2 })} /
              tick
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Shift capacity
            </dt>
            <dd className="text-base font-medium text-text-primary">
              {employee.maxMinutesPerTick.toLocaleString()} minutes / tick
            </dd>
          </div>
        </dl>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
              <span>Morale</span>
              <span>{percentageFormatter.format(morale)}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-border/30">
              <div
                className="h-2 rounded-full bg-warning"
                style={{ width: `${Math.round(morale * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
              <span>Energy</span>
              <span>{percentageFormatter.format(energy)}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-border/30">
              <div
                className="h-2 rounded-full bg-accent"
                style={{ width: `${Math.round(energy * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Termination will dispatch a workforce fire intent. Any queued work for this employee will
          be redistributed.
        </p>
      </div>
    </Modal>
  );
};

export default FireEmployeeModal;
