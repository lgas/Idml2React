import { describe, it, expect } from 'vitest';
import { toArray, str, num } from '../parser.helper';

describe('toArray', () => {
  it('returns empty array for undefined', () => {
    expect(toArray(undefined)).toEqual([]);
  });

  it('returns empty array for null-ish falsy value', () => {
    expect(toArray(0 as unknown as undefined)).toEqual([]);
  });

  it('wraps a scalar in an array', () => {
    expect(toArray('hello')).toEqual(['hello']);
    expect(toArray(42)).toEqual([42]);
    expect(toArray({ a: 1 })).toEqual([{ a: 1 }]);
  });

  it('passes through an array unchanged', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
    expect(toArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('does not double-wrap an array', () => {
    const arr = [1, 2];
    expect(toArray(arr)).toBe(arr);
  });
});

describe('str', () => {
  it('returns undefined for empty string', () => {
    expect(str('')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(str(undefined)).toBeUndefined();
  });

  it('returns the value when non-empty', () => {
    expect(str('hello')).toBe('hello');
    expect(str(' ')).toBe(' ');
    expect(str('0')).toBe('0');
  });
});

describe('num', () => {
  it('returns undefined for empty string', () => {
    expect(num('')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(num(undefined)).toBeUndefined();
  });

  it('parses integer strings', () => {
    expect(num('42')).toBe(42);
    expect(num('0')).toBe(0);
    expect(num('-5')).toBe(-5);
  });

  it('parses float strings', () => {
    expect(num('12.5')).toBe(12.5);
    expect(num('0.001')).toBe(0.001);
  });

  it('returns NaN for non-numeric strings', () => {
    expect(num('abc')).toBeNaN();
  });
});
