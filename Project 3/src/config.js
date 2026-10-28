// Constants for the viewer: one place for formats, camera and display settings.

/**
 * Splat file formats the viewer accepts, by file extension. All are read by Spark
 * 2.4.0 from the file's bytes: https://sparkjs.dev/docs/
 */
export const FORMATS = {
  ply: 'PLY (3DGS training output)',
  spz: 'SPZ (Niantic, compressed)',
  splat: '.splat (antimatter15)',
  ksplat: '.ksplat (mkkellogg GaussianSplats3D)',
  sog: 'SOG (PlayCanvas, compressed)',
};

/** `accept` value for the file input, e.g. ".ply,.spz,…". */
export const ACCEPT = Object.keys(FORMATS)
  .map((extension) => `.${extension}`)
  .join(',');

/**
 * Splat centres inside this central fraction (per axis) are used to frame the
 * camera. Trained splats often have a few "floaters" far from the scene, which
 * would make a plain bounding box (and the camera distance) far too large.
 */
export const CORE_FRACTION = 0.96;

/** At most this many splat centres are sorted for the core bounds (evenly sampled). */
export const CORE_MAX_SAMPLES = 500_000;

/** Camera: vertical field of view (degrees), and where it looks from on reset. */
export const CAMERA = {
  verticalFovDeg: 60,
  // Direction from the target to the camera, in the viewer frame (+y up).
  viewDirection: [0.6, 0.45, 1],
  // Near/far planes as fractions/multiples of the framing distance.
  nearFactor: 0.001,
  farFactor: 100,
};

/** Up axis of the file's coordinates, as stored. 3DGS/COLMAP output is usually −y. */
export const UP_AXES = ['+y', '-y', '+z', '-z'];
export const DEFAULT_UP_AXIS = '-y';

/** Measurement markers: diameter as a fraction of the view height, and colour. */
export const MARKER = { screenSize: 0.025, color: '#f5a623' };

/** While measuring, a press that moves more than this (CSS px) is a drag, not a pick. */
export const CLICK_TOLERANCE_PX = 5;

/** How long an error message stays up (ms); opening another file also clears it. */
export const ERROR_MESSAGE_MS = 10_000;

/** Same breakpoint as the mobile media query in style.css. */
export const MOBILE_QUERY = '(max-width: 640px)';

/** The "My GIS module" homepage, relative to this app's subpath. */
export const HOME_URL = '../';
