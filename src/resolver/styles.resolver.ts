import type {
  ParsedIdml,
  IdmlGradient,
  IdmlParagraphStyle,
  IdmlCharacterStyle,
  IdmlParagraphStyleRange,
  IdmlCharacterStyleRange,
} from '@/types/idml.types';

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
  fontKerning?: 'normal' | 'none' | 'auto';
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
  fontVariant?:   'normal' | 'small-caps';
  textDecoration?: string;        // 'underline' | 'line-through' | ...
  textDecorationColor?: string;   // CSS color
  // Lang attribute (drives browser shaping for Arabic, Hebrew, CJK, etc.)
  lang?: string;
  // Character transforms
  verticalAlign?: number;    // pt — positive = up, negative = down
  scaleX?: number;           // % (100 = normal)
  scaleY?: number;           // % (100 = normal)
  // Paragraph indents
  paddingLeft?:  number;     // px
  paddingRight?: number;     // px
  // Raw IDML font style name — used for PostScript filename lookup, not rendered
  fontStyleName?: string;
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
    case 'AllCaps': return 'uppercase';
    default:        return 'none';
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

export const buildColorMap = (
  colors:    ParsedIdml['colors'],
  gradients: IdmlGradient[] = [],
): Map<string, string> => {
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

  for (const gradient of gradients) {
    const sorted = [...gradient.stops].sort((a, b) => a.location - b.location);
    const stopsCss = sorted
      .map(s => `${map.get(s.stopColor) ?? '#000000'} ${s.location}%`)
      .join(', ');

    const css = gradient.type === 'Radial'
      ? `radial-gradient(circle, ${stopsCss})`
      : `linear-gradient(90deg, ${stopsCss})`;  // 90deg = left→right (angle 0 in InDesign)

    map.set(gradient.self, css);
  }

  return map;
};

/**
 * Substitute the angle in a stored linear-gradient CSS string.
 * InDesign angle 0° = left→right = CSS 90deg.
 * Formula: cssAngle = ((90 - idmlAngle) % 360 + 360) % 360
 */
export const applyGradientAngle = (gradientCss: string, angleDeg: number): string => {
  if (!gradientCss.startsWith('linear-gradient(')) return gradientCss;
  const cssAngle = ((90 - angleDeg) % 360 + 360) % 360;
  return gradientCss.replace(/^linear-gradient\(\d+(\.\d+)?deg,/, `linear-gradient(${cssAngle}deg,`);
};

// ---------------------------------------------------------------------------
// basedOn chain flattening — runs once at resolver build time
// ---------------------------------------------------------------------------

const mergeParagraphStyles = (
  parent: IdmlParagraphStyle,
  child: IdmlParagraphStyle,
): IdmlParagraphStyle => ({
  ...parent,
  ...Object.fromEntries(Object.entries(child).filter(([, v]) => v !== undefined)),
  characterStyle: (parent.characterStyle || child.characterStyle)
    ? {
        ...parent.characterStyle,
        ...Object.fromEntries(
          Object.entries(child.characterStyle ?? {}).filter(([, v]) => v !== undefined)
        ),
      }
    : undefined,
});

const flattenParaStyle = (
  ref: string,
  rawMap: Map<string, IdmlParagraphStyle>,
  visited = new Set<string>(),
  memo = new Map<string, IdmlParagraphStyle>(),
): IdmlParagraphStyle | undefined => {
  if (memo.has(ref)) return memo.get(ref);
  if (visited.has(ref)) return rawMap.get(ref);
  visited.add(ref);
  const style = rawMap.get(ref);
  if (!style) return undefined;
  const { basedOn } = style;
  if (!basedOn) return style;
  const parentRef = rawMap.has(basedOn) ? basedOn : `ParagraphStyle/${basedOn}`;
  if (!rawMap.has(parentRef)) return style;
  const parent = flattenParaStyle(parentRef, rawMap, visited, memo);
  const result = parent ? mergeParagraphStyles(parent, style) : style;
  memo.set(ref, result);
  return result;
};

const mergeCharStyles = (
  parent: IdmlCharacterStyle,
  child: IdmlCharacterStyle,
): IdmlCharacterStyle => ({
  ...parent,
  ...Object.fromEntries(Object.entries(child).filter(([, v]) => v !== undefined)),
});

const flattenCharStyle = (
  ref: string,
  rawMap: Map<string, IdmlCharacterStyle>,
  visited = new Set<string>(),
  memo = new Map<string, IdmlCharacterStyle>(),
): IdmlCharacterStyle | undefined => {
  if (memo.has(ref)) return memo.get(ref);
  if (visited.has(ref)) return rawMap.get(ref);
  visited.add(ref);
  const style = rawMap.get(ref);
  if (!style) return undefined;
  const { basedOn } = style;
  if (!basedOn) return style;
  const parentRef = rawMap.has(basedOn) ? basedOn : `CharacterStyle/${basedOn}`;
  if (!rawMap.has(parentRef)) return style;
  const parent = flattenCharStyle(parentRef, rawMap, visited, memo);
  const result = parent ? mergeCharStyles(parent, style) : style;
  memo.set(ref, result);
  return result;
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
  if (char.fontStyle) {
    Object.assign(out, resolveFontStyle(char.fontStyle));
    out.fontStyleName = char.fontStyle;
  }
  if (char.pointSize)     out.fontSize      = pt(char.pointSize);
  if (char.leading) {
    out.lineHeight = char.leading === 'Auto'
      ? pt(baseFontSize) * 1.2
      : pt(char.leading);
  }
  if (char.tracking !== undefined) out.letterSpacing = char.tracking / 1000;
  if (char.kerningMethod) out.fontKerning = char.kerningMethod === '$ID/0' ? 'none' : char.kerningMethod === '$ID/Optical' ? 'auto' : 'normal';
  if (char.fillColor)     out.color         = resolveColor(char.fillColor, colorMap) ?? out.color;
  if (char.capitalization === 'SmallCaps') {
    out.fontVariant = 'small-caps';
    out.textTransform = 'none';
  } else if (char.capitalization) {
    out.textTransform = resolveCapitalization(char.capitalization);
    out.fontVariant = undefined;
  }
  if (char.appliedLanguage) out.lang         = char.appliedLanguage;
  if (char.underline)     out.textDecoration = 'underline';
  if (char.strikeThru)    out.textDecoration = out.textDecoration
    ? `${out.textDecoration} line-through`
    : 'line-through';
  if (char.baselineShift !== undefined) out.verticalAlign = char.baselineShift;
  if (char.horizontalScale !== undefined) out.scaleX = char.horizontalScale;
  if (char.verticalScale   !== undefined) out.scaleY = char.verticalScale;
  if (char.underlineColor)     out.textDecorationColor = resolveColor(char.underlineColor, colorMap) ?? out.textDecorationColor;
  if (char.strikeThroughColor) out.textDecorationColor = resolveColor(char.strikeThroughColor, colorMap) ?? out.textDecorationColor;

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

export const buildStyleResolver = (idml: ParsedIdml, colorMap: Map<string, string>): StyleResolver => {
  const rawParaMap = new Map(idml.paragraphStyles.map(s => [s.self, s]));
  const rawCharMap = new Map(idml.characterStyles.map(s => [s.self, s]));
  const paraMemo = new Map<string, IdmlParagraphStyle>();
  const charMemo = new Map<string, IdmlCharacterStyle>();
  const paraMap = new Map(
    idml.paragraphStyles.map(s => [s.self, flattenParaStyle(s.self, rawParaMap, new Set(), paraMemo) ?? s])
  );
  const charMap = new Map(
    idml.characterStyles.map(s => [s.self, flattenCharStyle(s.self, rawCharMap, new Set(), charMemo) ?? s])
  );

  const resolveRange = (
    para: IdmlParagraphStyleRange,
    range: IdmlCharacterStyleRange,
  ): ResolvedTextStyle => {
    let style: ResolvedTextStyle = {};

    // 1 — Named paragraph style (includes char-level defaults)
    const namedPara: IdmlParagraphStyle | undefined = paraMap.get(para.appliedParagraphStyle);
    if (namedPara) {
      const isList = namedPara.bulletsAndNumberingListType && namedPara.bulletsAndNumberingListType !== 'NoList';
      style.textAlign  = resolveTextAlign(namedPara.justification ?? (isList ? namedPara.bulletsAlignment : undefined));
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
      const isListOverride = para.overrides.bulletsAndNumberingListType && para.overrides.bulletsAndNumberingListType !== 'NoList';
      const alignOverride  = para.overrides.justification ?? (isListOverride ? para.overrides.bulletsAlignment : undefined);
      if (alignOverride)                     style.textAlign = resolveTextAlign(alignOverride);
      if (para.overrides.paragraphDirection) style.direction = resolveDirection(para.overrides.paragraphDirection);
      if (para.overrides.spaceBefore    !== undefined) style.marginTop    = pt(para.overrides.spaceBefore);
      if (para.overrides.spaceAfter     !== undefined) style.marginBottom = pt(para.overrides.spaceAfter);
      if (para.overrides.firstLineIndent !== undefined) style.textIndent  = pt(para.overrides.firstLineIndent);
      if (para.overrides.leftIndent     !== undefined) style.paddingLeft  = pt(para.overrides.leftIndent);
      if (para.overrides.rightIndent    !== undefined) style.paddingRight = pt(para.overrides.rightIndent);
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