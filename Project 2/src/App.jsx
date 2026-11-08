import { useState } from 'react';
import { CAMERA_VIEWS, SHELTERS } from './config.js';
import { addBuildings } from './layers/buildings.js';
import { addShelters } from './layers/shelters.js';
import { useCesiumViewer } from './hooks/useCesiumViewer.js';
import { useAsyncLayer } from './hooks/useAsyncLayer.js';
import { useNearestShelter } from './hooks/useNearestShelter.js';
import { useWalkingNetwork } from './hooks/useWalkingNetwork.js';
import ControlPanel from './components/ControlPanel.jsx';
import ViewButtons from './components/ViewButtons.jsx';
import LayerToggle from './components/LayerToggle.jsx';
import NearestShelter from './components/NearestShelter.jsx';
import OutOfRange from './components/OutOfRange.jsx';
import Messages from './components/Messages.jsx';
import Legend from './components/Legend.jsx';
import About from './components/About.jsx';
import { summarizeShelters } from './utils/nearest.js';

export default function App() {
  const [viewer, containerRef] = useCesiumViewer();
  const buildings = useAsyncLayer(viewer, addBuildings);
  const shelters = useAsyncLayer(viewer, addShelters);
  const network = useWalkingNetwork();
  const analysis = useNearestShelter(viewer, shelters, network, buildings);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      {/* Cesium owns this element's children: React must never render into it. */}
      <main id="cesiumContainer" ref={containerRef} aria-label="3D map of Trondheim" />
      <ControlPanel onAbout={() => setAboutOpen(true)}>
        <ViewButtons camera={viewer?.camera} views={CAMERA_VIEWS} />
        <section aria-labelledby="layers-heading">
          <h2 className="panel__heading" id="layers-heading">
            Layers
          </h2>
          <ul className="layers">
            <LayerToggle label="Buildings" state={buildings} scene={viewer?.scene} />
            <LayerToggle
              label="Public shelters"
              state={shelters}
              scene={viewer?.scene}
              swatch={SHELTERS.style.color}
            />
          </ul>
        </section>
        <NearestShelter status={shelters.status} networkStatus={network.status} {...analysis} />
        <Legend />
      </ControlPanel>
      <About
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        network={network}
        shelterTotals={summarizeShelters(analysis.shelters)}
      />
      <OutOfRange outOfRange={analysis.outOfRange} onClose={analysis.dismissOutOfRange} />
      <Messages />
    </>
  );
}
