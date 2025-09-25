import { useMemo } from 'react';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { CandidateCard } from '@/components/personnel/CandidateCard';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';
import type { EmployeeSnapshot } from '@/types/simulation';

const EmployeeCard = ({ employee }: { employee: EmployeeSnapshot }) => {
  const openModal = useUIStore((state) => state.openModal);

  const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    switch (status.toLowerCase()) {
      case 'working':
        return 'success';
      case 'idle':
        return 'default';
      case 'resting':
        return 'warning';
      case 'offduty':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getMoraleColor = (morale: number): 'success' | 'warning' | 'danger' => {
    if (morale >= 0.75) return 'success';
    if (morale >= 0.5) return 'warning';
    return 'danger';
  };

  const getEnergyColor = (energy: number): 'success' | 'warning' | 'danger' => {
    if (energy >= 0.75) return 'success';
    if (energy >= 0.25) return 'warning';
    return 'danger';
  };

  return (
    <Card
      title={employee.name}
      subtitle={`${employee.role} • €${employee.salaryPerTick}/tick`}
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Icon name="person" />}
            onClick={() =>
              openModal({
                id: `employee-details-${employee.id}`,
                type: 'employeeDetails',
                title: `${employee.name} Details`,
                subtitle: `Manage ${employee.role} profile and assignments`,
                context: { employeeId: employee.id },
              })
            }
          >
            Details
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Icon name="person_remove" />}
            onClick={() =>
              openModal({
                id: `fire-employee-${employee.id}`,
                type: 'fireEmployee',
                title: `Terminate ${employee.name}`,
                subtitle: `Confirm termination of ${employee.role}`,
                context: { employeeId: employee.id },
              })
            }
          >
            Fire
          </Button>
        </div>
      }
      className="bg-surface-elevated/80"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge tone={getStatusColor(employee.status)}>
              {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
            </Badge>
            {employee.assignedStructureId && (
              <Badge tone="default">
                <Icon name="domain" size={14} />
                Assigned
              </Badge>
            )}
          </div>
          <div className="text-sm text-text-muted">Max {employee.maxMinutesPerTick}min/tick</div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
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
        </div>
      </div>
    </Card>
  );
};

export const PersonnelView = () => {
  const snapshot = useSimulationStore((state) => state.snapshot);
  const openModal = useUIStore((state) => state.openModal);

  const personnel = snapshot?.personnel;

  const stats = useMemo(() => {
    if (!personnel) {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalApplicants: 0,
        averageMorale: 0,
        totalPayroll: 0,
        roleDistribution: {} as Record<string, number>,
      };
    }

    const activeEmployees = personnel.employees.filter((emp) => emp.status !== 'offduty').length;

    const totalPayroll = personnel.employees.reduce((sum, emp) => sum + emp.salaryPerTick, 0);

    const roleDistribution = personnel.employees.reduce(
      (acc, emp) => {
        acc[emp.role] = (acc[emp.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalEmployees: personnel.employees.length,
      activeEmployees,
      totalApplicants: personnel.applicants.length,
      averageMorale: personnel.overallMorale,
      totalPayroll,
      roleDistribution,
    };
  }, [personnel]);

  if (!snapshot || !personnel) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text">Personnel Management</h2>
          <p className="text-sm text-text-muted">
            Staff roster, hiring, and workforce administration
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Icon name="group_add" />}
          onClick={() =>
            openModal({
              id: 'recruit-staff',
              type: 'recruitStaff',
              title: 'Recruit Staff',
              subtitle: 'Generate new job applicants for available positions',
            })
          }
        >
          Recruit Staff
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Total Staff" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon name="groups" size={32} className="text-primary" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-text">{stats.totalEmployees}</span>
              <span className="text-sm text-text-muted">{stats.activeEmployees} active</span>
            </div>
          </div>
        </Card>

        <Card title="Job Applicants" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon name="person_search" size={32} className="text-warning" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-text">{stats.totalApplicants}</span>
              <span className="text-sm text-text-muted">pending review</span>
            </div>
          </div>
        </Card>

        <Card title="Overall Morale" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon
              name="sentiment_satisfied"
              size={32}
              className={
                stats.averageMorale >= 0.75
                  ? 'text-success'
                  : stats.averageMorale >= 0.5
                    ? 'text-warning'
                    : 'text-danger'
              }
            />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-text">
                {Math.round(stats.averageMorale * 100)}%
              </span>
              <span className="text-sm text-text-muted">company average</span>
            </div>
          </div>
        </Card>

        <Card title="Total Payroll" className="bg-surface-elevated/80">
          <div className="flex items-center gap-3">
            <Icon name="payments" size={32} className="text-text" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-text">
                €{stats.totalPayroll.toLocaleString()}
              </span>
              <span className="text-sm text-text-muted">per tick</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Current Staff</h3>
            <Badge tone="default">{personnel.employees.length} employees</Badge>
          </div>

          {personnel.employees.length === 0 ? (
            <Card className="text-center py-8">
              <Icon name="groups" size={48} className="mx-auto mb-4 text-text-muted" />
              <p className="text-text-muted">No employees hired yet.</p>
              <p className="text-sm text-text-muted mt-2">
                Start by recruiting staff or hiring from available applicants.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {personnel.employees.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Job Applicants</h3>
            <Badge tone="warning">{personnel.applicants.length} pending</Badge>
          </div>

          {personnel.applicants.length === 0 ? (
            <Card className="text-center py-6">
              <Icon name="person_search" size={40} className="mx-auto mb-3 text-text-muted" />
              <p className="text-text-muted">No pending applicants.</p>
              <p className="text-sm text-text-muted mt-2">
                Use the Recruit Staff button to generate new applications.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {personnel.applicants.map((applicant) => (
                <CandidateCard key={applicant.id} applicant={applicant} />
              ))}
            </div>
          )}

          {Object.keys(stats.roleDistribution).length > 0 && (
            <Card title="Role Distribution" className="bg-surface-elevated/80">
              <div className="grid gap-2">
                {Object.entries(stats.roleDistribution).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">{role}</span>
                    <Badge tone="default">{count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};
