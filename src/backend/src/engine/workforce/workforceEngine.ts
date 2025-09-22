import type { EventCollector } from '@/lib/eventBus.js';
import type {
  EmployeeState,
  GameState,
  PendingTreatmentApplication,
  StructureState,
  TaskAssignment,
  TaskDefinition,
  TaskDefinitionMap,
  TaskLocation,
  TaskState,
  TaskSystemState,
  ZoneState,
} from '@/state/models.js';
import type { SimulationPhaseHandler } from '@/sim/loop.js';
import {
  type TaskSafetyRequirements,
  type WorkforceEmployeeRuntimeState,
  type WorkforceEngineOptions,
  type WorkforcePolicies,
  type WorkforceTaskMetadata,
} from './types.js';

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const PRIORITY_STEP = 10;
const PRIORITY_MIN = 30;
const PRIORITY_MAX = 100;

const normalizePriority = (value: number): number => {
  if (!Number.isFinite(value)) {
    return PRIORITY_MIN;
  }
  const snapped = Math.round(value / PRIORITY_STEP) * PRIORITY_STEP;
  return clamp(snapped, PRIORITY_MIN, PRIORITY_MAX);
};

const compareTasksByCreation = (left: TaskState, right: TaskState): number => {
  if (left.createdAtTick !== right.createdAtTick) {
    return left.createdAtTick - right.createdAtTick;
  }
  return left.id.localeCompare(right.id);
};

const DEFAULT_POLICIES: WorkforcePolicies = {
  energy: {
    minEnergyToClaim: 0.35,
    energyCostPerHour: 0.08,
    idleRecoveryPerTick: 0.05,
    overtimeCostMultiplier: 1.5,
  },
  overtime: {
    standardHoursPerDay: 8,
    overtimeThresholdHours: 8,
    maxOvertimeHoursPerDay: 4,
  },
  utility: {
    weights: {
      priority: 0.4,
      skill: 0.3,
      energy: 0.2,
      morale: 0.1,
    },
    claimThreshold: 0.45,
    skillEfficiencyBonus: 0.08,
  },
  safety: {
    treatmentCertifications: {
      cultural: 'cert.treatment.cultural',
      biological: 'cert.treatment.biological',
      mechanical: 'cert.treatment.mechanical',
      chemical: 'cert.treatment.chemical',
      physical: 'cert.treatment.physical',
    },
    defaultTreatmentCertification: 'cert.treatment.general',
  },
  generation: {
    reservoirLevelThreshold: 0.45,
    nutrientStrengthThreshold: 0.6,
    cleanlinessThreshold: 0.7,
    harvestReadinessThreshold: 0.5,
    maintenanceConditionThreshold: 0.55,
    maintenanceGraceTicks: 6,
  },
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const getTaskMetadata = (task: TaskState): WorkforceTaskMetadata | undefined => {
  const raw = task.metadata as WorkforceTaskMetadata | undefined;
  if (!raw) {
    return undefined;
  }
  if (typeof raw.estimatedWorkHours !== 'number') {
    return undefined;
  }
  return raw;
};

const computeDayIndex = (tick: number, ticksPerDay: number): number => {
  if (ticksPerDay <= 0) {
    return 0;
  }
  return Math.floor(Math.max(tick - 1, 0) / ticksPerDay);
};

interface TaskCreationContext {
  structure: StructureState;
  zone: ZoneState;
  taskSystem: TaskSystemState;
  tick: number;
  definitionId: string;
  fallbackPriority: number;
  priorityDelta?: number;
  events: EventCollector;
  metadata: Record<string, unknown>;
  safety?: TaskSafetyRequirements;
  taskKey?: string;
}

interface WorkHoursAllocation {
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
}

const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = HOURS_PER_DAY * 60;
const MIN_ESTIMATED_HOURS = 0.25;

const normaliseMinuteOfDay = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const wrapped = Math.floor(value % MINUTES_PER_DAY);
  return wrapped < 0 ? wrapped + MINUTES_PER_DAY : wrapped;
};

const computeShiftStartMinute = (shift: EmployeeState['shift']): number => {
  const overlap = Math.max(shift.overlapMinutes, 0);
  return normaliseMinuteOfDay(shift.startHour * 60 - overlap);
};

const computeShiftEndMinute = (shift: EmployeeState['shift']): number => {
  const start = computeShiftStartMinute(shift);
  const duration = Math.max(shift.durationHours * 60, 0);
  const overlap = Math.max(shift.overlapMinutes, 0);
  return normaliseMinuteOfDay(start + duration + overlap);
};

const isShiftActiveAtMinute = (
  shift: EmployeeState['shift'] | undefined,
  minuteOfDay: number,
): boolean => {
  if (!shift) {
    return true;
  }
  const duration = Math.max(shift.durationHours * 60, 0);
  if (duration >= MINUTES_PER_DAY) {
    return true;
  }
  const start = computeShiftStartMinute(shift);
  const end = computeShiftEndMinute(shift);
  if (start < end) {
    return minuteOfDay >= start && minuteOfDay < end;
  }
  return minuteOfDay >= start || minuteOfDay < end;
};

export class WorkforceEngine {
  private readonly definitions: TaskDefinitionMap;

  private readonly policies: WorkforcePolicies;

  private readonly runtime = new Map<string, WorkforceEmployeeRuntimeState>();

  private readonly priorityRotation = new Map<number, string>();

  private sequence = 0;

  constructor(definitions: TaskDefinitionMap, options?: WorkforceEngineOptions) {
    this.definitions = definitions;
    this.policies = {
      ...DEFAULT_POLICIES,
      ...options?.policies,
      energy: { ...DEFAULT_POLICIES.energy, ...options?.policies?.energy },
      overtime: { ...DEFAULT_POLICIES.overtime, ...options?.policies?.overtime },
      utility: { ...DEFAULT_POLICIES.utility, ...options?.policies?.utility },
      safety: { ...DEFAULT_POLICIES.safety, ...options?.policies?.safety },
      generation: { ...DEFAULT_POLICIES.generation, ...options?.policies?.generation },
    } satisfies WorkforcePolicies;
  }

  createPhaseHandler(): SimulationPhaseHandler {
    return (context) => {
      this.processTick(context.state, context.tick, context.tickLengthMinutes, context.events);
    };
  }

  processTick(
    state: GameState,
    tick: number,
    tickLengthMinutes: number,
    events: EventCollector,
  ): void {
    const ticksPerDay = Math.max(
      1,
      Math.round((HOURS_PER_DAY * 60) / Math.max(tickLengthMinutes, 1)),
    );
    const minuteOfDay = this.computeMinutesIntoDay(tick, tickLengthMinutes);
    this.ensureRuntimeState(state.personnel.employees);
    this.resetDailyCounters(state.personnel.employees, tick, ticksPerDay);
    this.handleShiftTransitions(state, minuteOfDay);
    this.updateShiftStatuses(state.personnel.employees, minuteOfDay);
    this.generateTasks(state, tick, events);
    this.assignTasks(state, tick, tickLengthMinutes, minuteOfDay);
    this.advanceActiveTasks(state, tick, tickLengthMinutes, events);
    this.recoverIdleEmployees(state.personnel.employees, tickLengthMinutes);
  }

  private ensureRuntimeState(employees: EmployeeState[]): void {
    for (const employee of employees) {
      const certifications = new Set(employee.certifications ?? []);
      const existing = this.runtime.get(employee.id);
      if (existing) {
        existing.certifications = certifications;
      } else {
        this.runtime.set(employee.id, {
          certifications,
          lastShiftDayIndex: -1,
        });
      }
    }
  }

  private resetDailyCounters(employees: EmployeeState[], tick: number, ticksPerDay: number): void {
    const currentDay = computeDayIndex(tick, ticksPerDay);
    for (const employee of employees) {
      const runtime = this.runtime.get(employee.id);
      if (!runtime) {
        continue;
      }
      if (runtime.lastShiftDayIndex !== currentDay) {
        employee.hoursWorkedToday = 0;
        runtime.lastShiftDayIndex = currentDay;
        employee.lastShiftResetTick = tick;
      }
      if (!Number.isFinite(employee.overtimeHours) || employee.overtimeHours < 0) {
        employee.overtimeHours = 0;
      }
    }
  }

  private handleShiftTransitions(state: GameState, minuteOfDay: number): void {
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
      if (this.isEmployeeOnDuty(employee, minuteOfDay)) {
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
      const zone = this.findZone(state, task.location);
      if (zone) {
        zone.activeTaskIds = zone.activeTaskIds.filter((id) => id !== task.id);
      }
      employee.status = 'offShift';
      state.tasks.backlog.push(task);
    }
  }

  private updateShiftStatuses(employees: EmployeeState[], minuteOfDay: number): void {
    for (const employee of employees) {
      if (employee.status === 'training') {
        continue;
      }
      if (employee.currentTaskId) {
        employee.status = 'assigned';
        continue;
      }
      if (this.isEmployeeOnDuty(employee, minuteOfDay)) {
        employee.status = 'idle';
      } else {
        employee.status = 'offShift';
      }
    }
  }

  private computeMinutesIntoDay(tick: number, tickLengthMinutes: number): number {
    const minutes = Math.max(tick, 0) * Math.max(tickLengthMinutes, 0);
    return normaliseMinuteOfDay(minutes);
  }

  private isEmployeeOnDuty(employee: EmployeeState, minuteOfDay: number): boolean {
    if (employee.status === 'training') {
      return false;
    }
    return isShiftActiveAtMinute(employee.shift, minuteOfDay);
  }

  private recoverIdleEmployees(employees: EmployeeState[], tickLengthMinutes: number): void {
    const recoveryPerTick = this.policies.energy.idleRecoveryPerTick * (tickLengthMinutes / 60);
    for (const employee of employees) {
      if (employee.status !== 'assigned') {
        employee.energy = clamp(employee.energy + recoveryPerTick, 0, 1);
      }
      if (employee.status === 'assigned' && !employee.currentTaskId) {
        employee.status = 'idle';
      }
    }
  }

  private generateTasks(state: GameState, tick: number, events: EventCollector): void {
    for (const structure of state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          this.generateZoneTasks(state.tasks, structure, room, zone, tick, events);
        }
      }
    }
  }

  private generateZoneTasks(
    taskSystem: TaskSystemState,
    structure: StructureState,
    room: StructureState['rooms'][number],
    zone: ZoneState,
    tick: number,
    events: EventCollector,
  ): void {
    const generationPolicy = this.policies.generation;
    if (
      zone.resources.reservoirLevel < generationPolicy.reservoirLevelThreshold &&
      !this.hasOpenTask(taskSystem, zone.id, 'refill_supplies_water')
    ) {
      const priorityBoost =
        Math.round((1 - clamp(zone.resources.reservoirLevel, 0, 1)) * 4) * PRIORITY_STEP;
      this.queueTask({
        structure,
        zone,
        taskSystem,
        tick,
        definitionId: 'refill_supplies_water',
        fallbackPriority: 80,
        priorityDelta: priorityBoost,
        events,
        metadata: {
          zoneName: zone.name,
          structureName: structure.name,
          reason: 'lowReservoir',
          taskKey: 'refill_supplies_water',
        },
        taskKey: 'refill_supplies_water',
      });
    }

    if (
      zone.resources.nutrientStrength < generationPolicy.nutrientStrengthThreshold &&
      !this.hasOpenTask(taskSystem, zone.id, 'refill_supplies_nutrients')
    ) {
      const priorityBoost =
        Math.round((1 - clamp(zone.resources.nutrientStrength, 0, 1)) * 4) * PRIORITY_STEP;
      this.queueTask({
        structure,
        zone,
        taskSystem,
        tick,
        definitionId: 'refill_supplies_nutrients',
        fallbackPriority: 80,
        priorityDelta: priorityBoost,
        events,
        metadata: {
          zoneName: zone.name,
          structureName: structure.name,
          reason: 'lowNutrients',
          taskKey: 'refill_supplies_nutrients',
        },
        taskKey: 'refill_supplies_nutrients',
      });
    }

    if (
      room.cleanliness < generationPolicy.cleanlinessThreshold &&
      !this.hasOpenTask(taskSystem, zone.id, 'clean_zone')
    ) {
      const dirtiness = 1 - clamp(room.cleanliness, 0, 1);
      const priorityBoost = Math.round(dirtiness * 5) * PRIORITY_STEP;
      this.queueTask({
        structure,
        zone,
        taskSystem,
        tick,
        definitionId: 'clean_zone',
        fallbackPriority: 60,
        priorityDelta: priorityBoost,
        events,
        metadata: {
          zoneName: zone.name,
          structureName: structure.name,
          area: room.area,
          taskKey: 'clean_zone',
        },
        taskKey: 'clean_zone',
      });
    }

    const harvestablePlants = zone.plants.filter((plant) => plant.stage === 'harvestReady');
    if (
      harvestablePlants.length / Math.max(zone.plants.length || 1, 1) >=
        generationPolicy.harvestReadinessThreshold &&
      harvestablePlants.length > 0 &&
      !this.hasOpenTask(taskSystem, zone.id, 'harvest_plants')
    ) {
      this.queueTask({
        structure,
        zone,
        taskSystem,
        tick,
        definitionId: 'harvest_plants',
        fallbackPriority: 90,
        events,
        metadata: {
          zoneName: zone.name,
          structureName: structure.name,
          plantCount: harvestablePlants.length,
          taskKey: 'harvest_plants',
        },
        taskKey: 'harvest_plants',
      });
    }

    for (const device of zone.devices) {
      const key = `maintain_${device.id}`;
      if (
        device.maintenance.condition < generationPolicy.maintenanceConditionThreshold ||
        device.maintenance.nextDueTick - tick <= generationPolicy.maintenanceGraceTicks
      ) {
        if (!this.hasOpenTask(taskSystem, zone.id, 'maintain_device', key)) {
          this.queueTask({
            structure,
            zone,
            taskSystem,
            tick,
            definitionId: 'maintain_device',
            fallbackPriority: 60,
            events,
            metadata: {
              zoneName: zone.name,
              structureName: structure.name,
              deviceId: device.id,
              deviceName: device.name,
              taskKey: key,
            },
            taskKey: key,
          });
        }
      }
      if (device.status === 'failed' || device.maintenance.condition < 0.35) {
        const repairKey = `repair_${device.id}`;
        if (!this.hasOpenTask(taskSystem, zone.id, 'repair_device', repairKey)) {
          this.queueTask({
            structure,
            zone,
            taskSystem,
            tick,
            definitionId: 'repair_device',
            fallbackPriority: 100,
            events,
            metadata: {
              zoneName: zone.name,
              structureName: structure.name,
              deviceId: device.id,
              deviceName: device.name,
              taskKey: repairKey,
            },
            safety: {
              hazardLevel: 'medium',
              requiredCertifications: [],
            },
            taskKey: repairKey,
          });
        }
      }
    }

    for (const pending of zone.health.pendingTreatments) {
      if (pending.scheduledTick > tick) {
        continue;
      }
      const taskKey = this.buildTreatmentTaskKey(pending);
      if (this.hasOpenTask(taskSystem, zone.id, 'apply_treatment', taskKey)) {
        continue;
      }
      const safety = this.createTreatmentSafety(pending);
      const plantCount = pending.plantIds.length || 1;
      this.queueTask({
        structure,
        zone,
        taskSystem,
        tick,
        definitionId: 'apply_treatment',
        fallbackPriority: 100,
        events,
        metadata: {
          zoneName: zone.name,
          structureName: structure.name,
          treatmentOptionId: pending.optionId,
          treatmentTarget: pending.target,
          treatmentCategory: pending.category,
          treatmentName: pending.optionId,
          plantCount,
          taskKey,
        },
        safety,
        taskKey,
      });
    }
  }

  private hasOpenTask(
    taskSystem: TaskSystemState,
    zoneId: string,
    definitionId: string,
    taskKey?: string,
  ): boolean {
    const matches = (task: TaskState) => {
      if (task.definitionId !== definitionId) {
        return false;
      }
      if (task.location?.zoneId !== zoneId) {
        return false;
      }
      if (task.status === 'completed' || task.status === 'cancelled') {
        return false;
      }
      if (!taskKey) {
        return true;
      }
      const metadata = getTaskMetadata(task);
      return metadata?.taskKey === taskKey;
    };

    return taskSystem.backlog.some(matches) || taskSystem.active.some(matches);
  }

  private queueTask(context: TaskCreationContext): void {
    const definition = this.definitions[context.definitionId];
    const basePriority = definition ? definition.priority : context.fallbackPriority;
    const adjustedPriority = basePriority + (context.priorityDelta ?? 0);
    const normalizedPriority = normalizePriority(adjustedPriority);
    const metadata: WorkforceTaskMetadata = {
      ...context.metadata,
      estimatedWorkHours: this.estimateWorkHours(definition, context.metadata),
    };
    if (context.safety) {
      metadata.safety = context.safety;
    }
    if (context.taskKey) {
      metadata.taskKey = context.taskKey;
    }

    const task: TaskState = {
      id: this.generateTaskId(context.tick),
      definitionId: context.definitionId,
      status: 'pending',
      priority: normalizedPriority,
      createdAtTick: context.tick,
      dueTick: this.computeDueTick(normalizedPriority, context.tick),
      location: {
        structureId: context.structure.id,
        roomId: context.zone.roomId,
        zoneId: context.zone.id,
      } satisfies TaskLocation,
      metadata,
    };

    context.events.queue(
      'task.created',
      {
        taskId: task.id,
        definitionId: task.definitionId,
        priority: task.priority,
        structureId: context.structure.id,
        roomId: context.zone.roomId,
        zoneId: context.zone.id,
        safety: metadata.safety,
      },
      context.tick,
      'info',
    );

    context.taskSystem.backlog.push(task);
  }

  private assignTasks(
    state: GameState,
    tick: number,
    tickLengthMinutes: number,
    minuteOfDay: number,
  ): void {
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
      const startId = this.priorityRotation.get(priority);
      const rotated = this.rotateGroup(group, startId);
      groupOrders.set(priority, rotated);
      groupStarts.set(priority, rotated[0]?.id);
      roundRobinOrder.push(...rotated);
    }

    const availableEmployees = state.personnel.employees.filter((employee) => {
      if (employee.status !== 'idle') {
        return false;
      }
      if (!this.isEmployeeOnDuty(employee, minuteOfDay)) {
        return false;
      }
      if (employee.energy < this.policies.energy.minEnergyToClaim) {
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
        metadata?.estimatedWorkHours ?? this.estimateWorkHours(definition, task.metadata);
      const hoursPerTick = Math.max(tickLengthMinutes / 60, 0.1);
      const etaTicks = Math.max(1, Math.ceil(estimatedHours / hoursPerTick));
      const assignment: TaskAssignment = {
        employeeId: best.id,
        startedAtTick: tick,
        progress: 0,
        etaTick: tick + etaTicks,
      };
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
    for (const priority of this.priorityRotation.keys()) {
      prioritiesToUpdate.add(priority);
    }

    for (const priority of prioritiesToUpdate) {
      const rotated = groupOrders.get(priority);
      const pendingInOrder = rotated
        ? rotated.filter((task) => pendingIdSet.has(task.id))
        : pendingAfter.filter((task) => task.priority === priority).sort(compareTasksByCreation);

      if (pendingInOrder.length === 0) {
        this.priorityRotation.delete(priority);
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
        const existingId = this.priorityRotation.get(priority);
        if (existingId && pendingIdSet.has(existingId)) {
          nextId = existingId;
        } else {
          nextId = pendingInOrder[0].id;
        }
      }

      this.priorityRotation.set(priority, nextId);
    }
  }

  private selectEmployeeForTask(
    employees: EmployeeState[],
    task: TaskState,
    definition: TaskDefinition | undefined,
  ): EmployeeState | undefined {
    let best: EmployeeState | undefined;
    let bestScore = this.policies.utility.claimThreshold;
    for (const employee of employees) {
      const score = this.computeUtility(employee, task, definition);
      if (score > bestScore) {
        best = employee;
        bestScore = score;
      }
    }
    return best;
  }

  private computeUtility(
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
      const runtime = this.runtime.get(employee.id);
      const certs = runtime?.certifications ?? new Set(employee.certifications);
      for (const certification of safety.requiredCertifications) {
        if (!certs.has(certification)) {
          return Number.NEGATIVE_INFINITY;
        }
      }
    }

    if (employee.energy < this.policies.energy.minEnergyToClaim) {
      return Number.NEGATIVE_INFINITY;
    }

    const weights = this.policies.utility.weights;
    const priorityScore = clamp(task.priority / PRIORITY_MAX, 0, 1);
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

  private advanceActiveTasks(
    state: GameState,
    tick: number,
    tickLengthMinutes: number,
    events: EventCollector,
  ): void {
    const hoursPerTick = Math.max(tickLengthMinutes / 60, 0.1);
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
        metadata?.estimatedWorkHours ?? this.estimateWorkHours(definition, task.metadata);
      const allocation = this.allocateWorkHours(employee, hoursPerTick);
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

  private allocateWorkHours(employee: EmployeeState, hoursPerTick: number): WorkHoursAllocation {
    const overtimePolicy = this.policies.overtime;
    const threshold = overtimePolicy.overtimeThresholdHours;
    const standardLimit =
      overtimePolicy.standardHoursPerDay + overtimePolicy.maxOvertimeHoursPerDay;
    const hoursWorked = employee.hoursWorkedToday;
    const regularAvailable = Math.max(threshold - hoursWorked, 0);
    const regularHours = Math.min(regularAvailable, hoursPerTick);
    let overtimeHours = Math.max(hoursPerTick - regularHours, 0);
    const overtimeRemaining = Math.max(standardLimit - hoursWorked - regularHours, 0);
    if (overtimeHours > overtimeRemaining) {
      overtimeHours = overtimeRemaining;
    }
    const totalHours = regularHours + overtimeHours;
    return { regularHours, overtimeHours, totalHours };
  }

  private estimateWorkHours(
    definition: TaskDefinition | undefined,
    metadata: Record<string, unknown>,
  ): number {
    if (!definition) {
      return 1;
    }
    const baseMinutes = definition.costModel.laborMinutes;
    let quantity = 1;
    if (definition.costModel.basis === 'perPlant') {
      quantity = Math.max(toNumber(metadata.plantCount, 1), 1);
    } else if (definition.costModel.basis === 'perSquareMeter') {
      quantity = Math.max(toNumber(metadata.area, 1), 1);
    }
    const minutes = baseMinutes * quantity;
    return Math.max(minutes / 60, MIN_ESTIMATED_HOURS);
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

  private computeDueTick(priority: number, tick: number): number {
    const normalized = normalizePriority(priority);
    const bucket = Math.max(PRIORITY_MIN / PRIORITY_STEP, Math.round(normalized / PRIORITY_STEP));
    const horizon = Math.max(3, Math.round(16 / bucket));
    return tick + horizon;
  }

  private generateTaskId(tick: number): string {
    this.sequence += 1;
    return `wf-${tick}-${this.sequence}`;
  }

  private findZone(state: GameState, location: TaskLocation | undefined): ZoneState | undefined {
    if (!location) {
      return undefined;
    }
    for (const structure of state.structures) {
      if (structure.id !== location.structureId) {
        continue;
      }
      for (const room of structure.rooms) {
        if (room.id !== location.roomId) {
          continue;
        }
        const zone = room.zones.find((item) => item.id === location.zoneId);
        if (zone) {
          return zone;
        }
      }
    }
    return undefined;
  }

  private createTreatmentSafety(pending: PendingTreatmentApplication): TaskSafetyRequirements {
    const category = pending.category;
    const certification =
      (category ? this.policies.safety.treatmentCertifications[category] : undefined) ??
      this.policies.safety.defaultTreatmentCertification;
    const requiredCertifications = certification ? [certification] : [];
    const hazard: TaskSafetyRequirements['hazardLevel'] =
      category === 'chemical' ? 'high' : category === 'mechanical' ? 'medium' : 'medium';
    return {
      hazardLevel: hazard,
      requiredCertifications,
    };
  }

  private buildTreatmentTaskKey(pending: PendingTreatmentApplication): string {
    const plants = pending.plantIds.join(',');
    return `${pending.optionId}:${pending.target}:${plants}`;
  }
}
