// Web Worker: PSNR and SSIM of one render against its photo, off the main thread (SSIM on a
// 3-megapixel photo takes long enough to freeze the page). Started by hooks/useEvaluation.js.
// Worker module: https://vite.dev/guide/features#web-workers
import { alphaMask, differenceImage, meanOver, psnr, ssimMap } from '../utils/metrics.js';

/**
 * Message in: {id, render, photo, width, height, threshold, gain, difference}; render and
 * photo are RGBA bytes, top row first. Message out: {id, psnr, ssim, psnrSplat, ssimSplat,
 * coverage, difference?} or {id, error}.
 */
self.onmessage = ({ data }) => {
  const { id, render, photo, width, height, threshold, gain } = data;
  try {
    if (data.difference) {
      const image = differenceImage(render, photo, gain);
      self.postMessage({ id, difference: image }, [image.buffer]);
      return;
    }
    // "Splat area": the pixels the splat covers, for splats cropped to an object.
    const { mask, coverage } = alphaMask(render, threshold);
    const map = ssimMap(render, photo, width, height);
    self.postMessage({
      id,
      psnr: psnr(render, photo),
      ssim: meanOver(map),
      psnrSplat: psnr(render, photo, mask),
      ssimSplat: meanOver(map, mask),
      coverage,
    });
  } catch (error) {
    self.postMessage({ id, error: error?.message ?? String(error) });
  }
};
