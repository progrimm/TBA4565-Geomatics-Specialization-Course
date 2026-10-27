import { useEffect, useState } from 'react';
import { NEAREST } from '../config.js';
import { showMessage } from '../state/messages.js';
import { buildGraph } from '../utils/network.js';

/**
 * Load the walking network once and build its graph.
 * @returns {{status: 'loading' | 'ready' | 'error', graph?: import('../utils/network.js').Graph}}
 */
export function useWalkingNetwork() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const hideLoading = showMessage('Loading walking network…');
    fetch(NEAREST.network.url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((network) => {
        if (active) setState({ status: 'ready', graph: buildGraph(network) });
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
