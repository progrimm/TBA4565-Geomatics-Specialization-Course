// Web Worker: PSNR and SSIM of one render against its photo, off the main thread (SSIM on a
// 3-megapixel photo takes long enough to freeze the page). Started by hooks/useEvaluation.js.
// Worker module: https://vite.dev/guide/features#web-workers
import {
  alphaMask,
  differenceImage,
  errorHistogram,
  meanOver,
  meanSignedDifference,
  psnr,
  ssimMap,
} from '../utils/metrics.js';

/** PSNR and SSIM over the whole photo and over the splat area. */
function metrics(render, photo, width, height, mask, coverage) {
  const map = ssimMap(render, photo, width, height);
  return {
    psnr: psnr(render, photo),
    ssim: meanOver(map),
    psnrSplat: psnr(render, photo, mask),
    ssimSplat: meanOver(map, mask),
    coverage,
  };
}

/**
 * Message in: {id, render, photo, width, height, threshold, gain, detail}; render and photo
 * are RGBA bytes, top row first. Message out: {id, metrics} or, with detail, also the
 * difference image, the error histograms (whole photo and splat area) and the mean signed
 * difference render − photo in the splat area; or {id, error}.
 */
self.onmessage = ({ data }) => {
  const { id, render, photo, width, height, threshold, gain } = data;
  try {
    // "Splat area": the pixels the splat covers, for splats cropped to an object.
    const { mask, coverage } = alphaMask(render, threshold);
    const result = { id, metrics: metrics(render, photo, width, height, mask, coverage) };
    if (!data.detail) {
      self.postMessage(result);
      return;
    }
    const difference = differenceImage(render, photo, gain);
    const histogram = errorHistogram(render, photo);
    const histogramSplat = errorHistogram(render, photo, mask);
    self.postMessage(
      {
        ...result,
        difference,
        histogram,
        histogramSplat,
        offset: meanSignedDifference(render, photo, mask),
      },
      [difference.buffer, histogram.buffer, histogramSplat.buffer],
    );
  } catch (error) {
    self.postMessage({ id, error: error?.message ?? String(error) });
  }
};
