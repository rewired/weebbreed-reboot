import type { EventCollector } from '@/lib/eventBus.js';
import type {
  EmployeeState,
  GameState,
  TaskAssignment,
  TaskDefinition,
  TaskDefinitionMap,
  TaskLocation,
  TaskState,
  ZoneState,
} from '@/state/types.js';
import { clamp } from '../runtime/math.js';
import { computeEffectiveWorkMinutesPerTick } from '../runtime/workMinutes.js';
import { toNumber } from '../runtime/values.js';
import type { WorkforceEmployeeRuntimeState, WorkforcePolicies } from '../types.js';
import { compareTasksByCreation } from './priority.js';
import { getTaskMetadata } from './taskMetadata.js';
import { MIN_ESTIMATED_HOURS } from './constants.js';

export interface AssignmentServiceOptions {
  definitions: TaskDefinitionMap;
  policies: WorkforcePolicies;
  findZone: (state: GameState, location: TaskLocation | undefined) => ZoneState | undefined;
  estimateWorkHours: (
    definition: TaskDefinition | undefined,
    metadata: Record<string, unknown>,
  ) => number;
  getRuntimeState: (employeeId: string) => WorkforceEmployeeRuntimeState | undefined;
}

export interface AssignmentContext {
  state: GameState;
  tick: number;
  tickLengthMinutes: number;
  minuteOfDay: number;
  priorityRotation: Map<number, string>;
  isEmployeeOnDuty: (employee: EmployeeState, minuteOfDay: number) => boolean;
}

export interface AdvanceContext {
  state: GameState;
  tick: number;
  tickLengthMinutes: number;
  events: EventCollector;
}

export class AssignmentService {
  private readonly definitions: TaskDefinitionMap;

  private readonly policies: WorkforcePolicies;

  private readonly findZone: AssignmentServiceOptions['findZone'];

  private readonly estimateWorkHours: AssignmentServiceOptions['estimateWorkHours'];

  private readonly getRuntimeState: AssignmentServiceOptions['getRuntimeState'];

  constructor(options: AssignmentServiceOptions) {
    this.definitions = options.definitions;
    this.policies = options.policies;
    this.findZone = options.findZone;
    this.estimateWorkHours = options.estimateWorkHours;
    this.getRuntimeState = options.getRuntimeState;
  }

  assignTasks(context: AssignmentContext): void {
    const { state, tick, tickLengthMinutes, minuteOfDay, priorityRotation, isEmployeeOnDuty } =
      context;
    const pendingTasks = state.tasks.backlog.filter((task) => task.status === 'pending');
    if (pendingTasks.length === 0) {
      return;
    }

    const priorityGroups = new Map<number, TaskState[]>();
    for (const task of pendingTasks) {
      const group = priorityGroups.get(task.priority);
      if (group) {
        group.push(task);
      } else {
        priorityGroups.set(task.priority, [task]);
      }
    }

    const orderedPriorities = Array.from(priorityGroups.keys()).sort((left, right) => right - left);
    const roundRobinOrder: TaskState[] = [];
    const groupOrders = new Map<number, TaskState[]>();
    const groupStarts = new Map<number, string | undefined>();

    for (const priority of orderedPriorities) {
      const group = priorityGroups.get(priority);
      if (!group) {
        continue;
      }
      group.sort(compareTasksByCreation);
      const startId = priorityRotation.get(priority);
      const rotated = this.rotateGroup(group, startId);
      groupOrders.set(priority, rotated);
      groupStarts.set(priority, rotated[0]?.id);
      roundRobinOrder.push(...rotated);
    }

    const availableEmployees = state.personnel.employees.filter((employee) => {
      if (employee.status !== 'idle') {
        return false;
      }
      if (!isEmployeeOnDuty(employee, minuteOfDay)) {
        return false;
      }
      if (employee.energy < this.policies.energy.minEnergyToClaim) {
        return false;
      }
      if (computeEffectiveWorkMinutesPerTick(employee, tickLengthMinutes) <= 0) {
        return false;
      }
      return true;
    });

    const lastAssignedByPriority = new Map<number, string>();

    for (const task of roundRobinOrder) {
      const definition = this.definitions[task.definitionId];
      const best = this.selectEmployeeForTask(availableEmployees, task, definition);
      if (!best) {
        continue;
      }
      const index = state.tasks.backlog.indexOf(task);
      if (index >= 0) {
        state.tasks.backlog.splice(index, 1);
      }
      task.status = 'inProgress';
      const metadata = getTaskMetadata(task);
      const estimatedHours =
        metadata?.estimatedWorkHours ?? this.estimateWorkHours(definition, task.metadata ?? {});
      const workMinutesPerTick = computeEffectiveWorkMinutesPerTick(best, tickLengthMinutes);
      const hoursPerTick = workMinutesPerTick / 60;
      const etaTicks =
        hoursPerTick > 0 ? Math.max(1, Math.ceil(estimatedHours / hoursPerTick)) : undefined;
      const assignment: TaskAssignment = {
        employeeId: best.id,
        startedAtTick: tick,
        progress: 0,
      };
      if (typeof etaTicks === 'number') {
        assignment.etaTick = tick + etaTicks;
      }
      task.assignment = assignment;
      state.tasks.active.push(task);
      best.status = 'assigned';
      best.currentTaskId = task.id;
      const zone = this.findZone(state, task.location);
      if (zone && !zone.activeTaskIds.includes(task.id)) {
        zone.activeTaskIds.push(task.id);
      }
      const employeeIndex = availableEmployees.findIndex((item) => item.id === best.id);
      if (employeeIndex >= 0) {
        availableEmployees.splice(employeeIndex, 1);
      }
      lastAssignedByPriority.set(task.priority, task.id);
    }

    const pendingAfter = state.tasks.backlog.filter((task) => task.status === 'pending');
    const pendingIdSet = new Set(pendingAfter.map((task) => task.id));

    const prioritiesToUpdate = new Set<number>();
    for (const priority of groupOrders.keys()) {
      prioritiesToUpdate.add(priority);
    }
    for (const task of pendingAfter) {
      prioritiesToUpdate.add(task.priority);
    }
    for (const priority of priorityRotation.keys()) {
      prioritiesToUpdate.add(priority);
    }

    for (const priority of prioritiesToUpdate) {
      const rotated = groupOrders.get(priority);
      const pendingInOrder = rotated
        ? rotated.filter((task) => pendingIdSet.has(task.id))
        : pendingAfter.filter((task) => task.priority === priority).sort(compareTasksByCreation);

      if (pendingInOrder.length === 0) {
        priorityRotation.delete(priority);
        continue;
      }

      const referenceId =
        lastAssignedByPriority.get(priority) ?? groupStarts.get(priority) ?? undefined;

      let nextId: string | undefined;
      const searchOrder = rotated && rotated.length > 0 ? rotated : pendingInOrder;
      if (referenceId) {
        const startIndex = searchOrder.findIndex((task) => task.id === referenceId);
        if (startIndex >= 0) {
          for (let offset = 1; offset <= searchOrder.length; offset += 1) {
            const candidate = searchOrder[(startIndex + offset) % searchOrder.length];
            if (pendingIdSet.has(candidate.id)) {
              nextId = candidate.id;
              break;
            }
          }
        }
      }

      if (!nextId) {
        const existingId = priorityRotation.get(priority);
        if (existingId && pendingIdSet.has(existingId)) {
          nextId = existingId;
        } else {
          nextId = pendingInOrder[0].id;
        }
      }

      priorityRotation.set(priority, nextId);
    }
  }

  advanceActiveTasks(context: AdvanceContext): void {
    const { state, tick, tickLengthMinutes, events } = context;
    const baseHoursPerTick = Math.max(tickLengthMinutes / 60, 0);
    const completed: TaskState[] = [];
    const requeued: TaskState[] = [];

    for (const task of state.tasks.active) {
      const assignment = task.assignment;
      if (!assignment) {
        task.status = 'pending';
        const zone = this.findZone(state, task.location);
        if (zone) {
          zone.activeTaskIds = zone.activeTaskIds.filter((id) => id !== task.id);
        }
        state.tasks.backlog.push(task);
        requeued.push(task);
        continue;
      }

      const employee = state.personnel.employees.find((item) => item.id === assignment.employeeId);
      if (!employee) {
        task.assignment = undefined;
        task.status = 'pending';
        const zone = this.findZone(state, task.location);
        if (zone) {
          zone.activeTaskIds = zone.activeTaskIds.filter((id) => id !== task.id);
        }
        state.tasks.backlog.push(task);
        requeued.push(task);
        continue;
      }

      const definition = this.definitions[task.definitionId];
      const metadata = getTaskMetadata(task);
      const estimatedHours =
        metadata?.estimatedWorkHours ?? this.estimateWorkHours(definition, task.metadata ?? {});
      const allocation = this.allocateWorkHours(employee, baseHoursPerTick);
      if (allocation.totalHours <= 0) {
        assignment.etaTick = tick + 1;
        continue;
      }

      const skillLevel = definition ? toNumber(employee.skills?.[definition.requiredSkill]) : 0;
      const skillBonus = Math.max(skillLevel - (definition?.minSkillLevel ?? 0), 0);
      const skillMultiplier = 1 + skillBonus * this.policies.utility.skillEfficiencyBonus;
      const energyMultiplier = 0.4 + clamp(employee.energy, 0, 1) * 0.6;
      const moraleMultiplier = 0.5 + clamp(employee.morale, 0, 1) * 0.5;

      const effectiveHours =
        allocation.totalHours * skillMultiplier * energyMultiplier * moraleMultiplier;
      const requiredHours = Math.max(estimatedHours, MIN_ESTIMATED_HOURS);
      assignment.progress = clamp(assignment.progress + effectiveHours / requiredHours, 0, 1);

      employee.hoursWorkedToday += allocation.totalHours;
      employee.overtimeHours += allocation.overtimeHours;
      if (allocation.overtimeHours > 0) {
        events.queue(
          'hr.overtimeAccrued',
          {
            employeeId: employee.id,
            hours: allocation.overtimeHours,
            totalOvertimeHours: employee.overtimeHours,
            taskId: task.id,
          },
          tick,
          'info',
        );
      }

      const baseEnergyCost = allocation.totalHours * this.policies.energy.energyCostPerHour;
      const overtimePenalty =
        allocation.overtimeHours *
        this.policies.energy.energyCostPerHour *
        (this.policies.energy.overtimeCostMultiplier - 1);
      employee.energy = clamp(employee.energy - baseEnergyCost - overtimePenalty, 0, 1);

      if (assignment.progress >= 0.999) {
        assignment.progress = 1;
        assignment.etaTick = tick;
        completed.push(task);
        this.finishTask(state, task, employee, tick, events);
      } else {
        const remaining = Math.max(requiredHours * (1 - assignment.progress), 0.1);
        const etaTicks = Math.max(1, Math.ceil(remaining / Math.max(allocation.totalHours, 0.1)));
        assignment.etaTick = tick + etaTicks;
      }
    }

    for (const task of completed) {
      const index = state.tasks.active.indexOf(task);
      if (index >= 0) {
        state.tasks.active.splice(index, 1);
      }
      state.tasks.completed.push(task);
    }

    for (const task of requeued) {
      const index = state.tasks.active.indexOf(task);
      if (index >= 0) {
        state.tasks.active.splice(index, 1);
      }
    }
  }

  private rotateGroup(tasks: TaskState[], startId: string | undefined): TaskState[] {
    if (tasks.length === 0) {
      return [];
    }
    if (!startId) {
      return tasks.slice();
    }
    const index = tasks.findIndex((task) => task.id === startId);
    if (index <= 0) {
      return tasks.slice();
    }
    return tasks.slice(index).concat(tasks.slice(0, index));
  }

  private selectEmployeeForTask(
    employees: EmployeeState[],
    task: TaskState,
    definition: TaskDefinition | undefined,
  ): EmployeeState | undefined {
    let best: EmployeeState | undefined;
    let bestScore = this.policies.utility.claimThreshold;

    for (const employee of employees) {
      const score = this.computeEmployeeUtility(employee, task, definition);
      if (score > bestScore) {
        best = employee;
        bestScore = score;
      }
    }

    return best;
  }

  private computeEmployeeUtility(
    employee: EmployeeState,
    task: TaskState,
    definition: TaskDefinition | undefined,
  ): number {
    if (definition) {
      if (employee.role !== definition.requiredRole) {
        return Number.NEGATIVE_INFINITY;
      }
      const skillLevel = toNumber(employee.skills?.[definition.requiredSkill]);
      if (skillLevel < definition.minSkillLevel) {
        return Number.NEGATIVE_INFINITY;
      }
    }

    const metadata = getTaskMetadata(task);
    const safety = metadata?.safety;
    if (safety && safety.requiredCertifications.length > 0) {
      const runtime = this.getRuntimeState(employee.id);
      const certs = runtime?.certifications ?? new Set(employee.certifications);
      for (const certification of safety.requiredCertifications) {
        if (!certs.has(certification)) {
          return Number.NEGATIVE_INFINITY;
        }
      }
    }

    if (employee.status !== 'idle') {
      return Number.NEGATIVE_INFINITY;
    }

    if (employee.energy < this.policies.energy.minEnergyToClaim) {
      return Number.NEGATIVE_INFINITY;
    }

    const weights = this.policies.utility.weights;
    const priorityScore = clamp(task.priority / 100, 0, 1);
    const skillScore = definition
      ? clamp(toNumber(employee.skills?.[definition.requiredSkill]) / 10, 0, 1)
      : 0.5;
    const energyScore = clamp(employee.energy, 0, 1);
    const moraleScore = clamp(employee.morale, 0, 1);

    return (
      weights.priority * priorityScore +
      weights.skill * skillScore +
      weights.energy * energyScore +
      weights.morale * moraleScore
    );
  }

  private allocateWorkHours(
    employee: EmployeeState,
    baseHoursPerTick: number,
  ): { regularHours: number; overtimeHours: number; totalHours: number } {
    const minutesRequested = Math.max(baseHoursPerTick * 60, 0);
    const effectiveMinutes = computeEffectiveWorkMinutesPerTick(employee, minutesRequested);
    const limitedHoursPerTick = Math.min(baseHoursPerTick, effectiveMinutes / 60);
    if (!(limitedHoursPerTick > 0)) {
      return { regularHours: 0, overtimeHours: 0, totalHours: 0 };
    }
    const overtimePolicy = this.policies.overtime;
    const threshold = overtimePolicy.overtimeThresholdHours;
    const standardLimit =
      overtimePolicy.standardHoursPerDay + overtimePolicy.maxOvertimeHoursPerDay;
    const hoursWorked = employee.hoursWorkedToday;
    const regularAvailable = Math.max(threshold - hoursWorked, 0);
    const regularHours = Math.min(regularAvailable, limitedHoursPerTick);
    let overtimeHours = Math.max(limitedHoursPerTick - regularHours, 0);
    const overtimeRemaining = Math.max(standardLimit - hoursWorked - regularHours, 0);
    if (overtimeHours > overtimeRemaining) {
      overtimeHours = overtimeRemaining;
    }
    const totalHours = regularHours + overtimeHours;
    return { regularHours, overtimeHours, totalHours };
  }

  private finishTask(
    state: GameState,
    task: TaskState,
    employee: EmployeeState,
    tick: number,
    events: EventCollector,
  ): void {
    task.status = 'completed';
    employee.status = 'idle';
    if (employee.currentTaskId === task.id) {
      employee.currentTaskId = undefined;
    }
    const zone = this.findZone(state, task.location);
    if (zone) {
      zone.activeTaskIds = zone.activeTaskIds.filter((id) => id !== task.id);
    }
    events.queue(
      'task.completed',
      {
        taskId: task.id,
        definitionId: task.definitionId,
        employeeId: employee.id,
        zoneId: task.location?.zoneId,
      },
      tick,
      'info',
    );
  }
}
