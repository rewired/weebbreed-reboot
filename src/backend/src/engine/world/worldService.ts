import { generateId } from '@/state/initialization/common.js';
import type { RngService, RngStream } from '@/lib/rng.js';
import { CostAccountingService, type TickAccumulator } from '@/engine/economy/costAccounting.js';
import {
  DEFAULT_MAINTENANCE_INTERVAL_TICKS,
  DEFAULT_ZONE_NUTRIENT_LITERS,
  DEFAULT_ZONE_RESERVOIR_LEVEL,
  DEFAULT_ZONE_WATER_LITERS,
} from '@/constants/world.js';
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
  type StructureState,
  type RoomState,
  type ZoneState,
  type ZoneResourceState,
  type ZoneMetricState,
  type ZoneHealthState,
  type DifficultyLevel,
  type EconomicsSettings,
} from '@/state/models.js';
import { validateStructureGeometry } from '@/state/geometry.js';
import { findStructure, findRoom, findZone, type ZoneLookupResult } from './stateSelectors.js';
import { type RoomPurposeSource, resolveRoomPurposeId } from '@/engine/roomPurposes/index.js';
import type { DifficultyConfig } from '@/data/configs/difficulty.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import type { CultivationMethodBlueprint } from '@/data/schemas/index.js';

const deriveDuplicateName = (original: string, fallbackSuffix: string): string => {
  const trimmed = original.trim();
  if (trimmed.length === 0) {
    return fallbackSuffix;
  }
  if (trimmed.toLowerCase().includes('copy')) {
    return trimmed;
  }
  return `${trimmed} Copy`;
};

const cloneMetrics = (source: ZoneMetricState, tick: number): ZoneMetricState => ({
  averageTemperature: source.averageTemperature,
  averageHumidity: source.averageHumidity,
  averageCo2: source.averageCo2,
  averagePpfd: source.averagePpfd,
  stressLevel: source.stressLevel,
  lastUpdatedTick: tick,
});

const cloneCultivation = (
  cultivation: ZoneState['cultivation'] | undefined,
): ZoneState['cultivation'] | undefined => {
  if (!cultivation) {
    return undefined;
  }

  const cloned: ZoneState['cultivation'] = {};
  if (cultivation.container) {
    cloned.container = { ...cultivation.container };
  }
  if (cultivation.substrate) {
    cloned.substrate = { ...cultivation.substrate };
  }
  return cloned;
};

const createDefaultResources = (): ZoneResourceState => ({
  waterLiters: DEFAULT_ZONE_WATER_LITERS,
  nutrientSolutionLiters: DEFAULT_ZONE_NUTRIENT_LITERS,
  nutrientStrength: 1,
  substrateHealth: 1,
  reservoirLevel: DEFAULT_ZONE_RESERVOIR_LEVEL,
  lastTranspirationLiters: 0,
});

const createEmptyHealth = (): ZoneHealthState => ({
  plantHealth: {},
  pendingTreatments: [],
  appliedTreatments: [],
});

const cloneEnvironment = (environment: ZoneState['environment']): ZoneState['environment'] => {
  return {
    temperature: environment.temperature,
    relativeHumidity: environment.relativeHumidity,
    co2: environment.co2,
    ppfd: environment.ppfd,
    vpd: environment.vpd,
  };
};

const cloneControl = (control: ZoneState['control'] | undefined): ZoneState['control'] => {
  if (!control) {
    return { setpoints: {} } satisfies ZoneState['control'];
  }
  const setpoints = control.setpoints ?? {};
  return {
    setpoints: {
      temperature: setpoints.temperature,
      humidity: setpoints.humidity,
      co2: setpoints.co2,
      ppfd: setpoints.ppfd,
      vpd: setpoints.vpd,
    },
  } satisfies ZoneState['control'];
};

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

const clonePlantStressModifiers = (source: PlantStressModifiers): PlantStressModifiers => ({
  optimalRangeMultiplier: source.optimalRangeMultiplier,
  stressAccumulationMultiplier: source.stressAccumulationMultiplier,
});

const cloneDeviceFailureModifiers = (source: DeviceFailureModifiers): DeviceFailureModifiers => ({
  mtbfMultiplier: source.mtbfMultiplier,
});

const deepCloneSettings = (settings: Record<string, unknown>): Record<string, unknown> => {
  return JSON.parse(JSON.stringify(settings));
};

type DevicePurchaseMap = Map<string, number>;

export interface DuplicateStructureResult {
  structureId: string;
}

export interface DuplicateRoomResult {
  roomId: string;
}

export interface CreateRoomResult {
  roomId: string;
}

export interface CreateZoneResult {
  zoneId: string;
  method: {
    blueprintId: string;
    setupCost?: number;
  };
  container: {
    blueprintId: string;
    slug: string;
    type: string;
    count: number;
    maxSupported: number;
    unitCost?: number;
    totalCost?: number;
  };
  substrate: {
    blueprintId: string;
    slug: string;
    type: string;
    totalVolumeLiters: number;
    unitCost?: number;
    totalCost?: number;
  };
  totalCost?: number;
}

export interface DuplicateZoneResult {
  zoneId: string;
}

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

  constructor(options: WorldServiceOptions) {
    this.state = options.state;
    this.costAccounting = options.costAccounting;
    this.idStream = options.rng.getStream('world.structures');
    this.structureBlueprints = options.structureBlueprints;
    this.roomPurposeSource = options.roomPurposeSource;
    this.difficultyConfig = options.difficultyConfig;
    this.repository = options.repository;
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

  private resolveMethodDefaults(method: CultivationMethodBlueprint): {
    containerSlug?: string;
    substrateSlug?: string;
  } {
    const meta = method.meta;
    if (!meta || typeof meta !== 'object') {
      return {};
    }
    const defaultsRaw = (meta as Record<string, unknown>).defaults;
    if (!defaultsRaw || typeof defaultsRaw !== 'object') {
      return {};
    }
    const defaults = defaultsRaw as Record<string, unknown>;
    const containerSlug =
      typeof defaults.containerSlug === 'string' ? defaults.containerSlug : undefined;
    const substrateSlug =
      typeof defaults.substrateSlug === 'string' ? defaults.substrateSlug : undefined;
    return { containerSlug, substrateSlug };
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
    const lookup = findStructure(this.state, structureId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.renameStructure',
        'structureId',
      ]);
    }

    const trimmedName = name.trim();
    lookup.structure.name = trimmedName;

    context.events.queue(
      'world.structureRenamed',
      { structureId, name: trimmedName },
      context.tick,
      'info',
    );
    return { ok: true } satisfies CommandResult;
  }

  rentStructure(
    structureId: string,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> {
    if (!this.structureBlueprints) {
      return this.failure('ERR_INVALID_STATE', 'Structure blueprints are not available.', [
        'world.rentStructure',
      ]);
    }
    const blueprint = this.structureBlueprints.find((s) => s.id === structureId);
    if (!blueprint) {
      return this.failure('ERR_NOT_FOUND', `Structure blueprint ${structureId} not found.`, [
        'world.rentStructure',
        'structureId',
      ]);
    }

    // Allow renting multiple structures of any blueprint type

    // Check if player has enough cash for upfront fee
    if (this.state.finances.cashOnHand < blueprint.upfrontFee) {
      return this.failure(
        'ERR_INSUFFICIENT_FUNDS',
        `Insufficient funds for upfront fee. Required: ${blueprint.upfrontFee}, Available: ${this.state.finances.cashOnHand}`,
        ['world.rentStructure', 'upfrontFee'],
      );
    }

    // Convert monthly rental cost to per-tick cost
    // Assuming 30 days per month and tick length from game metadata
    const tickLengthHours = this.state.metadata.tickLengthMinutes / 60;
    const hoursPerMonth = 30 * 24; // 720 hours per month
    const area = blueprint.footprint.length * blueprint.footprint.width;
    const monthlyRentTotal = blueprint.rentalCostPerSqmPerMonth * area;
    const hourlyRent = monthlyRentTotal / hoursPerMonth;
    const rentPerTick = hourlyRent * tickLengthHours;

    const newStructure: StructureState = {
      id: this.createId('structure'),
      blueprintId: blueprint.id,
      name: blueprint.name,
      status: 'active',
      footprint: {
        ...blueprint.footprint,
        area: area,
        volume: area * (blueprint.footprint.height || 2.5),
        height: blueprint.footprint.height || 2.5,
      },
      rooms: [],
      rentPerTick: rentPerTick,
      upfrontCostPaid: blueprint.upfrontFee,
      notes: undefined,
    };

    this.state.structures.push(newStructure);

    // Deduct upfront fee from cash
    this.state.finances.cashOnHand -= blueprint.upfrontFee;

    // Record upfront fee as a capital expenditure if there's an amount
    if (blueprint.upfrontFee > 0) {
      const timestamp = new Date().toISOString();

      // Create ledger entry for upfront fee
      const ledgerEntry = {
        id: `ledger_${this.state.finances.ledger.length + 1}`,
        tick: context.tick,
        timestamp,
        amount: -blueprint.upfrontFee,
        type: 'expense' as const,
        category: 'rent' as const,
        description: `Structure rental upfront fee: ${newStructure.name}`,
      };

      this.state.finances.ledger.push(ledgerEntry);

      // Update finance summary
      this.state.finances.summary.totalExpenses += blueprint.upfrontFee;
      this.state.finances.summary.lastTickExpenses = blueprint.upfrontFee;
      this.state.finances.summary.netIncome =
        this.state.finances.summary.totalRevenue - this.state.finances.summary.totalExpenses;

      context.events.queue(
        'finance.capex',
        {
          tick: context.tick,
          amount: blueprint.upfrontFee,
          category: 'rent',
          description: `Structure rental upfront fee: ${newStructure.name}`,
          structureId: newStructure.id,
        },
        context.tick,
        'info',
      );
    }

    // Note: Structure rent costs are automatically handled by the accounting system during tick processing

    context.events.queue(
      'world.structureRented',
      { structureId: newStructure.id, name: newStructure.name },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: { structureId: newStructure.id },
    } satisfies CommandResult<DuplicateStructureResult>;
  }

  createRoom(
    intent: CreateRoomIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateRoomResult> {
    const { structureId, room } = intent;
    const lookup = findStructure(this.state, structureId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.createRoom',
        'structureId',
      ]);
    }

    const structure = lookup.structure;

    // Resolve room purpose ID from name
    if (!this.roomPurposeSource) {
      return this.failure('ERR_INVALID_STATE', 'Room purpose registry is not configured.', [
        'world.createRoom',
        'room.purpose',
      ]);
    }

    let purposeId: string;
    try {
      purposeId = resolveRoomPurposeId(this.roomPurposeSource, room.purpose);
    } catch (error) {
      return this.failure('ERR_NOT_FOUND', `Unknown room purpose: ${room.purpose}`, [
        'world.createRoom',
        'room.purpose',
      ]);
    }

    // Check if adding the room would exceed the structure footprint
    const totalExistingArea = structure.rooms.reduce((sum, current) => sum + current.area, 0);
    if (totalExistingArea + room.area > structure.footprint.area) {
      return this.failure(
        'ERR_CONFLICT',
        'Adding the room would exceed the structure footprint area.',
        ['world.createRoom', 'room.area'],
      );
    }

    // Create the new room
    const height = room.height ?? 2.5; // Default height if not specified
    const newRoom: RoomState = {
      id: this.createId('room'),
      structureId,
      name: room.name.trim(),
      purposeId,
      area: room.area,
      height,
      volume: room.area * height,
      cleanliness: 1, // Start with perfect cleanliness
      maintenanceLevel: 1, // Start with perfect maintenance
      zones: [], // Start with no zones
    } satisfies RoomState;

    // Add the room to the structure
    structure.rooms.push(newRoom);

    // Validate the structure geometry
    validateStructureGeometry(structure);

    // Queue an event
    context.events.queue(
      'world.roomCreated',
      { roomId: newRoom.id, structureId, name: newRoom.name },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: { roomId: newRoom.id },
    } satisfies CommandResult<CreateRoomResult>;
  }

  createZone(
    intent: CreateZoneIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateZoneResult> {
    const { roomId, zone } = intent;
    const lookup = findRoom(this.state, roomId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Room ${roomId} was not found.`, [
        'world.createZone',
        'roomId',
      ]);
    }

    const room = lookup.room;
    const structure = lookup.structure;

    // Check if adding the zone would exceed the room area
    const totalExistingArea = room.zones.reduce((sum, current) => sum + current.area, 0);
    if (totalExistingArea + zone.area > room.area) {
      return this.failure('ERR_CONFLICT', 'Adding the zone would exceed the room area.', [
        'world.createZone',
        'zone.area',
      ]);
    }

    const method = this.repository.getCultivationMethod(zone.methodId);
    if (!method) {
      return this.failure('ERR_NOT_FOUND', `Cultivation method ${zone.methodId} was not found.`, [
        'world.createZone',
        'zone.methodId',
      ]);
    }

    const { container, substrate } = zone;

    const containerBlueprint = this.repository.getContainer(container.blueprintId);
    if (!containerBlueprint) {
      return this.failure(
        'ERR_NOT_FOUND',
        `Container blueprint ${container.blueprintId} was not found.`,
        ['world.createZone', 'zone.container.blueprintId'],
      );
    }

    const containerType = containerBlueprint.type;
    if (containerType !== container.type) {
      return this.failure('ERR_VALIDATION', 'Container type does not match blueprint metadata.', [
        'world.createZone',
        'zone.container.type',
      ]);
    }

    if (
      Array.isArray(method.compatibleContainerTypes) &&
      method.compatibleContainerTypes.length > 0 &&
      !method.compatibleContainerTypes.includes(containerType)
    ) {
      return this.failure(
        'ERR_INVALID_STATE',
        `Container type '${containerType}' is incompatible with cultivation method '${method.name}'.`,
        ['world.createZone', 'zone.container.type'],
      );
    }

    const footprintArea = containerBlueprint.footprintArea;
    if (!Number.isFinite(footprintArea) || footprintArea === undefined || footprintArea <= 0) {
      return this.failure(
        'ERR_INVALID_STATE',
        `Container blueprint '${containerBlueprint.slug}' is missing a valid footprint area.`,
        ['world.createZone', 'zone.container.blueprintId'],
      );
    }

    const packingDensity = Number.isFinite(containerBlueprint.packingDensity)
      ? Math.max(containerBlueprint.packingDensity ?? 0, 0)
      : 1;
    const effectiveDensity = packingDensity > 0 ? packingDensity : 1;
    const theoreticalCapacity = (zone.area / footprintArea) * effectiveDensity;
    const maxContainers = Number.isFinite(theoreticalCapacity)
      ? Math.floor(Math.max(theoreticalCapacity, 0))
      : 0;

    if (maxContainers <= 0) {
      return this.failure(
        'ERR_INVALID_STATE',
        `Zone area ${zone.area.toFixed(2)} m² cannot support container footprint ${footprintArea.toFixed(2)} m².`,
        ['world.createZone', 'zone.container.count'],
      );
    }

    if (container.count > maxContainers) {
      return this.failure(
        'ERR_CONFLICT',
        `Requested ${container.count} containers exceeds maximum supported count of ${maxContainers}.`,
        ['world.createZone', 'zone.container.count'],
      );
    }

    const substrateBlueprint = this.repository.getSubstrate(substrate.blueprintId);
    if (!substrateBlueprint) {
      return this.failure(
        'ERR_NOT_FOUND',
        `Substrate blueprint ${substrate.blueprintId} was not found.`,
        ['world.createZone', 'zone.substrate.blueprintId'],
      );
    }

    const substrateType = substrateBlueprint.type;
    if (substrateType !== substrate.type) {
      return this.failure('ERR_VALIDATION', 'Substrate type does not match blueprint metadata.', [
        'world.createZone',
        'zone.substrate.type',
      ]);
    }

    if (
      Array.isArray(method.compatibleSubstrateTypes) &&
      method.compatibleSubstrateTypes.length > 0 &&
      !method.compatibleSubstrateTypes.includes(substrateType)
    ) {
      return this.failure(
        'ERR_INVALID_STATE',
        `Substrate type '${substrateType}' is incompatible with cultivation method '${method.name}'.`,
        ['world.createZone', 'zone.substrate.type'],
      );
    }

    const containerVolume = containerBlueprint.volumeInLiters;
    if (
      !Number.isFinite(containerVolume) ||
      containerVolume === undefined ||
      containerVolume <= 0
    ) {
      return this.failure(
        'ERR_INVALID_STATE',
        `Container blueprint '${containerBlueprint.slug}' is missing a valid volumeInLiters value.`,
        ['world.createZone', 'zone.container.blueprintId'],
      );
    }

    const requiredSubstrateVolume = containerVolume * container.count;
    const warnings: string[] = [];

    if (substrate.volumeLiters !== undefined) {
      const providedVolume = substrate.volumeLiters;
      if (!Number.isFinite(providedVolume) || providedVolume <= 0) {
        warnings.push('Provided substrate volume was non-positive and has been ignored.');
      } else {
        const tolerance = Math.max(requiredSubstrateVolume * 0.05, 1);
        if (Math.abs(providedVolume - requiredSubstrateVolume) > tolerance) {
          warnings.push(
            `Submitted substrate volume (${providedVolume.toFixed(2)} L) differs from the required ${requiredSubstrateVolume.toFixed(2)} L.`,
          );
        }
      }
    }

    const methodPrice = this.repository.getCultivationMethodPrice(method.id);
    const containerPrice = this.repository.getContainerPrice(containerBlueprint.slug);
    const substratePrice = this.repository.getSubstratePrice(substrateBlueprint.slug);
    const multiplier = this.state.metadata.economics.itemPriceMultiplier ?? 1;

    const adjustedMethodCost =
      methodPrice && Number.isFinite(methodPrice.setupCost)
        ? Math.max(methodPrice.setupCost, 0) * multiplier
        : undefined;
    const adjustedContainerCost =
      containerPrice && Number.isFinite(containerPrice.costPerUnit)
        ? Math.max(containerPrice.costPerUnit, 0) * container.count * multiplier
        : undefined;
    const adjustedSubstrateCost =
      substratePrice && Number.isFinite(substratePrice.costPerLiter)
        ? Math.max(substratePrice.costPerLiter, 0) * requiredSubstrateVolume * multiplier
        : undefined;

    const totalCostCandidate = [
      adjustedMethodCost,
      adjustedContainerCost,
      adjustedSubstrateCost,
    ].reduce(
      (sum, value) => sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0),
      0,
    );
    const totalCost =
      totalCostCandidate > 0 &&
      [adjustedMethodCost, adjustedContainerCost, adjustedSubstrateCost].some(
        (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
      )
        ? totalCostCandidate
        : undefined;

    const ceilingHeight = room.height || 2.5;
    const newZone: ZoneState = {
      id: this.createId('zone'),
      roomId,
      name: zone.name.trim(),
      cultivationMethodId: zone.methodId,
      strainId: undefined,
      area: zone.area,
      ceilingHeight,
      volume: zone.area * ceilingHeight,
      environment: {
        temperature: 22,
        relativeHumidity: 0.6,
        co2: 400,
        ppfd: 0,
        vpd: 1.2,
      },
      resources: createDefaultResources(),
      plants: [],
      devices: [],
      metrics: {
        averageTemperature: 22,
        averageHumidity: 0.6,
        averageCo2: 400,
        averagePpfd: 0,
        stressLevel: 0,
        lastUpdatedTick: context.tick,
      },
      control: { setpoints: {} },
      health: createEmptyHealth(),
      activeTaskIds: [],
      plantingPlan: undefined,
      cultivation: {
        container: {
          blueprintId: containerBlueprint.id,
          slug: containerBlueprint.slug,
          type: containerBlueprint.type,
          count: container.count,
          name: containerBlueprint.name,
        },
        substrate: {
          blueprintId: substrateBlueprint.id,
          slug: substrateBlueprint.slug,
          type: substrateBlueprint.type,
          totalVolumeLiters: requiredSubstrateVolume,
          name: substrateBlueprint.name,
        },
      },
    } satisfies ZoneState;

    room.zones.push(newZone);
    validateStructureGeometry(structure);

    context.events.queue(
      'world.zoneCreated',
      {
        zoneId: newZone.id,
        roomId,
        structureId: structure.id,
        name: newZone.name,
        container: { slug: containerBlueprint.slug, count: container.count },
        substrate: { slug: substrateBlueprint.slug, totalVolumeLiters: requiredSubstrateVolume },
      },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: {
        zoneId: newZone.id,
        method: {
          blueprintId: method.id,
          setupCost: adjustedMethodCost,
        },
        container: {
          blueprintId: containerBlueprint.id,
          slug: containerBlueprint.slug,
          type: containerBlueprint.type,
          count: container.count,
          maxSupported: maxContainers,
          unitCost: containerPrice?.costPerUnit,
          totalCost: adjustedContainerCost,
        },
        substrate: {
          blueprintId: substrateBlueprint.id,
          slug: substrateBlueprint.slug,
          type: substrateBlueprint.type,
          totalVolumeLiters: requiredSubstrateVolume,
          unitCost: substratePrice?.costPerLiter,
          totalCost: adjustedSubstrateCost,
        },
        totalCost,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    } satisfies CommandResult<CreateZoneResult>;
  }

  updateZone(intent: UpdateZoneIntent, context: CommandExecutionContext): CommandResult {
    const { zoneId, patch } = intent;
    const lookup = findZone(this.state, zoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'world.updateZone',
        'zoneId',
      ]);
    }

    const { zone, room, structure } = lookup;
    const warnings: string[] = [];
    let geometryChanged = false;
    let cultivationChanged = false;

    if (typeof patch.name === 'string') {
      const trimmed = patch.name.trim();
      if (trimmed.length > 0) {
        zone.name = trimmed;
      }
    }

    if (typeof patch.area === 'number') {
      if (!Number.isFinite(patch.area) || patch.area <= 0) {
        return this.failure('ERR_VALIDATION', 'Zone area must be a positive number.', [
          'world.updateZone',
          'patch.area',
        ]);
      }
      const siblingArea = room.zones.reduce((sum, candidate) => {
        if (candidate.id === zone.id) {
          return sum;
        }
        return sum + candidate.area;
      }, 0);
      if (siblingArea + patch.area > room.area + 1e-6) {
        return this.failure('ERR_CONFLICT', 'Updated zone area would exceed the room capacity.', [
          'world.updateZone',
          'patch.area',
        ]);
      }
      zone.area = patch.area;
      zone.volume = patch.area * zone.ceilingHeight;
      geometryChanged = true;
    }

    if (typeof patch.methodId === 'string') {
      const method = this.repository.getCultivationMethod(patch.methodId);
      if (!method) {
        return this.failure(
          'ERR_NOT_FOUND',
          `Cultivation method ${patch.methodId} was not found.`,
          ['world.updateZone', 'patch.methodId'],
        );
      }

      const currentContainerType = zone.cultivation?.container?.type;
      if (
        currentContainerType &&
        Array.isArray(method.compatibleContainerTypes) &&
        method.compatibleContainerTypes.length > 0 &&
        !method.compatibleContainerTypes.includes(currentContainerType)
      ) {
        return this.failure(
          'ERR_INVALID_STATE',
          `Container type '${currentContainerType}' is incompatible with cultivation method '${method.name}'.`,
          ['world.updateZone', 'patch.methodId'],
        );
      }

      const currentSubstrateType = zone.cultivation?.substrate?.type;
      if (
        currentSubstrateType &&
        Array.isArray(method.compatibleSubstrateTypes) &&
        method.compatibleSubstrateTypes.length > 0 &&
        !method.compatibleSubstrateTypes.includes(currentSubstrateType)
      ) {
        return this.failure(
          'ERR_INVALID_STATE',
          `Substrate type '${currentSubstrateType}' is incompatible with cultivation method '${method.name}'.`,
          ['world.updateZone', 'patch.methodId'],
        );
      }

      const previousContainerSlug = zone.cultivation?.container?.slug;
      const previousSubstrateSlug = zone.cultivation?.substrate?.slug;

      zone.cultivationMethodId = patch.methodId;

      const defaults = this.resolveMethodDefaults(method);
      if (!zone.cultivation) {
        zone.cultivation = {};
      }

      if (defaults.containerSlug) {
        const containerBlueprint = this.repository.getContainerBySlug(defaults.containerSlug);
        if (containerBlueprint) {
          const count = zone.cultivation.container?.count ?? 0;
          zone.cultivation.container = {
            blueprintId: containerBlueprint.id,
            slug: containerBlueprint.slug,
            type: containerBlueprint.type,
            count,
            name: containerBlueprint.name,
          };
          if (previousContainerSlug && previousContainerSlug !== containerBlueprint.slug) {
            warnings.push(
              `Existing containers were moved to storage (stub). Install ${containerBlueprint.name} before planting.`,
            );
          }
        }
      }

      if (defaults.substrateSlug) {
        const substrateBlueprint = this.repository.getSubstrateBySlug(defaults.substrateSlug);
        if (substrateBlueprint) {
          const totalVolume = (() => {
            const container = zone.cultivation?.container;
            if (!container) {
              return zone.cultivation?.substrate?.totalVolumeLiters ?? 0;
            }
            const blueprint = this.repository.getContainer(container.blueprintId);
            if (!blueprint || !Number.isFinite(blueprint.volumeInLiters)) {
              return zone.cultivation?.substrate?.totalVolumeLiters ?? 0;
            }
            return Math.max(0, blueprint.volumeInLiters ?? 0) * Math.max(0, container.count);
          })();

          zone.cultivation.substrate = {
            blueprintId: substrateBlueprint.id,
            slug: substrateBlueprint.slug,
            type: substrateBlueprint.type,
            totalVolumeLiters: totalVolume,
            name: substrateBlueprint.name,
          };
          if (previousSubstrateSlug && previousSubstrateSlug !== substrateBlueprint.slug) {
            warnings.push(
              `Existing substrate was routed to storage (stub). Restock with ${substrateBlueprint.name} before planting.`,
            );
          }
        }
      }

      cultivationChanged = true;
    }

    if (geometryChanged) {
      validateStructureGeometry(structure);
    }

    if (geometryChanged || cultivationChanged) {
      const payload: Record<string, unknown> = {
        zoneId: zone.id,
        roomId: room.id,
        structureId: structure.id,
      };
      if (cultivationChanged) {
        payload.methodId = zone.cultivationMethodId;
        if (zone.cultivation?.container) {
          payload.container = {
            slug: zone.cultivation.container.slug,
            count: zone.cultivation.container.count,
          };
        }
        if (zone.cultivation?.substrate) {
          payload.substrate = {
            slug: zone.cultivation.substrate.slug,
            totalVolumeLiters: zone.cultivation.substrate.totalVolumeLiters,
          };
        }
      }
      if (geometryChanged) {
        payload.area = zone.area;
        payload.volume = zone.volume;
      }
      context.events.queue('world.zoneUpdated', payload, context.tick, 'info');
    }

    return {
      ok: true,
      warnings: warnings.length > 0 ? Array.from(new Set(warnings)) : undefined,
    } satisfies CommandResult;
  }

  deleteStructure(structureId: string, context: CommandExecutionContext): CommandResult {
    const lookup = findStructure(this.state, structureId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.deleteStructure',
        'structureId',
      ]);
    }

    const [removed] = this.state.structures.splice(lookup.index, 1);
    if (removed) {
      for (const room of removed.rooms) {
        for (const zone of room.zones) {
          zone.activeTaskIds = [];
        }
      }
      this.removeTasksForStructure(structureId);
    }

    context.events.queue('world.structureDeleted', { structureId }, context.tick, 'info');
    return { ok: true } satisfies CommandResult;
  }

  duplicateStructure(
    structureId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> {
    const lookup = findStructure(this.state, structureId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.duplicateStructure',
        'structureId',
      ]);
    }

    const source = lookup.structure;
    const newStructureId = this.createId('structure');
    const duplicateName = desiredName?.trim().length
      ? desiredName.trim()
      : deriveDuplicateName(source.name, 'Structure Copy');
    const rooms: StructureState['rooms'] = [];
    const purchaseMap: DevicePurchaseMap = new Map();

    for (const room of source.rooms) {
      rooms.push(this.cloneRoom(room, newStructureId, purchaseMap, context));
    }

    const duplicated: StructureState = {
      id: newStructureId,
      blueprintId: source.blueprintId,
      name: duplicateName,
      status: 'active',
      footprint: { ...source.footprint },
      rooms,
      rentPerTick: source.rentPerTick,
      upfrontCostPaid: 0,
      notes: undefined,
    } satisfies StructureState;

    validateStructureGeometry(duplicated);
    this.state.structures.push(duplicated);

    this.recordDevicePurchases(purchaseMap, context, `Structure duplication from ${structureId}`);

    context.events.queue(
      'world.structureDuplicated',
      { structureId: newStructureId, sourceStructureId: structureId, name: duplicateName },
      context.tick,
      'info',
    );

    return {
      ok: true,
      data: { structureId: newStructureId },
    } satisfies CommandResult<DuplicateStructureResult>;
  }

  duplicateRoom(
    roomId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateRoomResult> {
    const lookup = findRoom(this.state, roomId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Room ${roomId} was not found.`, [
        'world.duplicateRoom',
        'roomId',
      ]);
    }

    const { structure, room } = lookup;
    const totalArea = structure.rooms.reduce((sum, current) => sum + current.area, 0);
    if (totalArea + room.area - structure.footprint.area > 1e-6) {
      return this.failure(
        'ERR_CONFLICT',
        'Duplicating the room would exceed the structure footprint.',
        ['world.duplicateRoom', 'roomId'],
      );
    }

    const purchaseMap: DevicePurchaseMap = new Map();
    const newRoom = this.cloneRoom(
      room,
      structure.id,
      purchaseMap,
      context,
      desiredName?.trim().length ? desiredName.trim() : deriveDuplicateName(room.name, 'Room Copy'),
    );

    structure.rooms.push(newRoom);
    validateStructureGeometry(structure);

    this.recordDevicePurchases(purchaseMap, context, `Room duplication from ${roomId}`);

    context.events.queue(
      'world.roomDuplicated',
      { roomId: newRoom.id, sourceRoomId: roomId, structureId: structure.id },
      context.tick,
      'info',
    );

    return { ok: true, data: { roomId: newRoom.id } } satisfies CommandResult<DuplicateRoomResult>;
  }

  duplicateZone(
    zoneId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateZoneResult> {
    const lookup = findZone(this.state, zoneId);
    if (!lookup) {
      return this.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'world.duplicateZone',
        'zoneId',
      ]);
    }

    const { structure, room, zone } = lookup;
    const totalZoneArea = room.zones.reduce((sum, current) => sum + current.area, 0);
    if (totalZoneArea + zone.area - room.area > 1e-6) {
      return this.failure('ERR_CONFLICT', 'Duplicating the zone would exceed the room area.', [
        'world.duplicateZone',
        'zoneId',
      ]);
    }

    const purchaseMap: DevicePurchaseMap = new Map();
    const newZone = this.cloneZone(
      zone,
      structure.id,
      room.id,
      purchaseMap,
      context,
      desiredName?.trim().length ? desiredName.trim() : deriveDuplicateName(zone.name, 'Zone Copy'),
    );

    room.zones.push(newZone);
    validateStructureGeometry(structure);

    this.recordDevicePurchases(purchaseMap, context, `Zone duplication from ${zoneId}`);

    context.events.queue(
      'world.zoneDuplicated',
      {
        zoneId: newZone.id,
        sourceZoneId: zoneId,
        roomId: room.id,
        structureId: structure.id,
      },
      context.tick,
      'info',
    );

    return { ok: true, data: { zoneId: newZone.id } } satisfies CommandResult<DuplicateZoneResult>;
  }

  resetSession(context: CommandExecutionContext): CommandResult<DuplicateStructureResult> {
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

    this.ensureDifficultyMetadata();

    // Reset personnel to initial state
    this.state.personnel.employees.length = 0;
    this.state.personnel.applicants.length = 0;
    this.state.personnel.trainingPrograms.length = 0;
    this.state.personnel.overallMorale = 0;

    // Reset finances to initial state (preserve initial capital)
    const initialCapital = this.state.metadata.economics.initialCapital;
    this.state.finances.cashOnHand = initialCapital;
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

  private cloneRoom(
    room: RoomState,
    structureId: string,
    purchaseMap: DevicePurchaseMap,
    context: CommandExecutionContext,
    forcedName?: string,
  ): RoomState {
    const newRoomId = this.createId('room');
    const zones: RoomState['zones'] = [];

    for (const zone of room.zones) {
      zones.push(
        this.cloneZone(
          zone,
          structureId,
          newRoomId,
          purchaseMap,
          context,
          forcedName ? zone.name : undefined,
        ),
      );
    }

    return {
      id: newRoomId,
      structureId,
      name: forcedName ?? deriveDuplicateName(room.name, 'Room Copy'),
      purposeId: room.purposeId,
      area: room.area,
      height: room.height,
      volume: room.volume,
      cleanliness: room.cleanliness,
      maintenanceLevel: room.maintenanceLevel,
      zones,
    } satisfies RoomState;
  }

  private cloneZone(
    zone: ZoneState,
    structureId: string,
    roomId: string,
    purchaseMap: DevicePurchaseMap,
    context: CommandExecutionContext,
    forcedName?: string,
  ): ZoneState {
    const newZoneId = this.createId('zone');
    const devices: ZoneState['devices'] = [];

    for (const device of zone.devices) {
      const cloned = {
        id: this.createId('device'),
        blueprintId: device.blueprintId,
        kind: device.kind,
        name: device.name,
        zoneId: newZoneId,
        status: 'operational',
        efficiency: device.efficiency,
        runtimeHours: 0,
        maintenance: {
          lastServiceTick: context.tick,
          nextDueTick: context.tick + DEFAULT_MAINTENANCE_INTERVAL_TICKS,
          condition: 1,
          runtimeHoursAtLastService: 0,
          degradation: 0,
        },
        settings: deepCloneSettings(device.settings),
      } satisfies ZoneState['devices'][number];

      devices.push(cloned);
      const previous = purchaseMap.get(device.blueprintId) ?? 0;
      purchaseMap.set(device.blueprintId, previous + 1);
    }

    const environment = cloneEnvironment(zone.environment);
    const metrics = cloneMetrics(zone.metrics, context.tick);

    return {
      id: newZoneId,
      roomId,
      name: forcedName ?? deriveDuplicateName(zone.name, 'Zone Copy'),
      cultivationMethodId: zone.cultivationMethodId,
      strainId: zone.strainId,
      area: zone.area,
      ceilingHeight: zone.ceilingHeight,
      volume: zone.volume,
      environment,
      resources: createDefaultResources(),
      plants: [],
      devices,
      metrics,
      control: cloneControl(zone.control),
      health: createEmptyHealth(),
      activeTaskIds: [],
      plantingPlan: undefined,
      cultivation: cloneCultivation(zone.cultivation),
    } satisfies ZoneState;
  }

  private recordDevicePurchases(
    purchases: DevicePurchaseMap,
    context: CommandExecutionContext,
    description: string,
  ): void {
    if (purchases.size === 0) {
      return;
    }

    const accumulator = this.costAccounting.createAccumulator();
    const timestamp = new Date().toISOString();
    for (const [blueprintId, quantity] of purchases.entries()) {
      this.costAccounting.recordDevicePurchase(
        this.state,
        blueprintId,
        quantity,
        context.tick,
        timestamp,
        accumulator,
        context.events,
        description,
      );
    }
    this.applyAccumulator(accumulator);
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

  private removeTasksForStructure(structureId: string): void {
    const filterTasks = (collection: typeof this.state.tasks.backlog) =>
      collection.filter((task) => task.location?.structureId !== structureId);

    this.state.tasks.backlog = filterTasks(this.state.tasks.backlog);
    this.state.tasks.active = filterTasks(this.state.tasks.active);
    this.state.tasks.completed = filterTasks(this.state.tasks.completed);
    this.state.tasks.cancelled = filterTasks(this.state.tasks.cancelled);
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
