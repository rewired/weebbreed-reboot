import { useMemo } from 'react';
import Card from '@/components/Card';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsBar from '@/components/MetricsBar';
import Panel from '@/components/Panel';
import { Button } from '@/components/inputs';
import { useAppStore, usePersonnelStore, useZoneStore } from '@/store';

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const clampRatio = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(value, 1));
};

const clampSkillLevel = (value: unknown) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(value, 5));
};

const resolveBarTone = (value: number) => {
  if (value >= 0.8) {
    return 'bg-positive';
  }
  if (value >= 0.6) {
    return 'bg-accent';
  }
  if (value >= 0.4) {
    return 'bg-warning';
  }
  return 'bg-danger';
};

const formatSalaryPerTick = (value: number) =>
  `${currencyFormatter.format(Math.max(0, value))} / tick`;

const PersonnelMetricBar = ({ label, value }: { label: string; value: number }) => {
  const ratio = clampRatio(value);
  const barClass = resolveBarTone(ratio);
  return (
    <div>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
        <span>{label}</span>
        <span>{percentageFormatter.format(ratio)}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-border/30" aria-hidden="true">
        <div
          className={`h-2 rounded-full ${barClass}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
};

const ApplicantSkills = ({
  skills,
}: {
  skills: Record<string, number | undefined> | undefined;
}) => {
  const entries = useMemo(() => Object.entries(skills ?? {}), [skills]);
  if (!entries.length) {
    return null;
  }
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Key skills</h4>
      <ul className="space-y-2">
        {entries.map(([skill, level]) => {
          const normalized = clampSkillLevel(level);
          const percentage = Math.round((normalized / 5) * 100);
          return (
            <li key={skill} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">{skill}</span>
                <span className="text-xs text-text-muted">{percentage}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border/30" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${percentage}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const ApplicantTraits = ({ traits }: { traits: string[] | undefined }) => {
  if (!traits || traits.length === 0) {
    return null;
  }
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Traits</h4>
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
  );
};

const PersonnelView = () => {
  const personnel = usePersonnelStore((state) => state.personnel);
  const hrEvents = usePersonnelStore((state) => state.hrEvents.slice(-12).reverse());
  const refreshCandidates = usePersonnelStore((state) => state.refreshCandidates);
  const openModal = useAppStore((state) => state.openModal);
  const structures = useZoneStore((state) => state.structures);

  const structureNameById = useMemo(() => {
    const mapping: Record<string, string> = {};
    for (const structure of Object.values(structures)) {
      if (structure) {
        mapping[structure.id] = structure.name;
      }
    }
    return mapping;
  }, [structures]);

  if (!personnel) {
    return (
      <Panel
        title="Personnel overview"
        description="Staffing data will appear once the simulation streams HR snapshots."
        padding="lg"
        variant="elevated"
      >
        <p className="text-sm text-text-muted">No personnel data available yet.</p>
      </Panel>
    );
  }

  const employees = personnel.employees ?? [];
  const applicants = personnel.applicants ?? [];

  const overallMorale = clampRatio(personnel.overallMorale);
  const averageEnergy = employees.length
    ? clampRatio(
        employees.reduce((sum, employee) => sum + clampRatio(employee.energy), 0) /
          employees.length,
      )
    : 0;
  const averageMorale = employees.length
    ? clampRatio(
        employees.reduce((sum, employee) => sum + clampRatio(employee.morale), 0) /
          employees.length,
      )
    : 0;

  const summaryMetrics = [
    {
      id: 'overall-morale',
      label: 'Overall morale',
      value: percentageFormatter.format(overallMorale),
    },
    {
      id: 'employee-count',
      label: 'Employees',
      value: employees.length.toLocaleString(),
    },
    {
      id: 'applicant-count',
      label: 'Applicants',
      value: applicants.length.toLocaleString(),
    },
    {
      id: 'average-energy',
      label: 'Average energy',
      value: percentageFormatter.format(averageEnergy),
    },
  ];

  const handleHire = (candidateId: string, candidateName: string) => {
    openModal({
      kind: 'hireEmployee',
      title: `Hire ${candidateName}`,
      description: 'Review compensation before confirming the hire.',
      payload: { candidateId },
      autoPause: true,
    });
  };

  const handleFire = (employeeId: string, employeeName: string) => {
    openModal({
      kind: 'fireEmployee',
      title: `Fire ${employeeName}?`,
      description: 'Firing will immediately remove the employee from all assignments.',
      payload: { employeeId },
      autoPause: true,
    });
  };

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Personnel"
        subtitle="Monitor team morale, workload, and the hiring pipeline to keep the facility operating smoothly."
        status={{
          label: overallMorale >= 0.6 ? 'Stable team' : 'Needs attention',
          tone: overallMorale >= 0.6 ? 'positive' : 'warning',
          tooltip:
            overallMorale >= 0.6
              ? 'Morale is within healthy range.'
              : 'Investigate morale dips with HR events.',
        }}
        meta={[
          { label: 'Employees', value: employees.length.toLocaleString() },
          { label: 'Applicants', value: applicants.length.toLocaleString() },
          { label: 'Avg morale', value: percentageFormatter.format(averageMorale) },
        ]}
      />

      <MetricsBar metrics={summaryMetrics} layout="compact" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Panel
          title="Team roster"
          description="Current employees with morale and energy indicators."
          padding="lg"
          variant="elevated"
        >
          {employees.length === 0 ? (
            <p className="text-sm text-text-muted">No employees hired yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {employees.map((employee) => {
                const morale = clampRatio(employee.morale);
                const energy = clampRatio(employee.energy);
                const assignment = employee.assignedStructureId
                  ? (structureNameById[employee.assignedStructureId] ?? 'Unassigned')
                  : 'Unassigned';

                return (
                  <Card
                    key={employee.id}
                    title={employee.name}
                    subtitle={employee.role}
                    metadata={[
                      {
                        label: 'Salary / tick',
                        value: formatSalaryPerTick(employee.salaryPerTick),
                      },
                      {
                        label: 'Max minutes / tick',
                        value: employee.maxMinutesPerTick.toLocaleString(),
                      },
                      { label: 'Status', value: employee.status },
                      { label: 'Assignment', value: assignment },
                    ]}
                    footer={
                      <div className="flex items-center justify-end">
                        <Button
                          variant="solid"
                          tone="danger"
                          size="sm"
                          onClick={() => handleFire(employee.id, employee.name)}
                        >
                          Fire employee
                        </Button>
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      <PersonnelMetricBar label="Morale" value={morale} />
                      <PersonnelMetricBar label="Energy" value={energy} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Job market"
            description="Candidates available for immediate hire."
            padding="lg"
            variant="elevated"
            action={
              <Button variant="solid" tone="accent" size="sm" onClick={refreshCandidates}>
                Refresh candidates
              </Button>
            }
          >
            {applicants.length === 0 ? (
              <p className="text-sm text-text-muted">No open applications at the moment.</p>
            ) : (
              <div className="space-y-4">
                {applicants.map((applicant) => {
                  const skills = applicant.skills ?? {};
                  const traitList = applicant.traits ?? [];

                  return (
                    <Card
                      key={applicant.id}
                      title={applicant.name}
                      subtitle={applicant.desiredRole}
                      metadata={[
                        {
                          label: 'Expected wage',
                          value: formatSalaryPerTick(applicant.expectedSalary),
                        },
                        {
                          label: 'Skill count',
                          value: Object.keys(skills).length.toLocaleString(),
                        },
                      ]}
                      footer={
                        <div className="flex items-center justify-end">
                          <Button
                            variant="solid"
                            tone="accent"
                            size="sm"
                            onClick={() => handleHire(applicant.id, applicant.name)}
                          >
                            Hire candidate
                          </Button>
                        </div>
                      }
                    >
                      <div className="space-y-4">
                        <ApplicantSkills skills={skills} />
                        <ApplicantTraits traits={traitList} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="HR events"
            description="Latest staffing-related alerts from the simulation."
            padding="lg"
            variant="elevated"
          >
            {hrEvents.length === 0 ? (
              <p className="text-sm text-text-muted">No HR events recorded.</p>
            ) : (
              <ul className="space-y-3 text-sm text-text-secondary">
                {hrEvents.map((event, index) => (
                  <li
                    key={`${event.type}-${event.ts ?? event.tick ?? index}`}
                    className="rounded-md border border-border/40 bg-surfaceAlt/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-text-primary">
                        {event.type.replace('hr.', '')}
                      </p>
                      {event.tick !== undefined ? (
                        <span className="font-mono text-xs text-text-muted">
                          Tick {event.tick.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    {event.message ? (
                      <p className="mt-2 text-sm text-text-secondary">{event.message}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default PersonnelView;
