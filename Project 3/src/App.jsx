import { useCesiumViewer } from './hooks/useCesiumViewer.js';
import { useGallery } from './hooks/useGallery.js';
import { useAlignment } from './hooks/useAlignment.js';
import ControlPanel from './components/ControlPanel.jsx';
import Gallery from './components/Gallery.jsx';
import Inspector from './components/Inspector.jsx';
import MeasureTool from './components/MeasureTool.jsx';
import Messages from './components/Messages.jsx';
import AlignmentTool from './components/AlignmentTool.jsx';
import SplitLine from './components/SplitLine.jsx';
import PerformancePanel from './components/PerformancePanel.jsx';

export default function App() {
  const [viewer, containerRef] = useCesiumViewer();
  const gallery = useGallery(viewer);
  const tileset = gallery.selected && gallery.states[gallery.selected.id]?.tileset;
  const alignment = useAlignment(viewer, gallery.selected, tileset);

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
        <MeasureTool viewer={viewer} />
        <AlignmentTool splat={tileset && gallery.selected} alignment={alignment} />
        <PerformancePanel viewer={viewer} tileset={tileset} />
      </ControlPanel>
      {alignment.swipe && tileset && <SplitLine position={alignment.splitPosition} />}
      <Messages />
    </>
  );
}
