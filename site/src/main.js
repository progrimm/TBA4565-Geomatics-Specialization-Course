import '@fontsource-variable/bricolage-grotesque/wdth.css';
import './style.css';
import { TRONDHEIM, drawGlobe } from './globe.js';

// Tilt the globe south of Trondheim so the city sits above the centre and the
// meridians converge visibly towards the pole.
drawGlobe(document.getElementById('globe'), {
  radius: 300,
  lon0: TRONDHEIM.lon - 8,
  lat0: 38,
});
