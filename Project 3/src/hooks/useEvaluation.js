import { useCallback, useEffect, useRef, useState } from 'react';
import { ERROR_MESSAGE_MS, EVALUATION } from '../config.js';
import { showMessage } from '../state/messages.js';

/**
 * Decode a photo to RGBA bytes at the camera's size. EXIF rotation and colour profiles are
 * ignored, as COLMAP and 3DGS training read the raw pixel values.
 * @param {File} file
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Uint8ClampedArray>}
 */
async function decodePhoto(file, width, height) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'none',
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return context.getImageData(0, 0, width, height).data;
}

/** RGBA bytes to an object URL of a PNG. */
async function imageUrl(rgba, width, height) {
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
  return URL.createObjectURL(await canvas.convertToBlob({ type: 'image/png' }));
}

/** Log an error and show it as a message. */
function fail(text, error) {
  console.error(error);
  const hide = showMessage(`${text}: ${error?.message ?? error}`, 'error');
  setTimeout(hide, ERROR_MESSAGE_MS);
}

/**
 * @typedef {{psnr: number, ssim: number, psnrSplat: number, ssimSplat: number,
 *   coverage: number}} PhotoMetrics - Splat: only where the render's alpha ≥ threshold.
 */

/**
 * PSNR and SSIM of one pane's splat against the COLMAP photos, rendered at each photo's
 * camera and size; the metrics run in a Web Worker. Results are cleared when the pane opens
 * another splat, and a running evaluation stops.
 * @param {ReturnType<typeof import('../viewer/splatViewer.js').createSplatViewer> | null} viewer
 * @param {(import('./usePhotos.js').CapturePhoto & {role: string})[]} photos
 * @param {unknown} splatKey - changes when the pane opens another splat.
 * @returns {{results: Map<string, PhotoMetrics>, progress: {done: number, total: number} | null,
 *   seconds: number | null, evaluate: (onlyTest: boolean) => Promise<void>, cancel: () => void,
 *   difference: {name: string, url: string} | null, showDifference: (photo: object) => void}}
 */
export function useEvaluation(viewer, photos, splatKey) {
  const [results, setResults] = useState(() => new Map());
  const [progress, setProgress] = useState(null);
  const [seconds, setSeconds] = useState(null);
  const [difference, setDifference] = useState(null);
  const [resultsKey, setResultsKey] = useState(splatKey);
  // Bumped to stop a running evaluation (new splat, cancel, unmount).
  const run = useRef(0);
  const worker = useRef(null);
  const pending = useRef(new Map());
  const nextId = useRef(1);

  // Another splat: the old numbers no longer apply.
  // Adjusting state during render: https://react.dev/learn/you-might-not-need-an-effect
  if (resultsKey !== splatKey) {
    setResultsKey(splatKey);
    setResults(new Map());
    setSeconds(null);
    setDifference(null);
  }

  useEffect(() => {
    run.current += 1;
  }, [splatKey]);

  useEffect(
    () => () => {
      run.current += 1;
      worker.current?.terminate();
    },
    [],
  );
  useEffect(() => () => difference && URL.revokeObjectURL(difference.url), [difference]);

  /** Send one job to the worker (started on first use) and wait for its answer. */
  const compute = useCallback((message, transfer) => {
    if (!worker.current) {
      worker.current = new Worker(new URL('../workers/metrics.worker.js', import.meta.url), {
        type: 'module',
      });
      worker.current.onmessage = ({ data }) => {
        const job = pending.current.get(data.id);
        pending.current.delete(data.id);
        if (data.error) job?.reject(new Error(data.error));
        else job?.resolve(data);
      };
    }
    const id = nextId.current++;
    return new Promise((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      worker.current.postMessage({ ...message, id }, transfer);
    });
  }, []);

  /** The render and the photo of one camera, as RGBA bytes. */
  const images = useCallback(
    async (photo) => {
      const { width, height } = photo.intrinsics;
      const render = await viewer.renderPhoto(photo);
      const pixels = await decodePhoto(photo.file, width, height);
      return { render, pixels, width, height };
    },
    [viewer],
  );

  const evaluate = useCallback(
    async (onlyTest) => {
      if (!viewer) return;
      const token = ++run.current;
      const list = photos.filter((photo) => photo.file && (!onlyTest || photo.role === 'test'));
      setResults(new Map());
      setSeconds(null);
      setProgress({ done: 0, total: list.length });
      const started = performance.now();
      try {
        // Pipelined: the next photo is rendered while the worker compares the previous one.
        let previous = Promise.resolve();
        for (const [index, photo] of list.entries()) {
          const { render, pixels, width, height } = await images(photo);
          if (token !== run.current) return;
          await previous;
          previous = compute(
            { render, photo: pixels, width, height, threshold: EVALUATION.coverageThreshold },
            [render.buffer, pixels.buffer],
          ).then((metrics) => {
            if (token !== run.current) return;
            setResults((current) => new Map(current).set(photo.name, metrics));
            setProgress({ done: index + 1, total: list.length });
          });
        }
        await previous;
        if (token !== run.current) return;
        setSeconds((performance.now() - started) / 1000);
      } catch (error) {
        if (token === run.current) fail('Evaluation stopped', error);
      } finally {
        if (token === run.current) setProgress(null);
      }
    },
    [viewer, photos, images, compute],
  );

  const cancel = useCallback(() => {
    run.current += 1;
    setProgress(null);
  }, []);

  const showDifference = useCallback(
    async (photo) => {
      if (!viewer || !photo.file) return;
      try {
        const { render, pixels, width, height } = await images(photo);
        const { difference: rgba } = await compute(
          {
            render,
            photo: pixels,
            width,
            height,
            gain: EVALUATION.differenceGain,
            difference: true,
          },
          [render.buffer, pixels.buffer],
        );
        setDifference({ name: photo.name, url: await imageUrl(rgba, width, height) });
      } catch (error) {
        fail('Could not compute the difference image', error);
      }
    },
    [viewer, images, compute],
  );

  return { results, progress, seconds, evaluate, cancel, difference, showDifference };
}
