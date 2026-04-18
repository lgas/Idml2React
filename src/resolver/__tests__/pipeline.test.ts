/**
 * Comprehensive pipeline tests — verifies every parsed prop flows correctly
 * through resolve → render (CSS prop names used in components).
 *
 * Coverage map:
 *   IdmlCharacterStyle  → ResolvedTextStyle  → IdmlTextRun CSS
 *   IdmlParagraphStyle  → ResolvedTextStyle  → IdmlParagraph CSS
 *   4-layer cascade priority
 *   $ID/ prefixed basedOn inheritance (NormalParagraphStyle pattern)
 *   Paragraph inline overrides (all props incl. firstLineIndent)
 */

import { describe, it, expect } from 'vitest';
import { buildStyleResolver } from '../styles.resolver';
import { resolveDocument } from '../document.resolver';
import type {
  ParsedIdml,
  IdmlParagraphStyle,
  IdmlCharacterStyle,
  IdmlObjectStyle,
  IdmlColor,
  IdmlGraphicFrame,
  IdmlTextFrame,
  IdmlPolygon,
  GeometricBounds,
  ItemTransform,
} from '@/types/idml.types';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const PT_TO_PX = 96 / 72;
const pt = (v: number) => v * PT_TO_PX;

const NO_PARA_STYLE  = '$ID/[No paragraph style]';
const NO_CHAR_STYLE  = '$ID/[No character style]';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const makeIdml = (
  paragraphStyles: IdmlParagraphStyle[] = [],
  characterStyles: IdmlCharacterStyle[] = [],
  colors: IdmlColor[] = [],
): ParsedIdml => ({
  documentPreferences: { pageWidth: 595, pageHeight: 842 },
  colors,
  gradients: [],
  paragraphStyles,
  characterStyles,
  objectStyles: [],
  spreads: [],
  stories: [],
});

/** Single paragraph range helper */
const paraRange = (
  appliedParagraphStyle: string,
  paraOverrides?: Partial<IdmlParagraphStyle>,
) => ({
  appliedParagraphStyle,
  overrides: paraOverrides,
  characterRanges: [],
});

/** Single character range helper */
const charRange = (
  appliedCharacterStyle = NO_CHAR_STYLE,
  charOverrides?: Partial<IdmlCharacterStyle>,
) => ({
  appliedCharacterStyle,
  overrides: charOverrides,
  content: ['text'],
});

/** Resolve a single para+range combination */
const resolve = (
  idml: ParsedIdml,
  appliedParagraphStyle: string,
  appliedCharacterStyle = NO_CHAR_STYLE,
  paraOverrides?: Partial<IdmlParagraphStyle>,
  charOverrides?: Partial<IdmlCharacterStyle>,
) => {
  const resolver = buildStyleResolver(idml);
  return resolver.resolveRange(
    paraRange(appliedParagraphStyle, paraOverrides),
    charRange(appliedCharacterStyle, charOverrides),
  );
};

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BLACK: IdmlColor = { self: 'Color/Black', name: 'Black', space: 'RGB', values: [0, 0, 0] };
const RED:   IdmlColor = { self: 'Color/Red',   name: 'Red',   space: 'RGB', values: [255, 0, 0] };
const BLUE:  IdmlColor = { self: 'Color/Blue',  name: 'Blue',  space: 'RGB', values: [0, 0, 255] };

// ===========================================================================
// 1 — CHARACTER PROPS: paragraph style → resolved style
// ===========================================================================

describe('character props from paragraph style', () => {
  const PARA_ID = 'ParagraphStyle/P';

  const styleWith = (charProps: Partial<IdmlCharacterStyle>) =>
    resolve(
      makeIdml(
        [{ self: PARA_ID, name: 'P', characterStyle: { self: '', name: '', ...charProps } }],
        [],
        [BLACK, RED, BLUE],
      ),
      PARA_ID,
    );

  it('appliedFont → fontFamily', () => {
    expect(styleWith({ appliedFont: 'Helvetica Neue' }).fontFamily).toBe('Helvetica Neue');
  });

  it('fontStyle Regular → fontWeight normal, fontStyle normal', () => {
    const s = styleWith({ fontStyle: 'Regular' });
    expect(s.fontWeight).toBe('normal');
    expect(s.fontStyle).toBe('normal');
  });

  it('fontStyle Bold → fontWeight bold', () => {
    expect(styleWith({ fontStyle: 'Bold' }).fontWeight).toBe('bold');
  });

  it('fontStyle Italic → fontStyle italic', () => {
    expect(styleWith({ fontStyle: 'Italic' }).fontStyle).toBe('italic');
  });

  it('fontStyle Bold Italic → fontWeight bold + fontStyle italic', () => {
    const s = styleWith({ fontStyle: 'Bold Italic' });
    expect(s.fontWeight).toBe('bold');
    expect(s.fontStyle).toBe('italic');
  });

  it('pointSize → fontSize in px', () => {
    expect(styleWith({ pointSize: 12 }).fontSize).toBeCloseTo(pt(12));
  });

  it('leading (number) → lineHeight in px', () => {
    expect(styleWith({ leading: 18 }).lineHeight).toBeCloseTo(pt(18));
  });

  it('leading Auto → lineHeight = fontSize × 1.2', () => {
    // pointSize 10 → fontSize 10pt, leading Auto → 10 × 1.2 pt
    const s = styleWith({ pointSize: 10, leading: 'Auto' });
    expect(s.lineHeight).toBeCloseTo(pt(10) * 1.2);
  });

  it('tracking 0 → letterSpacing 0', () => {
    expect(styleWith({ tracking: 0 }).letterSpacing).toBe(0);
  });

  it('tracking 50 → letterSpacing 0.05em', () => {
    expect(styleWith({ tracking: 50 }).letterSpacing).toBeCloseTo(0.05);
  });

  it('tracking -20 → letterSpacing -0.02em', () => {
    expect(styleWith({ tracking: -20 }).letterSpacing).toBeCloseTo(-0.02);
  });

  it('kerningMethod $ID/Metrics → fontKerning normal', () => {
    expect(styleWith({ kerningMethod: '$ID/Metrics' }).fontKerning).toBe('normal');
  });

  it('kerningMethod $ID/0 → fontKerning none', () => {
    expect(styleWith({ kerningMethod: '$ID/0' }).fontKerning).toBe('none');
  });

  it('kerningMethod $ID/Optical → fontKerning none', () => {
    expect(styleWith({ kerningMethod: '$ID/Optical' }).fontKerning).toBe('none');
  });

  it('fillColor Color/Red → color rgb(255, 0, 0)', () => {
    expect(styleWith({ fillColor: 'Color/Red' }).color).toBe('rgb(255, 0, 0)');
  });

  it('underline true → textDecoration underline', () => {
    expect(styleWith({ underline: true }).textDecoration).toBe('underline');
  });

  it('strikeThru true → textDecoration line-through', () => {
    expect(styleWith({ strikeThru: true }).textDecoration).toBe('line-through');
  });

  it('underline + strikeThru → textDecoration underline line-through', () => {
    expect(styleWith({ underline: true, strikeThru: true }).textDecoration).toBe('underline line-through');
  });

  it('capitalization Normal → textTransform none', () => {
    expect(styleWith({ capitalization: 'Normal' }).textTransform).toBe('none');
  });

  it('capitalization AllCaps → textTransform uppercase', () => {
    expect(styleWith({ capitalization: 'AllCaps' }).textTransform).toBe('uppercase');
  });

  it('capitalization SmallCaps → textTransform capitalize', () => {
    expect(styleWith({ capitalization: 'SmallCaps' }).textTransform).toBe('capitalize');
  });

  it('appliedLanguage → lang', () => {
    expect(styleWith({ appliedLanguage: 'Arabic' }).lang).toBe('Arabic');
  });

  it('baselineShift positive → verticalAlign positive (pt)', () => {
    expect(styleWith({ baselineShift: 6 }).verticalAlign).toBe(6);
  });

  it('baselineShift negative → verticalAlign negative', () => {
    expect(styleWith({ baselineShift: -4 }).verticalAlign).toBe(-4);
  });

  it('baselineShift 0 → verticalAlign 0', () => {
    expect(styleWith({ baselineShift: 0 }).verticalAlign).toBe(0);
  });

  it('horizontalScale → scaleX', () => {
    expect(styleWith({ horizontalScale: 80 }).scaleX).toBe(80);
  });

  it('verticalScale → scaleY', () => {
    expect(styleWith({ verticalScale: 120 }).scaleY).toBe(120);
  });
});

// ===========================================================================
// 2 — PARAGRAPH PROPS: paragraph style → resolved style
// ===========================================================================

describe('paragraph props from paragraph style', () => {
  const PARA_ID = 'ParagraphStyle/P';

  const styleWith = (paraProps: Partial<IdmlParagraphStyle>) =>
    resolve(
      makeIdml([{ self: PARA_ID, name: 'P', ...paraProps }]),
      PARA_ID,
    );

  it('justification LeftAlign → textAlign left', () => {
    expect(styleWith({ justification: 'LeftAlign' }).textAlign).toBe('left');
  });

  it('justification CenterAlign → textAlign center', () => {
    expect(styleWith({ justification: 'CenterAlign' }).textAlign).toBe('center');
  });

  it('justification RightAlign → textAlign right', () => {
    expect(styleWith({ justification: 'RightAlign' }).textAlign).toBe('right');
  });

  it('justification FullyJustified → textAlign justify', () => {
    expect(styleWith({ justification: 'FullyJustified' }).textAlign).toBe('justify');
  });

  it('justification LeftJustified → textAlign justify', () => {
    expect(styleWith({ justification: 'LeftJustified' }).textAlign).toBe('justify');
  });

  it('justification CenterJustified → textAlign center', () => {
    expect(styleWith({ justification: 'CenterJustified' }).textAlign).toBe('center');
  });

  it('justification RightJustified → textAlign right', () => {
    expect(styleWith({ justification: 'RightJustified' }).textAlign).toBe('right');
  });

  it('paragraphDirection LeftToRightDirection → direction ltr', () => {
    expect(styleWith({ paragraphDirection: 'LeftToRightDirection' }).direction).toBe('ltr');
  });

  it('paragraphDirection RightToLeftDirection → direction rtl', () => {
    expect(styleWith({ paragraphDirection: 'RightToLeftDirection' }).direction).toBe('rtl');
  });

  it('spaceBefore → marginTop in px', () => {
    expect(styleWith({ spaceBefore: 12 }).marginTop).toBeCloseTo(pt(12));
  });

  it('spaceAfter → marginBottom in px', () => {
    expect(styleWith({ spaceAfter: 6 }).marginBottom).toBeCloseTo(pt(6));
  });

  it('firstLineIndent → textIndent in px', () => {
    expect(styleWith({ firstLineIndent: 18 }).textIndent).toBeCloseTo(pt(18));
  });

  it('leftIndent → paddingLeft in px', () => {
    expect(styleWith({ leftIndent: 10 }).paddingLeft).toBeCloseTo(pt(10));
  });

  it('rightIndent → paddingRight in px', () => {
    expect(styleWith({ rightIndent: 8 }).paddingRight).toBeCloseTo(pt(8));
  });

  it('spaceBefore 0 → marginTop 0', () => {
    expect(styleWith({ spaceBefore: 0 }).marginTop).toBe(0);
  });

  it('firstLineIndent 0 → textIndent 0', () => {
    expect(styleWith({ firstLineIndent: 0 }).textIndent).toBe(0);
  });
});

// ===========================================================================
// 3 — PARAGRAPH INLINE OVERRIDES (step 2 of cascade)
// ===========================================================================

describe('paragraph inline overrides', () => {
  const BASE_ID = 'ParagraphStyle/Base';

  const base: IdmlParagraphStyle = {
    self: BASE_ID,
    name: 'Base',
    justification: 'LeftAlign',
    spaceBefore: 0,
    spaceAfter: 0,
    firstLineIndent: 0,
    leftIndent: 0,
    rightIndent: 0,
  };

  const resolveWithOverride = (overrides: Partial<IdmlParagraphStyle>) =>
    resolve(makeIdml([base]), BASE_ID, NO_CHAR_STYLE, overrides);

  it('justification override wins', () => {
    expect(resolveWithOverride({ justification: 'CenterAlign' }).textAlign).toBe('center');
  });

  it('spaceBefore override → marginTop', () => {
    expect(resolveWithOverride({ spaceBefore: 20 }).marginTop).toBeCloseTo(pt(20));
  });

  it('spaceAfter override → marginBottom', () => {
    expect(resolveWithOverride({ spaceAfter: 10 }).marginBottom).toBeCloseTo(pt(10));
  });

  it('firstLineIndent override → textIndent', () => {
    expect(resolveWithOverride({ firstLineIndent: 24 }).textIndent).toBeCloseTo(pt(24));
  });

  it('leftIndent override → paddingLeft', () => {
    expect(resolveWithOverride({ leftIndent: 16 }).paddingLeft).toBeCloseTo(pt(16));
  });

  it('rightIndent override → paddingRight', () => {
    expect(resolveWithOverride({ rightIndent: 12 }).paddingRight).toBeCloseTo(pt(12));
  });

  it('paragraphDirection override → direction rtl', () => {
    expect(resolveWithOverride({ paragraphDirection: 'RightToLeftDirection' }).direction).toBe('rtl');
  });
});

// ===========================================================================
// 4 — 4-LAYER CASCADE PRIORITY
// ===========================================================================

describe('4-layer cascade priority', () => {
  const PARA_ID = 'ParagraphStyle/P';
  const CHAR_ID = 'CharacterStyle/C';

  it('layer 1 (named para) sets font size', () => {
    const idml = makeIdml(
      [{ self: PARA_ID, name: 'P', characterStyle: { self: '', name: '', pointSize: 10 } }],
    );
    expect(resolve(idml, PARA_ID).fontSize).toBeCloseTo(pt(10));
  });

  it('layer 2 (para overrides) wins over layer 1', () => {
    const idml = makeIdml(
      [{ self: PARA_ID, name: 'P', characterStyle: { self: '', name: '', pointSize: 10 } }],
    );
    const style = resolve(idml, PARA_ID, NO_CHAR_STYLE, {
      characterStyle: { self: '', name: '', pointSize: 20 },
    });
    expect(style.fontSize).toBeCloseTo(pt(20));
  });

  it('layer 3 (named char style) wins over layer 2', () => {
    const idml = makeIdml(
      [{ self: PARA_ID, name: 'P', characterStyle: { self: '', name: '', pointSize: 10 } }],
      [{ self: CHAR_ID, name: 'C', pointSize: 30 }],
    );
    const style = resolve(idml, PARA_ID, CHAR_ID, {
      characterStyle: { self: '', name: '', pointSize: 20 },
    });
    expect(style.fontSize).toBeCloseTo(pt(30));
  });

  it('layer 4 (char inline overrides) wins over layer 3', () => {
    const idml = makeIdml(
      [{ self: PARA_ID, name: 'P', characterStyle: { self: '', name: '', pointSize: 10 } }],
      [{ self: CHAR_ID, name: 'C', pointSize: 30 }],
    );
    const style = resolve(idml, PARA_ID, CHAR_ID, undefined, { pointSize: 40 });
    expect(style.fontSize).toBeCloseTo(pt(40));
  });

  it('layer 4 tracking overrides layer 3 tracking', () => {
    const idml = makeIdml(
      [{ self: PARA_ID, name: 'P' }],
      [{ self: CHAR_ID, name: 'C', tracking: 100 }],
    );
    const style = resolve(idml, PARA_ID, CHAR_ID, undefined, { tracking: -50 });
    expect(style.letterSpacing).toBeCloseTo(-0.05);
  });

  it('layer 4 color overrides layer 1 color', () => {
    const idml = makeIdml(
      [{ self: PARA_ID, name: 'P', characterStyle: { self: '', name: '', fillColor: 'Color/Red' } }],
      [],
      [RED, BLUE],
    );
    const style = resolve(idml, PARA_ID, NO_CHAR_STYLE, undefined, { fillColor: 'Color/Blue' });
    expect(style.color).toBe('rgb(0, 0, 255)');
  });
});

// ===========================================================================
// 5 — $ID/ PREFIXED basedOn INHERITANCE (NormalParagraphStyle pattern)
// ===========================================================================

describe('$ID/ prefixed basedOn inheritance', () => {
  it('NormalParagraphStyle inherits char props from [No paragraph style]', () => {
    const idml = makeIdml([
      {
        self: `ParagraphStyle/${NO_PARA_STYLE}`,
        name: NO_PARA_STYLE,
        characterStyle: {
          self: '',
          name: '',
          pointSize: 12,
          kerningMethod: '$ID/Metrics',
          tracking: 0,
          appliedLanguage: '$ID/French',
        },
      },
      {
        self: 'ParagraphStyle/$ID/NormalParagraphStyle',
        name: '$ID/NormalParagraphStyle',
        basedOn: NO_PARA_STYLE,
        characterStyle: { self: '', name: '' },
      },
    ]);

    const style = resolve(idml, 'ParagraphStyle/$ID/NormalParagraphStyle');

    expect(style.fontSize).toBeCloseTo(pt(12));
    expect(style.fontKerning).toBe('normal');
    expect(style.letterSpacing).toBe(0);
    expect(style.lang).toBe('$ID/French');
  });

  it('child can override props inherited via $ID/ basedOn', () => {
    const idml = makeIdml([
      {
        self: `ParagraphStyle/${NO_PARA_STYLE}`,
        name: NO_PARA_STYLE,
        characterStyle: { self: '', name: '', pointSize: 12 },
      },
      {
        self: 'ParagraphStyle/MyStyle',
        name: 'MyStyle',
        basedOn: NO_PARA_STYLE,
        characterStyle: { self: '', name: '', pointSize: 24 },
      },
    ]);

    expect(resolve(idml, 'ParagraphStyle/MyStyle').fontSize).toBeCloseTo(pt(24));
  });

  it('$ID/ char style basedOn inherits from prefixed parent', () => {
    const idml = makeIdml(
      [{ self: 'ParagraphStyle/P', name: 'P' }],
      [
        {
          self: `CharacterStyle/${NO_CHAR_STYLE}`,
          name: NO_CHAR_STYLE,
          tracking: 200,
        },
        {
          self: 'CharacterStyle/$ID/NormalCharacterStyle',
          name: '$ID/NormalCharacterStyle',
          basedOn: NO_CHAR_STYLE,
        },
      ],
    );

    const style = resolve(idml, 'ParagraphStyle/P', 'CharacterStyle/$ID/NormalCharacterStyle');
    expect(style.letterSpacing).toBeCloseTo(0.2);
  });
});

// ===========================================================================
// 6 — OBJECT STYLE $ID/ PREFIXED basedOn INHERITANCE
// ===========================================================================

const makeIdmlWithObjStyles = (objectStyles: IdmlObjectStyle[]): ParsedIdml => ({
  documentPreferences: { pageWidth: 595, pageHeight: 842 },
  colors: [RED, BLUE],
  gradients: [],
  paragraphStyles: [],
  characterStyles: [],
  objectStyles,
  spreads: [
    {
      self: 'Spread/1',
      pages: [{ self: 'Page/1', geometricBounds: [0, 0, 842, 595], itemTransform: [1, 0, 0, 1, 0, 0] }],
      textFrames: [],
      graphicFrames: [
        {
          self:              'Rectangle/1',
          itemTransform:     [1, 0, 0, 1, 100, 100],
          geometricBounds:   [0, 0, 200, 200],
          appliedObjectStyle: 'ObjectStyle/Child',
        },
      ],
      polygons: [],
    },
  ],
  stories: [],
});

describe('object style $ID/ prefixed basedOn', () => {
  it('inherits fillColor from $ID/ prefixed built-in parent', () => {
    const idml = makeIdmlWithObjStyles([
      { self: 'ObjectStyle/$ID/[Basic Graphics Frame]', name: '$ID/[Basic Graphics Frame]', fillColor: 'Color/Red' },
      { self: 'ObjectStyle/Child', name: 'Child', basedOn: '$ID/[Basic Graphics Frame]' },
    ]);
    expect(resolveDocument(idml).pages[0].graphicFrames[0].fillColor).toBe('rgb(255, 0, 0)');
  });

  it('child overrides $ID/ prefixed parent', () => {
    const idml = makeIdmlWithObjStyles([
      { self: 'ObjectStyle/$ID/[Basic Graphics Frame]', name: '$ID/[Basic Graphics Frame]', fillColor: 'Color/Red' },
      { self: 'ObjectStyle/Child', name: 'Child', basedOn: '$ID/[Basic Graphics Frame]', fillColor: 'Color/Blue' },
    ]);
    expect(resolveDocument(idml).pages[0].graphicFrames[0].fillColor).toBe('rgb(0, 0, 255)');
  });
});

// ===========================================================================
// 7 — extractCharStyle / extractParagraphStyle field coverage
//     (Ensures the split in document.resolver maps every prop)
// ===========================================================================

describe('extractCharStyle field coverage', () => {
  const PARA_ID = 'ParagraphStyle/P';

  it('all char fields survive the resolve→split→render path', () => {
    const idml = makeIdml(
      [{
        self: PARA_ID,
        name: 'P',
        characterStyle: {
          self: '', name: '',
          appliedFont:      'Arial',
          fontStyle:        'Bold Italic',
          pointSize:        16,
          leading:          20,
          tracking:         -10,
          kerningMethod:    '$ID/Metrics',
          fillColor:        'Color/Red',
          underline:        true,
          strikeThru:       true,
          capitalization:   'AllCaps',
          appliedLanguage:  'Arabic',
          baselineShift:    3,
          horizontalScale:  90,
          verticalScale:    110,
        },
      }],
      [],
      [RED],
    );

    const style = resolve(idml, PARA_ID);

    expect(style.fontFamily).toBe('Arial');
    expect(style.fontWeight).toBe('bold');
    expect(style.fontStyle).toBe('italic');
    expect(style.fontSize).toBeCloseTo(pt(16));
    expect(style.lineHeight).toBeCloseTo(pt(20));
    expect(style.letterSpacing).toBeCloseTo(-0.01);
    expect(style.fontKerning).toBe('normal');
    expect(style.color).toBe('rgb(255, 0, 0)');
    expect(style.textDecoration).toContain('underline');
    expect(style.textDecoration).toContain('line-through');
    expect(style.textTransform).toBe('uppercase');
    expect(style.lang).toBe('Arabic');
    expect(style.verticalAlign).toBe(3);
    expect(style.scaleX).toBe(90);
    expect(style.scaleY).toBe(110);
  });
});

// ===========================================================================
// Frame factories for resolveDocument tests
// ===========================================================================

const PAGE_BOUNDS: GeometricBounds  = [0, 0, 842, 595];
const PAGE_TRANSFORM: ItemTransform = [1, 0, 0, 1, -297.5, 0];
const IDENTITY: ItemTransform       = [1, 0, 0, 1, 0, 0];
const FRAME_BOUNDS: GeometricBounds = [0, 0, 100, 100];

const makeSpread = (frames: {
  graphicFrames?: IdmlGraphicFrame[];
  textFrames?: IdmlTextFrame[];
  polygons?: IdmlPolygon[];
}) => ({
  self: 'Spread/s1',
  pages: [{
    self: 'Page/p1',
    name: '1',
    geometricBounds: PAGE_BOUNDS,
    itemTransform:   PAGE_TRANSFORM,
  }],
  textFrames:    frames.textFrames    ?? [],
  graphicFrames: frames.graphicFrames ?? [],
  polygons:      frames.polygons      ?? [],
});

const makeGraphicFrame = (overrides: Partial<IdmlGraphicFrame> = {}): IdmlGraphicFrame => ({
  self:            'Rectangle/r1',
  itemTransform:   IDENTITY,
  geometricBounds: FRAME_BOUNDS,
  ...overrides,
});

const makeTextFrame = (overrides: Partial<IdmlTextFrame> = {}): IdmlTextFrame => ({
  self:            'TextFrame/t1',
  parentStory:     'Story/s1',
  itemTransform:   IDENTITY,
  geometricBounds: FRAME_BOUNDS,
  ...overrides,
});

const makePolygon = (overrides: Partial<IdmlPolygon> = {}): IdmlPolygon => ({
  self:            'Polygon/p1',
  itemTransform:   IDENTITY,
  geometricBounds: FRAME_BOUNDS,
  paths:           [],
  ...overrides,
});

const resolveWithFrames = (frames: {
  graphicFrames?: IdmlGraphicFrame[];
  textFrames?: IdmlTextFrame[];
  polygons?: IdmlPolygon[];
}, colors: IdmlColor[] = []) => {
  const idml: ParsedIdml = {
    documentPreferences: { pageWidth: 595, pageHeight: 842 },
    colors,
    gradients: [],
    paragraphStyles: [],
    characterStyles: [],
    objectStyles: [],
    spreads: [makeSpread(frames)],
    stories: [],
  };
  return resolveDocument(idml).pages[0];
};

// ===========================================================================
// visible field
// ===========================================================================

describe('visible field', () => {
  it('excludes graphic frames with visible=false', () => {
    const page = resolveWithFrames({ graphicFrames: [makeGraphicFrame({ visible: false })] });
    expect(page.graphicFrames).toHaveLength(0);
  });

  it('keeps graphic frames with visible=true', () => {
    const page = resolveWithFrames({ graphicFrames: [makeGraphicFrame({ visible: true })] });
    expect(page.graphicFrames).toHaveLength(1);
  });

  it('keeps graphic frames with visible=undefined (default visible)', () => {
    const page = resolveWithFrames({ graphicFrames: [makeGraphicFrame()] });
    expect(page.graphicFrames).toHaveLength(1);
  });

  it('excludes text frames with visible=false', () => {
    const page = resolveWithFrames({ textFrames: [makeTextFrame({ visible: false })] });
    expect(page.textFrames).toHaveLength(0);
  });

  it('keeps text frames with visible=undefined', () => {
    const page = resolveWithFrames({ textFrames: [makeTextFrame()] });
    expect(page.textFrames).toHaveLength(1);
  });

  it('excludes polygons with visible=false', () => {
    const page = resolveWithFrames({ polygons: [makePolygon({ visible: false })] });
    expect(page.polygons).toHaveLength(0);
  });

  it('keeps polygons with visible=undefined', () => {
    const page = resolveWithFrames({ polygons: [makePolygon()] });
    expect(page.polygons).toHaveLength(1);
  });
});

// ===========================================================================
// fillTint / strokeTint on graphic frames
// ===========================================================================

const RED_COLOR: IdmlColor  = { self: 'Color/Red',  name: 'Red',  space: 'RGB', values: [255, 0, 0] };
const BLUE_COLOR: IdmlColor = { self: 'Color/Blue', name: 'Blue', space: 'RGB', values: [0, 0, 255] };

describe('fillTint / strokeTint on graphic frames', () => {
  it('fillTint 50 → rgba() with 0.5 alpha on fill color', () => {
    const page = resolveWithFrames({
      graphicFrames: [makeGraphicFrame({ fillColor: 'Color/Red', fillTint: 50 })],
    }, [RED_COLOR]);
    expect(page.graphicFrames[0].fillColor).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('fillTint -1 → full color, no alpha applied', () => {
    const page = resolveWithFrames({
      graphicFrames: [makeGraphicFrame({ fillColor: 'Color/Red', fillTint: -1 })],
    }, [RED_COLOR]);
    expect(page.graphicFrames[0].fillColor).toBe('rgb(255, 0, 0)');
  });

  it('fillTint 0 → rgba() with 0 alpha', () => {
    const page = resolveWithFrames({
      graphicFrames: [makeGraphicFrame({ fillColor: 'Color/Red', fillTint: 0 })],
    }, [RED_COLOR]);
    expect(page.graphicFrames[0].fillColor).toBe('rgba(255, 0, 0, 0)');
  });

  it('strokeTint 75 → rgba() with 0.75 alpha on stroke color', () => {
    const page = resolveWithFrames({
      graphicFrames: [makeGraphicFrame({ strokeColor: 'Color/Blue', strokeWeight: 1, strokeTint: 75 })],
    }, [BLUE_COLOR]);
    expect(page.graphicFrames[0].strokeColor).toBe('rgba(0, 0, 255, 0.75)');
  });

  it('fillTint from objStyle used when frame has no override', () => {
    const idml: ParsedIdml = {
      documentPreferences: { pageWidth: 595, pageHeight: 842 },
      colors: [RED_COLOR],
      gradients: [],
      paragraphStyles: [],
      characterStyles: [],
      objectStyles: [{
        self: 'ObjectStyle/s1', name: 's1',
        fillColor: 'Color/Red', fillTint: 30,
      }],
      spreads: [makeSpread({
        graphicFrames: [makeGraphicFrame({ appliedObjectStyle: 'ObjectStyle/s1' })],
      })],
      stories: [],
    };
    const page = resolveDocument(idml).pages[0];
    expect(page.graphicFrames[0].fillColor).toBe('rgba(255, 0, 0, 0.3)');
  });

  it('frame fillTint overrides objStyle fillTint', () => {
    const idml: ParsedIdml = {
      documentPreferences: { pageWidth: 595, pageHeight: 842 },
      colors: [RED_COLOR],
      gradients: [],
      paragraphStyles: [],
      characterStyles: [],
      objectStyles: [{
        self: 'ObjectStyle/s1', name: 's1',
        fillColor: 'Color/Red', fillTint: 30,
      }],
      spreads: [makeSpread({
        graphicFrames: [makeGraphicFrame({ fillColor: 'Color/Red', fillTint: 80, appliedObjectStyle: 'ObjectStyle/s1' })],
      })],
      stories: [],
    };
    const page = resolveDocument(idml).pages[0];
    expect(page.graphicFrames[0].fillColor).toBe('rgba(255, 0, 0, 0.8)');
  });
});

describe('extractParagraphStyle field coverage', () => {
  const PARA_ID = 'ParagraphStyle/P';

  it('all paragraph fields survive the resolve path', () => {
    const idml = makeIdml([{
      self: PARA_ID,
      name: 'P',
      justification:    'RightAlign',
      paragraphDirection: 'RightToLeftDirection',
      spaceBefore:      8,
      spaceAfter:       4,
      firstLineIndent:  12,
      leftIndent:       6,
      rightIndent:      3,
    }]);

    const style = resolve(idml, PARA_ID);

    expect(style.textAlign).toBe('right');
    expect(style.direction).toBe('rtl');
    expect(style.marginTop).toBeCloseTo(pt(8));
    expect(style.marginBottom).toBeCloseTo(pt(4));
    expect(style.textIndent).toBeCloseTo(pt(12));
    expect(style.paddingLeft).toBeCloseTo(pt(6));
    expect(style.paddingRight).toBeCloseTo(pt(3));
  });
});
