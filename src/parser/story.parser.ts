import { xmlParser } from '@config/index';
import type {
  IdmlStory,
  IdmlParagraphStyleRange,
  IdmlCharacterStyleRange,
  IdmlCharacterStyle,
  StoryDirection,
  Leading,
  FontStyle,
  Capitalization,
  ParagraphDirection,
  Justification,
} from '../types/idml.types';
import { num, str, toArray } from '@/helpers/parser.helper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a Leading value, which can be a number or the string "Auto".
 */
export const parseLeading = (v: string | undefined): Leading | undefined => {
  if (!v) return undefined;
  if (v === 'Auto') return 'Auto';
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
};

// ---------------------------------------------------------------------------
// Raw XML shapes
// ---------------------------------------------------------------------------

interface RawContent {
  '#text'?: string;
  __cdata?: string;
}

interface RawBr {
  // self-closing element — presence means soft return
}

interface RawCharRange {
  '@_AppliedCharacterStyle': string;
  // Inline overrides — same attribute names as character styles
  '@_AppliedFont'?: string;
  '@_FontStyle'?: string;
  '@_PointSize'?: string;
  '@_Leading'?: string;
  '@_Tracking'?: string;
  '@_HorizontalScale'?: string;
  '@_VerticalScale'?: string;
  '@_BaselineShift'?: string;
  '@_FillColor'?: string;
  '@_StrokeColor'?: string;
  '@_Underline'?: string;
  '@_StrikeThru'?: string;
  '@_Capitalization'?: string;
  '@_AppliedLanguage'?: string;
  Content?: RawContent | RawContent[];
  Br?: RawBr | RawBr[];
}

interface RawParaRange {
  '@_AppliedParagraphStyle': string;
  // Inline paragraph overrides
  '@_Justification'?: string;
  '@_ParagraphDirection'?: string;
  '@_SpaceBefore'?: string;
  '@_SpaceAfter'?: string;
  '@_FirstLineIndent'?: string;
  '@_LeftIndent'?: string;
  '@_RightIndent'?: string;
  // Inline character overrides at paragraph level
  '@_AppliedFont'?: string;
  '@_FontStyle'?: string;
  '@_PointSize'?: string;
  '@_Leading'?: string;
  '@_Tracking'?: string;
  '@_FillColor'?: string;
  '@_AppliedLanguage'?: string;
  CharacterStyleRange?: RawCharRange | RawCharRange[];
}

interface RawStoryPreference {
  '@_StoryDirection'?: string;
}

interface RawStory {
  '@_Self': string;
  '@_Name'?: string;
  StoryPreference?: RawStoryPreference;
  ParagraphStyleRange?: RawParaRange | RawParaRange[];
}

interface RawRoot {
  // <idPkg:Story> → 'idPkg_Story' (wrapper); contains the real <Story Self="...">
  idPkg_Story?: { Story?: RawStory | RawStory[] };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * Extract text from a Content node.
 * InDesign stores text as #text or CDATA.
 */
const extractText = (content: RawContent): string =>
  content.__cdata ?? content['#text'] ?? '';

/**
 * Build inline character overrides from a CharacterStyleRange's attributes.
 * Only include fields that are explicitly set (not empty/undefined).
 */
const extractCharOverrides = (raw: RawCharRange): Partial<IdmlCharacterStyle> | undefined => {
  const overrides: Partial<IdmlCharacterStyle> = {};
  let hasAny = false;

  const set = <K extends keyof IdmlCharacterStyle>(
    key: K,
    value: IdmlCharacterStyle[K] | undefined
  ) => {
    if (value !== undefined) {
      (overrides as Record<string, unknown>)[key] = value;
      hasAny = true;
    }
  };

  set('appliedFont',    str(raw['@_AppliedFont']));
  set('fontStyle',      str(raw['@_FontStyle']) as FontStyle | undefined);
  set('pointSize',      num(raw['@_PointSize']));
  set('leading',        parseLeading(raw['@_Leading']));
  set('tracking',       num(raw['@_Tracking']));
  set('horizontalScale', num(raw['@_HorizontalScale']));
  set('verticalScale',  num(raw['@_VerticalScale']));
  set('baselineShift',  num(raw['@_BaselineShift']));
  set('fillColor',      str(raw['@_FillColor']));
  set('strokeColor',    str(raw['@_StrokeColor']));
  set('capitalization', str(raw['@_Capitalization']) as Capitalization | undefined);
  set('appliedLanguage', str(raw['@_AppliedLanguage']));

  if (raw['@_Underline'] !== undefined)
    set('underline', raw['@_Underline'] === 'true');
  if (raw['@_StrikeThru'] !== undefined)
    set('strikeThru', raw['@_StrikeThru'] === 'true');

  return hasAny ? overrides : undefined;
};

const mapCharRange = (raw: RawCharRange): IdmlCharacterStyleRange => {
  const contents = toArray(raw.Content).map(extractText).filter(t => t.length > 0);
  const hasBr    = toArray(raw.Br).length > 0;

  return {
    appliedCharacterStyle: raw['@_AppliedCharacterStyle'],
    overrides:  extractCharOverrides(raw),
    content:    contents,
    softReturn: hasBr || undefined,
  };
};

const mapParaRange = (raw: RawParaRange): IdmlParagraphStyleRange => {
  // Paragraph-level inline overrides
  const paraOverrides: Record<string, unknown> = {};
  let hasPara = false;

  const setP = (key: string, val: unknown) => {
    if (val !== undefined) { paraOverrides[key] = val; hasPara = true; }
  };

  setP('justification',      str(raw['@_Justification']) as Justification | undefined);
  setP('paragraphDirection', str(raw['@_ParagraphDirection']) as ParagraphDirection | undefined);
  setP('spaceBefore',  num(raw['@_SpaceBefore']));
  setP('spaceAfter',   num(raw['@_SpaceAfter']));
  setP('firstLineIndent', num(raw['@_FirstLineIndent']));
  setP('leftIndent',   num(raw['@_LeftIndent']));
  setP('rightIndent',  num(raw['@_RightIndent']));

  // Character-level overrides at the paragraph level (cascade down to all char ranges)
  const charOverridesAtPara: Partial<IdmlCharacterStyle> = {};
  let hasChar = false;
  const setC = (key: string, val: unknown) => {
    if (val !== undefined) { (charOverridesAtPara as Record<string, unknown>)[key] = val; hasChar = true; }
  };
  setC('appliedFont',    str(raw['@_AppliedFont']));
  setC('fontStyle',      str(raw['@_FontStyle']));
  setC('pointSize',      num(raw['@_PointSize']));
  setC('leading',        parseLeading(raw['@_Leading']));
  setC('tracking',       num(raw['@_Tracking']));
  setC('fillColor',      str(raw['@_FillColor']));
  setC('appliedLanguage', str(raw['@_AppliedLanguage']));

  if (hasChar) {
    setP('characterStyle', charOverridesAtPara);
  }

  return {
    appliedParagraphStyle: raw['@_AppliedParagraphStyle'],
    overrides: hasPara ? paraOverrides as Parameters<typeof Object.assign>[1] : undefined,
    characterRanges: toArray(raw.CharacterStyleRange).map(mapCharRange),
  };
};

const mapStory = (raw: RawStory): IdmlStory => ({
  self:      raw['@_Self'],
  name:      str(raw['@_Name']),
  direction: (raw.StoryPreference?.['@_StoryDirection'] as StoryDirection | undefined)
             ?? 'LeftToRightDirection',
  paragraphs: toArray(raw.ParagraphStyleRange).map(mapParaRange),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const parseStory = (xml: string): IdmlStory => {
  const raw: RawRoot = xmlParser.parse(xml);
  const story = toArray(raw.idPkg_Story?.Story)[0];
  if (!story) throw new Error('parseStory: no <Story> element found');
  return mapStory(story);
};
