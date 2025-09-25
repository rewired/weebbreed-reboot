import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { useUIStore } from '@/store/ui';
import { useSimulationStore } from '@/store/simulation';
import type { EmployeeSnapshot } from '@/types/simulation';
import {
  getMoraleColor,
  getEnergyColor,
  getStatusColor,
  formatStatusDisplay,
  getRoleDisplayName,
} from './utils';

interface EmployeeCardProps {
  employee: EmployeeSnapshot;
  className?: string;
}

export const EmployeeCard = ({ employee, className }: EmployeeCardProps) => {
  const openModal = useUIStore((state) => state.openModal);
  const snapshot = useSimulationStore((state) => state.snapshot);

  // Find assigned structure name
  const assignedStructure = employee.assignedStructureId
    ? snapshot?.structures.find((s) => s.id === employee.assignedStructureId)
    : null;

  const getProductivityIcon = (energy: number, morale: number): string => {
    const avgPerformance = (energy + morale) / 2;
    if (avgPerformance >= 0.8) return 'trending_up';
    if (avgPerformance >= 0.6) return 'trending_flat';
    return 'trending_down';
  };

  const getPerformanceColor = (energy: number, morale: number): string => {
    const avgPerformance = (energy + morale) / 2;
    if (avgPerformance >= 0.8) return 'text-success';
    if (avgPerformance >= 0.6) return 'text-warning';
    return 'text-danger';
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Icon name="badge" size={20} />
          {employee.name}
        </div>
      }
      subtitle={`${getRoleDisplayName(employee.role)} • €${employee.salaryPerTick.toLocaleString()}/tick`}
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
                subtitle: `Manage ${getRoleDisplayName(employee.role)} profile and assignments`,
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
                subtitle: `Confirm termination of ${getRoleDisplayName(employee.role)}`,
                context: { employeeId: employee.id },
              })
            }
          >
            Fire
          </Button>
        </div>
      }
      className={`bg-surface-elevated/80 ${className || ''}`}
    >
      <div className="flex flex-col gap-4">
        {/* Status and Assignment Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge tone={getStatusColor(employee.status)}>
              {formatStatusDisplay(employee.status)}
            </Badge>
            {employee.assignedStructureId && assignedStructure && (
              <Badge tone="default">
                <Icon name="domain" size={14} />
                {assignedStructure.name}
              </Badge>
            )}
            {!employee.assignedStructureId && (
              <Badge tone="warning">
                <Icon name="warning" size={14} />
                Unassigned
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Icon
              name={getProductivityIcon(employee.energy, employee.morale)}
              size={20}
              className={getPerformanceColor(employee.energy, employee.morale)}
            />
            <span className="text-sm text-text-muted">{employee.maxMinutesPerTick}min/tick</span>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon name="sentiment_satisfied" size={16} />
                <span className="text-text-muted">Morale</span>
              </div>
              <Badge tone={getMoraleColor(employee.morale)}>
                {Math.round(employee.morale * 100)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon name="battery_full" size={16} />
                <span className="text-text-muted">Energy</span>
              </div>
              <Badge tone={getEnergyColor(employee.energy)}>
                {Math.round(employee.energy * 100)}%
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon name="schedule" size={16} />
                <span className="text-text-muted">Work Limit</span>
              </div>
              <span className="text-text font-medium">{employee.maxMinutesPerTick}min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon name="payments" size={16} />
                <span className="text-text-muted">Salary</span>
              </div>
              <span className="text-text font-medium">
                €{employee.salaryPerTick.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="rounded-lg bg-surface-muted/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="analytics" size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text">Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                tone={getMoraleColor((employee.energy + employee.morale) / 2)}
                className="text-xs"
              >
                {Math.round(((employee.energy + employee.morale) / 2) * 100)}%
              </Badge>
              <Icon
                name={getProductivityIcon(employee.energy, employee.morale)}
                size={16}
                className={getPerformanceColor(employee.energy, employee.morale)}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
