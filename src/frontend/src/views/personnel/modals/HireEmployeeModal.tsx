import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import NumberInputField from '@/components/forms/NumberInputField';
import type { ApplicantSnapshot } from '@/types/simulation';

export type HireEmployeeModalProps = {
  candidate: ApplicantSnapshot;
  onConfirm: (options: { wage?: number; role: string }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const clampSkillLevel = (value: unknown) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(value, 5));
};

const HireEmployeeModal = ({
  candidate,
  onConfirm,
  onCancel,
  title,
  description,
}: HireEmployeeModalProps) => {
  const [wage, setWage] = useState(() => candidate.expectedSalary);

  const skills = useMemo(() => Object.entries(candidate.skills ?? {}), [candidate.skills]);
  const traits = candidate.traits ?? [];

  const handleConfirm = () => {
    onConfirm({
      wage,
      role: candidate.desiredRole,
    });
  };

  return (
    <Modal
      isOpen
      title={title ?? `Hire ${candidate.name}`}
      description={description ?? `Confirm onboarding details for ${candidate.desiredRole}.`}
      onClose={onCancel}
      size="md"
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Confirm hire',
          onClick: handleConfirm,
          variant: 'primary',
        },
      ]}
    >
      <div className="space-y-4">
        <section className="rounded-lg border border-border/50 bg-surfaceAlt/60 p-4 text-sm text-text-secondary">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Role
              </dt>
              <dd className="text-base font-medium text-text-primary">{candidate.desiredRole}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Expected wage
              </dt>
              <dd className="text-base font-medium text-text-primary">
                {currencyFormatter.format(candidate.expectedSalary)} / tick
              </dd>
            </div>
          </dl>
        </section>

        <NumberInputField
          label="Offer wage"
          value={Number.isFinite(wage) ? wage : 0}
          onChange={setWage}
          min={0}
          step={10}
          formatValue={(value) => currencyFormatter.format(Math.max(0, value))}
          suffix="/ tick"
          description="Adjust the salary offer before confirming the hire."
        />

        {skills.length ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Key skills
            </h3>
            <ul className="space-y-2">
              {skills.map(([skill, level]) => {
                const normalized = clampSkillLevel(level);
                const percentage = Math.round((normalized / 5) * 100);
                return (
                  <li key={skill} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-text-primary">{skill}</span>
                      <span className="text-xs text-text-muted">{percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border/30">
                      <div
                        className="h-1.5 rounded-full bg-accent"
                        style={{ width: `${percentage}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {traits.length ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Traits
            </h3>
            <div className="flex flex-wrap gap-2">
              {traits.map((trait) => (
                <span
                  key={trait}
                  className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-medium text-accent"
                >
                  {trait}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-text-muted">
          The offered wage will be sent with the hire intent. You can adjust assignments after the
          employee joins the roster.
        </p>
      </div>
    </Modal>
  );
};

export default HireEmployeeModal;
