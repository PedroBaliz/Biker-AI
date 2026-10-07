/**
 * Type-safe local storage manager with error handling, debouncing, and cache expiration.
 */

export function loadLocalData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[LocalStorage Read Error] Key "${key}":`, err);
    return fallback;
  }
}

export function saveLocalData<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn(`[LocalStorage Write Error] Key "${key}":`, err);
    return false;
  }
}

export function removeLocalData(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[LocalStorage Remove Error] Key "${key}":`, err);
  }
}

/**
 * A debounced function that also exposes cancel() and flush() controls.
 */
export interface DebouncedFunction<Args extends any[]> {
  (...args: Args): void;
  /** Cancels any pending invocation without running it. */
  cancel: () => void;
  /** Immediately runs a pending invocation (if any) with its last arguments. */
  flush: () => void;
}

/**
 * Creates a debounced version of a function for non-blocking persistence.
 * The returned function exposes cancel() and flush() so callers can drop or
 * force pending writes (e.g. on component unmount).
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  waitMs: number
): DebouncedFunction<Parameters<T>> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const clear = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    clear();
    timeout = setTimeout(() => {
      timeout = null;
      const pending = lastArgs;
      lastArgs = null;
      if (pending) func(...pending);
    }, waitMs);
  };

  debounced.cancel = () => {
    clear();
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeout === null || !lastArgs) return;
    clear();
    const pending = lastArgs;
    lastArgs = null;
    func(...pending);
  };

  return debounced;
}
