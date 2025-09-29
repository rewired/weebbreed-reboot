import type { CostAccountingService, TickAccumulator } from '@/engine/economy/costAccounting.js';
import type { CommandExecutionContext, CommandResult, ErrorCode } from '@/facade/index.js';
import type { BlueprintRepository } from '@/data/blueprintRepository.js';
import { findStructure } from './stateSelectors.js';
import { validateStructureGeometry } from '@/state/geometry.js';
import type { GameState, StructureBlueprint, StructureState } from '@/state/types.js';
import { deriveDuplicateName } from './worldDefaults.js';
import type { RoomService } from './roomService.js';
import type { DevicePurchaseMap } from './zoneService.js';

export interface DuplicateStructureResult {
  structureId: string;
}

export type FailureFactory = <T>(
  code: ErrorCode,
  message: string,
  path: string[],
) => CommandResult<T>;

export interface StructureServiceDependencies {
  state: GameState;
  costAccounting: CostAccountingService;
  repository: BlueprintRepository;
  createId: (prefix: string) => string;
  structureBlueprints?: StructureBlueprint[];
  roomService: Pick<RoomService, 'cloneRoom'>;
  failure: FailureFactory;
}

export interface StructureService {
  renameStructure(
    structureId: string,
    name: string,
    context: CommandExecutionContext,
  ): CommandResult;
  rentStructure(
    structureId: string,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult>;
  deleteStructure(structureId: string, context: CommandExecutionContext): CommandResult;
  duplicateStructure(
    structureId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult>;
  recordDevicePurchases(
    purchases: DevicePurchaseMap,
    context: CommandExecutionContext,
    description: string,
  ): void;
}

const mergePurchaseMaps = (target: DevicePurchaseMap, source: DevicePurchaseMap): void => {
  for (const [blueprintId, quantity] of source.entries()) {
    const previous = target.get(blueprintId) ?? 0;
    target.set(blueprintId, previous + quantity);
  }
};

export const createStructureService = (deps: StructureServiceDependencies): StructureService => {
  const applyAccumulator = (accumulator: TickAccumulator): void => {
    const summary = deps.state.finances.summary;
    summary.totalRevenue += accumulator.revenue;
    summary.totalExpenses += accumulator.expenses;
    summary.totalMaintenance += accumulator.maintenance;
    summary.totalPayroll += accumulator.payroll;
    summary.lastTickRevenue = accumulator.revenue;
    summary.lastTickExpenses = accumulator.expenses;
    summary.netIncome = summary.totalRevenue - summary.totalExpenses;
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
    applyAccumulator(accumulator);
  };

  const renameStructure = (
    structureId: string,
    name: string,
    context: CommandExecutionContext,
  ): CommandResult => {
    const lookup = findStructure(deps.state, structureId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
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
  };

  const rentStructure = (
    structureId: string,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> => {
    if (!deps.structureBlueprints) {
      return deps.failure('ERR_INVALID_STATE', 'Structure blueprints are not available.', [
        'world.rentStructure',
      ]);
    }
    const blueprint = deps.structureBlueprints.find((s) => s.id === structureId);
    if (!blueprint) {
      return deps.failure('ERR_NOT_FOUND', `Structure blueprint ${structureId} not found.`, [
        'world.rentStructure',
        'structureId',
      ]);
    }

    if (deps.state.finances.cashOnHand < blueprint.upfrontFee) {
      return deps.failure(
        'ERR_INSUFFICIENT_FUNDS',
        `Insufficient funds for upfront fee. Required: ${blueprint.upfrontFee}, Available: ${deps.state.finances.cashOnHand}`,
        ['world.rentStructure', 'upfrontFee'],
      );
    }

    const tickLengthHours = deps.state.metadata.tickLengthMinutes / 60;
    const hoursPerMonth = 30 * 24;
    const area = blueprint.footprint.length * blueprint.footprint.width;
    const monthlyRentTotal = blueprint.rentalCostPerSqmPerMonth * area;
    const hourlyRent = monthlyRentTotal / hoursPerMonth;
    const rentPerTick = hourlyRent * tickLengthHours;

    const newStructure: StructureState = {
      id: deps.createId('structure'),
      blueprintId: blueprint.id,
      name: blueprint.name,
      status: 'active',
      footprint: {
        ...blueprint.footprint,
        area,
        volume: area * (blueprint.footprint.height || 2.5),
        height: blueprint.footprint.height || 2.5,
      },
      rooms: [],
      rentPerTick,
      upfrontCostPaid: blueprint.upfrontFee,
      notes: undefined,
    } satisfies StructureState;

    deps.state.structures.push(newStructure);
    deps.state.finances.cashOnHand -= blueprint.upfrontFee;

    if (blueprint.upfrontFee > 0) {
      const timestamp = new Date().toISOString();
      const ledgerEntry = {
        id: `ledger_${deps.state.finances.ledger.length + 1}`,
        tick: context.tick,
        timestamp,
        amount: -blueprint.upfrontFee,
        type: 'expense' as const,
        category: 'rent' as const,
        description: `Structure rental upfront fee: ${newStructure.name}`,
      };

      deps.state.finances.ledger.push(ledgerEntry);
      const summary = deps.state.finances.summary;
      summary.totalExpenses += blueprint.upfrontFee;
      summary.lastTickExpenses = blueprint.upfrontFee;
      summary.netIncome = summary.totalRevenue - summary.totalExpenses;

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
  };

  const removeTasksForStructure = (structureId: string): void => {
    const filterTasks = (collection: typeof deps.state.tasks.backlog) =>
      collection.filter((task) => task.location?.structureId !== structureId);

    deps.state.tasks.backlog = filterTasks(deps.state.tasks.backlog);
    deps.state.tasks.active = filterTasks(deps.state.tasks.active);
    deps.state.tasks.completed = filterTasks(deps.state.tasks.completed);
    deps.state.tasks.cancelled = filterTasks(deps.state.tasks.cancelled);
  };

  const deleteStructure = (
    structureId: string,
    context: CommandExecutionContext,
  ): CommandResult => {
    const lookup = findStructure(deps.state, structureId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.deleteStructure',
        'structureId',
      ]);
    }

    const [removed] = deps.state.structures.splice(lookup.index, 1);
    if (removed) {
      for (const room of removed.rooms) {
        for (const zone of room.zones) {
          zone.activeTaskIds = [];
        }
      }
      removeTasksForStructure(structureId);
    }

    context.events.queue('world.structureDeleted', { structureId }, context.tick, 'info');
    return { ok: true } satisfies CommandResult;
  };

  const duplicateStructure = (
    structureId: string,
    desiredName: string | undefined,
    context: CommandExecutionContext,
  ): CommandResult<DuplicateStructureResult> => {
    const lookup = findStructure(deps.state, structureId);
    if (!lookup) {
      return deps.failure('ERR_NOT_FOUND', `Structure ${structureId} was not found.`, [
        'world.duplicateStructure',
        'structureId',
      ]);
    }

    const source = lookup.structure;
    const newStructureId = deps.createId('structure');
    const duplicateName = desiredName?.trim().length
      ? desiredName.trim()
      : deriveDuplicateName(source.name, 'Structure Copy');
    const rooms: StructureState['rooms'] = [];
    const purchaseMap: DevicePurchaseMap = new Map();

    for (const room of source.rooms) {
      const { room: clonedRoom, purchases } = deps.roomService.cloneRoom(
        room,
        newStructureId,
        context,
        {
          recordPurchases: false,
        },
      );
      rooms.push(clonedRoom);
      mergePurchaseMaps(purchaseMap, purchases);
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
    deps.state.structures.push(duplicated);

    recordDevicePurchases(purchaseMap, context, `Structure duplication from ${structureId}`);

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
  };

  return {
    renameStructure,
    rentStructure,
    deleteStructure,
    duplicateStructure,
    recordDevicePurchases,
  };
};
