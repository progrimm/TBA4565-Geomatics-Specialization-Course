const CONTAINER_ID = 'messages';

/**
 * Show a message banner over the map.
 * @param {string} text - user-facing message.
 * @param {'info' | 'error'} [type='info'] - errors are announced immediately (role="alert").
 * @returns {() => void} call to remove the message (e.g. when loading finishes).
 */
export function showMessage(text, type = 'info') {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.warn(`#${CONTAINER_ID} not found; message: ${text}`);
    return () => {};
  }

  const el = document.createElement('p');
  el.className = `message message--${type}`;
  el.textContent = text;
  if (type === 'error') el.setAttribute('role', 'alert');
  container.append(el);
  return () => el.remove();
}
