/**
 * Show or hide a layer (Cesium3DTileset or DataSource; both have a `show` flag).
 * @param {import('cesium').Scene} scene - used to request a render (requestRenderMode is on).
 * @param {{show: boolean}} layer
 * @param {boolean} visible
 */
export function setLayerVisible(scene, layer, visible) {
  layer.show = visible;
  // With requestRenderMode, changing .show does not trigger a new frame by itself.
  scene.requestRender();
}
