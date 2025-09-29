import { generateId } from '@/state/initialization/common.js';
import type { RngService, RngStream } from '@/lib/rng.js';
import { CostAccountingService, type TickAccumulator } from '@/engine/economy/costAccounting.js';
import {
  type CommandExecutionContext,
  type CommandResult,
  type ErrorCode,
  type CreateRoomIntent,
  type CreateZoneIntent,
  type UpdateZoneIntent,
} from '@/facade/index.js';
import {
  type DeviceFailureModifiers,
  type GameState,
  type PlantStressModifiers,
  type StructureBlueprint,
  type DifficultyLevel,
  type EconomicsSettings,
} from '@/state/types.js';
import type { RoomPurposeSource } from '@/engine/roomPurposes/index.js';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import {
  createStructureService,
  type StructureService,
  type DuplicateStructureResult,
} from './structureService.js';
import {
  createRoomService,
  type RoomService,
  type CreateRoomResult,
  type DuplicateRoomResult,
} from './roomService.js';
import {
  createZoneService,
  type ZoneService,
  type CreateZoneResult,
  type DuplicateZoneResult,
} from './zoneService.js';
import { cloneDeviceFailureModifiers, clonePlantStressModifiers } from './worldDefaults.js';
import { type ZoneLookupResult } from './stateSelectors.js';

export type { CreateZoneResult, DuplicateZoneResult } from './zoneService.js';
export type { CreateRoomResult, DuplicateRoomResult } from './roomService.js';
export type { DuplicateStructureResult } from './structureService.js';

const DEFAULT_ECONOMICS: EconomicsSettings = {
  initialCapital: 1_500_000,
  itemPriceMultiplier: 1.0,
  harvestPriceMultiplier: 1.0,
  rentPerSqmStructurePerTick: 0.15,
  rentPerSqmRoomPerTick: 0.3,
};

const DEFAULT_PLANT_STRESS_MODIFIERS: PlantStressModifiers = {
  optimalRangeMultiplier: 1,
  stressAccumulationMultiplier: 1,
};

const DEFAULT_DEVICE_FAILURE_MODIFIERS: DeviceFailureModifiers = {
  mtbfMultiplier: 1,
};

export interface WorldServiceOptions {
  state: GameState;
  rng: RngService;
  costAccounting: CostAccountingService;
  structureBlueprints?: StructureBlueprint[];
  roomPurposeSource?: RoomPurposeSource;
  difficultyConfig?: DifficultyConfig;
  repository: BlueprintRepository;
}

export class WorldService {
  private readonly state: GameState;

  private readonly idStream: RngStream;

  private readonly costAccounting: CostAccountingService;

  private readonly structureBlueprints?: StructureBlueprint[];

  private readonly roomPurposeSource?: RoomPurposeSource;

  private readonly difficultyConfig?: DifficultyConfig;

  private readonly repository: BlueprintRepository;

  private readonly structureService: StructureService;

  private readonly roomService: RoomService;

  private readonly zoneService: ZoneService;

  constructor(options: WorldServiceOptions) {
    this.state = options.state;
    this.costAccounting = options.costAccounting;
    this.idStream = options.rng.getStream('world.structures');
    this.structureBlueprints = options.structureBlueprints;
    this.roomPurposeSource = options.roomPurposeSource;
    this.difficultyConfig = options.difficultyConfig;
    this.repository = options.repository;

    const createId = (prefix: string) => this.createId(prefix);

    this.zoneService = createZoneService({
      state: this.state,
      repository: this.repository,
      costAccounting: this.costAccounting,
      createId,
      applyAccumulator: (accumulator) => this.applyAccumulator(accumulator),
      failure: this.failure.bind(this),
    });

    this.roomService = createRoomService({
      state: this.state,
      costAccounting: this.costAccounting,
      repository: this.repository,
      createId,
      roomPurposeSource: this.roomPurposeSource,
      zoneService: this.zoneService,
      failure: this.failure.bind(this),
    });

    this.structureService = createStructureService({
      state: this.state,
      costAccounting: this.costAccounting,
      repository: this.repository,
      createId,
      structureBlueprints: this.structureBlueprints,
      roomService: this.roomService,
      failure: this.failure.bind(this),
    });
  }

  private resolveEconomicsPreset(level: DifficultyLevel): EconomicsSettings {
    const preset = this.difficultyConfig?.[level]?.modifiers.economics;
    return preset ? { ...preset } : { ...DEFAULT_ECONOMICS };
  }

  private resolvePlantStressPreset(level: DifficultyLevel): PlantStressModifiers {
    const preset = this.difficultyConfig?.[level]?.modifiers.plantStress;
    return clonePlantStressModifiers(preset ?? DEFAULT_PLANT_STRESS_MODIFIERS);
  }

  private resolveDeviceFailurePreset(level: DifficultyLevel): DeviceFailureModifiers {
    const preset = this.difficultyConfig?.[level]?.modifiers.deviceFailure;
    return cloneDeviceFailureModifiers(preset ?? DEFAULT_DEVICE_FAILURE_MODIFIERS);
  }

  private ensureDifficultyMetadata(): void {
    const difficulty = this.state.metadata.difficulty;
    const plantStressSource =
      this.state.metadata.plantStress ?? this.resolvePlantStressPreset(difficulty);
    const deviceFailureSource =
      this.state.metadata.deviceFailure ?? this.resolveDeviceFailurePreset(difficulty);

    this.state.metadata.plantStress = clonePlantStressModifiers(plantStressSource);
    this.state.metadata.deviceFailure = cloneDeviceFailureModifiers(deviceFailureSource);
  }

  getStructureBlueprints(): CommandResult<StructureBlueprint[]> {
    return {
      ok: true,
      data: this.structureBlueprints ?? [],
    } satisfies CommandResult<StructureBlueprint[]>;
  }

  renameStructure(
    structureId: string,
    name: string,
    context: CommandExecutionContext,
  ): CommandResult {
    return this.structureService.renameStructure(structureId, name, context);
  }

  rentStructure(
    structureId: string,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> {
    return this.structureService.rentStructure(structureId, context);
  }

  createRoom(
    intent: CreateRoomIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateRoomResult> {
    return this.roomService.createRoom(intent, context);
  }

  createZone(
    intent: CreateZoneIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateZoneResult> {
    return this.zoneService.createZone(intent, context);
  }

  updateZone(intent: UpdateZoneIntent, context: CommandExecutionContext): CommandResult {
    return this.zoneService.updateZone(intent, context);
  }

  deleteStructure(structureId: string, context: CommandExecutionContext): CommandResult {
    return this.structureService.deleteStructure(structureId, context);
  }

  duplicateStructure(
    structureId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> {
    return this.structureService.duplicateStructure(structureId, desiredName, context);
  }

  duplicateRoom(
    roomId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateRoomResult> {
    return this.roomService.duplicateRoom(roomId, desiredName, context);
  }

  duplicateZone(
    zoneId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateZoneResult> {
    return this.zoneService.duplicateZone(zoneId, desiredName, context);
  }

  resetSession(context: CommandExecutionContext): CommandResult {
    this.state.finances.outstandingLoans.length = 0;
    this.state.finances.ledger.length = 0;
    this.state.finances.summary = {
      totalRevenue: 0,
      totalExpenses: 0,
      totalPayroll: 0,
      totalMaintenance: 0,
      netIncome: 0,
      lastTickRevenue: 0,
      lastTickExpenses: 0,
    };

    // Reset inventory to initial levels
    this.state.inventory.resources = {
      waterLiters: 12_000,
      nutrientsGrams: 8_000,
      co2Kg: 40,
      substrateKg: 2_000,
      packagingUnits: 400,
      sparePartsValue: 1_500,
    };
    this.state.inventory.seeds.length = 0;
    this.state.inventory.devices.length = 0;
    this.state.inventory.harvest.length = 0;
    this.state.inventory.consumables = {
      trimBins: 6,
      gloves: 200,
      filters: 12,
      labels: 500,
    };

    // Add a note about the session reset
    this.state.notes.push({
      id: this.createId('note'),
      tick: 0,
      message: 'Session reset - simulation restarted.',
      level: 'info',
    });

    context.events.queue('world.sessionReset', {}, context.tick, 'info');

    // Now rent the quickstart structure
    const QUICKSTART_STRUCTURE_ID = '43ee4095-627d-4a0c-860b-b10affbcf603';
    return this.rentStructure(QUICKSTART_STRUCTURE_ID, context);
  }

  newGame(
    difficulty: DifficultyLevel = 'normal',
    customModifiers:
      | {
          plantStress: PlantStressModifiers;
          deviceFailure: DeviceFailureModifiers;
          economics: EconomicsSettings;
        }
      | undefined,
    seed: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult {
    // Clear all existing structures
    this.state.structures.length = 0;

    // Clear all tasks as they reference structures
    this.state.tasks.backlog.length = 0;
    this.state.tasks.active.length = 0;
    this.state.tasks.completed.length = 0;
    this.state.tasks.cancelled.length = 0;

    // Reset clock to initial state
    this.state.clock.tick = 0;
    this.state.clock.isPaused = true;
    this.state.clock.lastUpdatedAt = new Date().toISOString();

    // Clear notes
    this.state.notes.length = 0;

    // Reset personnel to initial state
    this.state.personnel.employees.length = 0;
    this.state.personnel.applicants.length = 0;
    this.state.personnel.trainingPrograms.length = 0;
    this.state.personnel.overallMorale = 0;

    // Get economics from custom modifiers or default to difficulty preset from config
    const economicsPreset = this.resolveEconomicsPreset(difficulty);
    const plantStressPreset = this.resolvePlantStressPreset(difficulty);
    const deviceFailurePreset = this.resolveDeviceFailurePreset(difficulty);

    const economics = customModifiers?.economics ?? economicsPreset;
    const plantStress = customModifiers?.plantStress ?? plantStressPreset;
    const deviceFailure = customModifiers?.deviceFailure ?? deviceFailurePreset;

    // Update the game metadata with new difficulty and modifiers
    this.state.metadata.difficulty = difficulty;
    this.state.metadata.economics = { ...economics };
    this.state.metadata.plantStress = clonePlantStressModifiers(plantStress);
    this.state.metadata.deviceFailure = cloneDeviceFailureModifiers(deviceFailure);

    // Reset finances to initial state with difficulty-based capital
    this.state.finances.cashOnHand = economics.initialCapital;
    this.state.finances.reservedCash = 0;
    this.state.finances.outstandingLoans.length = 0;
    this.state.finances.ledger.length = 0;
    this.state.finances.summary = {
      totalRevenue: 0,
      totalExpenses: 0,
      totalPayroll: 0,
      totalMaintenance: 0,
      netIncome: 0,
      lastTickRevenue: 0,
      lastTickExpenses: 0,
    };

    // Reset inventory to initial levels
    this.state.inventory.resources = {
      waterLiters: 12_000,
      nutrientsGrams: 8_000,
      co2Kg: 40,
      substrateKg: 2_000,
      packagingUnits: 400,
      sparePartsValue: 1_500,
    };
    this.state.inventory.seeds.length = 0;
    this.state.inventory.devices.length = 0;
    this.state.inventory.harvest.length = 0;
    this.state.inventory.consumables = {
      trimBins: 6,
      gloves: 200,
      filters: 12,
      labels: 500,
    };

    // Store the seed if provided
    if (seed) {
      this.state.metadata.seed = seed;
    }

    // Add a note about the new game
    this.state.notes.push({
      id: this.createId('note'),
      tick: 0,
      message: seed
        ? `New game started with seed '${seed}' - empty session ready for building.`
        : 'New game started - empty session ready for building.',
      level: 'info',
    });

    context.events.queue('world.newGame', {}, context.tick, 'info');

    // Unlike resetSession, we DON'T rent any structures - leave it completely empty
    return { ok: true } satisfies CommandResult;
  }

  private applyAccumulator(accumulator: TickAccumulator): void {
    const summary = this.state.finances.summary;
    summary.totalRevenue += accumulator.revenue;
    summary.totalExpenses += accumulator.expenses;
    summary.totalMaintenance += accumulator.maintenance;
    summary.totalPayroll += accumulator.payroll;
    summary.lastTickRevenue = accumulator.revenue;
    summary.lastTickExpenses = accumulator.expenses;
    summary.netIncome = summary.totalRevenue - summary.totalExpenses;
  }

  private createId(prefix: string): string {
    return generateId(this.idStream, prefix);
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
    };
  }
}

export const requireZoneLookup = (lookup: ZoneLookupResult | undefined): ZoneLookupResult => {
  if (!lookup) {
    throw new Error('Zone lookup failed.');
  }
  return lookup;
};

export default WorldService;
