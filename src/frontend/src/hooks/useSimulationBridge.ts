import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config/socket';
import type {
  FacadeIntentCommand,
  SimulationConfigUpdate,
  SimulationControlCommand,
  SimulationEvent,
  SimulationTickEvent,
  SimulationUpdateEntry,
  SimulationUpdateMessage,
} from '@/types/simulation';
import {
  type ConnectionStatus,
  type FinanceTickEntry,
  useGameStore,
  usePersonnelStore,
  useZoneStore,
} from '@/store';

type AnyHandler = (...args: unknown[]) => void;

type DomainEventsMessage = { events?: SimulationEvent[] };

type FinanceTickPayload = {
  tick?: number;
  timestamp?: string;
  revenue?: number;
  expenses?: number;
  netIncome?: number;
  capex?: number;
  opex?: number;
  utilities?: {
    totalCost?: number;
    energy?: { totalCost?: number };
    water?: { totalCost?: number };
    nutrients?: { totalCost?: number };
  };
  maintenance?: unknown;
};

interface PendingSubscription {
  event: string;
  handler: AnyHandler;
}

export interface UseSimulationBridgeOptions {
  url?: string;
  autoConnect?: boolean;
  debug?: boolean;
}

export interface SimulationBridgeHandle {
  status: ConnectionStatus;
  socketId: string | null;
  connect: () => void;
  disconnect: () => void;
  sendControlCommand: (command: SimulationControlCommand) => void;
  sendConfigUpdate: (update: SimulationConfigUpdate) => void;
  sendFacadeIntent: (intent: FacadeIntentCommand) => void;
  subscribe: <TPayload = unknown>(
    event: string,
    handler: (payload: TPayload) => void,
  ) => () => void;
}

const toSimulationEvent = (payload: unknown): SimulationEvent => {
  if (payload && typeof payload === 'object' && 'type' in (payload as Record<string, unknown>)) {
    return payload as SimulationEvent;
  }

  return {
    type: 'domain.untyped',
    level: 'debug',
    message: typeof payload === 'string' ? payload : JSON.stringify(payload),
  };
};

const mapFinanceTick = (payload: unknown): FinanceTickEntry | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const data = payload as FinanceTickPayload;
  const maintenance = Array.isArray(data.maintenance) ? data.maintenance : [];
  const maintenanceDetails = maintenance
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return undefined;
      }
      const record = entry as {
        deviceId?: string;
        blueprintId?: string;
        totalCost?: number;
        degradationMultiplier?: number;
      };
      if (!record.deviceId || !record.blueprintId || typeof record.totalCost !== 'number') {
        return undefined;
      }
      return {
        deviceId: record.deviceId,
        blueprintId: record.blueprintId,
        totalCost: record.totalCost,
        degradationMultiplier: record.degradationMultiplier ?? 1,
      };
    })
    .filter((entry): entry is FinanceTickEntry['maintenanceDetails'][number] => Boolean(entry));

  const ts = data.timestamp ? Date.parse(data.timestamp) : Date.now();
  return {
    tick: data.tick ?? 0,
    ts,
    revenue: data.revenue ?? 0,
    expenses: data.expenses ?? 0,
    netIncome: data.netIncome ?? 0,
    capex: data.capex ?? 0,
    opex: data.opex ?? 0,
    utilities: {
      totalCost: data.utilities?.totalCost ?? 0,
      energy: data.utilities?.energy?.totalCost ?? 0,
      water: data.utilities?.water?.totalCost ?? 0,
      nutrients: data.utilities?.nutrients?.totalCost ?? 0,
    },
    maintenanceTotal: maintenanceDetails.reduce((sum, item) => sum + item.totalCost, 0),
    maintenanceDetails,
  } satisfies FinanceTickEntry;
};

const toArray = <T>(input: T | T[] | undefined): T[] => {
  if (!input) {
    return [];
  }

  return Array.isArray(input) ? input : [input];
};

const processSimulationUpdates = (
  message: SimulationUpdateMessage,
  handlers: Array<(update: SimulationUpdateEntry) => void>,
) => {
  if (!message || !Array.isArray(message.updates)) {
    return;
  }

  for (const update of message.updates) {
    for (const handler of handlers) {
      handler(update);
    }
  }
};

const processDomainEvents = (
  message: DomainEventsMessage,
  appendEvents: (events: SimulationEvent[]) => void,
  recordHREvent: (event: SimulationEvent) => void,
  recordFinanceTick: (entry: FinanceTickEntry) => void,
) => {
  const events = toArray(message?.events);
  if (!events.length) {
    return;
  }
  appendEvents(events);

  for (const event of events) {
    if (event.type.startsWith('hr.')) {
      recordHREvent(event);
    }
    if (event.type === 'finance.tick') {
      const entry = mapFinanceTick(event.payload);
      if (entry) {
        recordFinanceTick(entry);
      }
    }
  }
};

export const useSimulationBridge = (
  options: UseSimulationBridgeOptions = {},
): SimulationBridgeHandle => {
  const { url: overrideUrl, autoConnect = true, debug = false } = options;
  const resolvedUrl = overrideUrl ?? SOCKET_URL;
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const setTransportAvailability = useGameStore((state) => state.setTransportAvailability);
  const ingestGameUpdate = useGameStore((state) => state.ingestUpdate);
  const appendEvents = useGameStore((state) => state.appendEvents);
  const registerTickCompleted = useGameStore((state) => state.registerTickCompleted);
  const setGameCommandHandlers = useGameStore((state) => state.setCommandHandlers);
  const status = useGameStore((state) => state.connectionStatus);

  const ingestZoneUpdate = useZoneStore((state) => state.ingestUpdate);
  const recordFinanceTick = useZoneStore((state) => state.recordFinanceTick);
  const setZoneConfigHandler = useZoneStore((state) => state.setConfigHandler);
  const setIntentHandler = useZoneStore((state) => state.setIntentHandler);

  const ingestPersonnelUpdate = usePersonnelStore((state) => state.ingestUpdate);
  const recordHREvent = usePersonnelStore((state) => state.recordHREvent);
  const setPersonnelIntentHandler = usePersonnelStore((state) => state.setIntentHandler);

  const socketRef = useRef<Socket | null>(null);
  const pendingSubscriptionsRef = useRef<PendingSubscription[]>([]);
  const [socketId, setSocketId] = useState<string | null>(null);

  const sendControlCommand = useCallback(
    (command: SimulationControlCommand) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        if (debug) {
          console.warn(
            '[useSimulationBridge] Skipping control command; socket not connected',
            command,
          );
        }
        return;
      }

      socket.emit('simulationControl', { type: 'simulationControl', ...command });
    },
    [debug],
  );

  const sendConfigUpdate = useCallback(
    (update: SimulationConfigUpdate) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        if (debug) {
          console.warn(
            '[useSimulationBridge] Skipping config update; socket not connected',
            update,
          );
        }
        return;
      }

      socket.emit('config.update', update);
    },
    [debug],
  );

  const sendFacadeIntent = useCallback(
    (intent: FacadeIntentCommand) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        if (debug) {
          console.warn(
            '[useSimulationBridge] Skipping facade intent; socket not connected',
            intent,
          );
        }
        return;
      }

      socket.emit('facade.intent', intent);
    },
    [debug],
  );

  useEffect(() => {
    setGameCommandHandlers(sendControlCommand, sendConfigUpdate);
    setZoneConfigHandler(sendConfigUpdate);
    setIntentHandler(sendFacadeIntent);
    setPersonnelIntentHandler(sendFacadeIntent);
  }, [
    sendConfigUpdate,
    sendControlCommand,
    sendFacadeIntent,
    setGameCommandHandlers,
    setIntentHandler,
    setPersonnelIntentHandler,
    setZoneConfigHandler,
  ]);

  const subscribe = useCallback(<TPayload>(event: string, handler: (payload: TPayload) => void) => {
    const wrapped: AnyHandler = (payload: unknown) => handler(payload as TPayload);
    const socket = socketRef.current;

    if (socket) {
      socket.on(event, wrapped);
      return () => socket.off(event, wrapped);
    }

    const subscription: PendingSubscription = { event, handler: wrapped };
    pendingSubscriptionsRef.current = [...pendingSubscriptionsRef.current, subscription];

    return () => {
      pendingSubscriptionsRef.current = pendingSubscriptionsRef.current.filter(
        (candidate) => candidate !== subscription,
      );
    };
  }, []);

  useEffect(() => {
    const socket = io(resolvedUrl, {
      autoConnect: false,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    const flushSubscriptions = () => {
      if (pendingSubscriptionsRef.current.length === 0) {
        return;
      }

      for (const subscription of pendingSubscriptionsRef.current) {
        socket.on(subscription.event, subscription.handler);
      }

      pendingSubscriptionsRef.current = [];
    };

    const handleConnect = () => {
      setSocketId(socket.id ?? null);
      setConnectionStatus('connected');
      setTransportAvailability(true);
      flushSubscriptions();
    };

    const handleDisconnect = () => {
      setSocketId(null);
      setTransportAvailability(false);
      setConnectionStatus('disconnected');
    };

    const handleConnectError = (error: Error) => {
      setTransportAvailability(false);
      setConnectionStatus('error', error.message);
    };

    const handleSimulationUpdate = (payload: SimulationUpdateMessage) => {
      processSimulationUpdates(payload, [
        ingestGameUpdate,
        ingestZoneUpdate,
        ingestPersonnelUpdate,
      ]);
    };

    const handleTickCompleted = (payload: SimulationTickEvent) => {
      registerTickCompleted(payload);
    };

    const handleDomainEvents = (payload: DomainEventsMessage) => {
      processDomainEvents(payload, appendEvents, recordHREvent, recordFinanceTick);
    };

    const handleFinanceTick = (payload: unknown) => {
      const entry = mapFinanceTick(payload);
      if (entry) {
        recordFinanceTick(entry);
      }
    };

    const handleDomainEvent = (payload: unknown) => {
      appendEvents([toSimulationEvent(payload)]);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('error', handleConnectError);
    socket.on('simulationUpdate', handleSimulationUpdate);
    socket.on('sim.tickCompleted', handleTickCompleted);
    socket.on('domainEvents', handleDomainEvents);
    socket.on('finance.tick', handleFinanceTick);
    socket.on('domain.event', handleDomainEvent);
    socket.on('simulation.event', handleDomainEvent);

    if (debug) {
      socket.onAny((event, payload) => {
        if (
          event === 'simulationUpdate' ||
          event === 'sim.tickCompleted' ||
          event === 'domain.event' ||
          event === 'simulation.event'
        ) {
          return;
        }

        console.debug('[useSimulationBridge] event', event, payload);
      });
    }

    if (autoConnect) {
      setConnectionStatus('connecting');
      socket.connect();
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketId(null);
      setTransportAvailability(false);
      setConnectionStatus('disconnected');
    };
  }, [
    appendEvents,
    autoConnect,
    debug,
    ingestGameUpdate,
    ingestPersonnelUpdate,
    ingestZoneUpdate,
    recordFinanceTick,
    recordHREvent,
    registerTickCompleted,
    setConnectionStatus,
    setTransportAvailability,
    resolvedUrl,
  ]);

  return useMemo(
    () => ({
      status,
      socketId,
      connect: () => socketRef.current?.connect(),
      disconnect: () => socketRef.current?.disconnect(),
      sendControlCommand,
      sendConfigUpdate,
      sendFacadeIntent,
      subscribe,
    }),
    [sendConfigUpdate, sendControlCommand, sendFacadeIntent, socketId, status, subscribe],
  );
};
