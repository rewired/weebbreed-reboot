const DEFAULT_SOCKET_URL = 'http://localhost:7331/socket.io';

const normalizeUrl = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const getSocketUrl = (): string => {
  const envUrl = normalizeUrl(import.meta.env.VITE_SOCKET_URL);
  return envUrl ?? DEFAULT_SOCKET_URL;
};

export const SOCKET_URL = getSocketUrl();
