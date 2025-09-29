import type { EmployeeState, GameState, TaskLocation, ZoneState } from '@/state/types.js';

export interface ShiftManagerDependencies {
  findZone: (state: GameState, location: TaskLocation | undefined) => ZoneState | undefined;
  isEmployeeOnDuty: (employee: EmployeeState, minuteOfDay: number) => boolean;
}

export class ShiftManager {
  constructor(private readonly dependencies: ShiftManagerDependencies) {}

  handleShiftTransitions(state: GameState, minuteOfDay: number): void {
    for (let index = state.tasks.active.length - 1; index >= 0; index -= 1) {
      const task = state.tasks.active[index];
      const assignment = task.assignment;
      if (!assignment) {
        continue;
      }
      const employee = state.personnel.employees.find((item) => item.id === assignment.employeeId);
      if (!employee) {
        continue;
      }
      if (this.dependencies.isEmployeeOnDuty(employee, minuteOfDay)) {
        continue;
      }
      if (task.definitionId === 'harvest_plants') {
        employee.status = 'assigned';
        continue;
      }
      state.tasks.active.splice(index, 1);
      task.assignment = undefined;
      task.status = 'pending';
      if (employee.currentTaskId === task.id) {
        employee.currentTaskId = undefined;
      }
      const zone = this.dependencies.findZone(state, task.location);
      if (zone) {
        zone.activeTaskIds = zone.activeTaskIds.filter((id) => id !== task.id);
      }
      employee.status = 'offShift';
      state.tasks.backlog.push(task);
    }
  }

  updateShiftStatuses(employees: EmployeeState[], minuteOfDay: number): void {
    for (const employee of employees) {
      if (employee.status === 'training') {
        continue;
      }
      if (employee.currentTaskId) {
        employee.status = 'assigned';
        continue;
      }
      if (this.dependencies.isEmployeeOnDuty(employee, minuteOfDay)) {
        employee.status = 'idle';
      } else {
        employee.status = 'offShift';
      }
    }
  }
}
