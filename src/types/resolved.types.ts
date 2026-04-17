/**
 * Resolved document types — renderer-ready, no IDML IDs, no raw coordinates.
 * Everything is in px, colors are CSS strings, style chains are merged.
 */

// ---------------------------------------------------------------------------
// Style — split into paragraph-level and character-level
// so each maps cleanly to a <p> vs <span>
// ---------------------------------------------------------------------------

export interface ResolvedParagraphStyle {
  textAlign?:    'left' | 'center' | 'right' | 'justify';
  direction?:    'ltr' | 'rtl';
  marginTop?:    number;   // px
  marginBottom?: number;   // px
  textIndent?:   number;   // px
  paddingLeft?:  number;   // px
  paddingRight?: number;   // px
}

export interface ResolvedCharStyle {
  fontFamily?:     string;
  fontWeight?:     'normal' | 'bold';
  fontStyle?:      'normal' | 'italic';
  fontSize?:       number;   // px
  lineHeight?:     number;   // px
  letterSpacing?:  number;   // em
  color?:          string;   // CSS color
  textTransform?:  'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: string;
  lang?:           string;   // HTML lang attribute — drives RTL shaping
  verticalAlign?:  number;   // pt — positive = up, negative = down
  scaleX?:         number;   // % (100 = normal)
  scaleY?:         number;   // % (100 = normal)
}

// ---------------------------------------------------------------------------
// Text content
// ---------------------------------------------------------------------------

export interface ResolvedTextRange {
  text:        string;
  style:       ResolvedCharStyle;
  softReturn?: boolean;   // true = <br/> instead of new <p>
}

export interface ResolvedParagraph {
  style:  ResolvedParagraphStyle;
  ranges: ResolvedTextRange[];
}

// ---------------------------------------------------------------------------
// Frames — absolutely positioned on the page
// ---------------------------------------------------------------------------

export interface ResolvedTextFrame {
  self:         string;
  x:            number;   // px from page left
  y:            number;   // px from page top
  width:        number;   // px
  height:       number;   // px
  columns:      number;
  columnGutter: number;   // px
  borderRadius?: string;  // CSS border-radius shorthand
  paragraphs:   ResolvedParagraph[];
}

export interface ResolvedImage {
  /** data:image/jpeg;base64,... ready for <img src> */
  src:     string;
  /** Position of the image's top-left corner inside the frame (px) */
  offsetX: number;
  offsetY: number;
  /** Rendered size of the image (px) — may be larger than the frame (cropped by overflow:hidden) */
  width:   number;
  height:  number;
  /** True when the combined frame+image transform produces a horizontal/vertical flip */
  flipX?:  boolean;
  flipY?:  boolean;
}

export interface ResolvedGraphicFrame {
  self:          string;
  x:             number;
  y:             number;
  width:         number;
  height:        number;
  fillColor?:    string;   // CSS color
  strokeColor?:  string;
  strokeWeight?: number;   // px
  borderRadius?: string;   // CSS border-radius shorthand
  image?:        ResolvedImage;
}

export interface ResolvedPolygonPoint {
  anchor:         [number, number];   // px, relative to frame top-left
  leftDirection:  [number, number];
  rightDirection: [number, number];
}

export interface ResolvedPolygon extends ResolvedGraphicFrame {
  pathPoints: ResolvedPolygonPoint[];
  pathOpen: boolean;
}

// ---------------------------------------------------------------------------
// Page / Document
// ---------------------------------------------------------------------------

export interface ResolvedPage {
  self:          string;
  name?:         string;
  width:         number;   // px
  height:        number;   // px
  textFrames:    ResolvedTextFrame[];
  graphicFrames: ResolvedGraphicFrame[];
  polygons:      ResolvedPolygon[];
}

export interface ResolvedDocument {
  pageWidth:  number;   // px — from document preferences
  pageHeight: number;
  pages:      ResolvedPage[];   // all pages, all spreads, flattened
}
