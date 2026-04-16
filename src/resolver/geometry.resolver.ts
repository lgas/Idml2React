import type { ItemTransform, GeometricBounds } from '../types/idml.types';

const PT_TO_PX = 96 / 72;
const pt = (v: number) => v * PT_TO_PX;

// ---------------------------------------------------------------------------
// Core transform math
// ---------------------------------------------------------------------------

/**
 * Apply an affine matrix to a 2D point.
 * IDML matrix: [a, b, c, d, tx, ty]
 *   x' = a*x + c*y + tx
 *   y' = b*x + d*y + ty
 */
const applyTransform = (
  [a, b, c, d, tx, ty]: ItemTransform,
  x: number,
  y: number,
): [number, number] => [
  a * x + c * y + tx,
  b * x + d * y + ty,
];

/**
 * Transform all 4 corners of a bounds rect and return the axis-aligned
 * bounding box in the parent coordinate space.
 * This correctly handles rotation and skew.
 */
const transformBounds = (
  transform: ItemTransform,
  [top, left, bottom, right]: GeometricBounds,
): { x: number; y: number; width: number; height: number } => {
  const corners: [number, number][] = [
    applyTransform(transform, left,  top),     // TL
    applyTransform(transform, right, top),     // TR
    applyTransform(transform, left,  bottom),  // BL
    applyTransform(transform, right, bottom),  // BR
  ];

  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);

  return {
    x:      Math.min(...xs),
    y:      Math.min(...ys),
    width:  Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FrameGeometry {
  x:      number;   // px, relative to page top-left
  y:      number;
  width:  number;
  height: number;
}

export interface PageGeometry {
  /** Page top-left in spread space (px) — used to make frames page-relative */
  spreadX: number;
  spreadY: number;
  width:   number;
  height:  number;
}

// ---------------------------------------------------------------------------
// Page geometry
// ---------------------------------------------------------------------------

/**
 * Compute a page's position and size in spread space (px).
 */
export const resolvePageGeometry = (
  itemTransform: ItemTransform,
  geometricBounds: GeometricBounds,
): PageGeometry => {
  const { x, y, width, height } = transformBounds(itemTransform, geometricBounds);
  return {
    spreadX: pt(x),
    spreadY: pt(y),
    width:   pt(width),
    height:  pt(height),
  };
};

// ---------------------------------------------------------------------------
// Frame geometry
// ---------------------------------------------------------------------------

/**
 * Compute a frame's position and size relative to its containing page (px).
 *
 * Frames live in spread space in IDML — we subtract the page origin so
 * that (0, 0) = page top-left for the renderer.
 */
export const resolveFrameGeometry = (
  itemTransform: ItemTransform,
  geometricBounds: GeometricBounds,
  page: PageGeometry,
): FrameGeometry => {
  const { x, y, width, height } = transformBounds(itemTransform, geometricBounds);
  return {
    x:      pt(x) - page.spreadX,
    y:      pt(y) - page.spreadY,
    width:  pt(width),
    height: pt(height),
  };
};

// ---------------------------------------------------------------------------
// Page assignment
// ---------------------------------------------------------------------------

/**
 * Find which page a frame belongs to, based on the frame's center point
 * in spread space. Falls back to the first page if none matches.
 */
export const findPageForFrame = (
  itemTransform: ItemTransform,
  geometricBounds: GeometricBounds,
  pages: Array<{ self: string; geometry: PageGeometry }>,
): { self: string; geometry: PageGeometry } => {
  const { x, y, width, height } = transformBounds(itemTransform, geometricBounds);
  const centerX = pt(x + width  / 2);
  const centerY = pt(y + height / 2);

  const match = pages.find(({ geometry: g }) =>
    centerX >= g.spreadX &&
    centerX <= g.spreadX + g.width &&
    centerY >= g.spreadY &&
    centerY <= g.spreadY + g.height,
  );

  return match ?? pages[0];
};
