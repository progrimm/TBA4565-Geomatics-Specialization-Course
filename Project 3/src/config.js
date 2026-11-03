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

/**
 * Backgrounds behind the splats (all panes). Colour backgrounds are a plain clear colour;
 * navy is NTNU navy, as --stage in style.css. The sky is generated in the browser
 * (viewer/backgrounds.js), so no image is downloaded.
 */
export const BACKGROUNDS = [
  { id: 'navy', label: 'Navy', color: '#0f2a47' },
  { id: 'black', label: 'Black', color: '#000000' },
  { id: 'sky', label: 'Sky' },
];
export const DEFAULT_BACKGROUND = 'navy';

/**
 * Sky background: three.js's Sky shader (Preetham daylight model with clouds), rendered
 * once into a cube map. Scattering parameters as in the three.js Sky example; the sun is
 * placed by elevation above the horizon and azimuth (degrees). exposure scales the sky's
 * light before tone mapping (as renderer.toneMappingExposure in the example). Below the
 * horizon the sky fades to groundColor over groundFade (sine of the angle below the horizon).
 */
export const SKY = {
  turbidity: 2,
  rayleigh: 1,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  cloudCoverage: 0.4,
  sunElevationDeg: 25,
  sunAzimuthDeg: 200,
  exposure: 0.5,
  groundColor: '#5b6452',
  groundFade: 0.06,
  cubeSize: 512,
};

/**
 * At most this many panes (each its own WebGL view and splat). Browsers allow about 16
 * WebGL contexts per page; memory for the open splats is the real limit.
 */
export const MAX_PANES = 4;

/** Smallest share of a split either pane may get when a divider is dragged. */
export const MIN_PANE_FRACTION = 0.15;

/** How far one arrow-key press moves a focused divider (share of its split). */
export const DIVIDER_KEY_STEP = 0.05;

/**
 * COLMAP photos: frustum depth as a fraction of the scene size; colours of training, test and
 * selected photos; the hold-out ("every Nth photo is a test photo"; 0 = none) to start with.
 */
export const PHOTOS = {
  frustumFraction: 0.08,
  trainColor: '#4fc3f7',
  testColor: '#e573d4',
  selectedColor: '#ffffff',
  defaultHoldOut: 0,
  maxHoldOut: 50,
};

/** How a photo is compared with the splat in photo view; amount = swipe position or opacity. */
export const COMPARE_MODES = [
  { id: 'splat', label: 'Splat' },
  { id: 'photo', label: 'Photo' },
  { id: 'swipe', label: 'Swipe' },
  { id: 'blend', label: 'Blend' },
  { id: 'difference', label: 'Difference' },
];
export const DEFAULT_COMPARE = { mode: 'swipe', amount: 0.5 };

/**
 * Evaluation against the photos. Renders are made at the photo's size on black, the 3DGS
 * default background. "Splat area" metrics count only pixels with render alpha at least
 * coverageThreshold. The difference image shows the mean RGB error times differenceGain.
 */
export const EVALUATION = { coverageThreshold: 0.5, differenceGain: 4 };

/** While measuring, a press that moves more than this (CSS px) is a drag, not a pick. */
export const CLICK_TOLERANCE_PX = 5;

/** How long an error message stays up (ms); opening another file also clears it. */
export const ERROR_MESSAGE_MS = 10_000;

/**
 * Width of the controls panel on wide screens (CSS px): default, limits, the room always left
 * for the panes, and the step of one arrow-key press on the resize handle.
 */
export const PANEL = { width: 300, minWidth: 260, maxWidth: 640, paneRoom: 360, keyStep: 16 };

/** Same breakpoint as the mobile media query in style.css. */
export const MOBILE_QUERY = '(max-width: 640px)';

/** The "My GIS module" homepage, relative to this app's subpath. */
export const HOME_URL = '../';
