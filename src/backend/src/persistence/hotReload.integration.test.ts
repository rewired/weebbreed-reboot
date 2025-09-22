import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BlueprintRepository } from '@/data/blueprintRepository.js';
import { BlueprintHotReloadManager } from '@/persistence/hotReload.js';
import { EventBus, createEventCollector, type SimulationEvent } from '@/lib/eventBus.js';
import type { DataLoadResult } from '@/data/dataLoader.js';
import type { SimulationPhaseContext } from '@/sim/loop.js';
import { RngService } from '@/lib/rng.js';
import { createInitialState } from '@/stateFactory.js';
import { buildSimulationSnapshot } from '@/lib/uiSnapshot.js';

const sourceDataDirectory = fileURLToPath(new URL('../../../../data', import.meta.url));
const GROW_ROOM_ID = '2630459c-fc40-4e91-a69f-b47665b5a917';

describe('Blueprint hot reload integration', () => {
  let tempDataDirectory: string;

  beforeEach(async () => {
    tempDataDirectory = await mkdtemp(path.join(os.tmpdir(), 'weebbreed-data-'));
    await cp(sourceDataDirectory, tempDataDirectory, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDataDirectory, { recursive: true, force: true });
  });

  it('applies room purpose changes on the next committed tick', async () => {
    const repository = await BlueprintRepository.loadFrom(tempDataDirectory);
    const rng = new RngService('hot-reload-integration');
    const state = await createInitialState({ repository, rng, dataDirectory: tempDataDirectory });
    const bus = new EventBus();
    const manager = new BlueprintHotReloadManager(repository, bus, () => state.clock.tick);
    await manager.start();
    const committed: DataLoadResult[] = [];
    const removeListener = manager.onReloadCommitted((result) => {
      committed.push(result);
    });

    const initialPurpose = repository.getRoomPurpose(GROW_ROOM_ID);
    expect(initialPurpose).toBeDefined();
    const initialName = initialPurpose?.name ?? '';

    const buffered: SimulationEvent[] = [];
    const collector = createEventCollector(buffered, state.clock.tick + 1);
    const accountingStub: SimulationPhaseContext['accounting'] = {
      recordUtility: () => {},
      recordDevicePurchase: () => {},
    };
    const context: SimulationPhaseContext = {
      state,
      tick: state.clock.tick + 1,
      tickLengthMinutes: state.metadata.tickLengthMinutes,
      phase: 'commit',
      events: collector,
      accounting: accountingStub,
    };

    const growRoomPath = path.join(
      tempDataDirectory,
      'blueprints',
      'roomPurposes',
      'growroom.json',
    );
    const raw = await readFile(growRoomPath, 'utf-8');
    const payload = JSON.parse(raw) as { name: string; [key: string]: unknown };
    const updatedName = `${initialName} v2`;
    payload.name = updatedName;
    await writeFile(growRoomPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(repository.getRoomPurpose(GROW_ROOM_ID)?.name).toBe(initialName);

    const reloadEvents: SimulationEvent[] = [];
    const subscription = bus.events('reload:data').subscribe((event) => reloadEvents.push(event));

    try {
      const commitHook = manager.createCommitHook();
      await commitHook(context);
      bus.emitMany(buffered);
    } finally {
      subscription.unsubscribe();
      removeListener();
      await manager.stop();
    }

    expect(committed).toHaveLength(1);
    expect(repository.getRoomPurpose(GROW_ROOM_ID)?.name).toBe(updatedName);

    state.clock.tick = context.tick;
    state.clock.lastUpdatedAt = new Date().toISOString();

    const snapshot = buildSimulationSnapshot(state, repository);
    const growRoom = snapshot.rooms.find((room) => room.purposeId === GROW_ROOM_ID);
    expect(growRoom?.purposeName).toBe(updatedName);

    expect(
      reloadEvents.some(
        (event) =>
          event.type === 'reload:data' &&
          (event.payload as { status?: string })?.status === 'success',
      ),
    ).toBe(true);
  });
});
