import type { CostAccountingService, TickAccumulator } from '@/engine/economy/costAccounting.js';
import type {
  CommandExecutionContext,
  CommandResult,
  CreateZoneIntent,
  ErrorCode,
  UpdateZoneIntent,
} from '@/facade/index.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import { findRoom, findZone } from './stateSelectors.js';
import { validateStructureGeometry } from '@/state/geometry.js';
import type { GameState, ZoneState } from '@/state/types.js';
import type { CultivationMethodBlueprint } from '@/data/schemas/index.js';
import {
  cloneControl,
  cloneCultivation,
  cloneEnvironment,
  cloneMetrics,
  createDefaultResources,
  createEmptyHealth,
  deepCloneSettings,
  deriveDuplicateName,
  defaultMaintenanceIntervalTicks,
} from './worldDefaults.js';

export type FailureFactory = <T>(
  code: ErrorCode,
  message: string,
  path: string[],
) => CommandResult<T>;

export type DevicePurchaseMap = Map<string, number>;

const resolveMethodDefaults = (
  method: CultivationMethodBlueprint,
): {
  containerSlug?: string;
  substrateSlug?: string;
} => {
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
};

export interface ZoneServiceDependencies {
  state: GameState;
  repository: BlueprintRepository;
  costAccounting: CostAccountingService;
  createId: (prefix: string) => string;
  applyAccumulator: (accumulator: TickAccumulator) => void;
  failure: FailureFactory;
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

export interface ZoneService {
  createZone(
    intent: CreateZoneIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateZoneResult>;
  updateZone(intent: UpdateZoneIntent, context: CommandExecutionContext): CommandResult;
  duplicateZone(
    zoneId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateZoneResult>;
  cloneZone(
    zone: ZoneState,
    structureId: string,
    roomId: string,
    context: CommandExecutionContext,
    options?: { forcedName?: string; recordPurchases?: boolean },
  ): { zone: ZoneState; purchases: DevicePurchaseMap };
}

export const createZoneService = (deps: ZoneServiceDependencies): ZoneService => {
  const createZone = (
    intent: CreateZoneIntent,
    context: CommandExecutionContext,
  ): CommandResult<CreateZoneResult> => {
    const { roomId, zone } = intent;
    const lookup = findRoom(deps.state, roomId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Room ${roomId} was not found.`, [
        'world.createZone',
        'roomId',
      ]);
    }

    const room = lookup.room;
    const structure = lookup.structure;

    const totalExistingArea = room.zones.reduce((sum, current) => sum + current.area, 0);
    if (totalExistingArea + zone.area > room.area) {
      return deps.failure('ERR_CONFLICT', 'Adding the zone would exceed the room area.', [
        'world.createZone',
        'zone.area',
      ]);
    }

    const method = deps.repository.getCultivationMethod(zone.methodId);
    if (!method) {
      return deps.failure('ERR_NOT_FOUND', `Cultivation method ${zone.methodId} was not found.`, [
        'world.createZone',
        'zone.methodId',
      ]);
    }

    const { container, substrate } = zone;

    const containerBlueprint = deps.repository.getContainer(container.blueprintId);
    if (!containerBlueprint) {
      return deps.failure(
        'ERR_NOT_FOUND',
        `Container blueprint ${container.blueprintId} was not found.`,
        ['world.createZone', 'zone.container.blueprintId'],
      );
    }

    const containerType = containerBlueprint.type;
    if (containerType !== container.type) {
      return deps.failure('ERR_VALIDATION', 'Container type does not match blueprint metadata.', [
        'world.createZone',
        'zone.container.type',
      ]);
    }

    if (
      Array.isArray(method.compatibleContainerTypes) &&
      method.compatibleContainerTypes.length > 0 &&
      !method.compatibleContainerTypes.includes(containerType)
    ) {
      return deps.failure(
        'ERR_INVALID_STATE',
        `Container type '${containerType}' is incompatible with cultivation method '${method.name}'.`,
        ['world.createZone', 'zone.container.type'],
      );
    }

    const footprintArea = containerBlueprint.footprintArea;
    if (!Number.isFinite(footprintArea) || footprintArea === undefined || footprintArea <= 0) {
      return deps.failure(
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
      return deps.failure(
        'ERR_INVALID_STATE',
        `Zone area ${zone.area.toFixed(2)} m² cannot support container footprint ${footprintArea.toFixed(2)} m².`,
        ['world.createZone', 'zone.container.count'],
      );
    }

    if (container.count > maxContainers) {
      return deps.failure(
        'ERR_CONFLICT',
        `Requested ${container.count} containers exceeds maximum supported count of ${maxContainers}.`,
        ['world.createZone', 'zone.container.count'],
      );
    }

    const substrateBlueprint = deps.repository.getSubstrate(substrate.blueprintId);
    if (!substrateBlueprint) {
      return deps.failure(
        'ERR_NOT_FOUND',
        `Substrate blueprint ${substrate.blueprintId} was not found.`,
        ['world.createZone', 'zone.substrate.blueprintId'],
      );
    }

    const substrateType = substrateBlueprint.type;
    if (substrateType !== substrate.type) {
      return deps.failure('ERR_VALIDATION', 'Substrate type does not match blueprint metadata.', [
        'world.createZone',
        'zone.substrate.type',
      ]);
    }

    if (
      Array.isArray(method.compatibleSubstrateTypes) &&
      method.compatibleSubstrateTypes.length > 0 &&
      !method.compatibleSubstrateTypes.includes(substrateType)
    ) {
      return deps.failure(
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
      return deps.failure(
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

    const methodPrice = deps.repository.getCultivationMethodPrice(method.id);
    const containerPrice = deps.repository.getContainerPrice(containerBlueprint.slug);
    const substratePrice = deps.repository.getSubstratePrice(substrateBlueprint.slug);
    const multiplier = deps.state.metadata.economics.itemPriceMultiplier ?? 1;

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
      id: deps.createId('zone'),
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
  };

  const updateZone = (
    intent: UpdateZoneIntent,
    context: CommandExecutionContext,
  ): CommandResult => {
    const { zoneId, patch } = intent;
    const lookup = findZone(deps.state, zoneId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
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
        return deps.failure('ERR_VALIDATION', 'Zone area must be a positive number.', [
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
        return deps.failure('ERR_CONFLICT', 'Updated zone area would exceed the room capacity.', [
          'world.updateZone',
          'patch.area',
        ]);
      }
      zone.area = patch.area;
      zone.volume = patch.area * zone.ceilingHeight;
      geometryChanged = true;
    }

    const targetArea = zone.area;
    const previousContainerSlug = zone.cultivation?.container?.slug;
    const previousSubstrateSlug = zone.cultivation?.substrate?.slug;

    const requestedMethodId =
      typeof patch.methodId === 'string' ? patch.methodId : zone.cultivationMethodId;
    const methodChanged =
      typeof patch.methodId === 'string' && patch.methodId !== zone.cultivationMethodId;

    const method = requestedMethodId
      ? deps.repository.getCultivationMethod(requestedMethodId)
      : undefined;
    if (requestedMethodId && !method) {
      return deps.failure(
        'ERR_NOT_FOUND',
        `Cultivation method ${requestedMethodId} was not found.`,
        typeof patch.methodId === 'string'
          ? ['world.updateZone', 'patch.methodId']
          : ['world.updateZone', 'zone.cultivationMethodId'],
      );
    }

    if (!zone.cultivation) {
      zone.cultivation = {};
    }

    let nextContainer = zone.cultivation.container ? { ...zone.cultivation.container } : undefined;
    let containerBlueprint = nextContainer?.blueprintId
      ? deps.repository.getContainer(nextContainer.blueprintId)
      : undefined;

    if (patch.container) {
      const blueprint = deps.repository.getContainer(patch.container.blueprintId);
      if (!blueprint) {
        return deps.failure(
          'ERR_NOT_FOUND',
          `Container blueprint ${patch.container.blueprintId} was not found.`,
          ['world.updateZone', 'patch.container.blueprintId'],
        );
      }
      if (blueprint.type !== patch.container.type) {
        return deps.failure('ERR_VALIDATION', 'Container type does not match blueprint metadata.', [
          'world.updateZone',
          'patch.container.type',
        ]);
      }
      containerBlueprint = blueprint;
      nextContainer = {
        blueprintId: blueprint.id,
        slug: blueprint.slug,
        type: blueprint.type,
        count: patch.container.count,
        name: blueprint.name,
      };
    } else if (nextContainer && !containerBlueprint) {
      return deps.failure(
        'ERR_INVALID_STATE',
        `Container blueprint ${nextContainer.blueprintId} was not found.`,
        ['world.updateZone', 'zone.cultivation.container.blueprintId'],
      );
    }

    let nextSubstrate = zone.cultivation.substrate ? { ...zone.cultivation.substrate } : undefined;

    if (patch.substrate) {
      if (!nextContainer && !patch.container && !zone.cultivation.container) {
        return deps.failure(
          'ERR_INVALID_STATE',
          'Container configuration must be provided before updating substrate.',
          ['world.updateZone', 'patch.substrate.blueprintId'],
        );
      }
      const blueprint = deps.repository.getSubstrate(patch.substrate.blueprintId);
      if (!blueprint) {
        return deps.failure(
          'ERR_NOT_FOUND',
          `Substrate blueprint ${patch.substrate.blueprintId} was not found.`,
          ['world.updateZone', 'patch.substrate.blueprintId'],
        );
      }
      if (blueprint.type !== patch.substrate.type) {
        return deps.failure('ERR_VALIDATION', 'Substrate type does not match blueprint metadata.', [
          'world.updateZone',
          'patch.substrate.type',
        ]);
      }
      nextSubstrate = {
        blueprintId: blueprint.id,
        slug: blueprint.slug,
        type: blueprint.type,
        totalVolumeLiters: patch.substrate.volumeLiters ?? nextSubstrate?.totalVolumeLiters ?? 0,
        name: blueprint.name,
      };
    }

    if (method && nextContainer?.type) {
      if (
        Array.isArray(method.compatibleContainerTypes) &&
        method.compatibleContainerTypes.length > 0 &&
        !method.compatibleContainerTypes.includes(nextContainer.type)
      ) {
        return deps.failure(
          'ERR_INVALID_STATE',
          `Container type '${nextContainer.type}' is incompatible with cultivation method '${method.name}'.`,
          patch.container
            ? ['world.updateZone', 'patch.container.type']
            : ['world.updateZone', 'patch.methodId'],
        );
      }
    }

    if (method && nextSubstrate?.type) {
      if (
        Array.isArray(method.compatibleSubstrateTypes) &&
        method.compatibleSubstrateTypes.length > 0 &&
        !method.compatibleSubstrateTypes.includes(nextSubstrate.type)
      ) {
        return deps.failure(
          'ERR_INVALID_STATE',
          `Substrate type '${nextSubstrate.type}' is incompatible with cultivation method '${method.name}'.`,
          patch.substrate
            ? ['world.updateZone', 'patch.substrate.type']
            : ['world.updateZone', 'patch.methodId'],
        );
      }
    }

    if (methodChanged && method) {
      const defaults = resolveMethodDefaults(method);

      if (!patch.container && defaults.containerSlug) {
        const containerFromDefaults = deps.repository.getContainerBySlug(defaults.containerSlug);
        if (containerFromDefaults) {
          const count = nextContainer?.count ?? zone.cultivation.container?.count ?? 0;
          nextContainer = {
            blueprintId: containerFromDefaults.id,
            slug: containerFromDefaults.slug,
            type: containerFromDefaults.type,
            count,
            name: containerFromDefaults.name,
          };
          containerBlueprint = containerFromDefaults;
          if (previousContainerSlug && previousContainerSlug !== containerFromDefaults.slug) {
            warnings.push(
              `Existing containers were moved to storage (stub). Install ${containerFromDefaults.name} before planting.`,
            );
          }
        }
      }

      if (!patch.substrate && defaults.substrateSlug) {
        const substrateFromDefaults = deps.repository.getSubstrateBySlug(defaults.substrateSlug);
        if (substrateFromDefaults) {
          nextSubstrate = {
            blueprintId: substrateFromDefaults.id,
            slug: substrateFromDefaults.slug,
            type: substrateFromDefaults.type,
            totalVolumeLiters: nextSubstrate?.totalVolumeLiters ?? 0,
            name: substrateFromDefaults.name,
          };
          if (previousSubstrateSlug && previousSubstrateSlug !== substrateFromDefaults.slug) {
            warnings.push(
              `Existing substrate was routed to storage (stub). Restock with ${substrateFromDefaults.name} before planting.`,
            );
          }
        }
      }
    }

    if (patch.substrate && !nextSubstrate) {
      return deps.failure(
        'ERR_INVALID_STATE',
        'Substrate configuration could not be resolved for the update.',
        ['world.updateZone', 'patch.substrate.blueprintId'],
      );
    }

    if (nextSubstrate) {
      const substrateBlueprint = deps.repository.getSubstrate(nextSubstrate.blueprintId);
      if (!substrateBlueprint) {
        return deps.failure(
          'ERR_INVALID_STATE',
          `Substrate blueprint ${nextSubstrate.blueprintId} was not found.`,
          patch.substrate
            ? ['world.updateZone', 'patch.substrate.blueprintId']
            : ['world.updateZone', 'zone.cultivation.substrate.blueprintId'],
        );
      }
    }

    if (nextContainer && containerBlueprint) {
      const footprintArea = containerBlueprint.footprintArea;
      if (!Number.isFinite(footprintArea) || footprintArea === undefined || footprintArea <= 0) {
        return deps.failure(
          'ERR_INVALID_STATE',
          `Container blueprint '${containerBlueprint.slug}' is missing a valid footprint area.`,
          patch.container
            ? ['world.updateZone', 'patch.container.blueprintId']
            : ['world.updateZone', 'zone.cultivation.container.blueprintId'],
        );
      }

      const packingDensity = Number.isFinite(containerBlueprint.packingDensity)
        ? Math.max(containerBlueprint.packingDensity ?? 0, 0)
        : 1;
      const effectiveDensity = packingDensity > 0 ? packingDensity : 1;
      const theoreticalCapacity = (targetArea / footprintArea) * effectiveDensity;
      const maxContainers = Number.isFinite(theoreticalCapacity)
        ? Math.floor(Math.max(theoreticalCapacity, 0))
        : 0;

      if (maxContainers <= 0) {
        return deps.failure(
          'ERR_INVALID_STATE',
          `Zone area ${targetArea.toFixed(2)} m² cannot support container footprint ${footprintArea.toFixed(2)} m².`,
          patch.container
            ? ['world.updateZone', 'patch.container.count']
            : ['world.updateZone', 'zone.cultivation.container.count'],
        );
      }

      const requestedCount = patch.container ? patch.container.count : nextContainer.count;
      if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
        return deps.failure('ERR_VALIDATION', 'Container count must be a positive integer.', [
          'world.updateZone',
          patch.container ? 'patch.container.count' : 'zone.cultivation.container.count',
        ]);
      }

      const clampedCount = Math.min(requestedCount, maxContainers);
      if (clampedCount !== requestedCount) {
        warnings.push(
          `Container count has been clamped to ${clampedCount} to fit the zone capacity (${maxContainers}).`,
        );
      }
      nextContainer.count = clampedCount;
    }

    let requiredSubstrateVolume: number | null = null;
    if (nextContainer && containerBlueprint) {
      const containerVolume = containerBlueprint.volumeInLiters;
      if (
        !Number.isFinite(containerVolume) ||
        containerVolume === undefined ||
        containerVolume <= 0
      ) {
        return deps.failure(
          'ERR_INVALID_STATE',
          `Container blueprint '${containerBlueprint.slug}' is missing a valid volumeInLiters value.`,
          patch.container
            ? ['world.updateZone', 'patch.container.blueprintId']
            : ['world.updateZone', 'zone.cultivation.container.blueprintId'],
        );
      }
      requiredSubstrateVolume = containerVolume * nextContainer.count;
    }

    if (nextSubstrate && requiredSubstrateVolume !== null) {
      if (patch.substrate?.volumeLiters !== undefined) {
        const providedVolume = patch.substrate.volumeLiters;
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
      nextSubstrate.totalVolumeLiters = requiredSubstrateVolume;
    }

    const originalContainer = zone.cultivation.container;
    const originalSubstrate = zone.cultivation.substrate;

    if (methodChanged && typeof patch.methodId === 'string') {
      zone.cultivationMethodId = patch.methodId;
    }

    if (nextContainer) {
      zone.cultivation.container = nextContainer;
    }
    if (nextSubstrate) {
      zone.cultivation.substrate = nextSubstrate;
    }

    const containerChanged = (() => {
      if (!originalContainer && !nextContainer) {
        return false;
      }
      if (!originalContainer || !nextContainer) {
        return true;
      }
      return (
        originalContainer.blueprintId !== nextContainer.blueprintId ||
        originalContainer.count !== nextContainer.count
      );
    })();

    const substrateChanged = (() => {
      if (!originalSubstrate && !nextSubstrate) {
        return false;
      }
      if (!originalSubstrate || !nextSubstrate) {
        return true;
      }
      return (
        originalSubstrate.blueprintId !== nextSubstrate.blueprintId ||
        originalSubstrate.totalVolumeLiters !== nextSubstrate.totalVolumeLiters
      );
    })();

    if (methodChanged || containerChanged || substrateChanged) {
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
  };

  const recordDevicePurchases = (
    purchases: DevicePurchaseMap,
    context: CommandExecutionContext,
    description: string,
  ): void => {
    if (purchases.size === 0) {
      return;
    }

    const accumulator = deps.costAccounting.createAccumulator();
    const timestamp = new Date().toISOString();
    for (const [blueprintId, quantity] of purchases.entries()) {
      deps.costAccounting.recordDevicePurchase(
        deps.state,
        blueprintId,
        quantity,
        context.tick,
        timestamp,
        accumulator,
        context.events,
        description,
      );
    }
    deps.applyAccumulator(accumulator);
  };

  const cloneZone = (
    zone: ZoneState,
    _structureId: string,
    roomId: string,
    context: CommandExecutionContext,
    options?: { forcedName?: string; recordPurchases?: boolean },
  ): { zone: ZoneState; purchases: DevicePurchaseMap } => {
    const forcedName = options?.forcedName;
    const shouldRecord = options?.recordPurchases ?? false;
    const newZoneId = deps.createId('zone');
    const devices: ZoneState['devices'] = [];
    const purchases: DevicePurchaseMap = new Map();

    for (const device of zone.devices) {
      const cloned = {
        id: deps.createId('device'),
        blueprintId: device.blueprintId,
        kind: device.kind,
        name: device.name,
        zoneId: newZoneId,
        status: 'operational' as const,
        efficiency: device.efficiency,
        runtimeHours: 0,
        maintenance: {
          lastServiceTick: context.tick,
          nextDueTick: context.tick + defaultMaintenanceIntervalTicks,
          condition: 1,
          runtimeHoursAtLastService: 0,
          degradation: 0,
        },
        settings: deepCloneSettings(device.settings),
      } satisfies ZoneState['devices'][number];

      devices.push(cloned);
      const previous = purchases.get(device.blueprintId) ?? 0;
      purchases.set(device.blueprintId, previous + 1);
    }

    const environment = cloneEnvironment(zone.environment);
    const metrics = cloneMetrics(zone.metrics, context.tick);

    const clonedZone: ZoneState = {
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

    if (shouldRecord) {
      recordDevicePurchases(purchases, context, `Zone duplication from ${zone.id}`);
    }

    return { zone: clonedZone, purchases };
  };

  const duplicateZone = (
    zoneId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateZoneResult> => {
    const lookup = findZone(deps.state, zoneId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Zone ${zoneId} was not found.`, [
        'world.duplicateZone',
        'zoneId',
      ]);
    }

    const { structure, room, zone } = lookup;
    const totalZoneArea = room.zones.reduce((sum, current) => sum + current.area, 0);
    if (totalZoneArea + zone.area - room.area > 1e-6) {
      return deps.failure('ERR_CONFLICT', 'Duplicating the zone would exceed the room area.', [
        'world.duplicateZone',
        'zoneId',
      ]);
    }

    const forcedName = desiredName?.trim().length ? desiredName.trim() : undefined;
    const { zone: newZone } = cloneZone(zone, structure.id, room.id, context, {
      forcedName,
      recordPurchases: true,
    });

    room.zones.push(newZone);
    validateStructureGeometry(structure);

    context.events.queue(
      'world.zoneDuplicated',
      { zoneId: newZone.id, sourceZoneId: zoneId, roomId: room.id, structureId: structure.id },
      context.tick,
      'info',
    );

    return { ok: true, data: { zoneId: newZone.id } } satisfies CommandResult<DuplicateZoneResult>;
  };

  return {
    createZone,
    updateZone,
    duplicateZone,
    cloneZone,
  };
};
