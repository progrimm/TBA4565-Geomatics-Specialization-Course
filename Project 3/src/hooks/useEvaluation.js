import { useCallback, useEffect, useRef, useState } from 'react';
import { ERROR_MESSAGE_MS, EVALUATION } from '../config.js';
import { showMessage } from '../state/messages.js';
import { createWorkerPool, poolSize } from '../utils/workerPool.js';

const createMetricsWorker = () =>
  new Worker(new URL('../workers/metrics.worker.js', import.meta.url), { type: 'module' });

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
 * @typedef {{name: string, width: number, height: number, url: string, metrics: PhotoMetrics,
 *   histogram: Uint32Array, histogramSplat: Uint32Array, offset: number[],
 *   render: Uint8Array, photo: Uint8ClampedArray}} PhotoDetail
 *   One photo in detail: the difference image (url), error histograms of the whole photo and
 *   of the splat area, the mean signed difference render − photo (R, G, B levels, splat area),
 *   and both images for reading single pixels.
 */

/**
 * PSNR and SSIM of one pane's splat against the COLMAP photos, rendered at each photo's
 * camera and size. The photos are decoded and compared in a small pool of Web Workers, so while
 * the GPU renders the next photo, several earlier ones are compared at once. Results are cleared
 * when the pane opens another splat, and a running evaluation stops.
 * @param {ReturnType<typeof import('../viewer/splatViewer.js').createSplatViewer> | null} viewer
 * @param {(import('./usePhotos.js').CapturePhoto & {role: string})[]} photos
 * @param {unknown} splatKey - changes when the pane opens another splat.
 * @returns {{results: Map<string, PhotoMetrics>, progress: {done: number, total: number} | null,
 *   seconds: number | null, evaluate: (onlyTest: boolean) => Promise<void>, cancel: () => void,
 *   detail: PhotoDetail | null, analysing: string | null, analyse: (photo: object) => void}}
 */
export function useEvaluation(viewer, photos, splatKey) {
  const [results, setResults] = useState(() => new Map());
  const [progress, setProgress] = useState(null);
  const [seconds, setSeconds] = useState(null);
  const [detail, setDetail] = useState(null);
  const [analysing, setAnalysing] = useState(null);
  const [resultsKey, setResultsKey] = useState(splatKey);
  // Bumped to stop a running evaluation (new splat, cancel, unmount).
  const run = useRef(0);
  const pool = useRef(null);

  // Another splat: the old numbers no longer apply.
  // Adjusting state during render: https://react.dev/learn/you-might-not-need-an-effect
  if (resultsKey !== splatKey) {
    setResultsKey(splatKey);
    setResults(new Map());
    setSeconds(null);
    setDetail(null);
  }

  // Bumped for another splat or unmount, so an analysis started before is dropped.
  const generation = useRef(0);
  useEffect(() => {
    run.current += 1;
    generation.current += 1;
  }, [splatKey]);

  useEffect(
    () => () => {
      run.current += 1;
      generation.current += 1;
      pool.current?.terminate();
    },
    [],
  );
  useEffect(() => () => detail && URL.revokeObjectURL(detail.url), [detail]);

  /** The worker pool, started on first use. */
  const workers = useCallback(() => {
    pool.current ??= createWorkerPool(
      createMetricsWorker,
      poolSize(EVALUATION.workers, navigator.hardwareConcurrency),
    );
    return pool.current;
  }, []);

  /** Render one photo's camera and compare it with the photo in a worker. */
  const compare = useCallback(
    async (photo, options = {}) => {
      const { width, height } = photo.intrinsics;
      const render = await viewer.renderPhoto(photo);
      const kept = options.detail ? render.slice() : null;
      const job = workers().run(
        {
          render,
          photoFile: photo.file,
          width,
          height,
          threshold: EVALUATION.coverageThreshold,
          ...options,
        },
        [render.buffer],
      );
      return { job, render: kept, width, height };
    },
    [viewer, workers],
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
        // Pipelined: the GPU renders the next photo while the workers compare earlier ones. At
        // most one job per worker is in flight, so renders do not pile up in memory.
        const limit = workers().size;
        const running = new Set();
        let done = 0;
        let failure = null;
        for (const photo of list) {
          while (running.size >= limit) await Promise.race(running);
          if (failure) throw failure;
          if (token !== run.current) return;
          const { job } = await compare(photo);
          const tracked = job
            .then(({ metrics }) => {
              if (token !== run.current) return;
              done += 1;
              setResults((current) => new Map(current).set(photo.name, metrics));
              setProgress({ done, total: list.length });
            })
            .catch((error) => {
              failure ??= error;
            })
            .finally(() => running.delete(tracked));
          running.add(tracked);
        }
        await Promise.all(running);
        if (failure) throw failure;
        if (token !== run.current) return;
        setSeconds((performance.now() - started) / 1000);
      } catch (error) {
        if (token === run.current) fail('Evaluation stopped', error);
      } finally {
        if (token === run.current) setProgress(null);
      }
    },
    [viewer, photos, workers, compare],
  );

  const cancel = useCallback(() => {
    run.current += 1;
    setProgress(null);
  }, []);

  /** One photo in detail; its metrics also go into the results table. */
  const analyse = useCallback(
    async (photo) => {
      if (!viewer || !photo.file) return;
      const current = generation.current;
      setAnalysing(photo.name);
      try {
        // A copy of the render stays here for the pixel readout; the worker sends the photo back.
        const { job, render, width, height } = await compare(photo, {
          gain: EVALUATION.differenceGain,
          detail: true,
        });
        const data = await job;
        const url = await imageUrl(data.difference, width, height);
        if (current !== generation.current) {
          URL.revokeObjectURL(url);
          return;
        }
        setResults((map) => new Map(map).set(photo.name, data.metrics));
        setDetail({
          name: photo.name,
          width,
          height,
          url,
          metrics: data.metrics,
          histogram: data.histogram,
          histogramSplat: data.histogramSplat,
          offset: data.offset,
          render,
          photo: data.photo,
        });
      } catch (error) {
        if (current === generation.current) fail(`Could not evaluate ${photo.name}`, error);
      } finally {
        if (current === generation.current) setAnalysing(null);
      }
    },
    [viewer, compare],
  );

  return { results, progress, seconds, evaluate, cancel, detail, analysing, analyse };
}
