/**
 * Minimal message store, independent of React so Cesium layer code can use it.
 * React reads it with useSyncExternalStore (see components/Messages.jsx).
 */

/** @typedef {{id: number, text: string, type: 'info' | 'error'}} Message */

/** @type {Message[]} Replaced (never mutated) on change, so React sees a new snapshot. */
let messages = [];
let nextId = 1;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * Show a message banner over the map.
 * @param {string} text - user-facing message.
 * @param {'info' | 'error'} [type='info'] - errors are announced immediately (role="alert").
 * @returns {() => void} call to remove the message (e.g. when loading finishes).
 */
export function showMessage(text, type = 'info') {
  const id = nextId++;
  messages = [...messages, { id, text, type }];
  emit();
  return () => {
    messages = messages.filter((message) => message.id !== id);
    emit();
  };
}

/**
 * Subscribe to message changes.
 * @param {() => void} listener
 * @returns {() => void} unsubscribe.
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @returns {Message[]} current messages (stable reference until the next change). */
export function getMessages() {
  return messages;
}
