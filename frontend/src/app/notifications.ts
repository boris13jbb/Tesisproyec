let onGlobalError: ((message: string) => void) | null = null;

export function setGlobalErrorHandler(
  fn: ((message: string) => void) | null,
): void {
  onGlobalError = fn;
}

export function notifyGlobalError(message: string): void {
  onGlobalError?.(message);
}

