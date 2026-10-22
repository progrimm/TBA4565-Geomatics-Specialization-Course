/**
 * Add an on/off switch for a layer that loads asynchronously.
 * The switch is disabled until the layer has loaded, and stays disabled if it failed.
 * @param {HTMLUListElement} list
 * @param {import('cesium').Scene} scene - used to request a render (requestRenderMode is on).
 * @param {object} options
 * @param {string} options.label
 * @param {Promise<{show: boolean} | undefined>} options.layer - tileset or data source.
 * @param {string} [options.swatch] - CSS colour of the legend dot.
 */
export function addLayerToggle(list, scene, { label, layer, swatch }) {
  const item = document.createElement('li');
  const row = document.createElement('label');
  row.className = 'layer';

  if (swatch) {
    const dot = document.createElement('span');
    dot.className = 'layer__swatch';
    dot.style.background = swatch;
    dot.setAttribute('aria-hidden', 'true');
    row.append(dot);
  }

  const name = document.createElement('span');
  name.className = 'layer__name';
  name.textContent = label;

  const status = document.createElement('span');
  status.className = 'layer__status';
  status.textContent = 'Loading…';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'switch';
  input.setAttribute('role', 'switch');
  input.checked = true;
  input.disabled = true;

  row.append(name, status, input);
  item.append(row);
  list.append(item);

  layer.then((loaded) => {
    if (!loaded) {
      status.textContent = 'Unavailable';
      input.checked = false;
      return;
    }
    status.remove();
    input.disabled = false;
    input.addEventListener('change', () => {
      loaded.show = input.checked;
      // With requestRenderMode, changing .show does not trigger a new frame by itself.
      scene.requestRender();
    });
  });
}
