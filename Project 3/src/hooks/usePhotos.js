import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_COMPARE, ERROR_MESSAGE_MS, PHOTOS } from '../config.js';
import { showMessage } from '../state/messages.js';
import {
  findColmapFiles,
  parseCamerasBin,
  parseCamerasTxt,
  parseImagesBin,
  parseImagesTxt,
  pinholeIntrinsics,
} from '../utils/colmap.js';
import { cameraPose, photoRoles } from '../utils/photoCamera.js';

/**
 * @typedef {import('../viewer/photoCameras.js').Photo & {file: File | null}} CapturePhoto
 * @typedef {{folder: string, photos: CapturePhoto[], missing: number,
 *   size: {width: number, height: number}, cameraModel: string}} Capture
 */

/** Read a COLMAP model and its photos from the files of a chosen folder. */
async function readCapture(fileList) {
  const entries = [...fileList].map((file) => ({
    path: file.webkitRelativePath || file.name,
    file,
  }));
  const found = findColmapFiles(entries);
  const binary = found.format === 'bin';
  const read = async ({ file }) =>
    binary ? new Uint8Array(await file.arrayBuffer()) : file.text();
  const cameras = (binary ? parseCamerasBin : parseCamerasTxt)(await read(found.cameras));
  const images = (binary ? parseImagesBin : parseImagesTxt)(await read(found.images));
  const distorted = cameras.find((camera) => !pinholeIntrinsics(camera));
  if (distorted) {
    throw new Error(
      `the cameras use the ${distorted.model} model, which has lens distortion. Open the ` +
        'undistorted workspace instead (the output of colmap image_undistorter, e.g. dense/).',
    );
  }
  if (images.length === 0) throw new Error('the COLMAP model has no images.');
  const intrinsics = new Map(cameras.map((camera) => [camera.id, pinholeIntrinsics(camera)]));
  const files = new Map(entries.map(({ path, file }) => [path, file]));
  const photos = images
    .map((image) => ({
      name: image.name,
      file: files.get(found.photoPath(image.name)) ?? null,
      intrinsics: intrinsics.get(image.cameraId),
      ...cameraPose(image),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const first = cameras.find((camera) => camera.id === images[0].cameraId);
  return {
    folder: entries[0].path.split('/')[0],
    photos,
    missing: photos.filter((photo) => !photo.file).length,
    size: { width: first.width, height: first.height },
    cameraModel: first.model,
  };
}

/**
 * The photos of one COLMAP capture, shared by all panes: loading, train/test split, the
 * selected photo (with an object URL for showing it) and the comparison settings.
 * @returns {{capture: Capture | null, photos: (CapturePhoto & {role: 'train' | 'test'})[],
 *   loading: boolean, open: (files: FileList) => Promise<void>, holdOut: number,
 *   setHoldOut: (n: number) => void, selected: (CapturePhoto & {url: string | null}) | null,
 *   select: (name: string | null) => void, visible: boolean, setVisible: (v: boolean) => void,
 *   compare: {mode: string, amount: number}, setCompare: (c: object) => void}}
 */
export function usePhotos() {
  const [capture, setCapture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [holdOut, setHoldOut] = useState(PHOTOS.defaultHoldOut);
  // The chosen photo and an object URL for its image file.
  const [shown, setShown] = useState(null);
  const [visible, setVisible] = useState(true);
  const [compare, setCompare] = useState(DEFAULT_COMPARE);

  const open = useCallback(async (fileList) => {
    if (fileList.length === 0) return;
    setLoading(true);
    const hide = showMessage('Reading the COLMAP model…');
    try {
      setCapture(await readCapture(fileList));
      setShown(null);
    } catch (error) {
      const hideError = showMessage(
        `Could not read the photos: ${error?.message ?? error}`,
        'error',
      );
      setTimeout(hideError, ERROR_MESSAGE_MS);
    } finally {
      hide();
      setLoading(false);
    }
  }, []);

  const photos = useMemo(() => {
    if (!capture) return [];
    const roles = photoRoles(
      capture.photos.map((photo) => photo.name),
      holdOut,
    );
    return capture.photos.map((photo) => ({ ...photo, role: roles.get(photo.name) }));
  }, [capture, holdOut]);

  const select = useCallback(
    (name) => {
      const photo = capture?.photos.find((candidate) => candidate.name === name);
      setShown(photo ? { name, url: photo.file ? URL.createObjectURL(photo.file) : null } : null);
    },
    [capture],
  );
  // Revoke a photo's object URL once another photo is shown.
  useEffect(() => () => shown?.url && URL.revokeObjectURL(shown.url), [shown]);

  const selectedPhoto = photos.find((photo) => photo.name === shown?.name);
  const selected = selectedPhoto ? { ...selectedPhoto, url: shown.url } : null;

  return {
    capture,
    photos,
    loading,
    open,
    holdOut,
    setHoldOut,
    selected,
    select,
    visible,
    setVisible,
    compare,
    setCompare,
  };
}
