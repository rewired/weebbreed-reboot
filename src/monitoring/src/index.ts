import contrib from 'blessed-contrib';
import { Command } from 'commander';
// eslint-disable-next-line import/default
import EventSource from 'eventsource';
import type { MessageEvent } from 'eventsource';
import blessed from 'neo-blessed';

type FocusTarget = 'structures' | 'rooms' | 'zones';

type NullableNumber = number | null | undefined;

type NullableString = string | null | undefined;

interface StructureRow {
  id: string;
  name: string;
  status?: string;
  roomCount?: number;
  area?: number;
}

interface RoomRow {
  id: string;
  structureId: string;
  name: string;
  zoneCount?: number;
  area?: number;
}

interface ZoneRow {
  id: string;
  structureId: string;
  roomId: string;
  name: string;
  environment?: {
    temperature?: NullableNumber;
    relativeHumidity?: NullableNumber;
    co2?: NullableNumber;
    ppfd?: NullableNumber;
    vpd?: NullableNumber;
  };
  resources?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  control?: Record<string, unknown>;
  plants?: unknown[];
  devices?: unknown[];
}

interface TimeStatusPayload {
  paused?: boolean;
  running?: boolean;
  speed?: number;
  tick?: number;
}

interface FinanceSnapshot {
  cashOnHand?: number;
}

interface SimulationSnapshot {
  tick?: number;
  structures?: StructureSnapshot[];
  rooms?: RoomSnapshot[];
  zones?: ZoneSnapshot[];
  finance?: FinanceSnapshot;
}

interface StructureSnapshot {
  id?: string;
  name?: string;
  status?: string;
  roomIds?: string[];
  footprint?: {
    area?: number;
  };
}

interface RoomSnapshot {
  id?: string;
  name?: string;
  structureId?: string;
  zoneIds?: string[];
  area?: number;
}

interface ZoneSnapshot {
  id?: string;
  name?: string;
  structureId?: string;
  roomId?: string;
  environment?: ZoneRow['environment'];
  resources?: ZoneRow['resources'];
  metrics?: ZoneRow['metrics'];
  control?: ZoneRow['control'];
  plants?: ZoneRow['plants'];
  devices?: ZoneRow['devices'];
}

interface SimulationUpdateEntry {
  tick?: number;
  time?: TimeStatusPayload;
  snapshot?: SimulationSnapshot | null;
}

interface SimulationUpdateMessage {
  updates?: SimulationUpdateEntry[];
}

interface MonitorState {
  focus: FocusTarget;
  structures: StructureRow[];
  roomsByStructure: Map<string, RoomRow[]>;
  zonesByRoom: Map<string, ZoneRow[]>;
  zoneById: Map<string, ZoneRow>;
  structureIndex: number;
  roomIndex: number;
  zoneIndex: number;
  selectedStructureId?: string;
  selectedRoomId?: string;
  selectedZoneId?: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  backoffMs: number;
  tick?: number;
  speed?: number;
  paused?: boolean;
  running?: boolean;
  cashOnHand?: number;
  lastMessage?: string;
  latestSnapshot?: SimulationSnapshot;
  latestTimeStatus?: TimeStatusPayload;
}

const DEFAULT_URL = 'http://localhost:7331/events';

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1;
  }
  const mod = ((index % length) + length) % length;
  return mod;
}

function formatNumber(value: NullableNumber, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '–';
  }
  return value.toFixed(digits);
}

function formatPercent(value: NullableNumber): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '–';
  }
  return percentFormatter.format(value);
}

function formatNullableString(value: NullableString): string {
  if (!value) {
    return '–';
  }
  return value;
}

class MonitorCli {
  private readonly screen = blessed.screen({
    smartCSR: true,
    title: 'WeebBreed Monitoring',
    dockBorders: true,
  });

  private readonly grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

  private readonly statusBox = this.grid.set(0, 0, 2, 12, blessed.box, {
    label: 'Status',
    border: { type: 'line' },
    style: { label: { bold: true } },
  });

  private readonly structuresList = this.grid.set(2, 0, 4, 4, blessed.list, {
    label: 'Structures',
    border: { type: 'line' },
    style: {
      selected: { bg: 'blue' },
      label: { bold: true },
    },
    tags: true,
  }) as blessed.Widgets.ListElement;

  private readonly roomsList = this.grid.set(2, 4, 4, 4, blessed.list, {
    label: 'Rooms',
    border: { type: 'line' },
    style: {
      selected: { bg: 'blue' },
      label: { bold: true },
    },
    tags: true,
  }) as blessed.Widgets.ListElement;

  private readonly zonesList = this.grid.set(2, 8, 4, 4, blessed.list, {
    label: 'Zones',
    border: { type: 'line' },
    style: {
      selected: { bg: 'blue' },
      label: { bold: true },
    },
    tags: true,
  }) as blessed.Widgets.ListElement;

  private readonly detailBox = this.grid.set(6, 0, 6, 12, blessed.box, {
    label: 'Zone Details',
    border: { type: 'line' },
    style: { label: { bold: true } },
    tags: true,
    scrollable: true,
    keys: false,
    alwaysScroll: true,
  });

  private eventSource?: EventSource;
  private reconnectTimer?: NodeJS.Timeout;

  private state: MonitorState = {
    focus: 'structures',
    structures: [],
    roomsByStructure: new Map(),
    zonesByRoom: new Map(),
    zoneById: new Map(),
    structureIndex: -1,
    roomIndex: -1,
    zoneIndex: -1,
    connectionStatus: 'connecting',
    backoffMs: 1000,
  };

  constructor(private readonly url: string) {
    this.applyFocusHighlight();
    this.registerKeybindings();
    this.updateStatusBox();
    this.updateLists();
    this.screen.render();
    this.connect();
  }

  private registerKeybindings(): void {
    this.screen.key(['q', 'C-c'], () => {
      this.shutdown();
    });

    this.screen.key(['tab'], () => {
      this.cycleFocus(1);
    });

    this.screen.key(['S-tab'], () => {
      this.cycleFocus(-1);
    });

    this.screen.key(['left'], () => {
      this.cycleFocus(-1);
    });

    this.screen.key(['right'], () => {
      this.cycleFocus(1);
    });

    this.screen.key(['up'], () => {
      this.moveSelection(-1);
    });

    this.screen.key(['down'], () => {
      this.moveSelection(1);
    });

    this.screen.key(['r'], () => {
      this.restartConnection('manual reconnect requested');
    });

    process.on('SIGINT', () => {
      this.shutdown();
    });
  }

  private shutdown(): void {
    this.screen.destroy();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    process.exit(0);
  }

  private cycleFocus(direction: 1 | -1): void {
    const order: FocusTarget[] = ['structures', 'rooms', 'zones'];
    const currentIndex = order.indexOf(this.state.focus);
    const nextIndex = clampIndex(currentIndex + direction, order.length);
    this.state.focus = order[nextIndex] ?? 'structures';
    this.applyFocusHighlight();
    this.screen.render();
  }

  private applyFocusHighlight(): void {
    const activeColor = 'cyan';
    const inactiveColor = 'gray';

    const setBorder = (element: blessed.Widgets.BlessedElement, active: boolean) => {
      const style = element.style ?? {};
      if (!style.border) {
        style.border = {};
      }
      style.border.fg = active ? activeColor : inactiveColor;
      element.style = style;
    };

    setBorder(this.structuresList, this.state.focus === 'structures');
    setBorder(this.roomsList, this.state.focus === 'rooms');
    setBorder(this.zonesList, this.state.focus === 'zones');
  }

  private moveSelection(delta: 1 | -1): void {
    switch (this.state.focus) {
      case 'structures':
        this.shiftStructure(delta);
        break;
      case 'rooms':
        this.shiftRoom(delta);
        break;
      case 'zones':
        this.shiftZone(delta);
        break;
    }
  }

  private shiftStructure(delta: 1 | -1): void {
    const { structures } = this.state;
    if (!structures.length) {
      return;
    }
    const nextIndex = clampIndex((this.state.structureIndex ?? 0) + delta, structures.length);
    this.state.structureIndex = nextIndex;
    const structure = structures[nextIndex];
    this.state.selectedStructureId = structure?.id;
    this.updateRooms();
    this.screen.render();
  }

  private shiftRoom(delta: 1 | -1): void {
    const rooms = this.getRoomsForSelectedStructure();
    if (!rooms.length) {
      return;
    }
    const nextIndex = clampIndex((this.state.roomIndex ?? 0) + delta, rooms.length);
    this.state.roomIndex = nextIndex;
    const room = rooms[nextIndex];
    this.state.selectedRoomId = room?.id;
    this.updateZones();
    this.screen.render();
  }

  private shiftZone(delta: 1 | -1): void {
    const zones = this.getZonesForSelectedRoom();
    if (!zones.length) {
      return;
    }
    const nextIndex = clampIndex((this.state.zoneIndex ?? 0) + delta, zones.length);
    this.state.zoneIndex = nextIndex;
    const zone = zones[nextIndex];
    this.state.selectedZoneId = zone?.id;
    this.updateZoneDetail();
    this.screen.render();
  }

  private getRoomsForSelectedStructure(): RoomRow[] {
    const structureId = this.state.selectedStructureId;
    if (!structureId) {
      return [];
    }
    return this.state.roomsByStructure.get(structureId) ?? [];
  }

  private getZonesForSelectedRoom(): ZoneRow[] {
    const roomId = this.state.selectedRoomId;
    if (!roomId) {
      return [];
    }
    return this.state.zonesByRoom.get(roomId) ?? [];
  }

  private connect(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.state.connectionStatus = 'connecting';
    this.state.lastMessage = `connecting to ${this.url}`;
    this.updateStatusBox();
    this.screen.render();

    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      this.state.connectionStatus = 'connected';
      this.state.lastMessage = 'connected';
      this.state.backoffMs = 1000;
      this.updateStatusBox();
      this.screen.render();
    };

    this.eventSource.onerror = () => {
      this.state.connectionStatus = 'disconnected';
      this.state.lastMessage = 'connection lost';
      this.updateStatusBox();
      this.scheduleReconnect();
      this.screen.render();
    };

    this.eventSource.addEventListener('time.status', (event: MessageEvent) => {
      this.handleTimeStatus(event);
    });

    this.eventSource.addEventListener('simulationUpdate', (event: MessageEvent) => {
      this.handleSimulationUpdate(event);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.state.connectionStatus = 'reconnecting';
    const wait = this.state.backoffMs;
    this.state.backoffMs = Math.min(this.state.backoffMs * 2, 30000);
    this.state.lastMessage = `reconnecting in ${(wait / 1000).toFixed(1)}s`;
    this.updateStatusBox();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, wait);
  }

  private restartConnection(message: string): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.state.backoffMs = 1000;
    this.state.lastMessage = message;
    this.state.connectionStatus = 'reconnecting';
    this.updateStatusBox();
    setTimeout(() => this.connect(), 50);
  }

  private handleTimeStatus(event: MessageEvent): void {
    try {
      const payload = JSON.parse(event.data ?? '{}') as { status?: TimeStatusPayload };
      if (payload && typeof payload === 'object') {
        const status = payload.status ?? (payload as unknown as TimeStatusPayload);
        if (status) {
          this.state.latestTimeStatus = status;
          this.updateTimeStatus(status);
        }
      }
    } catch (error) {
      this.state.lastMessage = `failed to parse time.status: ${(error as Error).message}`;
      this.updateStatusBox();
    }
    this.screen.render();
  }

  private handleSimulationUpdate(event: MessageEvent): void {
    try {
      const payload = JSON.parse(event.data ?? '{}') as SimulationUpdateMessage;
      if (!payload || typeof payload !== 'object') {
        return;
      }
      const entries = payload.updates ?? [];
      for (const entry of entries) {
        if (entry.time) {
          this.state.latestTimeStatus = entry.time;
          this.updateTimeStatus(entry.time);
        }
        if (entry.snapshot) {
          this.state.latestSnapshot = entry.snapshot ?? undefined;
          this.updateSnapshot(entry.snapshot ?? undefined);
        }
        if (typeof entry.tick === 'number') {
          this.state.tick = entry.tick;
        }
      }
      this.updateStatusBox();
      this.screen.render();
    } catch (error) {
      this.state.lastMessage = `failed to parse simulationUpdate: ${(error as Error).message}`;
      this.updateStatusBox();
      this.screen.render();
    }
  }

  private updateTimeStatus(status: TimeStatusPayload): void {
    if (typeof status.tick === 'number') {
      this.state.tick = status.tick;
    }
    if (typeof status.speed === 'number') {
      this.state.speed = status.speed;
    }
    if (typeof status.paused === 'boolean') {
      this.state.paused = status.paused;
    }
    if (typeof status.running === 'boolean') {
      this.state.running = status.running;
    }
  }

  private updateSnapshot(snapshot?: SimulationSnapshot): void {
    if (!snapshot) {
      return;
    }

    if (snapshot.finance && typeof snapshot.finance.cashOnHand === 'number') {
      this.state.cashOnHand = snapshot.finance.cashOnHand;
    }

    const structures: StructureRow[] = [];
    if (Array.isArray(snapshot.structures)) {
      for (const entry of snapshot.structures) {
        if (
          !entry ||
          typeof entry !== 'object' ||
          typeof entry.id !== 'string' ||
          typeof entry.name !== 'string'
        ) {
          continue;
        }
        structures.push({
          id: entry.id,
          name: entry.name,
          status: entry.status ?? undefined,
          roomCount: Array.isArray(entry.roomIds) ? entry.roomIds.length : undefined,
          area: typeof entry.footprint?.area === 'number' ? entry.footprint.area : undefined,
        });
      }
    }
    structures.sort((a, b) => a.name.localeCompare(b.name));
    this.state.structures = structures;

    const roomsByStructure = new Map<string, RoomRow[]>();
    if (Array.isArray(snapshot.rooms)) {
      for (const room of snapshot.rooms) {
        if (
          !room ||
          typeof room !== 'object' ||
          typeof room.id !== 'string' ||
          typeof room.name !== 'string'
        ) {
          continue;
        }
        const structureId = room.structureId ?? '';
        if (!structureId) {
          continue;
        }
        const row: RoomRow = {
          id: room.id,
          name: room.name,
          structureId,
          zoneCount: Array.isArray(room.zoneIds) ? room.zoneIds.length : undefined,
          area: typeof room.area === 'number' ? room.area : undefined,
        };
        if (!roomsByStructure.has(structureId)) {
          roomsByStructure.set(structureId, []);
        }
        roomsByStructure.get(structureId)!.push(row);
      }
    }

    for (const list of roomsByStructure.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    this.state.roomsByStructure = roomsByStructure;

    const zonesByRoom = new Map<string, ZoneRow[]>();
    const zoneById = new Map<string, ZoneRow>();
    if (Array.isArray(snapshot.zones)) {
      for (const zone of snapshot.zones) {
        if (
          !zone ||
          typeof zone !== 'object' ||
          typeof zone.id !== 'string' ||
          typeof zone.name !== 'string'
        ) {
          continue;
        }
        const roomId = zone.roomId ?? '';
        const structureId = zone.structureId ?? '';
        if (!roomId || !structureId) {
          continue;
        }
        const row: ZoneRow = {
          id: zone.id,
          name: zone.name,
          roomId,
          structureId,
          environment: zone.environment,
          resources: zone.resources,
          metrics: zone.metrics,
          control: zone.control,
          plants: zone.plants,
          devices: zone.devices,
        };
        if (!zonesByRoom.has(roomId)) {
          zonesByRoom.set(roomId, []);
        }
        zonesByRoom.get(roomId)!.push(row);
        zoneById.set(zone.id, row);
      }
    }

    for (const list of zonesByRoom.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    this.state.zonesByRoom = zonesByRoom;
    this.state.zoneById = zoneById;

    this.reconcileSelections();
    this.updateLists();
    this.updateZoneDetail();
  }

  private reconcileSelections(): void {
    if (this.state.structures.length === 0) {
      this.state.structureIndex = -1;
      this.state.selectedStructureId = undefined;
    } else {
      let index = this.state.structureIndex;
      if (index < 0) {
        index = 0;
      }
      const id = this.state.selectedStructureId;
      if (id) {
        const idx = this.state.structures.findIndex((entry) => entry.id === id);
        index = idx >= 0 ? idx : clampIndex(index, this.state.structures.length);
      } else {
        index = clampIndex(index, this.state.structures.length);
      }
      this.state.structureIndex = index;
      this.state.selectedStructureId = this.state.structures[index]?.id;
    }

    const rooms = this.getRoomsForSelectedStructure();
    if (!rooms.length) {
      this.state.roomIndex = -1;
      this.state.selectedRoomId = undefined;
    } else {
      let index = this.state.roomIndex;
      if (index < 0) {
        index = 0;
      }
      const id = this.state.selectedRoomId;
      if (id) {
        const idx = rooms.findIndex((entry) => entry.id === id);
        index = idx >= 0 ? idx : clampIndex(index, rooms.length);
      } else {
        index = clampIndex(index, rooms.length);
      }
      this.state.roomIndex = index;
      this.state.selectedRoomId = rooms[index]?.id;
    }

    const zones = this.getZonesForSelectedRoom();
    if (!zones.length) {
      this.state.zoneIndex = -1;
      this.state.selectedZoneId = undefined;
    } else {
      let index = this.state.zoneIndex;
      if (index < 0) {
        index = 0;
      }
      const id = this.state.selectedZoneId;
      if (id) {
        const idx = zones.findIndex((entry) => entry.id === id);
        index = idx >= 0 ? idx : clampIndex(index, zones.length);
      } else {
        index = clampIndex(index, zones.length);
      }
      this.state.zoneIndex = index;
      this.state.selectedZoneId = zones[index]?.id;
    }
  }

  private updateLists(): void {
    const structureItems = this.state.structures.map((structure) => {
      const parts: string[] = [structure.name];
      if (structure.status) {
        parts.push(`{gray-fg}${structure.status}{/}`);
      }
      if (typeof structure.roomCount === 'number') {
        parts.push(`rooms: ${structure.roomCount}`);
      }
      if (typeof structure.area === 'number') {
        parts.push(`${numberFormatter.format(structure.area)} m²`);
      }
      return parts.join('  ');
    });
    this.structuresList.setItems(structureItems.length ? structureItems : ['(no structures)']);
    const structureIndex = this.state.structureIndex >= 0 ? this.state.structureIndex : 0;
    this.structuresList.select(structureItems.length ? structureIndex : 0);

    const rooms = this.getRoomsForSelectedStructure();
    const roomItems = rooms.map((room) => {
      const parts: string[] = [room.name];
      if (typeof room.zoneCount === 'number') {
        parts.push(`zones: ${room.zoneCount}`);
      }
      if (typeof room.area === 'number') {
        parts.push(`${numberFormatter.format(room.area)} m²`);
      }
      return parts.join('  ');
    });
    this.roomsList.setItems(roomItems.length ? roomItems : ['(no rooms)']);
    const roomIndex = this.state.roomIndex >= 0 ? this.state.roomIndex : 0;
    this.roomsList.select(roomItems.length ? roomIndex : 0);

    const zones = this.getZonesForSelectedRoom();
    const zoneItems = zones.map((zone) => {
      const env = zone.environment ?? {};
      const temperature =
        typeof env.temperature === 'number' ? `${formatNumber(env.temperature, 1)}°C` : '–';
      const humidity =
        typeof env.relativeHumidity === 'number' ? formatPercent(env.relativeHumidity) : '–';
      const vpd = typeof env.vpd === 'number' ? `${formatNumber(env.vpd, 2)} kPa` : '–';
      return `${zone.name}  T: ${temperature}  RH: ${humidity}  VPD: ${vpd}`;
    });
    this.zonesList.setItems(zoneItems.length ? zoneItems : ['(no zones)']);
    const zoneIndex = this.state.zoneIndex >= 0 ? this.state.zoneIndex : 0;
    this.zonesList.select(zoneItems.length ? zoneIndex : 0);

    this.applyFocusHighlight();
  }

  private updateZones(): void {
    this.reconcileSelections();
    this.updateLists();
    this.updateZoneDetail();
  }

  private updateRooms(): void {
    this.reconcileSelections();
    this.updateLists();
    this.updateZoneDetail();
  }

  private updateZoneDetail(): void {
    const zoneId = this.state.selectedZoneId;
    if (!zoneId) {
      this.detailBox.setContent('Select a zone to view details.');
      return;
    }
    const zone = this.state.zoneById.get(zoneId);
    if (!zone) {
      this.detailBox.setContent('Zone data unavailable.');
      return;
    }
    const lines: string[] = [];
    lines.push(`{bold}${zone.name}{/bold}`);
    const roomId = zone.roomId;
    const structureId = zone.structureId;
    const structure = this.state.structures.find((entry) => entry.id === structureId);
    const rooms = this.state.roomsByStructure.get(structureId ?? '') ?? [];
    const room = rooms.find((entry) => entry.id === roomId);
    lines.push(
      `Structure: ${formatNullableString(structure?.name)}  |  Room: ${formatNullableString(room?.name)}`,
    );
    lines.push('');
    const env = zone.environment ?? {};
    lines.push('{underline}Environment{/underline}');
    lines.push(`  Temperature: ${formatNumber(env.temperature, 1)} °C`);
    lines.push(
      `  Relative Humidity: ${
        typeof env.relativeHumidity === 'number' ? formatPercent(env.relativeHumidity) : '–'
      }`,
    );
    lines.push(
      `  CO₂: ${typeof env.co2 === 'number' ? `${compactNumberFormatter.format(env.co2)} ppm` : '–'}`,
    );
    lines.push(
      `  PPFD: ${typeof env.ppfd === 'number' ? `${compactNumberFormatter.format(env.ppfd)} µmol·m⁻²·s⁻¹` : '–'}`,
    );
    lines.push(`  VPD: ${typeof env.vpd === 'number' ? `${formatNumber(env.vpd, 2)} kPa` : '–'}`);
    lines.push('');
    lines.push('{underline}Resources{/underline}');
    const resources = zone.resources ?? {};
    const resourceEntries = Object.entries(resources).slice(0, 10);
    if (resourceEntries.length === 0) {
      lines.push('  (no resource data)');
    } else {
      for (const [key, value] of resourceEntries) {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      }
    }
    lines.push('');
    lines.push('{underline}Control{/underline}');
    const control = zone.control ?? {};
    const controlEntries = Object.entries(control);
    if (controlEntries.length === 0) {
      lines.push('  (no control data)');
    } else {
      for (const [key, value] of controlEntries.slice(0, 10)) {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      }
    }
    lines.push('');
    lines.push('{underline}Metrics{/underline}');
    const metrics = zone.metrics ?? {};
    const metricEntries = Object.entries(metrics).slice(0, 12);
    if (metricEntries.length === 0) {
      lines.push('  (no metrics)');
    } else {
      for (const [key, value] of metricEntries) {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      }
    }
    lines.push('');
    lines.push('{underline}Counts{/underline}');
    const plantCount = Array.isArray(zone.plants) ? zone.plants.length : undefined;
    const deviceCount = Array.isArray(zone.devices) ? zone.devices.length : undefined;
    lines.push(`  Plants: ${typeof plantCount === 'number' ? plantCount : '–'}`);
    lines.push(`  Devices: ${typeof deviceCount === 'number' ? deviceCount : '–'}`);
    lines.push('');
    lines.push('{gray-fg}↑/↓ select • ←/→ or Tab cycle focus • r reconnect • q quit{/gray-fg}');

    this.detailBox.setContent(lines.join('\n'));
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return numberFormatter.format(value);
      }
      return value.toFixed(2);
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'yes' : 'no';
    }
    if (value === null || value === undefined) {
      return '–';
    }
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    if (typeof value === 'object') {
      return '{…}';
    }
    return String(value);
  }

  private updateStatusBox(): void {
    const connectionLine = `Connection: ${this.state.connectionStatus} (${this.url})`;
    const status =
      this.state.paused === true ? 'paused' : this.state.running === false ? 'idle' : 'running';
    const tickLabel = typeof this.state.tick === 'number' ? this.state.tick : '–';
    const speedLabel =
      typeof this.state.speed === 'number' ? `${this.state.speed.toFixed(2)}×` : '–';
    const cashLabel =
      typeof this.state.cashOnHand === 'number'
        ? `€${compactNumberFormatter.format(this.state.cashOnHand)}`
        : '–';
    const simLine = `Sim: ${status}  Tick: ${tickLabel}  Speed: ${speedLabel}  Cash: ${cashLabel}`;
    const focusLine = this.describeFocus();
    const messageLine = this.state.lastMessage ? `Note: ${this.state.lastMessage}` : '';
    const lines = [connectionLine, simLine, focusLine];
    if (messageLine) {
      lines.push(messageLine);
    }
    this.statusBox.setContent(lines.join('\n'));
  }

  private describeFocus(): string {
    const structure = this.state.structures[this.state.structureIndex]?.name;
    const room = this.getRoomsForSelectedStructure()[this.state.roomIndex]?.name;
    const zone = this.getZonesForSelectedRoom()[this.state.zoneIndex]?.name;
    return `Focus: ${this.state.focus}  |  Structure: ${structure ?? '–'}  ›  Room: ${room ?? '–'}  ›  Zone: ${zone ?? '–'}`;
  }
}

function main(): void {
  const program = new Command();
  program
    .name('weedbreed-monitor')
    .description('Terminal dashboard for the WeedBreed simulation SSE feed')
    .option('-u, --url <url>', 'SSE endpoint URL', DEFAULT_URL)
    .parse(process.argv);

  const options = program.opts<{ url: string }>();
  const url = options.url ?? DEFAULT_URL;
  // eslint-disable-next-line no-new
  new MonitorCli(url);
}

main();
