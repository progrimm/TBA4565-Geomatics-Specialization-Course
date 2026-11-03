/**
 * Which panel tools are open, remembered for the session (and in this browser, if storage is
 * allowed). Kept outside React, so a tool keeps its state when the active pane changes and its
 * tools are rendered again.
 */

const STORAGE_KEY = '3dgs-viewer.tools';

function load() {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')));
  } catch {
    return new Map();
  }
}

const open = load();

/**
 * Whether a tool is open.
 * @param {string} id
 * @param {boolean} fallback - when nothing is remembered.
 * @returns {boolean}
 */
export function isToolOpen(id, fallback) {
  return open.get(id) ?? fallback;
}

/**
 * Remember whether a tool is open.
 * @param {string} id
 * @param {boolean} value
 */
export function setToolOpen(id, value) {
  open.set(id, value);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(open)));
  } catch {
    // Storage blocked (private window, site data off): remembered for this session only.
  }
}
