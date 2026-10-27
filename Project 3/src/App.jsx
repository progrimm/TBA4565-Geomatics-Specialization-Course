import { openSplat } from './layers/splat.js';
import { useCesiumViewer } from './hooks/useCesiumViewer.js';
import { useAsyncLayer } from './hooks/useAsyncLayer.js';
import ControlPanel from './components/ControlPanel.jsx';
import SplatButton from './components/SplatButton.jsx';
import Messages from './components/Messages.jsx';

export default function App() {
  const [viewer, containerRef] = useCesiumViewer();
  // Loads on startup and jumps the camera to the splat: the app opens on it.
  const splat = useAsyncLayer(viewer, openSplat);

  return (
    <>
      {/* Cesium owns this element's children: React must never render into it. */}
      <main id="cesiumContainer" ref={containerRef} aria-label="3D globe with a Gaussian splat" />
      <ControlPanel>
        <section aria-labelledby="splats-heading">
          <h2 className="panel__heading" id="splats-heading">
            Splats
          </h2>
          <div className="views">
            <SplatButton camera={viewer?.camera} state={splat} />
          </div>
        </section>
      </ControlPanel>
      <Messages />
    </>
  );
}
