import { useEffect, useState } from "preact/hooks";

export function useCachedObj(key: string, initialValue: any) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue !== null ? JSON.parse(storedValue) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {}
  }, [key, state]);

  return [state, setState];
}

export function useCachedVar<T>(key: string, initialValue: T) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    const stored = window.localStorage.getItem(key);

    if (stored === null) return initialValue;

    const num = parseFloat(stored);
    if (!isNaN(num)) return num;
    if (stored === "true") return true;
    if (stored === "false") return false;
    return stored;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, (state as number).toString());
    } catch (error) {}
  }, [key, state]);

  return [state, setState] as [T, (newValue: T) => void];
}
