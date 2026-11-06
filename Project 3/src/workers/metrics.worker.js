// Web Worker: decodes one photo and computes PSNR and SSIM of a render against it, off the main
// thread (SSIM on a 3-megapixel photo takes long enough to freeze the page). hooks/useEvaluation.js
// runs a few of these side by side. Worker module: https://vite.dev/guide/features#web-workers
import {
  alphaMask,
  differenceImage,
  errorHistogram,
  meanOver,
  meanSignedDifference,
  psnr,
  ssimMap,
} from '../utils/metrics.js';

/**
 * Decode a photo to RGBA bytes at the camera's size. EXIF rotation and colour profiles are
 * ignored, as COLMAP and 3DGS training read the raw pixel values. createImageBitmap and
 * OffscreenCanvas both work in workers:
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
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
 * Message in: {id, render, photoFile, width, height, threshold, gain, detail}; render is RGBA
 * bytes, top row first; photoFile is the photo's image file. Message out: {id, metrics} or, with
 * detail, also the decoded photo bytes, the difference image, the error histograms (whole photo
 * and splat area) and the mean signed difference render − photo in the splat area; or
 * {id, error}.
 */
self.onmessage = async ({ data }) => {
  const { id, render, photoFile, width, height, threshold, gain } = data;
  try {
    const photo = await decodePhoto(photoFile, width, height);
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
        photo,
        difference,
        histogram,
        histogramSplat,
        offset: meanSignedDifference(render, photo, mask),
      },
      [photo.buffer, difference.buffer, histogram.buffer, histogramSplat.buffer],
    );
  } catch (error) {
    self.postMessage({ id, error: error?.message ?? String(error) });
  }
};
