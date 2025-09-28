import { generateId } from '@/state/initialization/common.js';
import { RNG_STREAM_IDS, type RngService, type RngStream } from '@/lib/rng.js';
import {
  type CommandExecutionContext,
  type CommandResult,
  type ErrorCode,
} from '@/facade/index.js';
import type { GameState, PlantState, ZoneState, PlantHealthState } from '@/state/models.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { CultivationMethodBlueprint } from '@/data/schemas/cultivationMethodSchema.js';
import type { StrainBlueprint } from '@/data/schemas/strainsSchema.js';
import { findZone } from '@/engine/world/stateSelectors.js';

export interface PlantingResult {
  plantIds: string[];
  warnings?: string[];
}

export interface PlantingServiceOptions {
  state: GameState;
  rng: RngService;
  repository: BlueprintRepository;
}

const MIN_AREA_PER_PLANT = 0.1;
const LOW_AFFINITY_WARNING_THRESHOLD = 0.6;
const INCOMPATIBLE_AFFINITY_THRESHOLD = 0.25;

export class PlantingService {
  private readonly state: GameState;

  private readonly repository: BlueprintRepository;

  private readonly idStream: RngStream;

  private readonly plantStream: RngStream;

  constructor(options: PlantingServiceOptions) {
    this.state = options.state;
    this.repository = options.repository;
    this.idStream = options.rng.getStream(RNG_STREAM_IDS.ids);
    this.plantStream = options.rng.getStream(RNG_STREAM_IDS.plants);
  }

  addPlanting(
    zoneId: string,
    strainId: string,
    count: number,
    startTick: number | undefined,
    context: CommandExecutionContext,
  ): CommandResult<PlantingResult> {
    const lookup = findZone(this.state, zoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'plants.addPlanting',
        'zoneId',
      ]);
    }

    if (count <= 0) {
      return this.failure('ERR_VALIDATION', 'Plant count must be positive.', [
        'plants.addPlanting',
        'count',
      ]);
    }

    const strain = this.repository.getStrain(strainId);
    if (!strain) {
      return this.failure('ERR_NOT_FOUND', `Strain blueprint ${strainId} was not found.`, [
        'plants.addPlanting',
        'strainId',
      ]);
    }

    const method = this.requireCultivationMethod(lookup.zone);

    const existingStrainId = lookup.zone.strainId;
    if (existingStrainId && existingStrainId !== strainId && lookup.zone.plants.length > 0) {
      return this.failure(
        'ERR_CONFLICT',
        `Zone ${lookup.zone.name ?? lookup.zone.id} is configured for strain ${lookup.zone.strainId}.`,
        ['plants.addPlanting', 'strainId'],
      );
    }

    const capacityResult = this.validateCapacity(lookup.zone, method, count);
    if (!capacityResult.ok) {
      return capacityResult.result;
    }

    const compatibilityWarnings = this.evaluateCompatibility(strain, method);
    if (compatibilityWarnings.incompatible) {
      return this.failure('ERR_INVALID_STATE', compatibilityWarnings.incompatible, [
        'plants.addPlanting',
        'strainId',
      ]);
    }

    const planted: string[] = [];
    const plantingTick = startTick ?? context.tick;

    for (let index = 0; index < count; index += 1) {
      const plant = this.createPlant(lookup.zone, strain, plantingTick, context.tick);
      lookup.zone.plants.push(plant);
      this.ensurePlantHealth(lookup.zone, plant);
      planted.push(plant.id);
    }

    lookup.zone.strainId = strain.id;

    const warnings = compatibilityWarnings.warnings;

    context.events.queue(
      'plant.planted',
      {
        zoneId,
        strainId: strain.id,
        plantIds: [...planted],
        count,
        warnings: warnings.length > 0 ? [...warnings] : undefined,
      },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: { plantIds: planted, warnings: warnings.length > 0 ? warnings : undefined },
      warnings: warnings.length > 0 ? warnings : undefined,
    } satisfies CommandResult<PlantingResult>;
  }

  private createPlant(
    zone: ZoneState,
    strain: StrainBlueprint,
    plantedAtTick: number,
    currentTick: number,
  ): PlantState {
    const height = 0.1 + this.plantStream.nextRange(0, 0.05);
    return {
      id: generateId(this.idStream, 'plant'),
      strainId: strain.id,
      zoneId: zone.id,
      stage: 'seedling',
      plantedAtTick,
      ageInHours: Math.max(0, (currentTick - plantedAtTick) * this.tickLengthHours()),
      health: 0.95,
      stress: 0.05,
      biomassDryGrams: 0,
      heightMeters: height,
      canopyCover: 0.12,
      yieldDryGrams: 0,
      quality: 0.8,
      lastMeasurementTick: currentTick,
    } satisfies PlantState;
  }

  private tickLengthHours(): number {
    const minutes = this.state.metadata.tickLengthMinutes;
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return 0;
    }
    return minutes / 60;
  }

  private ensurePlantHealth(zone: ZoneState, plant: PlantState): PlantHealthState {
    const existing = zone.health.plantHealth[plant.id];
    if (existing) {
      return existing;
    }
    const created: PlantHealthState = { diseases: [], pests: [] };
    zone.health.plantHealth[plant.id] = created;
    return created;
  }

  private requireCultivationMethod(zone: ZoneState): CultivationMethodBlueprint {
    const blueprint = this.repository.getCultivationMethod(zone.cultivationMethodId);
    if (!blueprint) {
      throw new Error(
        `Unknown cultivation method ${zone.cultivationMethodId} for zone ${zone.id}.`,
      );
    }
    return blueprint;
  }

  private validateCapacity(
    zone: ZoneState,
    method: CultivationMethodBlueprint,
    count: number,
  ): { ok: true } | { ok: false; result: CommandResult<PlantingResult> } {
    const areaPerPlant = Math.max(method.areaPerPlant ?? MIN_AREA_PER_PLANT, MIN_AREA_PER_PLANT);
    const capacity = Math.max(1, Math.floor(zone.area / areaPerPlant));
    const remaining = capacity - zone.plants.length;
    if (remaining < count) {
      const message = `Zone ${zone.name ?? zone.id} can host ${remaining} additional plants (capacity ${capacity}).`;
      return {
        ok: false,
        result: this.failure('ERR_INVALID_STATE', message, ['plants.addPlanting', 'count']),
      };
    }
    return { ok: true };
  }

  private evaluateCompatibility(
    strain: StrainBlueprint,
    method: CultivationMethodBlueprint,
  ): { warnings: string[]; incompatible?: string } {
    const affinity = strain.methodAffinity?.[method.id];
    if (affinity === undefined) {
      return { warnings: [] };
    }
    if (affinity < INCOMPATIBLE_AFFINITY_THRESHOLD) {
      return {
        warnings: [],
        incompatible: `Strain ${strain.name} is incompatible with cultivation method ${method.name} (affinity ${affinity.toFixed(
          2,
        )}).`,
      };
    }
    if (affinity < LOW_AFFINITY_WARNING_THRESHOLD) {
      return {
        warnings: [
          `Strain ${strain.name} has low affinity (${affinity.toFixed(2)}) for cultivation method ${method.name}.`,
        ],
      };
    }
    return { warnings: [] };
  }

  private failure<T = never>(code: ErrorCode, message: string, path: string[]): CommandResult<T> {
    return {
      ok: false,
      errors: [
        {
          code,
          message,
          path,
        },
      ],
    } satisfies CommandResult<T>;
  }
}

export default PlantingService;
