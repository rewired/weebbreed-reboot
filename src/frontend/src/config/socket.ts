const DEFAULT_BACKEND_HTTP_URL = 'http://localhost:7331';
const DEFAULT_SOCKET_PATH = '/socket.io';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const ensureNoTrailingSlash = (value: string): string => {
  if (value.endsWith('/')) {
    return value.slice(0, -1);
  }
  return value;
};

const ensureLeadingSlash = (value: string): string => {
  if (!value.startsWith('/')) {
    return `/${value}`;
  }
  return value;
};

const resolveSocketBaseUrl = (): string => {
  const explicitSocket = normalizeString(import.meta.env.VITE_SOCKET_URL);
  if (explicitSocket) {
    return ensureNoTrailingSlash(explicitSocket);
  }
  const backendHttp = normalizeString(import.meta.env.VITE_BACKEND_HTTP_URL);
  if (backendHttp) {
    return ensureNoTrailingSlash(backendHttp);
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return ensureNoTrailingSlash(window.location.origin);
  }
  return ensureNoTrailingSlash(DEFAULT_BACKEND_HTTP_URL);
};

const resolveSocketPath = (): string => {
  const explicitPath = normalizeString(import.meta.env.VITE_SOCKET_PATH);
  if (explicitPath) {
    return ensureLeadingSlash(explicitPath);
  }
  return DEFAULT_SOCKET_PATH;
};

export const SOCKET_URL = resolveSocketBaseUrl();
export const SOCKET_PATH = resolveSocketPath();
export const SOCKET_ENDPOINT = `${SOCKET_URL}${SOCKET_PATH}`;

export const buildBackendReachabilityMessage = () =>
  `Backend not reachable at ${SOCKET_ENDPOINT}. Is the server running?`;

if (import.meta.env.DEV) {
  console.info(`[socket] Using SOCKET_URL=${SOCKET_URL} SOCKET_PATH=${SOCKET_PATH}`);
}
