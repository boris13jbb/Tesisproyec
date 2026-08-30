import { useCallback, useRef } from 'react';

/**
 * Encola mutaciones async para evitar condiciones de carrera en toggles rápidos.
 */
export function useSerializedMutation<T>() {
  const chainRef = useRef<Promise<T | undefined>>(Promise.resolve(undefined));

  const run = useCallback((fn: () => Promise<T>): Promise<T> => {
    const next = chainRef.current.then(() => fn());
    chainRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);

  return run;
}
