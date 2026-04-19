import { describe, it, expect } from 'vitest';
import { buildStyleResolver, buildColorMap } from '../styles.resolver';
import { resolveDocument } from '../document.resolver';
import type { ParsedIdml, IdmlParagraphStyle, IdmlCharacterStyle, IdmlObjectStyle, IdmlColor } from '@/types/idml.types';

// ---------------------------------------------------------------------------
// Minimal ParsedIdml factory
// ---------------------------------------------------------------------------

const makeIdml = (
  paragraphStyles: IdmlParagraphStyle[] = [],
  characterStyles: IdmlCharacterStyle[] = [],
): ParsedIdml => ({
  documentPreferences: { pageWidth: 595, pageHeight: 842 },
  colors: [],
  gradients: [],
  paragraphStyles,
  characterStyles,
  objectStyles: [],
  fonts: [],
  spreads: [],
  stories: [],
});

const buildResolver = (idml: ParsedIdml) =>
  buildStyleResolver(idml, buildColorMap(idml.colors, idml.gradients));

const noStyle = '$ID/[No paragraph style]';
const noCharStyle = '$ID/[No character style]';

const para = (
  appliedParagraphStyle: string,
  overrides?: IdmlParagraphStyle['characterStyle'],
) => ({
  appliedParagraphStyle,
  overrides: overrides ? { characterStyle: overrides } : undefined,
  characterRanges: [],
});

const range = (appliedCharacterStyle = noCharStyle) => ({
  appliedCharacterStyle,
  content: ['text'],
});

// ---------------------------------------------------------------------------
// Paragraph style basedOn
// ---------------------------------------------------------------------------

describe('paragraph style basedOn', () => {
  it('inherits fontSize from parent', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/Base',
        name: 'Base',
        characterStyle: { self: '', name: '', pointSize: 14 },
      },
      {
        self: 'ParagraphStyle/Child',
        name: 'Child',
        basedOn: 'ParagraphStyle/Base',
        characterStyle: { self: '', name: '' },
      },
    ]);

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(para('ParagraphStyle/Child'), range());

    expect(style.fontSize).toBeCloseTo(14 * (96 / 72));
  });

  it('child overrides parent fontSize', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/Base',
        name: 'Base',
        characterStyle: { self: '', name: '', pointSize: 14 },
      },
      {
        self: 'ParagraphStyle/Child',
        name: 'Child',
        basedOn: 'ParagraphStyle/Base',
        characterStyle: { self: '', name: '', pointSize: 20 },
      },
    ]);

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(para('ParagraphStyle/Child'), range());

    expect(style.fontSize).toBeCloseTo(20 * (96 / 72));
  });

  it('inherits paragraph-level spacing from parent', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/Base',
        name: 'Base',
        spaceBefore: 10,
        spaceAfter: 5,
      },
      {
        self: 'ParagraphStyle/Child',
        name: 'Child',
        basedOn: 'ParagraphStyle/Base',
      },
    ]);

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(para('ParagraphStyle/Child'), range());

    expect(style.marginTop).toBeCloseTo(10 * (96 / 72));
    expect(style.marginBottom).toBeCloseTo(5 * (96 / 72));
  });

  it('child overrides parent paragraph spacing', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/Base',
        name: 'Base',
        spaceBefore: 10,
        spaceAfter: 5,
      },
      {
        self: 'ParagraphStyle/Child',
        name: 'Child',
        basedOn: 'ParagraphStyle/Base',
        spaceAfter: 20,
      },
    ]);

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(para('ParagraphStyle/Child'), range());

    expect(style.marginTop).toBeCloseTo(10 * (96 / 72));
    expect(style.marginBottom).toBeCloseTo(20 * (96 / 72));
  });

  it('multi-level chain: grandparent → parent → child', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/Root',
        name: 'Root',
        characterStyle: { self: '', name: '', pointSize: 10 },
        spaceBefore: 4,
      },
      {
        self: 'ParagraphStyle/Mid',
        name: 'Mid',
        basedOn: 'ParagraphStyle/Root',
        characterStyle: { self: '', name: '', fillColor: 'Color/Black' },
      },
      {
        self: 'ParagraphStyle/Leaf',
        name: 'Leaf',
        basedOn: 'ParagraphStyle/Mid',
        characterStyle: { self: '', name: '', pointSize: 24 },
      },
    ]);

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(para('ParagraphStyle/Leaf'), range());

    // fontSize from Leaf (overrides Root's 10pt)
    expect(style.fontSize).toBeCloseTo(24 * (96 / 72));
    // marginTop inherited from Root through Mid
    expect(style.marginTop).toBeCloseTo(4 * (96 / 72));
  });

  it('$ID/ sentinel stops the chain', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/Child',
        name: 'Child',
        basedOn: noStyle,
        characterStyle: { self: '', name: '', pointSize: 16 },
      },
    ]);

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(para('ParagraphStyle/Child'), range());

    expect(style.fontSize).toBeCloseTo(16 * (96 / 72));
  });

  it('missing basedOn ref is silently ignored', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/Child',
        name: 'Child',
        basedOn: 'ParagraphStyle/Ghost',
        characterStyle: { self: '', name: '', pointSize: 12 },
      },
    ]);

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(para('ParagraphStyle/Child'), range());

    expect(style.fontSize).toBeCloseTo(12 * (96 / 72));
  });

  it('cycle in basedOn does not hang', () => {
    const idml = makeIdml([
      {
        self: 'ParagraphStyle/A',
        name: 'A',
        basedOn: 'ParagraphStyle/B',
        characterStyle: { self: '', name: '', pointSize: 10 },
      },
      {
        self: 'ParagraphStyle/B',
        name: 'B',
        basedOn: 'ParagraphStyle/A',
        characterStyle: { self: '', name: '', pointSize: 20 },
      },
    ]);

    const resolver = buildResolver(idml);
    expect(() => resolver.resolveRange(para('ParagraphStyle/A'), range())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Character style basedOn
// ---------------------------------------------------------------------------

describe('character style basedOn', () => {
  it('inherits fontSize from parent character style', () => {
    const idml = makeIdml(
      [{ self: 'ParagraphStyle/Base', name: 'Base' }],
      [
        { self: 'CharacterStyle/Base', name: 'Base', pointSize: 18 },
        { self: 'CharacterStyle/Child', name: 'Child', basedOn: 'CharacterStyle/Base' },
      ],
    );

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(
      para('ParagraphStyle/Base'),
      range('CharacterStyle/Child'),
    );

    expect(style.fontSize).toBeCloseTo(18 * (96 / 72));
  });

  it('child character style overrides parent', () => {
    const idml = makeIdml(
      [{ self: 'ParagraphStyle/Base', name: 'Base' }],
      [
        { self: 'CharacterStyle/Base', name: 'Base', pointSize: 18, tracking: 50 },
        { self: 'CharacterStyle/Child', name: 'Child', basedOn: 'CharacterStyle/Base', pointSize: 24 },
      ],
    );

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(
      para('ParagraphStyle/Base'),
      range('CharacterStyle/Child'),
    );

    expect(style.fontSize).toBeCloseTo(24 * (96 / 72));
    expect(style.letterSpacing).toBeCloseTo(50 / 1000);
  });

  it('multi-level character style chain', () => {
    const idml = makeIdml(
      [{ self: 'ParagraphStyle/Base', name: 'Base' }],
      [
        { self: 'CharacterStyle/Root', name: 'Root', pointSize: 10, tracking: 100 },
        { self: 'CharacterStyle/Mid',  name: 'Mid',  basedOn: 'CharacterStyle/Root', fontStyle: 'Bold' },
        { self: 'CharacterStyle/Leaf', name: 'Leaf', basedOn: 'CharacterStyle/Mid',  pointSize: 32 },
      ],
    );

    const resolver = buildResolver(idml);
    const style = resolver.resolveRange(
      para('ParagraphStyle/Base'),
      range('CharacterStyle/Leaf'),
    );

    expect(style.fontSize).toBeCloseTo(32 * (96 / 72));
    expect(style.fontWeight).toBe('bold');
    expect(style.letterSpacing).toBeCloseTo(100 / 1000);
  });

  it('cycle in character style does not hang', () => {
    const idml = makeIdml(
      [{ self: 'ParagraphStyle/Base', name: 'Base' }],
      [
        { self: 'CharacterStyle/A', name: 'A', basedOn: 'CharacterStyle/B', pointSize: 10 },
        { self: 'CharacterStyle/B', name: 'B', basedOn: 'CharacterStyle/A', pointSize: 20 },
      ],
    );

    const resolver = buildResolver(idml);
    expect(() =>
      resolver.resolveRange(para('ParagraphStyle/Base'), range('CharacterStyle/A'))
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Object style basedOn
// ---------------------------------------------------------------------------

const RED: IdmlColor  = { self: 'Color/Red',  name: 'Red',  space: 'RGB', values: [255, 0, 0] };
const BLUE: IdmlColor = { self: 'Color/Blue', name: 'Blue', space: 'RGB', values: [0, 0, 255] };

const makeIdmlWithObjectStyles = (objectStyles: IdmlObjectStyle[]): ParsedIdml => ({
  documentPreferences: { pageWidth: 595, pageHeight: 842 },
  colors: [RED, BLUE],
  gradients: [],
  paragraphStyles: [],
  characterStyles: [],
  objectStyles,
  fonts: [],
  spreads: [
    {
      self: 'Spread/1',
      pages: [
        {
          self: 'Page/1',
          geometricBounds: [0, 0, 842, 595],
          itemTransform:   [1, 0, 0, 1, 0, 0],
        },
      ],
      textFrames:    [],
      graphicFrames: [
        {
          self:             'Rectangle/1',
          itemTransform:    [1, 0, 0, 1, 100, 100],
          geometricBounds:  [0, 0, 200, 200],
          appliedObjectStyle: 'ObjectStyle/Child',
        },
      ],
      polygons: [],
    },
  ],
  stories: [],
});

const getFrame = (idml: ParsedIdml) =>
  resolveDocument(idml).pages[0].graphicFrames[0];

describe('object style basedOn', () => {
  it('inherits fillColor from parent', () => {
    const idml = makeIdmlWithObjectStyles([
      { self: 'ObjectStyle/Base',  name: 'Base',  fillColor: 'Color/Red' },
      { self: 'ObjectStyle/Child', name: 'Child', basedOn: 'ObjectStyle/Base' },
    ]);

    expect(getFrame(idml).fillColor).toBe('rgb(255, 0, 0)');
  });

  it('child overrides parent fillColor', () => {
    const idml = makeIdmlWithObjectStyles([
      { self: 'ObjectStyle/Base',  name: 'Base',  fillColor: 'Color/Red' },
      { self: 'ObjectStyle/Child', name: 'Child', basedOn: 'ObjectStyle/Base', fillColor: 'Color/Blue' },
    ]);

    expect(getFrame(idml).fillColor).toBe('rgb(0, 0, 255)');
  });

  it('inherits strokeWeight from parent', () => {
    const PT_TO_PX = 96 / 72;
    const idml = makeIdmlWithObjectStyles([
      { self: 'ObjectStyle/Base',  name: 'Base',  strokeWeight: 4 },
      { self: 'ObjectStyle/Child', name: 'Child', basedOn: 'ObjectStyle/Base' },
    ]);

    expect(getFrame(idml).strokeWeight).toBeCloseTo(4 * PT_TO_PX);
  });

  it('inherits borderRadius from parent', () => {
    const PT_TO_PX = 96 / 72;
    const idml = makeIdmlWithObjectStyles([
      {
        self: 'ObjectStyle/Base', name: 'Base',
        topLeftCornerRadius: 8, topLeftCornerOption: 'RoundedCorner',
        topRightCornerRadius: 8, topRightCornerOption: 'RoundedCorner',
        bottomRightCornerRadius: 8, bottomRightCornerOption: 'RoundedCorner',
        bottomLeftCornerRadius: 8, bottomLeftCornerOption: 'RoundedCorner',
      },
      { self: 'ObjectStyle/Child', name: 'Child', basedOn: 'ObjectStyle/Base' },
    ]);

    const r = 8 * PT_TO_PX;
    expect(getFrame(idml).borderRadius).toBe(`${r}px ${r}px ${r}px ${r}px`);
  });

  it('multi-level chain: grandparent → parent → child', () => {
    const idml = makeIdmlWithObjectStyles([
      { self: 'ObjectStyle/Root',  name: 'Root',  fillColor: 'Color/Red', strokeWeight: 2 },
      { self: 'ObjectStyle/Mid',   name: 'Mid',   basedOn: 'ObjectStyle/Root', strokeWeight: 6 },
      { self: 'ObjectStyle/Child', name: 'Child', basedOn: 'ObjectStyle/Mid' },
    ]);

    const frame = getFrame(idml);
    expect(frame.fillColor).toBe('rgb(255, 0, 0)');       // from Root
    expect(frame.strokeWeight).toBeCloseTo(6 * (96 / 72)); // Mid overrides Root
  });

  it('$ID/ sentinel stops the chain', () => {
    const idml = makeIdmlWithObjectStyles([
      {
        self: 'ObjectStyle/Child', name: 'Child',
        basedOn: '$ID/[None]',
        fillColor: 'Color/Blue',
      },
    ]);

    expect(getFrame(idml).fillColor).toBe('rgb(0, 0, 255)');
  });

  it('cycle in basedOn does not hang', () => {
    const idml = makeIdmlWithObjectStyles([
      { self: 'ObjectStyle/A', name: 'A', basedOn: 'ObjectStyle/B', fillColor: 'Color/Red' },
      { self: 'ObjectStyle/B', name: 'B', basedOn: 'ObjectStyle/A', fillColor: 'Color/Blue' },
    ]);

    expect(() => getFrame(idml)).not.toThrow();
  });
});
