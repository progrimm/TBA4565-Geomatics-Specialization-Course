import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_UP_AXIS, ERROR_MESSAGE_MS, FORMATS } from '../config.js';
import { showMessage } from '../state/messages.js';
import { parsePlyHeader } from '../utils/ply.js';
import { splatFormat } from '../utils/splatFile.js';
import { createSplatViewer } from '../viewer/splatViewer.js';

/** A problem with the user's file (expected), as opposed to a bug or engine error. */
class FileProblem extends Error {}

/**
 * @typedef {object} SplatFacts
 * @property {string} name
 * @property {string} formatLabel
 * @property {number} fileBytes
 * @property {number} numSplats
 * @property {number[]} coreSize
 * @property {number[]} fullSize
 * @property {number} loadSeconds
 * @property {ReturnType<typeof parsePlyHeader> | null} header - PLY files only.
 */

/**
 * Bridge between React and the three.js/Spark viewer: creates it on the canvas,
 * opens files and keeps the load state.
 * @returns {{canvasRef: import('react').RefObject<HTMLCanvasElement>,
 *   viewer: ReturnType<typeof createSplatViewer> | null, loading: boolean,
 *   facts: SplatFacts | null, upAxis: string, setUpAxis: (axis: string) => void,
 *   open: (file: File) => Promise<void>}}
 */
export function useSplatViewer() {
  const canvasRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [facts, setFacts] = useState(null);
  const [upAxis, setUpAxisState] = useState(DEFAULT_UP_AXIS);
  const hideError = useRef(() => {});
  // A ref, not state, so open() stays the same function while loading (the drop
  // listeners depend on it) and two quick drops cannot both start a load.
  const busy = useRef(false);

  useEffect(() => {
    let created;
    try {
      created = createSplatViewer(canvasRef.current);
    } catch (error) {
      console.error(error);
      showMessage('3D view unavailable: this browser could not start WebGL 2.', 'error');
      return undefined;
    }
    setViewer(created);
    return () => {
      created.dispose();
      setViewer(null);
    };
  }, []);

  const open = useCallback(
    async (file) => {
      if (!viewer) return;
      if (busy.current) {
        const hide = showMessage(`Still opening the previous file; ${file.name} was not opened.`);
        setTimeout(hide, ERROR_MESSAGE_MS);
        return;
      }
      hideError.current();
      const fail = (text) => {
        hideError.current = showMessage(text, 'error');
        setTimeout(hideError.current, ERROR_MESSAGE_MS);
      };
      const format = splatFormat(file.name, FORMATS);
      if (!format) {
        fail(
          `"${file.name}" is not a supported splat file. ` +
            `Open a ${Object.keys(FORMATS).join(', ')} file.`,
        );
        return;
      }

      busy.current = true;
      setLoading(true);
      const hideLoading = showMessage(`Opening ${file.name}…`);
      const started = performance.now();
      try {
        // The whole file is read into memory: the browser's memory is the size limit.
        const bytes = new Uint8Array(await file.arrayBuffer());
        // Read the header before Spark gets the bytes (it may hand them to a worker).
        let header = null;
        if (format.extension === 'ply') {
          header = parsePlyHeader(bytes);
          if (header.missing.length > 0) {
            throw new FileProblem(
              `it has no Gaussian splat properties (missing ${header.missing.join(', ')}). ` +
                'It may be a mesh or a plain point cloud.',
            );
          }
        }
        const stats = await viewer.load(bytes, file.name);
        setFacts({
          name: file.name,
          formatLabel: format.label,
          fileBytes: file.size,
          ...stats,
          loadSeconds: (performance.now() - started) / 1000,
          header,
        });
      } catch (error) {
        if (!(error instanceof FileProblem)) console.error(error);
        fail(`Could not open ${file.name}: ${error?.message ?? error}`);
      } finally {
        hideLoading();
        busy.current = false;
        setLoading(false);
      }
    },
    [viewer],
  );

  const setUpAxis = useCallback(
    (axis) => {
      viewer?.setUpAxis(axis);
      setUpAxisState(axis);
    },
    [viewer],
  );

  return { canvasRef, viewer, loading, facts, upAxis, setUpAxis, open };
}
