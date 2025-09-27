import type { EventCollector } from '@/lib/eventBus.js';
import type {
  GameState,
  PendingTreatmentApplication,
  StructureState,
  TaskDefinition,
  TaskDefinitionMap,
  TaskLocation,
  TaskState,
  TaskSystemState,
  ZoneState,
} from '@/state/models.js';
import { clamp } from '../runtime/math.js';
import type {
  TaskGenerationPolicy,
  TaskSafetyRequirements,
  WorkforcePolicies,
  WorkforceTaskMetadata,
} from '../types.js';
import { PRIORITY_STEP, normalizePriority } from './priority.js';
import { getTaskMetadata } from './taskMetadata.js';

export interface TaskGeneratorOptions {
  definitions: TaskDefinitionMap;
  policies: Pick<WorkforcePolicies, 'generation' | 'safety'>;
  estimateWorkHours: (
    definition: TaskDefinition | undefined,
    metadata: Record<string, unknown>,
  ) => number;
  generateTaskId: (tick: number) => string;
  computeDueTick: (priority: number, tick: number) => number;
}

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

export class TaskGenerator {
  private readonly definitions: TaskDefinitionMap;

  private readonly generationPolicy: TaskGenerationPolicy;

  private readonly safetyPolicy: TaskGeneratorOptions['policies']['safety'];

  constructor(private readonly options: TaskGeneratorOptions) {
    this.definitions = options.definitions;
    this.generationPolicy = options.policies.generation;
    this.safetyPolicy = options.policies.safety;
  }

  generateTasks(state: GameState, tick: number, events: EventCollector): void {
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
    if (
      zone.resources.reservoirLevel < this.generationPolicy.reservoirLevelThreshold &&
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
      zone.resources.nutrientStrength < this.generationPolicy.nutrientStrengthThreshold &&
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
      room.cleanliness < this.generationPolicy.cleanlinessThreshold &&
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
          reason: 'lowCleanliness',
          cleanliness: room.cleanliness,
          taskKey: 'clean_zone',
        },
        taskKey: 'clean_zone',
      });
    }

    const dueForHarvest = zone.plants.some((plant) => plant.stage === 'harvestReady');
    if (dueForHarvest && !this.hasOpenTask(taskSystem, zone.id, 'harvest_plants')) {
      this.queueTask({
        structure,
        zone,
        taskSystem,
        tick,
        definitionId: 'harvest_plants',
        fallbackPriority: 95,
        events,
        metadata: {
          zoneName: zone.name,
          structureName: structure.name,
          plantCount: zone.plants.length,
          taskKey: 'harvest_plants',
        },
        taskKey: 'harvest_plants',
      });
    }

    for (const device of zone.devices) {
      if (!device.maintenance) {
        continue;
      }
      const maintenanceKey = `maintain_${device.id}`;
      if (
        Number.isFinite(device.maintenance.nextDueTick) &&
        tick < device.maintenance.nextDueTick
      ) {
        continue;
      }
      if (
        Number.isFinite(device.maintenance.lastServiceTick) &&
        tick - device.maintenance.lastServiceTick < this.generationPolicy.maintenanceGraceTicks
      ) {
        continue;
      }
      if (this.hasOpenTask(taskSystem, zone.id, 'maintain_device', maintenanceKey)) {
        continue;
      }
      this.queueTask({
        structure,
        zone,
        taskSystem,
        tick,
        definitionId: 'maintain_device',
        fallbackPriority: 80,
        events,
        metadata: {
          zoneName: zone.name,
          structureName: structure.name,
          deviceId: device.id,
          deviceName: device.name,
          taskKey: maintenanceKey,
        },
        taskKey: maintenanceKey,
      });
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
        priorityDelta: PRIORITY_STEP,
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
      estimatedWorkHours: this.options.estimateWorkHours(definition, context.metadata),
    };
    if (context.safety) {
      metadata.safety = context.safety;
    }
    if (context.taskKey) {
      metadata.taskKey = context.taskKey;
    }

    const task: TaskState = {
      id: this.options.generateTaskId(context.tick),
      definitionId: context.definitionId,
      status: 'pending',
      priority: normalizedPriority,
      createdAtTick: context.tick,
      dueTick: this.options.computeDueTick(normalizedPriority, context.tick),
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

  private createTreatmentSafety(pending: PendingTreatmentApplication): TaskSafetyRequirements {
    const category = pending.category;
    const certification =
      (category ? this.safetyPolicy.treatmentCertifications[category] : undefined) ??
      this.safetyPolicy.defaultTreatmentCertification;
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
