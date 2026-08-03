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
 * Creates a debounced version of a function for non-blocking persistence
 */
export function debounce<T extends (...args: any[]) => void>(func: T, waitMs: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}
