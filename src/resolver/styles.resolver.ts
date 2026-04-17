import type {
  ParsedIdml,
  IdmlParagraphStyle,
  IdmlCharacterStyle,
  IdmlParagraphStyleRange,
  IdmlCharacterStyleRange,
} from '../types/idml.types';

// ---------------------------------------------------------------------------
// Output type — flat CSS-ready props, no more IDML IDs
// ---------------------------------------------------------------------------

export interface ResolvedTextStyle {
  // Font
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?:  'normal' | 'italic';
  fontSize?:   number;       // px
  // Spacing
  lineHeight?:    number;    // px
  letterSpacing?: number;    // em  (tracking / 1000)
  // Color
  color?: string;            // resolved hex/rgba
  // Paragraph
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  direction?: 'ltr' | 'rtl';
  marginTop?:    number;     // px
  marginBottom?: number;     // px
  textIndent?:   number;     // px
  // Decorations
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: string;   // 'underline' | 'line-through' | ...
  // Lang attribute (drives browser shaping for Arabic, Hebrew, CJK, etc.)
  lang?: string;
  // Character transforms
  verticalAlign?: number;    // pt — positive = up, negative = down
  scaleX?: number;           // % (100 = normal)
  scaleY?: number;           // % (100 = normal)
  // Paragraph indents
  paddingLeft?:  number;     // px
  paddingRight?: number;     // px
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PT_TO_PX = 96 / 72;
const pt = (v: number) => v * PT_TO_PX;

/** 'Bold Italic' → { fontWeight: 'bold', fontStyle: 'italic' } */
const resolveFontStyle = (fontStyle: string | undefined) => ({
  fontWeight: fontStyle?.toLowerCase().includes('bold')   ? 'bold'   : 'normal' as const,
  fontStyle:  fontStyle?.toLowerCase().includes('italic') ? 'italic' : 'normal' as const,
});

const resolveTextAlign = (justification: string | undefined): ResolvedTextStyle['textAlign'] => {
  switch (justification) {
    case 'CenterAlign':
    case 'CenterJustified': return 'center';
    case 'RightAlign':
    case 'RightJustified':  return 'right';
    case 'LeftJustified':
    case 'FullyJustified':  return 'justify';
    default:                return 'left';
  }
};

const resolveDirection = (dir: string | undefined): 'ltr' | 'rtl' | undefined =>
  dir === 'RightToLeftDirection' ? 'rtl'
  : dir === 'LeftToRightDirection' ? 'ltr'
  : undefined;

const resolveCapitalization = (cap: string | undefined): ResolvedTextStyle['textTransform'] => {
  switch (cap) {
    case 'AllCaps':    return 'uppercase';
    case 'SmallCaps':  return 'capitalize'; // approximate — real smallcaps needs font-variant
    default:           return 'none';
  }
};

const resolveColor = (
  colorRef: string | undefined,
  colorMap: Map<string, string>,
): string | undefined =>
  colorRef ? colorMap.get(colorRef) : undefined;

// ---------------------------------------------------------------------------
// Build a hex color lookup from IdmlColor[]
// ---------------------------------------------------------------------------

export const buildColorMap = (colors: ParsedIdml['colors']): Map<string, string> => {
  const map = new Map<string, string>();

  for (const color of colors) {
    let hex: string;

    if (color.space === 'RGB') {
      const [r, g, b] = color.values;
      hex = `rgb(${r}, ${g}, ${b})`;
    } else if (color.space === 'CMYK') {
      // Convert CMYK (0–100) → RGB approximation
      const [c, m, y, k] = color.values.map(v => v / 100);
      const r = Math.round(255 * (1 - c) * (1 - k));
      const g = Math.round(255 * (1 - m) * (1 - k));
      const b = Math.round(255 * (1 - y) * (1 - k));
      hex = `rgb(${r}, ${g}, ${b})`;
    } else {
      hex = '#000000'; // LAB/Mixed — needs ICC profile, fallback for now
    }

    map.set(color.self, hex);
  }

  return map;
};

// ---------------------------------------------------------------------------
// Core merge — applies one layer of char-level props onto a base style
// ---------------------------------------------------------------------------

const applyCharProps = (
  base: ResolvedTextStyle,
  char: Partial<IdmlCharacterStyle> | undefined,
  colorMap: Map<string, string>,
  baseFontSize: number,   // needed to resolve 'Auto' leading
): ResolvedTextStyle => {
  if (!char) return base;

  const out: ResolvedTextStyle = { ...base };

  if (char.appliedFont)   out.fontFamily    = char.appliedFont;
  if (char.fontStyle)     Object.assign(out, resolveFontStyle(char.fontStyle));
  if (char.pointSize)     out.fontSize      = pt(char.pointSize);
  if (char.leading) {
    out.lineHeight = char.leading === 'Auto'
      ? pt(baseFontSize) * 1.2
      : pt(char.leading);
  }
  if (char.tracking !== undefined) out.letterSpacing = char.tracking / 1000;
  if (char.fillColor)     out.color         = resolveColor(char.fillColor, colorMap) ?? out.color;
  if (char.capitalization) out.textTransform = resolveCapitalization(char.capitalization);
  if (char.appliedLanguage) out.lang         = char.appliedLanguage;
  if (char.underline)     out.textDecoration = 'underline';
  if (char.strikeThru)    out.textDecoration = out.textDecoration
    ? `${out.textDecoration} line-through`
    : 'line-through';
  if (char.baselineShift !== undefined) out.verticalAlign = char.baselineShift;
  if (char.horizontalScale !== undefined) out.scaleX = char.horizontalScale;
  if (char.verticalScale   !== undefined) out.scaleY = char.verticalScale;

  return out;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StyleResolver {
  resolveRange: (
    para: IdmlParagraphStyleRange,
    range: IdmlCharacterStyleRange,
  ) => ResolvedTextStyle;
}

export const buildStyleResolver = (idml: ParsedIdml): StyleResolver => {
  const paraMap = new Map(idml.paragraphStyles.map(s => [s.self, s]));
  const charMap = new Map(idml.characterStyles.map(s => [s.self, s]));
  const colorMap = buildColorMap(idml.colors);

  const resolveRange = (
    para: IdmlParagraphStyleRange,
    range: IdmlCharacterStyleRange,
  ): ResolvedTextStyle => {
    let style: ResolvedTextStyle = {};

    // 1 — Named paragraph style (includes char-level defaults)
    const namedPara: IdmlParagraphStyle | undefined = paraMap.get(para.appliedParagraphStyle);
    if (namedPara) {
      style.textAlign  = resolveTextAlign(namedPara.justification);
      style.direction  = resolveDirection(namedPara.paragraphDirection);
      style.marginTop  = namedPara.spaceBefore !== undefined ? pt(namedPara.spaceBefore) : undefined;
      style.marginBottom = namedPara.spaceAfter !== undefined ? pt(namedPara.spaceAfter) : undefined;
      style.textIndent   = namedPara.firstLineIndent !== undefined ? pt(namedPara.firstLineIndent) : undefined;
      style.paddingLeft  = namedPara.leftIndent  !== undefined ? pt(namedPara.leftIndent)  : undefined;
      style.paddingRight = namedPara.rightIndent !== undefined ? pt(namedPara.rightIndent) : undefined;
      // Character-level props embedded in the paragraph style
      const baseFontSize = namedPara.characterStyle?.pointSize ?? 12;
      style = applyCharProps(style, namedPara.characterStyle, colorMap, baseFontSize);
    }

    // 2 — Paragraph inline overrides
    if (para.overrides) {
      if (para.overrides.justification)      style.textAlign = resolveTextAlign(para.overrides.justification);
      if (para.overrides.paragraphDirection) style.direction = resolveDirection(para.overrides.paragraphDirection);
      if (para.overrides.spaceBefore  !== undefined) style.marginTop    = pt(para.overrides.spaceBefore);
      if (para.overrides.spaceAfter   !== undefined) style.marginBottom = pt(para.overrides.spaceAfter);
      if (para.overrides.leftIndent   !== undefined) style.paddingLeft  = pt(para.overrides.leftIndent);
      if (para.overrides.rightIndent  !== undefined) style.paddingRight = pt(para.overrides.rightIndent);
      const baseFontSize = style.fontSize ? style.fontSize / PT_TO_PX : 12;
      style = applyCharProps(style, para.overrides.characterStyle, colorMap, baseFontSize);
    }

    // 3 — Named character style
    const namedChar: IdmlCharacterStyle | undefined = charMap.get(range.appliedCharacterStyle);
    if (namedChar) {
      const baseFontSize = style.fontSize ? style.fontSize / PT_TO_PX : 12;
      style = applyCharProps(style, namedChar, colorMap, baseFontSize);
    }

    // 4 — Character inline overrides (highest priority)
    if (range.overrides) {
      const baseFontSize = style.fontSize ? style.fontSize / PT_TO_PX : 12;
      style = applyCharProps(style, range.overrides, colorMap, baseFontSize);
    }

    return style;
  };

  return { resolveRange };
};