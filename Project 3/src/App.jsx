import { useCesiumViewer } from './hooks/useCesiumViewer.js';
import { useGallery } from './hooks/useGallery.js';
import ControlPanel from './components/ControlPanel.jsx';
import Gallery from './components/Gallery.jsx';
import Inspector from './components/Inspector.jsx';
import Messages from './components/Messages.jsx';

export default function App() {
  const [viewer, containerRef] = useCesiumViewer();
  const gallery = useGallery(viewer);
  const tileset = gallery.selected && gallery.states[gallery.selected.id]?.tileset;

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
        {tileset && <Inspector tileset={tileset} />}
      </ControlPanel>
      <Messages />
    </>
  );
}
