import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query matches, updated when it changes (e.g. on resize).
 * @param {string} query - e.g. MOBILE_QUERY from config.js.
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
