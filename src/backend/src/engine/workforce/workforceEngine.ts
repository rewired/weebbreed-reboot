import type { EventCollector } from '@/lib/eventBus.js';
import type {
  EmployeeState,
  GameState,
  TaskDefinition,
  TaskDefinitionMap,
  TaskLocation,
  ZoneState,
} from '@/state/models.js';
import type { SimulationPhaseHandler } from '@/sim/loop.js';
import {
  type WorkforceEmployeeRuntimeState,
  type WorkforceEngineOptions,
  type WorkforcePolicies,
} from './types.js';
import {
  ENERGY_COST_PER_TICK_WORKING,
  ENERGY_REST_THRESHOLD,
  IDLE_ENERGY_REGEN_PER_TICK,
} from '@/constants/balance.js';
import { computeDayIndex, computeMinutesIntoDay, HOURS_PER_DAY } from './runtime/dayCycle.js';
import { clamp } from './runtime/math.js';
import { toNumber } from './runtime/values.js';
import { MIN_ESTIMATED_HOURS } from './tasks/constants.js';
import { normalizePriority, PRIORITY_MIN, PRIORITY_STEP } from './tasks/priority.js';
import { ShiftManager } from './shifts/shiftManager.js';
import { isShiftActiveAtMinute } from './shifts/shiftUtils.js';
import { TaskGenerator } from './tasks/taskGenerator.js';
import { AssignmentService } from './tasks/assignmentService.js';

const DEFAULT_POLICIES: WorkforcePolicies = {
  energy: {
    minEnergyToClaim: ENERGY_REST_THRESHOLD / 100,
    energyCostPerHour: ENERGY_COST_PER_TICK_WORKING / 100,
    idleRecoveryPerTick: IDLE_ENERGY_REGEN_PER_TICK / 100,
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

export class WorkforceEngine {
  private readonly definitions: TaskDefinitionMap;

  private readonly policies: WorkforcePolicies;

  private readonly runtime = new Map<string, WorkforceEmployeeRuntimeState>();

  private readonly priorityRotation = new Map<number, string>();

  private readonly shiftManager: ShiftManager;

  private readonly taskGenerator: TaskGenerator;

  private readonly assignmentService: AssignmentService;

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

    this.shiftManager = new ShiftManager({
      findZone: this.findZone.bind(this),
      isEmployeeOnDuty: this.isEmployeeOnDuty.bind(this),
    });

    this.taskGenerator = new TaskGenerator({
      definitions: this.definitions,
      policies: {
        generation: this.policies.generation,
        safety: this.policies.safety,
      },
      estimateWorkHours: (definition, metadata) => this.estimateWorkHours(definition, metadata),
      generateTaskId: (tick) => this.generateTaskId(tick),
      computeDueTick: (priority, tick) => this.computeDueTick(priority, tick),
    });

    this.assignmentService = new AssignmentService({
      definitions: this.definitions,
      policies: this.policies,
      findZone: this.findZone.bind(this),
      estimateWorkHours: (definition, metadata) => this.estimateWorkHours(definition, metadata),
      getRuntimeState: (employeeId) => this.runtime.get(employeeId),
    });
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
    const minuteOfDay = computeMinutesIntoDay(tick, tickLengthMinutes);
    this.ensureRuntimeState(state.personnel.employees);
    this.resetDailyCounters(state.personnel.employees, tick, ticksPerDay);
    this.shiftManager.handleShiftTransitions(state, minuteOfDay);
    this.shiftManager.updateShiftStatuses(state.personnel.employees, minuteOfDay);
    this.taskGenerator.generateTasks(state, tick, events);
    this.assignmentService.assignTasks({
      state,
      tick,
      tickLengthMinutes,
      minuteOfDay,
      priorityRotation: this.priorityRotation,
      isEmployeeOnDuty: this.isEmployeeOnDuty.bind(this),
    });
    this.assignmentService.advanceActiveTasks({ state, tick, tickLengthMinutes, events });
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

  private isEmployeeOnDuty(employee: EmployeeState, minuteOfDay: number): boolean {
    if (employee.status === 'training') {
      return false;
    }
    return isShiftActiveAtMinute(employee.shift, minuteOfDay);
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
}
