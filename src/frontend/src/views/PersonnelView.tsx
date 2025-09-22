import Card from '@/components/Card';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsBar from '@/components/MetricsBar';
import Panel from '@/components/Panel';
import { useAppStore } from '@/store';

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

const PersonnelView = () => {
  const personnel = useAppStore((state) => state.personnel);
  const hrEvents = useAppStore((state) => state.hrEvents.slice(-12).reverse());

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
      value: employees.length,
    },
    {
      id: 'applicants',
      label: 'Applicants',
      value: applicants.length,
    },
    {
      id: 'avg-energy',
      label: 'Average energy',
      value: percentageFormatter.format(averageEnergy),
      change: percentageFormatter.format(averageMorale),
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Personnel"
        subtitle="Monitor team morale, workload, and hiring pipeline to keep the facility operating smoothly."
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

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Panel
          title="Team roster"
          description="Morale and energy trends per employee."
          padding="lg"
          variant="elevated"
        >
          {employees.length === 0 ? (
            <p className="text-sm text-text-muted">No employees hired yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {employees.map((employee) => {
                const morale = clampRatio(employee.morale);
                const energy = clampRatio(employee.energy);
                const moraleTone = resolveBarTone(morale);
                const energyTone = resolveBarTone(energy);

                return (
                  <Card
                    key={employee.id}
                    title={employee.name}
                    subtitle={employee.role}
                    metadata={[
                      {
                        label: 'Salary / tick',
                        value: `${currencyFormatter.format(employee.salaryPerTick)} / tick`,
                      },
                      {
                        label: 'Max minutes / tick',
                        value: employee.maxMinutesPerTick.toLocaleString(),
                      },
                      {
                        label: 'Status',
                        value: employee.status,
                      },
                      {
                        label: 'Assignment',
                        value: employee.assignedStructureId ?? 'Unassigned',
                      },
                    ]}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
                          <span>Morale</span>
                          <span>{percentageFormatter.format(morale)}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-border/30">
                          <div
                            className={`h-2 rounded-full ${moraleTone}`}
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
                            className={`h-2 rounded-full ${energyTone}`}
                            style={{ width: `${Math.round(energy * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Applicants"
            description="Candidates waiting in the hiring pipeline."
            padding="lg"
            variant="elevated"
          >
            {applicants.length === 0 ? (
              <p className="text-sm text-text-muted">No open applications at the moment.</p>
            ) : (
              <ul className="space-y-4 text-sm text-text-secondary">
                {applicants.map((applicant) => (
                  <li
                    key={applicant.id}
                    className="rounded-md border border-border/40 bg-surfaceAlt/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{applicant.name}</p>
                        <p className="text-xs uppercase tracking-wide text-text-muted">
                          {applicant.desiredRole}
                        </p>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        {currencyFormatter.format(applicant.expectedSalary)} / tick
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
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
