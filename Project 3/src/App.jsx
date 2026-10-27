import { useCesiumViewer } from './hooks/useCesiumViewer.js';
import { useGallery } from './hooks/useGallery.js';
import ControlPanel from './components/ControlPanel.jsx';
import Gallery from './components/Gallery.jsx';
import Messages from './components/Messages.jsx';

export default function App() {
  const [viewer, containerRef] = useCesiumViewer();
  const gallery = useGallery(viewer);

  return (
    <>
      {/* Cesium owns this element's children: React must never render into it. */}
      <main
        id="cesiumContainer"
        ref={containerRef}
        aria-label="3D globe with georeferenced Gaussian splats"
      />
      <ControlPanel>
        <Gallery gallery={gallery} />
      </ControlPanel>
      <Messages />
    </>
  );
}
