import { describe, it, expect } from 'vitest';
import {
  applyTransform,
  resolvePageGeometry,
  resolveFrameGeometry,
  findPageForFrame,
} from '../geometry.resolver';
import type { ItemTransform, GeometricBounds } from '@/types/idml.types';
import type { PageGeometry } from '../geometry.resolver';

const PT_TO_PX = 96 / 72;
const pt = (v: number) => v * PT_TO_PX;

// ---------------------------------------------------------------------------
// applyTransform
// ---------------------------------------------------------------------------

describe('applyTransform', () => {
  it('identity transform leaves point unchanged', () => {
    const identity: ItemTransform = [1, 0, 0, 1, 0, 0];
    expect(applyTransform(identity, 10, 20)).toEqual([10, 20]);
  });

  it('pure translation moves the point', () => {
    const t: ItemTransform = [1, 0, 0, 1, 10, 20];
    expect(applyTransform(t, 0, 0)).toEqual([10, 20]);
    expect(applyTransform(t, 5, 3)).toEqual([15, 23]);
  });

  it('uniform scale', () => {
    const t: ItemTransform = [2, 0, 0, 3, 0, 0];
    expect(applyTransform(t, 5, 4)).toEqual([10, 12]);
  });

  it('90° rotation (counter-clockwise): [0,1,-1,0,0,0]', () => {
    // x' = 0*x + (-1)*y + 0 = -y
    // y' = 1*x + 0*y + 0 = x
    const t: ItemTransform = [0, 1, -1, 0, 0, 0];
    const [x, y] = applyTransform(t, 1, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
  });

  it('negative scale (flip)', () => {
    const t: ItemTransform = [-1, 0, 0, 1, 0, 0];
    expect(applyTransform(t, 10, 5)).toEqual([-10, 5]);
  });

  it('combined scale + translate', () => {
    const t: ItemTransform = [2, 0, 0, 2, 100, 50];
    expect(applyTransform(t, 10, 10)).toEqual([120, 70]);
  });
});

// ---------------------------------------------------------------------------
// resolvePageGeometry
// ---------------------------------------------------------------------------

describe('resolvePageGeometry', () => {
  it('identity transform: converts bounds to px', () => {
    const identity: ItemTransform = [1, 0, 0, 1, 0, 0];
    // bounds = [top, left, bottom, right]
    const bounds: GeometricBounds = [0, 0, 842, 595];
    const geo = resolvePageGeometry(identity, bounds);
    expect(geo.spreadX).toBeCloseTo(pt(0));
    expect(geo.spreadY).toBeCloseTo(pt(0));
    expect(geo.width).toBeCloseTo(pt(595));
    expect(geo.height).toBeCloseTo(pt(842));
  });

  it('page translated to right (two-page spread)', () => {
    const t: ItemTransform = [1, 0, 0, 1, 297.5, 0];
    const bounds: GeometricBounds = [0, 0, 842, 297.5];
    const geo = resolvePageGeometry(t, bounds);
    expect(geo.spreadX).toBeCloseTo(pt(297.5));
  });

  it('produces non-negative width and height for rotated page', () => {
    // 180° rotation
    const t: ItemTransform = [-1, 0, 0, -1, 595, 842];
    const bounds: GeometricBounds = [0, 0, 842, 595];
    const geo = resolvePageGeometry(t, bounds);
    expect(geo.width).toBeGreaterThan(0);
    expect(geo.height).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// resolveFrameGeometry
// ---------------------------------------------------------------------------

describe('resolveFrameGeometry', () => {
  const page: PageGeometry = {
    spreadX: pt(0),
    spreadY: pt(0),
    width: pt(595),
    height: pt(842),
  };

  it('frame at origin of page has x=0, y=0', () => {
    const t: ItemTransform = [1, 0, 0, 1, 0, 0];
    const bounds: GeometricBounds = [0, 0, 100, 200];
    const geo = resolveFrameGeometry(t, bounds, page);
    expect(geo.x).toBeCloseTo(0);
    expect(geo.y).toBeCloseTo(0);
    expect(geo.width).toBeCloseTo(pt(200));
    expect(geo.height).toBeCloseTo(pt(100));
  });

  it('subtracts page spreadX/spreadY from frame coordinates', () => {
    const page2: PageGeometry = { spreadX: pt(100), spreadY: pt(50), width: pt(595), height: pt(842) };
    const t: ItemTransform = [1, 0, 0, 1, 150, 80];
    const bounds: GeometricBounds = [0, 0, 40, 60];
    const geo = resolveFrameGeometry(t, bounds, page2);
    expect(geo.x).toBeCloseTo(pt(150) - pt(100));
    expect(geo.y).toBeCloseTo(pt(80) - pt(50));
  });

  it('frame size is unaffected by page offset', () => {
    const pageOffset: PageGeometry = { spreadX: pt(200), spreadY: pt(0), width: pt(595), height: pt(842) };
    const t: ItemTransform = [1, 0, 0, 1, 210, 10];
    const bounds: GeometricBounds = [0, 0, 50, 100];
    const geo = resolveFrameGeometry(t, bounds, pageOffset);
    expect(geo.width).toBeCloseTo(pt(100));
    expect(geo.height).toBeCloseTo(pt(50));
  });
});

// ---------------------------------------------------------------------------
// findPageForFrame
// ---------------------------------------------------------------------------

describe('findPageForFrame', () => {
  const makePage = (id: string, sx: number, sy: number, w: number, h: number) => ({
    self: id,
    geometry: { spreadX: pt(sx), spreadY: pt(sy), width: pt(w), height: pt(h) },
  });

  const pages = [
    makePage('page1', 0, 0, 595, 842),
    makePage('page2', 595, 0, 595, 842),
  ];

  it('frame centered on left page is assigned to page1', () => {
    const t: ItemTransform = [1, 0, 0, 1, 100, 200];
    const bounds: GeometricBounds = [0, 0, 100, 100];
    const result = findPageForFrame(t, bounds, pages);
    expect(result.self).toBe('page1');
  });

  it('frame centered on right page is assigned to page2', () => {
    const t: ItemTransform = [1, 0, 0, 1, 700, 200];
    const bounds: GeometricBounds = [0, 0, 100, 100];
    const result = findPageForFrame(t, bounds, pages);
    expect(result.self).toBe('page2');
  });

  it('falls back to pages[0] when frame center is outside all pages', () => {
    const t: ItemTransform = [1, 0, 0, 1, 2000, 2000];
    const bounds: GeometricBounds = [0, 0, 10, 10];
    const result = findPageForFrame(t, bounds, pages);
    expect(result.self).toBe('page1');
  });

  it('works with a single page', () => {
    const singlePage = [makePage('only', 0, 0, 595, 842)];
    const t: ItemTransform = [1, 0, 0, 1, 300, 400];
    const bounds: GeometricBounds = [0, 0, 50, 50];
    const result = findPageForFrame(t, bounds, singlePage);
    expect(result.self).toBe('only');
  });
});
