/** Access JWT solo en memoria (no localStorage). */
let accessToken: string | null = null;

let onSessionLost: (() => void) | null = null;

export function setSessionLostHandler(fn: (() => void) | null): void {
  onSessionLost = fn;
}

export function notifySessionLost(): void {
  onSessionLost?.();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
