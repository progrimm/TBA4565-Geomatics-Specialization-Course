import { useEffect, useState } from 'react';
import { ANALYSIS_SUMMARY_URL, SHELTERS } from '../config.js';

/** Fetch a JSON file; rejects on network errors and HTTP errors. */
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * The run-time facts for the "How it works" panel: the shelter fetch date (from the
 * shelter file's `metadata` member) and the grid-analysis summary. Both are small
 * files and only fetched the first time the panel opens. A failed file leaves its
 * fact undefined and sets `error`; the rest of the panel still works.
 * @param {boolean} open - whether the panel has been opened.
 * @returns {{status: 'idle' | 'loading' | 'ready', sheltersFetched?: string,
 *   summary?: object, error?: boolean}}
 */
export function useAboutFacts(open) {
  const [facts, setFacts] = useState({ status: 'idle' });
  const requested = open || facts.status !== 'idle';

  useEffect(() => {
    if (!requested) return undefined;
    let active = true;
    const settle = (promise) =>
      promise.catch((error) => {
        console.error('"How it works" data failed to load:', error);
        return undefined;
      });
    Promise.all([settle(fetchJson(SHELTERS.url)), settle(fetchJson(ANALYSIS_SUMMARY_URL))]).then(
      ([shelters, summary]) => {
        if (!active) return;
        setFacts({
          status: 'ready',
          sheltersFetched: shelters?.metadata?.fetched,
          summary,
          error: !shelters || !summary,
        });
      },
    );
    return () => {
      active = false;
    };
  }, [requested]);

  if (requested && facts.status === 'idle') return { status: 'loading' };
  return facts;
}
