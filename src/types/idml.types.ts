/**
 * Types for parsed IDML data
 * Focused on what is needed to render pixel-perfect HTML,
 * including full multi-language / non-latin support.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * InDesign affine transform matrix — stored in IDML as a space-separated string.
 * Maps to CSS transform: matrix(a, b, c, d, tx, ty)
 * [a b c d tx ty]
 */
export type ItemTransform = [a: number, b: number, c: number, d: number, tx: number, ty: number];

/**
 * InDesign geometric bounds — stored in IDML as a space-separated string.
 * [top, left, bottom, right] in points, in the item's own coordinate space.
 * width  = right  - left
 * height = bottom - top
 */
export type GeometricBounds = [top: number, left: number, bottom: number, right: number];

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export type ColorSpace = 'CMYK' | 'RGB' | 'LAB' | 'Mixed';

/**
 * A named color swatch from Resources/Graphic.xml
 */
export interface IdmlColor {
  self: string;
  name: string;
  space: ColorSpace;
  /** Values depend on space: 4 values for CMYK, 3 for RGB/LAB */
  values: number[];
}

// ---------------------------------------------------------------------------
// Typography — Character level
// ---------------------------------------------------------------------------

export type Capitalization = 'Normal' | 'AllCaps' | 'SmallCaps' | 'CapToSmallCap';
export type Underline = boolean;
export type StrikeThru = boolean;
export type FontStyle = 'Regular' | 'Bold' | 'Italic' | 'Bold Italic' | string;
/** 'Auto' means leading = pointSize × 1.2 (InDesign default) */
export type Leading = number | 'Auto';

export interface IdmlCharacterStyle {
  self: string;
  name: string;

  // Font
  appliedFont?: string;       // PostScript font family name
  fontStyle?: FontStyle;
  pointSize?: number;         // font-size in pt

  // Spacing
  leading?: Leading;          // line-height
  tracking?: number;          // letter-spacing (1/1000 em units)
  kerningMethod?: string;

  // Scale / distortion
  horizontalScale?: number;   // % → scaleX
  verticalScale?: number;     // % → scaleY
  baselineShift?: number;     // pt → vertical-align

  // Color
  fillColor?: string;         // ref to IdmlColor.self
  strokeColor?: string;

  // Decorations
  underline?: Underline;
  strikeThru?: StrikeThru;
  capitalization?: Capitalization;

  // Language (critical for non-latin scripts)
  appliedLanguage?: string;   // e.g. 'Arabic', 'Hebrew', 'Japanese', 'French'
}

// ---------------------------------------------------------------------------
// Typography — Paragraph level
// ---------------------------------------------------------------------------

export type Justification =
  | 'LeftAlign'
  | 'CenterAlign'
  | 'RightAlign'
  | 'LeftJustified'
  | 'RightJustified'
  | 'CenterJustified'
  | 'FullyJustified';

export type ParagraphDirection = 'LeftToRightDirection' | 'RightToLeftDirection';

export interface IdmlParagraphStyle {
  self: string;
  name: string;

  // Inherits all character-level props
  characterStyle?: Partial<IdmlCharacterStyle>;

  // Alignment & direction (critical for Arabic, Hebrew, etc.)
  justification?: Justification;
  paragraphDirection?: ParagraphDirection;

  // Spacing
  spaceBefore?: number;       // margin-top in pt
  spaceAfter?: number;        // margin-bottom in pt

  // Indents
  firstLineIndent?: number;
  leftIndent?: number;
  rightIndent?: number;
}

// ---------------------------------------------------------------------------
// Story content
// ---------------------------------------------------------------------------

export interface IdmlCharacterStyleRange {
  /** References IdmlCharacterStyle.self — '$ID/[No character style]' means unstyled */
  appliedCharacterStyle: string;

  /** Inline character-level overrides (take priority over the named style) */
  overrides?: Partial<IdmlCharacterStyle>;

  /** Text content of this range. Multiple entries = multiple Content nodes. */
  content: string[];

  /** True if followed by a soft return (Shift+Enter in InDesign) */
  softReturn?: boolean;
}

export interface IdmlParagraphStyleRange {
  /** References IdmlParagraphStyle.self */
  appliedParagraphStyle: string;

  /** Inline paragraph-level overrides */
  overrides?: Partial<IdmlParagraphStyle>;

  characterRanges: IdmlCharacterStyleRange[];
}

export type StoryDirection = 'LeftToRightDirection' | 'RightToLeftDirection';

export interface IdmlStory {
  self: string;
  name?: string;
  direction: StoryDirection;
  paragraphs: IdmlParagraphStyleRange[];
}

// ---------------------------------------------------------------------------
// Spread / Page layout
// ---------------------------------------------------------------------------

/**
 * A text frame on the page — links geometry to a story.
 */
export interface IdmlTextFrame {
  self: string;
  parentStory: string;        // ref to IdmlStory.self

  itemTransform: ItemTransform;
  geometricBounds: GeometricBounds;

  // Multi-column support
  textColumnCount?: number;
  textColumnGutter?: number;  // pt

  visible?: boolean;
}

export type ImageStoredState = 'Embedded' | 'Linked' | 'Missing';

export interface IdmlImage {
  self:          string;
  /** Affine transform of the image WITHIN its parent frame.
   *  [scaleX, 0, 0, scaleY, offsetX, offsetY] — no rotation in practice. */
  itemTransform: ItemTransform;
  storedState:   ImageStoredState;
  mimeType:      string;        // 'image/jpeg' | 'image/png' | ...
  /** Populated by the parser: inline CDATA or extracted from ZIP Links/ */
  base64?:       string;
  /** Original file URI — present for linked (non-embedded) images */
  linkUri?:      string;
  /** Natural dimensions in points (from GraphicBounds inside Properties) */
  naturalWidth?:  number;
  naturalHeight?: number;
}

/**
 * A generic graphic frame (rectangle, image placeholder, etc.)
 */
export interface IdmlGraphicFrame {
  self: string;
  itemTransform: ItemTransform;
  geometricBounds: GeometricBounds;
  fillColor?: string;         // ref to IdmlColor.self
  strokeColor?: string;       // ref to IdmlColor.self
  strokeWeight?: number;      // pt
  visible?: boolean;
  image?: IdmlImage;          // present when frame contains an image
}

export interface IdmlPage {
  self: string;
  name?: string;              // e.g. '1', '2-3'
  /** Page dimensions in points */
  geometricBounds: GeometricBounds;
  itemTransform: ItemTransform;
}

export interface IdmlSpread {
  self: string;
  pages: IdmlPage[];
  // Frames are direct children of <Spread> in IDML, not of <Page>.
  // Pages only define boundaries — use page bounds + frame transforms
  // to determine which page a frame visually belongs to.
  textFrames: IdmlTextFrame[];
  graphicFrames: IdmlGraphicFrame[];
}

// ---------------------------------------------------------------------------
// Document resources
// ---------------------------------------------------------------------------

export interface IdmlDocumentPreferences {
  /** Page width in points */
  pageWidth: number;
  /** Page height in points */
  pageHeight: number;
}

// ---------------------------------------------------------------------------
// Top-level parsed result
// ---------------------------------------------------------------------------

export interface ParsedIdml {
  documentPreferences: IdmlDocumentPreferences;
  colors: IdmlColor[];
  paragraphStyles: IdmlParagraphStyle[];
  characterStyles: IdmlCharacterStyle[];
  spreads: IdmlSpread[];
  stories: IdmlStory[];
}
