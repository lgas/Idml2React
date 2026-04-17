import { xmlParser } from '@config/index';
import type {
  IdmlColor,
  IdmlGradient,
  IdmlCharacterStyle,
  IdmlParagraphStyle,
  IdmlDocumentPreferences,
  ColorSpace,
  Leading,
  FontStyle,
  Capitalization,
  Justification,
  ParagraphDirection,
} from '../types/idml.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const num = (v: string | undefined): number | undefined =>
  v !== undefined && v !== '' ? parseFloat(v) : undefined;

const str = (v: string | undefined): string | undefined =>
  v !== undefined && v !== '' ? v : undefined;

const toArray = <T>(val: T | T[] | undefined): T[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

const parseLeading = (v: string | undefined): Leading | undefined => {
  if (!v) return undefined;
  if (v === 'Auto') return 'Auto';
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
};

// ---------------------------------------------------------------------------
// Raw XML shapes (fast-xml-parser output)
// ---------------------------------------------------------------------------

interface RawColor {
  '@_Self': string;
  '@_Name': string;
  '@_Space': string;
  '@_ColorValue': string;
}

interface RawCharStyle {
  '@_Self': string;
  '@_Name': string;
  '@_AppliedFont'?: string;
  '@_FontStyle'?: string;
  '@_PointSize'?: string;
  '@_Leading'?: string;
  '@_Tracking'?: string;
  '@_KerningMethod'?: string;
  '@_HorizontalScale'?: string;
  '@_VerticalScale'?: string;
  '@_BaselineShift'?: string;
  '@_FillColor'?: string;
  '@_StrokeColor'?: string;
  '@_Underline'?: string;
  '@_StrikeThru'?: string;
  '@_Capitalization'?: string;
  '@_AppliedLanguage'?: string;
}

interface RawParaStyle extends RawCharStyle {
  '@_Justification'?: string;
  '@_ParagraphDirection'?: string;
  '@_SpaceBefore'?: string;
  '@_SpaceAfter'?: string;
  '@_FirstLineIndent'?: string;
  '@_LeftIndent'?: string;
  '@_RightIndent'?: string;
  '@_BulletsAndNumberingListType'?: string;
  '@_BulletsAlignment'?: string;
}

interface RawStyleGroup {
  '@_Self': string;
  '@_Name': string;
  CharacterStyle?: RawCharStyle | RawCharStyle[];
  ParagraphStyle?: RawParaStyle | RawParaStyle[];
  StyleGroup?: RawStyleGroup | RawStyleGroup[];
}

interface RawGradientStop {
  '@_StopColor': string;
  '@_Location':  string;
  '@_Midpoint'?: string;
}

interface RawGradient {
  '@_Self': string;
  '@_Name': string;
  '@_Type': string;
  GradientStop?: RawGradientStop | RawGradientStop[];
}

interface RawGraphic {
  idPkg_Graphic?: {
    Color?:    RawColor    | RawColor[];
    Gradient?: RawGradient | RawGradient[];
  };
}

interface RawStyles {
  idPkg_Styles?: {
    RootCharacterStyleGroup?: RawStyleGroup;
    RootParagraphStyleGroup?: RawStyleGroup;
  };
}

interface RawPreferences {
  idPkg_Preferences?: {
    DocumentPreference?: {
      '@_PageWidth': string;
      '@_PageHeight': string;
    };
  };
}

// ---------------------------------------------------------------------------
// Color parser  (Resources/Graphic.xml)
// ---------------------------------------------------------------------------

const mapColor = (raw: RawColor): IdmlColor => ({
  self:   raw['@_Self'],
  name:   raw['@_Name'],
  space:  (raw['@_Space'] as ColorSpace) ?? 'CMYK',
  values: (raw['@_ColorValue'] ?? '').split(' ').map(Number),
});

const mapGradient = (raw: RawGradient): IdmlGradient => ({
  self:  raw['@_Self'],
  name:  raw['@_Name'],
  type:  raw['@_Type'] === 'Radial' ? 'Radial' : 'Linear',
  stops: toArray(raw.GradientStop).map(s => ({
    stopColor: s['@_StopColor'],
    location:  parseFloat(s['@_Location']),
    midpoint:  s['@_Midpoint'] !== undefined ? parseFloat(s['@_Midpoint']) : undefined,
  })),
});

export const parseGraphic = (xml: string): { colors: IdmlColor[]; gradients: IdmlGradient[] } => {
  const raw: RawGraphic = xmlParser.parse(xml);
  return {
    colors:    toArray(raw.idPkg_Graphic?.Color).map(mapColor),
    gradients: toArray(raw.idPkg_Graphic?.Gradient).map(mapGradient),
  };
};

// ---------------------------------------------------------------------------
// Character style parser
// ---------------------------------------------------------------------------

const mapCharStyle = (raw: RawCharStyle): IdmlCharacterStyle => ({
  self: raw['@_Self'],
  name: raw['@_Name'],
  appliedFont:    str(raw['@_AppliedFont']),
  fontStyle:      str(raw['@_FontStyle']) as FontStyle | undefined,
  pointSize:      num(raw['@_PointSize']),
  leading:        parseLeading(raw['@_Leading']),
  tracking:       num(raw['@_Tracking']),
  kerningMethod:  str(raw['@_KerningMethod']),
  horizontalScale: num(raw['@_HorizontalScale']),
  verticalScale:   num(raw['@_VerticalScale']),
  baselineShift:   num(raw['@_BaselineShift']),
  fillColor:       str(raw['@_FillColor']),
  strokeColor:     str(raw['@_StrokeColor']),
  underline:       raw['@_Underline'] === 'true' ? true : raw['@_Underline'] === 'false' ? false : undefined,
  strikeThru:      raw['@_StrikeThru'] === 'true' ? true : raw['@_StrikeThru'] === 'false' ? false : undefined,
  capitalization:  str(raw['@_Capitalization']) as Capitalization | undefined,
  appliedLanguage: str(raw['@_AppliedLanguage']),
});

// Recursively flatten nested StyleGroups
const flattenCharStyles = (group: RawStyleGroup | undefined): IdmlCharacterStyle[] => {
  if (!group) return [];
  const styles = toArray(group.CharacterStyle).map(mapCharStyle);
  const nested = toArray(group.StyleGroup).flatMap(flattenCharStyles);
  return [...styles, ...nested];
};

// ---------------------------------------------------------------------------
// Paragraph style parser
// ---------------------------------------------------------------------------

const mapParaStyle = (raw: RawParaStyle): IdmlParagraphStyle => ({
  self: raw['@_Self'],
  name: raw['@_Name'],
  characterStyle: mapCharStyle(raw),
  justification:       str(raw['@_Justification']) as Justification | undefined,
  paragraphDirection:  str(raw['@_ParagraphDirection']) as ParagraphDirection | undefined,
  spaceBefore:  num(raw['@_SpaceBefore']),
  spaceAfter:   num(raw['@_SpaceAfter']),
  firstLineIndent: num(raw['@_FirstLineIndent']),
  leftIndent:   num(raw['@_LeftIndent']),
  rightIndent:  num(raw['@_RightIndent']),
  bulletsAndNumberingListType: str(raw['@_BulletsAndNumberingListType']) as IdmlParagraphStyle['bulletsAndNumberingListType'],
  bulletsAlignment:            str(raw['@_BulletsAlignment']) as Justification | undefined,
});

const flattenParaStyles = (group: RawStyleGroup | undefined): IdmlParagraphStyle[] => {
  if (!group) return [];
  const styles = toArray(group.ParagraphStyle).map(mapParaStyle);
  const nested = toArray(group.StyleGroup).flatMap(flattenParaStyles);
  return [...styles, ...nested];
};

export const parseStyles = (xml: string): {
  characterStyles: IdmlCharacterStyle[];
  paragraphStyles: IdmlParagraphStyle[];
} => {
  const raw: RawStyles = xmlParser.parse(xml);
  return {
    characterStyles: flattenCharStyles(raw.idPkg_Styles?.RootCharacterStyleGroup),
    paragraphStyles: flattenParaStyles(raw.idPkg_Styles?.RootParagraphStyleGroup),
  };
};

// ---------------------------------------------------------------------------
// Document preferences parser  (Resources/Preferences.xml)
// ---------------------------------------------------------------------------

export const parsePreferences = (xml: string): IdmlDocumentPreferences => {
  const raw: RawPreferences = xmlParser.parse(xml);
  const pref = raw.idPkg_Preferences?.DocumentPreference;
  return {
    pageWidth:  parseFloat(pref?.['@_PageWidth']  ?? '0'),
    pageHeight: parseFloat(pref?.['@_PageHeight'] ?? '0'),
  };
};
