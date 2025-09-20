import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  SimulationConfigUpdate,
  SimulationControlCommand,
  SimulationEvent,
  SimulationSnapshot,
  SimulationTickEvent,
} from '../types/simulation';
import { useAppStore } from '../store';
import type { ConnectionStatus } from '../store';

type AnyHandler = (...args: unknown[]) => void;

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
    severity: 'debug',
    message: typeof payload === 'string' ? payload : JSON.stringify(payload),
  };
};

export const useSimulationBridge = (
  options: UseSimulationBridgeOptions = {},
): SimulationBridgeHandle => {
  const { url = '/socket.io', autoConnect = true, debug = false } = options;
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);
  const ingestSnapshot = useAppStore((state) => state.ingestSnapshot);
  const appendEvents = useAppStore((state) => state.appendEvents);
  const registerTickCompleted = useAppStore((state) => state.registerTickCompleted);
  const setCommandHandlers = useAppStore((state) => state.setCommandHandlers);
  const status = useAppStore((state) => state.connectionStatus);

  const socketRef = useRef<Socket | null>(null);
  const pendingSubscriptionsRef = useRef<PendingSubscription[]>([]);
  const [socketId, setSocketId] = useState<string | null>(null);

  const sendControlCommand = useCallback((command: SimulationControlCommand) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn('[useSimulationBridge] No active socket to send control command', command);
      return;
    }

    socket.emit('simulationControl', { type: 'simulationControl', ...command });
  }, []);

  const sendConfigUpdate = useCallback((update: SimulationConfigUpdate) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn('[useSimulationBridge] No active socket to send config update', update);
      return;
    }

    socket.emit('config.update', update);
  }, []);

  useEffect(() => {
    setCommandHandlers(sendControlCommand, sendConfigUpdate);
  }, [sendConfigUpdate, sendControlCommand, setCommandHandlers]);

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
    const socket = io(url, {
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
      flushSubscriptions();
    };

    const handleDisconnect = () => {
      setSocketId(null);
      setConnectionStatus('disconnected');
    };

    const handleConnectError = (error: Error) => {
      setConnectionStatus('error', error.message);
    };

    const handleSimulationUpdate = (payload: SimulationSnapshot) => {
      ingestSnapshot(payload);
    };

    const handleTickCompleted = (payload: SimulationTickEvent) => {
      registerTickCompleted(payload);
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
      setConnectionStatus('disconnected');
    };
  }, [
    appendEvents,
    autoConnect,
    debug,
    ingestSnapshot,
    registerTickCompleted,
    setConnectionStatus,
    url,
  ]);

  const connect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    if (socket.connected) {
      return;
    }

    setConnectionStatus('connecting');
    socket.connect();
  }, [setConnectionStatus]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return useMemo(
    () => ({
      status,
      socketId,
      connect,
      disconnect,
      sendControlCommand,
      sendConfigUpdate,
      subscribe,
    }),
    [connect, disconnect, sendConfigUpdate, sendControlCommand, socketId, status, subscribe],
  );
};
