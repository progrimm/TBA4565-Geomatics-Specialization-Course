import { useEffect, useState } from 'react';
import { NEAREST } from '../config.js';
import { showMessage } from '../state/messages.js';
import { buildGraph } from '../utils/network.js';
import { passageIndexFor } from '../utils/passages.js';

/** Fetch a JSON file; rejects on network errors and HTTP errors. */
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * Building passages are optional: without them routes still work, only the
 * buildings they pass through are not highlighted.
 */
function fetchPassages() {
  return fetchJson(NEAREST.passages.url).catch((error) => {
    console.error('Building passages failed to load:', error);
    showMessage('Building passages unavailable: routes are shown without them.', 'error');
    return undefined;
  });
}

/**
 * Load the walking network (and the buildings it passes through) once and build its graph.
 * @returns {{status: 'loading' | 'ready' | 'error', graph?: import('../utils/network.js').Graph,
 *   passages?: Map<string, import('../utils/passages.js').PassageBuilding[]>}}
 */
export function useWalkingNetwork() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const hideLoading = showMessage('Loading walking network…');
    Promise.all([fetchJson(NEAREST.network.url), fetchPassages()])
      .then(([network, passages]) => {
        if (!active) return;
        setState({
          status: 'ready',
          graph: buildGraph(network),
          passages: passageIndexFor(network, passages),
        });
      })
      .catch((error) => {
        console.error('Walking network failed to load:', error);
        if (active) {
          setState({ status: 'error' });
          showMessage('Walking network unavailable: showing straight-line distances.', 'error');
        }
      })
      .finally(hideLoading);
    return () => {
      active = false;
    };
  }, []);

  return state;
}
