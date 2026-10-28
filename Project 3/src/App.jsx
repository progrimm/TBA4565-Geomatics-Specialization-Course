import { useSplatViewer } from './hooks/useSplatViewer.js';
import { useMeasurement } from './hooks/useMeasurement.js';
import { useFileOpener } from './hooks/useFileOpener.js';
import ControlPanel from './components/ControlPanel.jsx';
import FileOpener, { DropOverlay, EmptyState } from './components/FileOpener.jsx';
import SplatFacts from './components/SplatFacts.jsx';
import OrientationTool from './components/OrientationTool.jsx';
import MeasureTool from './components/MeasureTool.jsx';
import Messages from './components/Messages.jsx';

export default function App() {
  const { canvasRef, viewer, loading, facts, upAxis, setUpAxis, open } = useSplatViewer();
  const measurement = useMeasurement(viewer, canvasRef, facts);
  const opener = useFileOpener(open);

  return (
    <>
      {/* The panel comes first, so keyboard users reach the file button before the view. */}
      <ControlPanel>
        <FileOpener opener={opener} loading={loading} />
        {facts && (
          <>
            <SplatFacts facts={facts} />
            <OrientationTool
              upAxis={upAxis}
              onUpAxis={setUpAxis}
              onReset={() => viewer?.resetView()}
            />
            <MeasureTool measurement={measurement} />
          </>
        )}
      </ControlPanel>
      <main className="stage">
        <canvas
          ref={canvasRef}
          className="stage__canvas"
          tabIndex={0}
          aria-label={facts ? `3D view of ${facts.name}` : '3D view, no splat open'}
          aria-describedby="view-controls"
        />
        <p className="sr-only" id="view-controls">
          Drag to orbit, right-drag to pan, scroll to zoom. With the view focused: arrow keys pan,
          Shift + arrows orbit.
        </p>
        {!facts && !loading && <EmptyState onChoose={opener.choose} />}
      </main>
      {opener.dragging && <DropOverlay />}
      <Messages />
    </>
  );
}
