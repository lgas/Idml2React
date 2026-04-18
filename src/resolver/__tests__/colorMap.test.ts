import { describe, it, expect } from 'vitest';
import { buildColorMap, applyGradientAngle } from '../styles.resolver';
import type { IdmlColor, IdmlGradient } from '@/types/idml.types';

// ---------------------------------------------------------------------------
// buildColorMap — solid colors
// ---------------------------------------------------------------------------

const color = (self: string, space: IdmlColor['space'], values: number[]): IdmlColor => ({
  self, name: self, space, values,
});

describe('buildColorMap — solid colors', () => {
  it('returns empty map for no colors', () => {
    expect(buildColorMap([])).toEqual(new Map());
  });

  it('maps RGB color correctly', () => {
    const map = buildColorMap([color('Color/Red', 'RGB', [255, 0, 0])]);
    expect(map.get('Color/Red')).toBe('rgb(255, 0, 0)');
  });

  it('maps CMYK pure black (0 0 0 100) to rgb(0, 0, 0)', () => {
    const map = buildColorMap([color('Color/Black', 'CMYK', [0, 0, 0, 100])]);
    expect(map.get('Color/Black')).toBe('rgb(0, 0, 0)');
  });

  it('maps CMYK pure white (0 0 0 0) to rgb(255, 255, 255)', () => {
    const map = buildColorMap([color('Color/White', 'CMYK', [0, 0, 0, 0])]);
    expect(map.get('Color/White')).toBe('rgb(255, 255, 255)');
  });

  it('maps CMYK pure cyan (100 0 0 0) to rgb(0, 255, 255)', () => {
    const map = buildColorMap([color('Color/Cyan', 'CMYK', [100, 0, 0, 0])]);
    expect(map.get('Color/Cyan')).toBe('rgb(0, 255, 255)');
  });

  it('maps CMYK pure magenta (0 100 0 0) to rgb(255, 0, 255)', () => {
    const map = buildColorMap([color('Color/Magenta', 'CMYK', [0, 100, 0, 0])]);
    expect(map.get('Color/Magenta')).toBe('rgb(255, 0, 255)');
  });

  it('maps CMYK pure yellow (0 0 100 0) to rgb(255, 255, 0)', () => {
    const map = buildColorMap([color('Color/Yellow', 'CMYK', [0, 0, 100, 0])]);
    expect(map.get('Color/Yellow')).toBe('rgb(255, 255, 0)');
  });

  it('maps LAB / Mixed color to #000000 fallback', () => {
    const map = buildColorMap([color('Color/Lab', 'LAB' as IdmlColor['space'], [50, 0, 0])]);
    expect(map.get('Color/Lab')).toBe('#000000');
  });

  it('maps multiple colors independently', () => {
    const map = buildColorMap([
      color('Color/R', 'RGB', [255, 0, 0]),
      color('Color/G', 'RGB', [0, 255, 0]),
    ]);
    expect(map.get('Color/R')).toBe('rgb(255, 0, 0)');
    expect(map.get('Color/G')).toBe('rgb(0, 255, 0)');
  });
});

// ---------------------------------------------------------------------------
// buildColorMap — gradients
// ---------------------------------------------------------------------------

const gradient = (
  self: string,
  type: 'Linear' | 'Radial',
  stops: { stopColor: string; location: number }[],
): IdmlGradient => ({ self, name: self, type, stops });

describe('buildColorMap — gradients', () => {
  it('builds linear-gradient CSS for a 2-stop linear gradient', () => {
    const colors = [
      color('Color/Black', 'CMYK', [0, 0, 0, 100]),
      color('Color/White', 'CMYK', [0, 0, 0, 0]),
    ];
    const grads = [
      gradient('Gradient/BW', 'Linear', [
        { stopColor: 'Color/Black', location: 0 },
        { stopColor: 'Color/White', location: 100 },
      ]),
    ];
    const map = buildColorMap(colors, grads);
    const css = map.get('Gradient/BW')!;
    expect(css).toContain('linear-gradient(');
    expect(css).toContain('90deg');
    expect(css).toContain('rgb(0, 0, 0) 0%');
    expect(css).toContain('rgb(255, 255, 255) 100%');
  });

  it('builds radial-gradient CSS for radial gradient', () => {
    const colors = [color('Color/Black', 'CMYK', [0, 0, 0, 100])];
    const grads = [
      gradient('Gradient/R', 'Radial', [{ stopColor: 'Color/Black', location: 0 }]),
    ];
    const map = buildColorMap(colors, grads);
    expect(map.get('Gradient/R')).toContain('radial-gradient(circle,');
  });

  it('falls back to #000000 for unresolved stop color', () => {
    const map = buildColorMap([], [
      gradient('Gradient/X', 'Linear', [{ stopColor: 'Color/Missing', location: 0 }]),
    ]);
    expect(map.get('Gradient/X')).toContain('#000000 0%');
  });

  it('sorts stops by location', () => {
    const colors = [
      color('Color/A', 'RGB', [255, 0, 0]),
      color('Color/B', 'RGB', [0, 0, 255]),
    ];
    const grads = [
      gradient('Gradient/Rev', 'Linear', [
        { stopColor: 'Color/B', location: 100 },
        { stopColor: 'Color/A', location: 0 },
      ]),
    ];
    const map = buildColorMap(colors, grads);
    const css = map.get('Gradient/Rev')!;
    // After sort, Color/A at 0% should appear before Color/B at 100%
    const pos0 = css.indexOf('0%');
    const pos100 = css.indexOf('100%');
    expect(pos0).toBeLessThan(pos100);
  });
});

// ---------------------------------------------------------------------------
// applyGradientAngle
// ---------------------------------------------------------------------------

describe('applyGradientAngle', () => {
  const base = 'linear-gradient(90deg, #000 0%, #fff 100%)';

  it('InDesign angle 0 → CSS 90deg (no-op)', () => {
    expect(applyGradientAngle(base, 0)).toBe(base);
  });

  it('InDesign angle 90 → CSS 0deg', () => {
    const result = applyGradientAngle(base, 90);
    expect(result).toContain('linear-gradient(0deg,');
  });

  it('InDesign angle 45 → CSS 45deg', () => {
    const result = applyGradientAngle(base, 45);
    expect(result).toContain('linear-gradient(45deg,');
  });

  it('InDesign angle 180 → CSS 270deg', () => {
    const result = applyGradientAngle(base, 180);
    expect(result).toContain('linear-gradient(270deg,');
  });

  it('handles angle wrapping: 450 → same as 90 → 0deg', () => {
    const result = applyGradientAngle(base, 450);
    expect(result).toContain('linear-gradient(0deg,');
  });

  it('negative angle wrapping: -90 → CSS 180deg', () => {
    const result = applyGradientAngle(base, -90);
    expect(result).toContain('linear-gradient(180deg,');
  });

  it('does not modify radial-gradient strings', () => {
    const radial = 'radial-gradient(circle, #000 0%, #fff 100%)';
    expect(applyGradientAngle(radial, 45)).toBe(radial);
  });

  it('does not modify non-gradient strings', () => {
    expect(applyGradientAngle('rgb(255, 0, 0)', 45)).toBe('rgb(255, 0, 0)');
    expect(applyGradientAngle('#000000', 90)).toBe('#000000');
  });

  it('preserves stop colors and positions after angle substitution', () => {
    const result = applyGradientAngle(base, 90);
    expect(result).toContain('#000 0%');
    expect(result).toContain('#fff 100%');
  });
});
