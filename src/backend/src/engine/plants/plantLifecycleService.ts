import { generateId } from '@/state/initialization/common.js';
import { RNG_STREAM_IDS, type RngService, type RngStream } from '@/lib/rng.js';
import type { CommandExecutionContext, CommandResult, ErrorCode } from '@/facade/index.js';
import { createError } from '@/facade/index.js';
import type {
  GameState,
  HarvestBatch,
  PlantStage,
  PlantState,
  RoomState,
  StructureState,
  ZoneState,
} from '@/state/types.js';

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export interface HarvestPlantResult {
  plantId: string;
  zoneId: string;
  roomId: string;
  structureId: string;
  harvestBatchId: string;
  weightGrams: number;
  quality: number;
  warnings?: string[];
}

export interface DiscardPlantResult {
  plantId: string;
  zoneId: string;
  roomId: string;
  structureId: string;
  stage: PlantStage;
  warnings?: string[];
}

export interface PlantLifecycleServiceOptions {
  state: GameState;
  rng: RngService;
}

interface PlantLookupResult {
  structure: StructureState;
  room: RoomState;
  zone: ZoneState;
  plant: PlantState;
  plantIndex: number;
}

export class PlantLifecycleService {
  private readonly state: GameState;

  private readonly idStream: RngStream;

  constructor(options: PlantLifecycleServiceOptions) {
    this.state = options.state;
    this.idStream = options.rng.getStream(RNG_STREAM_IDS.ids);
  }

  harvestPlant(
    plantId: string,
    context: CommandExecutionContext,
  ): CommandResult<HarvestPlantResult> {
    const lookup = this.findPlant(plantId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Plant ${plantId} was not found.`, [
        'plants.harvestPlant',
        'plantId',
      ]);
    }

    const { plant, zone, room, structure } = lookup;

    const restrictionFailure = this.checkZoneAccess(zone, context.tick, 'plants.harvestPlant');
    if (restrictionFailure) {
      return restrictionFailure;
    }

    if (plant.stage !== 'harvestReady') {
      return this.failure(
        'ERR_INVALID_STATE',
        `Plant ${plant.id} is not ready for harvest (stage: ${plant.stage}).`,
        ['plants.harvestPlant', 'plantId'],
      );
    }

    const warnings: string[] = [];

    const batch = this.createHarvestBatch(plant, context.tick);
    if (batch.weightGrams <= 0) {
      warnings.push('Plant did not produce any harvestable yield.');
    }

    this.removePlantFromZone(lookup);
    this.ensureHarvestInventory().push(batch);

    const payload: Record<string, unknown> = {
      plantId: plant.id,
      zoneId: zone.id,
      roomId: room.id,
      structureId: structure.id,
      strainId: plant.strainId,
      harvestBatchId: batch.id,
      weightGrams: batch.weightGrams,
      quality: batch.quality,
    };
    if (warnings.length > 0) {
      payload.warnings = [...warnings];
    }

    context.events.queue('plant.harvested', payload, context.tick, 'info');

    const resultWarnings = warnings.length > 0 ? [...warnings] : undefined;
    return {
      ok: true,
      data: {
        plantId: plant.id,
        zoneId: zone.id,
        roomId: room.id,
        structureId: structure.id,
        harvestBatchId: batch.id,
        weightGrams: batch.weightGrams,
        quality: batch.quality,
        warnings: resultWarnings,
      },
      warnings: resultWarnings,
    } satisfies CommandResult<HarvestPlantResult>;
  }

  discardPlant(
    plantId: string,
    context: CommandExecutionContext,
  ): CommandResult<DiscardPlantResult> {
    const lookup = this.findPlant(plantId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Plant ${plantId} was not found.`, [
        'plants.cullPlant',
        'plantId',
      ]);
    }

    const { plant, zone, room, structure } = lookup;

    const restrictionFailure = this.checkZoneAccess(zone, context.tick, 'plants.cullPlant');
    if (restrictionFailure) {
      return restrictionFailure;
    }

    if (plant.stage === 'drying' || plant.stage === 'cured') {
      return this.failure(
        'ERR_INVALID_STATE',
        `Plant ${plant.id} is already processed (stage: ${plant.stage}).`,
        ['plants.cullPlant', 'plantId'],
      );
    }

    const warnings: string[] = [];
    if (plant.stage === 'dead') {
      warnings.push('Plant was already dead prior to culling.');
    }

    this.removePlantFromZone(lookup);

    const payload: Record<string, unknown> = {
      plantId: plant.id,
      zoneId: zone.id,
      roomId: room.id,
      structureId: structure.id,
      strainId: plant.strainId,
      stage: plant.stage,
    };
    if (warnings.length > 0) {
      payload.warnings = [...warnings];
    }

    context.events.queue('plant.discarded', payload, context.tick, 'info');

    const resultWarnings = warnings.length > 0 ? [...warnings] : undefined;
    return {
      ok: true,
      data: {
        plantId: plant.id,
        zoneId: zone.id,
        roomId: room.id,
        structureId: structure.id,
        stage: plant.stage,
        warnings: resultWarnings,
      },
      warnings: resultWarnings,
    } satisfies CommandResult<DiscardPlantResult>;
  }

  private createHarvestBatch(plant: PlantState, tick: number): HarvestBatch {
    const weight = Math.max(0, plant.yieldDryGrams);
    const quality = clamp(plant.quality, 0, 1);

    return {
      id: generateId(this.idStream, 'harvest'),
      strainId: plant.strainId,
      weightGrams: weight,
      quality,
      stage: 'fresh',
      harvestedAtTick: tick,
    } satisfies HarvestBatch;
  }

  private ensureHarvestInventory(): HarvestBatch[] {
    if (!this.state.inventory.harvest) {
      this.state.inventory.harvest = [];
    }
    return this.state.inventory.harvest;
  }

  private removePlantFromZone(lookup: PlantLookupResult): void {
    const { zone, plantIndex, plant } = lookup;
    zone.plants.splice(plantIndex, 1);

    if (zone.health?.plantHealth) {
      delete zone.health.plantHealth[plant.id];
      this.pruneTreatmentReferences(zone, plant.id);
    }
  }

  private pruneTreatmentReferences(zone: ZoneState, plantId: string): void {
    const health = zone.health;
    if (!health) {
      return;
    }

    for (let index = health.pendingTreatments.length - 1; index >= 0; index -= 1) {
      const pending = health.pendingTreatments[index]!;
      pending.plantIds = pending.plantIds.filter((id) => id !== plantId);
      if (pending.plantIds.length === 0) {
        health.pendingTreatments.splice(index, 1);
      }
    }

    for (let index = health.appliedTreatments.length - 1; index >= 0; index -= 1) {
      const applied = health.appliedTreatments[index]!;
      applied.plantIds = applied.plantIds.filter((id) => id !== plantId);
      if (applied.plantIds.length === 0) {
        health.appliedTreatments.splice(index, 1);
      }
    }
  }

  private checkZoneAccess(
    zone: ZoneState,
    tick: number,
    command: string,
  ): CommandResult<never> | undefined {
    const { health } = zone;

    const reentryRestrictedUntilTick = health?.reentryRestrictedUntilTick;
    if (typeof reentryRestrictedUntilTick === 'number' && reentryRestrictedUntilTick > tick) {
      return this.failure(
        'ERR_FORBIDDEN',
        `Zone ${zone.name ?? zone.id} is restricted until tick ${reentryRestrictedUntilTick} due to safety requirements.`,
        [command, 'zoneId'],
      );
    }

    const preHarvestRestrictedUntilTick = health?.preHarvestRestrictedUntilTick;
    if (typeof preHarvestRestrictedUntilTick === 'number' && preHarvestRestrictedUntilTick > tick) {
      return this.failure(
        'ERR_FORBIDDEN',
        `Zone ${zone.name ?? zone.id} cannot be handled until tick ${preHarvestRestrictedUntilTick} because of a pre-harvest interval.`,
        [command, 'zoneId'],
      );
    }

    return undefined;
  }

  private findPlant(plantId: string): PlantLookupResult | undefined {
    for (const structure of this.state.structures) {
      for (const room of structure.rooms) {
        for (const zone of room.zones) {
          const plantIndex = zone.plants.findIndex((candidate) => candidate.id === plantId);
          if (plantIndex >= 0) {
            return {
              structure,
              room,
              zone,
              plant: zone.plants[plantIndex]!,
              plantIndex,
            } satisfies PlantLookupResult;
          }
        }
      }
    }
    return undefined;
  }

  private failure<T = never>(code: ErrorCode, message: string, path: string[]): CommandResult<T> {
    return {
      ok: false,
      errors: [createError(code, message, path)],
    } satisfies CommandResult<T>;
  }
}

export default PlantLifecycleService;
