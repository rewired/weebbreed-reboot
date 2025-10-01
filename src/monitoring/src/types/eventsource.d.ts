declare module 'eventsource' {
  export type MessageEvent = {
    data: string;
    lastEventId?: string;
    origin?: string;
  };

  export interface EventSourceInitDict {
    withCredentials?: boolean;
    headers?: Record<string, string>;
    proxy?: string;
    https?: Record<string, unknown>;
    rejectUnauthorized?: boolean;
  }

  export default class EventSource {
    constructor(url: string, eventSourceInitDict?: EventSourceInitDict);
    readonly url: string;
    readonly readyState: number;
    onopen: ((event: MessageEvent) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: MessageEvent) => void) | null;
    addEventListener(type: string, listener: (event: MessageEvent) => void): void;
    removeEventListener(type: string, listener: (event: MessageEvent) => void): void;
    close(): void;
  }
}
