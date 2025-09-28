import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';
import type { Observable, Subscription } from 'rxjs';

import type { SimulationFacade, TimeStatus } from '@/facade/index.js';
import {
  createUiStream,
  type EventBus,
  type UiSimulationUpdateEntry,
  type UiSimulationUpdateMessage,
  type UiStreamPacket,
} from '@runtime/eventBus.js';
import {
  buildSimulationSnapshot,
  type SimulationSnapshot,
  type SnapshotBlueprintSource,
} from '@/lib/uiSnapshot.js';

const DEFAULT_KEEP_ALIVE_MS = 15000;

const DEFAULT_SIMULATION_BATCH_INTERVAL_MS = 120;
const DEFAULT_SIMULATION_BATCH_MAX_SIZE = 5;
const DEFAULT_DOMAIN_BATCH_INTERVAL_MS = 250;
const DEFAULT_DOMAIN_BATCH_MAX_SIZE = 25;

const ACCESS_CONTROL_ALLOW_HEADERS = 'Content-Type, Last-Event-ID';

// Environment-based CORS configuration
const getAllowedOrigin = (requestOrigin: string | undefined): string => {
  // In production, restrict to specific origins
  const allowedOrigins =
    process.env.WEEBBREED_ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [];

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length > 0) {
    return allowedOrigins.includes(requestOrigin ?? '') ? (requestOrigin ?? '') : 'null';
  }

  // In development, allow localhost origins and wildcard for convenience
  if (requestOrigin?.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
    return requestOrigin;
  }

  // Fallback to wildcard in development only
  return process.env.NODE_ENV === 'production' ? 'null' : '*';
};

const formatData = (data: unknown): string => {
  if (data === undefined) {
    return 'null';
  }
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
};

const extractPathname = (request: IncomingMessage, fallback: string): string => {
  if (!request.url) {
    return fallback;
  }
  try {
    const base = `http://${request.headers.host ?? 'localhost'}`;
    return new URL(request.url, base).pathname ?? fallback;
  } catch (error) {
    return fallback;
  }
};

interface SseClient {
  readonly res: ServerResponse;
  readonly subscription: Subscription;
  readonly keepAliveTimer?: NodeJS.Timeout;
  closed: boolean;
}

type SimulationUpdateEntry = UiSimulationUpdateEntry<SimulationSnapshot, TimeStatus>;
type SimulationUpdateMessage = UiSimulationUpdateMessage<SimulationSnapshot, TimeStatus>;

export interface SseGatewayOptions {
  httpServer: HttpServer;
  facade: SimulationFacade;
  roomPurposeSource: SnapshotBlueprintSource;
  path?: string;
  keepAliveMs?: number;
  simulationBatchIntervalMs?: number;
  simulationBatchMaxSize?: number;
  domainBatchIntervalMs?: number;
  domainBatchMaxSize?: number;
  eventBus?: EventBus;
  uiStream$?: Observable<UiStreamPacket<SimulationSnapshot, TimeStatus>>;
}

export class SseGateway {
  private readonly server: HttpServer;

  private readonly facade: SimulationFacade;

  private readonly roomPurposeSource: SnapshotBlueprintSource;

  private readonly path: string;

  private readonly keepAliveMs: number;

  private readonly uiStream: Observable<UiStreamPacket<SimulationSnapshot, TimeStatus>>;

  private readonly connections = new Set<SseClient>();

  private readonly requestListener: (req: IncomingMessage, res: ServerResponse) => void;

  private disposed = false;

  constructor(options: SseGatewayOptions) {
    this.server = options.httpServer;
    this.facade = options.facade;
    this.roomPurposeSource = options.roomPurposeSource;
    this.path = options.path ?? '/events';
    this.keepAliveMs = options.keepAliveMs ?? DEFAULT_KEEP_ALIVE_MS;

    const simulationBatchInterval =
      options.simulationBatchIntervalMs ?? DEFAULT_SIMULATION_BATCH_INTERVAL_MS;
    const simulationBatchMaxSize =
      options.simulationBatchMaxSize ?? DEFAULT_SIMULATION_BATCH_MAX_SIZE;
    const domainBatchInterval = options.domainBatchIntervalMs ?? DEFAULT_DOMAIN_BATCH_INTERVAL_MS;
    const domainBatchMaxSize = options.domainBatchMaxSize ?? DEFAULT_DOMAIN_BATCH_MAX_SIZE;

    this.uiStream =
      options.uiStream$ ??
      createUiStream<SimulationSnapshot, TimeStatus>({
        snapshotProvider: () =>
          this.facade.select((state) => buildSimulationSnapshot(state, this.roomPurposeSource)),
        timeStatusProvider: () => this.facade.getTimeStatus(),
        eventBus: options.eventBus,
        simulationBufferMs: simulationBatchInterval,
        simulationMaxBatchSize: simulationBatchMaxSize,
        domainBufferMs: domainBatchInterval,
        domainMaxBatchSize: domainBatchMaxSize,
      });

    this.requestListener = (req, res) => this.handleRequest(req, res);
    this.server.on('request', this.requestListener);
  }

  close(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.server.off('request', this.requestListener);
    for (const connection of this.connections) {
      connection.subscription.unsubscribe();
      if (connection.keepAliveTimer) {
        clearInterval(connection.keepAliveTimer);
      }
      if (!connection.res.writableEnded) {
        connection.res.end();
      }
      connection.closed = true;
    }
    this.connections.clear();
  }

  private handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const pathname = extractPathname(request, '/events');
    if (pathname !== this.path) {
      return;
    }

    if (request.method === 'OPTIONS') {
      const allowedOrigin = getAllowedOrigin(request.headers.origin);
      response.writeHead(204, {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': ACCESS_CONTROL_ALLOW_HEADERS,
      });
      response.end();
      return;
    }

    if (request.method !== 'GET') {
      const allowedOrigin = getAllowedOrigin(request.headers.origin);
      response.writeHead(405, {
        Allow: 'GET, OPTIONS',
        'Access-Control-Allow-Origin': allowedOrigin,
      });
      response.end();
      return;
    }

    this.openStream(request, response);
  }

  private openStream(request: IncomingMessage, response: ServerResponse): void {
    const allowedOrigin = getAllowedOrigin(request.headers.origin);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': ACCESS_CONTROL_ALLOW_HEADERS,
      'X-Accel-Buffering': 'no',
    });
    if (typeof response.flushHeaders === 'function') {
      response.flushHeaders();
    }

    const snapshot = this.facade.select((state) =>
      buildSimulationSnapshot(state, this.roomPurposeSource),
    );
    const time = this.facade.getTimeStatus();
    const handshake: SimulationUpdateEntry = {
      tick: snapshot.tick,
      ts: Date.now(),
      events: [],
      snapshot,
      time,
    };

    this.writeEvent(response, 'gateway.protocol', { version: 1 });
    this.writeEvent(response, 'time.status', { status: time });
    this.writeEvent(response, 'simulationUpdate', {
      updates: [handshake],
    } satisfies SimulationUpdateMessage);

    const client: SseClient = {
      res: response,
      subscription: this.uiStream.subscribe({
        next: (packet) => this.dispatchPacket(response, packet),
        error: () => {
          if (!response.writableEnded) {
            response.end();
          }
        },
      }),
      keepAliveTimer:
        this.keepAliveMs > 0
          ? setInterval(() => this.writeComment(response, 'keep-alive'), this.keepAliveMs)
          : undefined,
      closed: false,
    };

    this.connections.add(client);

    const cleanup = () => {
      if (client.closed) {
        return;
      }
      client.closed = true;
      client.subscription.unsubscribe();
      if (client.keepAliveTimer) {
        clearInterval(client.keepAliveTimer);
      }
      this.connections.delete(client);
    };

    request.on('close', cleanup);
    response.on('close', cleanup);
    response.on('error', cleanup);
  }

  private dispatchPacket(
    response: ServerResponse,
    packet: UiStreamPacket<SimulationSnapshot, TimeStatus>,
  ): void {
    if (!response.writable || response.writableEnded) {
      return;
    }

    if (packet.channel === 'simulationUpdate' || packet.channel === 'sim.tickCompleted') {
      this.writeEvent(response, packet.channel, packet.payload);
      return;
    }

    this.writeEvent(response, packet.channel, packet.payload ?? null);
  }

  private writeEvent(response: ServerResponse, event: string, data: unknown): void {
    response.write(`event: ${event}\n`);
    const payload = formatData(data);
    response.write(`data: ${payload}\n\n`);
  }

  private writeComment(response: ServerResponse, comment: string): void {
    if (!response.writable || response.writableEnded) {
      return;
    }
    response.write(`: ${comment}\n\n`);
  }
}
