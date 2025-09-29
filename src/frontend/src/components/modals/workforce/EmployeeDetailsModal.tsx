import { Button } from '@/components/primitives/Button';
import type { SimulationBridge } from '@/facade/systemFacade';
import { useSimulationStore } from '@/store/simulation';
import { formatNumber } from '@/utils/formatNumber';

export interface EmployeeDetailsModalProps {
  bridge: SimulationBridge;
  closeModal: () => void;
  context?: Record<string, unknown>;
}

export const EmployeeDetailsModal = ({ closeModal, context }: EmployeeDetailsModalProps) => {
  const employeeId = typeof context?.employeeId === 'string' ? context.employeeId : null;
  const employee = useSimulationStore((state) =>
    employeeId
      ? (state.snapshot?.personnel.employees.find((item) => item.id === employeeId) ?? null)
      : null,
  );

  if (!employee || !employeeId) {
    return (
      <p className="text-sm text-text-muted">
        Employee data unavailable. Select an employee to view details.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Employee ID</span>
          <span className="font-mono text-xs text-text">{employee.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Role</span>
          <span className="font-medium text-text">{employee.role}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Status</span>
          <span className="font-medium text-text">
            {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Salary</span>
          <span className="font-medium text-text">
            €{formatNumber(employee.salaryPerTick, { maximumFractionDigits: 0 })}/tick
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Morale</span>
          <span className="font-medium text-text">
            {formatNumber(employee.morale * 100, { maximumFractionDigits: 0 })}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Energy</span>
          <span className="font-medium text-text">
            {formatNumber(employee.energy * 100, { maximumFractionDigits: 0 })}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Max Work Time</span>
          <span className="font-medium text-text">
            {formatNumber(employee.maxMinutesPerTick, { maximumFractionDigits: 0 })} min/tick
          </span>
        </div>
        {employee.assignedStructureId && (
          <div className="flex justify-between">
            <span className="text-text-muted">Assigned Structure</span>
            <span className="font-mono text-xs text-text">{employee.assignedStructureId}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  );
};
