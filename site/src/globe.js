// A line-drawn orthographic globe (graticule only) centred near Trondheim.
// Orthographic projection on a unit sphere (Snyder 1987, Map Projections: A Working
// Manual, USGS Professional Paper 1395). Coordinates are WGS 84 degrees;
// the drawing is a sphere, which is all a decorative graticule needs.

const RAD = Math.PI / 180;

/** Trondheim, approximately (WGS 84 degrees). Only the marker uses it. */
export const TRONDHEIM = { lon: 10.4, lat: 63.42 };

/**
 * Orthographic projection for a globe centred on (lon0, lat0).
 * @returns {(lon: number, lat: number) => [number, number] | null} SVG x/y on a unit
 *   disc (y down), or null on the far side of the globe.
 */
export function orthographic(lon0, lat0) {
  const sinLat0 = Math.sin(lat0 * RAD);
  const cosLat0 = Math.cos(lat0 * RAD);
  return (lon, lat) => {
    const dLon = (lon - lon0) * RAD;
    const sinLat = Math.sin(lat * RAD);
    const cosLat = Math.cos(lat * RAD);
    // cos of the angular distance from the centre: negative means hidden.
    const cosC = sinLat0 * sinLat + cosLat0 * cosLat * Math.cos(dLon);
    if (cosC < 0) return null;
    return [cosLat * Math.sin(dLon), -(cosLat0 * sinLat - sinLat0 * cosLat * Math.cos(dLon))];
  };
}

/** SVG path data for a polyline, split wherever it passes behind the globe. */
function pathData(points, project, radius) {
  let data = '';
  let drawing = false;
  for (const [lon, lat] of points) {
    const xy = project(lon, lat);
    if (!xy) {
      drawing = false;
      continue;
    }
    const [x, y] = xy.map((v) => (v * radius).toFixed(1));
    data += `${drawing ? 'L' : 'M'}${x} ${y}`;
    drawing = true;
  }
  return data;
}

function range(start, stop, step) {
  return Array.from({ length: Math.floor((stop - start) / step) + 1 }, (_, i) => start + i * step);
}

/**
 * Fill an <svg> (viewBox centred on 0,0) with a 10° graticule, the equator, the
 * outline and a marker at Trondheim.
 */
export function drawGlobe(svg, { radius, lon0, lat0 }) {
  const project = orthographic(lon0, lat0);
  const ns = 'http://www.w3.org/2000/svg';
  const add = (tag, attributes) => {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    svg.append(node);
    return node;
  };

  add('circle', { r: radius, class: 'globe__sphere' });
  const lines = [
    ...range(-180, 170, 10).map((lon) => range(-80, 80, 1).map((lat) => [lon, lat])),
    ...range(-80, 80, 10).map((lat) => range(-180, 180, 2).map((lon) => [lon, lat])),
  ];
  lines.forEach((points, index) => {
    const d = pathData(points, project, radius);
    if (d) add('path', { d, class: 'globe__line', pathLength: 1, style: `--i: ${index % 12}` });
  });
  add('path', {
    d: pathData(
      range(-180, 180, 2).map((lon) => [lon, 0]),
      project,
      radius,
    ),
    class: 'globe__equator',
  });

  const here = project(TRONDHEIM.lon, TRONDHEIM.lat);
  if (here) {
    const [x, y] = here.map((v) => v * radius);
    add('circle', { cx: x, cy: y, r: radius * 0.06, class: 'globe__halo' });
    add('circle', { cx: x, cy: y, r: radius * 0.018, class: 'globe__marker' });
  }
}
