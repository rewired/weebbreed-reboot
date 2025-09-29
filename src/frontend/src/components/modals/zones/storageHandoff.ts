export interface StorageHandoffRequest {
  zoneId: string;
  zoneName?: string | null;
  currentMethodId?: string | null;
  nextMethodId: string;
  containerName?: string | null;
  substrateName?: string | null;
}

type StorageHandoffCallback = (request: StorageHandoffRequest) => Promise<boolean>;

const defaultStorageHandoffCallback: StorageHandoffCallback = async (request) => {
  console.info('Storage handoff confirmation stub invoked', request);
  return true;
};

let storageHandoffCallback: StorageHandoffCallback = defaultStorageHandoffCallback;

export const setStorageHandoffHandler = (callback: StorageHandoffCallback | null) => {
  storageHandoffCallback = callback ?? defaultStorageHandoffCallback;
};

export const requestStorageHandoff = (request: StorageHandoffRequest) =>
  storageHandoffCallback(request);
