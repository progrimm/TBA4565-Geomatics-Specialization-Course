import { CAMERA_VIEWS, SHELTERS } from './config.js';
import { addBuildings } from './layers/buildings.js';
import { addShelters } from './layers/shelters.js';
import { useCesiumViewer } from './hooks/useCesiumViewer.js';
import { useAsyncLayer } from './hooks/useAsyncLayer.js';
import ControlPanel from './components/ControlPanel.jsx';
import ViewButtons from './components/ViewButtons.jsx';
import LayerToggle from './components/LayerToggle.jsx';
import Messages from './components/Messages.jsx';

export default function App() {
  const [viewer, containerRef] = useCesiumViewer();
  const buildings = useAsyncLayer(viewer, addBuildings);
  const shelters = useAsyncLayer(viewer, addShelters);

  return (
    <>
      {/* Cesium owns this element's children: React must never render into it. */}
      <main id="cesiumContainer" ref={containerRef} aria-label="3D map of Trondheim" />
      <ControlPanel>
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
      </ControlPanel>
      <Messages />
    </>
  );
}
