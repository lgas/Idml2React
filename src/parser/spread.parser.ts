import { xmlParser } from '@config/index';
import type {
  IdmlSpread,
  IdmlPage,
  IdmlTextFrame,
  IdmlGraphicFrame,
  IdmlImage,
  ImageStoredState,
  GeometricBounds,
  ItemTransform,
} from '../types/idml.types';
import { str, toArray } from '@/helpers/parser.helper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a space-separated 6-number string into an ItemTransform tuple.
 * Falls back to identity matrix if the string is missing or malformed.
 */
const parseTransform = (v: string | undefined): ItemTransform => {
  if (!v) return [1, 0, 0, 1, 0, 0];
  const parts = v.trim().split(/\s+/).map(Number);
  if (parts.length !== 6 || parts.some(isNaN)) return [1, 0, 0, 1, 0, 0];
  return parts as ItemTransform;
};

/**
 * Parse a space-separated 4-number string into a GeometricBounds tuple.
 */
const parseBoundsAttr = (v: string | undefined): GeometricBounds | null => {
  if (!v) return null;
  const parts = v.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return parts as GeometricBounds;
};

/**
 * Derive GeometricBounds from a PathPointArray.
 * Each PathPointType has an Anchor="x y" attribute.
 * We take the bounding box of all anchor points.
 *
 * In IDML path coordinates are in the item's local space (before ItemTransform).
 * Result: [top, left, bottom, right] matching the GeometricBounds convention.
 */
const boundsFromPathGeometry = (pathGeometry: RawPathGeometry | undefined): GeometricBounds | null => {
  if (!pathGeometry) return null;
  const points = toArray(pathGeometry.GeometryPathType)
    .flatMap(gpt => toArray(gpt.PathPointArray?.PathPointType))
    .map(pt => {
      const parts = (pt?.['@_Anchor'] ?? '').trim().split(/\s+/).map(Number);
      return parts.length === 2 && !parts.some(isNaN)
        ? { x: parts[0], y: parts[1] }
        : null;
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  if (points.length === 0) return null;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const left   = Math.min(...xs);
  const right  = Math.max(...xs);
  const top    = Math.min(...ys);
  const bottom = Math.max(...ys);

  return [top, left, bottom, right];
};

/**
 * Resolve GeometricBounds: prefer the direct attribute, fall back to PathGeometry.
 */
const resolveBounds = (
  attr: string | undefined,
  pathGeometry: RawPathGeometry | undefined,
): GeometricBounds => {
  return parseBoundsAttr(attr) ?? boundsFromPathGeometry(pathGeometry) ?? [0, 0, 0, 0];
};



// ---------------------------------------------------------------------------
// Raw XML shapes
// ---------------------------------------------------------------------------

interface RawPathPoint {
  '@_Anchor'?: string;
}

interface RawPathGeometry {
  GeometryPathType?: RawGeometryPathType | RawGeometryPathType[];
}

interface RawGeometryPathType {
  PathPointArray?: {
    PathPointType?: RawPathPoint | RawPathPoint[];
  };
}

interface RawGraphicBounds {
  '@_Left':   string;
  '@_Top':    string;
  '@_Right':  string;
  '@_Bottom': string;
}

interface RawImageProperties {
  PathGeometry?:  RawPathGeometry;
  GraphicBounds?: RawGraphicBounds;
  Contents?:      { __cdata?: string; '#text'?: string };
}

interface RawProperties {
  PathGeometry?: RawPathGeometry;
}

interface RawLink {
  '@_Self':            string;
  '@_StoredState'?:    string;   // 'Embedded' | 'Normal' | 'Missing'
  '@_LinkResourceURI'?: string;
}

interface RawImage {
  '@_Self':          string;
  '@_ItemTransform'?: string;
  '@_ImageTypeName'?: string;
  Properties?:       RawImageProperties | RawImageProperties[];
  Link?:             RawLink | RawLink[];
}

interface RawTextFrame {
  '@_Self': string;
  '@_ParentStory': string;
  '@_ItemTransform'?: string;
  '@_GeometricBounds'?: string;
  '@_TextColumnCount'?: string;
  '@_TextColumnGutter'?: string;
  '@_Visible'?: string;
  Properties?: RawProperties | RawProperties[];
  TextFramePreference?: {
    '@_TextColumnCount'?: string;
    '@_TextColumnGutter'?: string;
  };
}

interface RawRectangle {
  '@_Self': string;
  '@_ItemTransform'?: string;
  '@_GeometricBounds'?: string;
  '@_FillColor'?: string;
  '@_StrokeColor'?: string;
  '@_StrokeWeight'?: string;
  '@_Visible'?: string;
  Properties?: RawProperties | RawProperties[];
  Image?: RawImage | RawImage[];
}

interface RawPage {
  '@_Self': string;
  '@_Name'?: string;
  '@_GeometricBounds'?: string;
  '@_ItemTransform'?: string;
  Properties?: RawProperties | RawProperties[];
}

interface RawSpread {
  '@_Self': string;
  Page?: RawPage | RawPage[];
  TextFrame?: RawTextFrame | RawTextFrame[];
  Rectangle?: RawRectangle | RawRectangle[];
}

interface RawRoot {
  // <idPkg:Spread> → 'idPkg_Spread' (wrapper); contains the real <Spread Self="...">
  idPkg_Spread?: { Spread?: RawSpread | RawSpread[] };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const getProperties = (raw: { Properties?: RawProperties | RawProperties[] }): RawProperties | undefined =>
  toArray(raw.Properties)[0];

const mimeFromTypeName = (name: string | undefined): string => {
  const n = (name ?? '').toLowerCase();
  if (n.includes('png'))  return 'image/png';
  if (n.includes('gif'))  return 'image/gif';
  if (n.includes('tiff') || n.includes('tif')) return 'image/tiff';
  if (n.includes('webp')) return 'image/webp';
  if (n.includes('svg'))  return 'image/svg+xml';
  return 'image/jpeg';
};

const mapImage = (raw: RawImage): IdmlImage => {
  const props = toArray(raw.Properties)[0];
  const link  = toArray(raw.Link)[0];

  // Natural dimensions from GraphicBounds (in image local coordinate space)
  const gb = props?.GraphicBounds;
  const naturalWidth  = gb ? parseFloat(gb['@_Right'])  - parseFloat(gb['@_Left']) : undefined;
  const naturalHeight = gb ? parseFloat(gb['@_Bottom']) - parseFloat(gb['@_Top'])  : undefined;

  // Inline base64 CDATA — present when image is embedded directly in the XML
  const base64 = props?.Contents?.__cdata ?? props?.Contents?.['#text'];

  const storedState = (link?.['@_StoredState'] === 'Embedded' ? 'Embedded'
    : link?.['@_StoredState'] === 'Normal'   ? 'Linked'
    : base64 ? 'Embedded'
    : 'Missing') as ImageStoredState;

  return {
    self:          raw['@_Self'],
    itemTransform: parseTransform(raw['@_ItemTransform']),
    storedState,
    mimeType:      mimeFromTypeName(raw['@_ImageTypeName']),
    base64:        base64 ?? undefined,
    linkUri:       link?.['@_LinkResourceURI'],
    naturalWidth:  naturalWidth  && !isNaN(naturalWidth)  ? naturalWidth  : undefined,
    naturalHeight: naturalHeight && !isNaN(naturalHeight) ? naturalHeight : undefined,
  };
};

const mapTextFrame = (raw: RawTextFrame): IdmlTextFrame => {
  const props = getProperties(raw);
  // TextColumnCount/Gutter may be on the frame directly or in <TextFramePreference>
  const colCount  = raw['@_TextColumnCount']  ?? raw.TextFramePreference?.['@_TextColumnCount'];
  const colGutter = raw['@_TextColumnGutter'] ?? raw.TextFramePreference?.['@_TextColumnGutter'];

  return {
    self:            raw['@_Self'],
    parentStory:     raw['@_ParentStory'],
    itemTransform:   parseTransform(raw['@_ItemTransform']),
    geometricBounds: resolveBounds(raw['@_GeometricBounds'], props?.PathGeometry),
    textColumnCount:  colCount  ? parseInt(colCount,  10) : undefined,
    textColumnGutter: colGutter ? parseFloat(colGutter)   : undefined,
    visible: raw['@_Visible'] !== undefined ? raw['@_Visible'] === 'true' : undefined,
  };
};

const mapGraphicFrame = (raw: RawRectangle): IdmlGraphicFrame => {
  const props    = getProperties(raw);
  const rawImage = toArray(raw.Image)[0];
  return {
    self:            raw['@_Self'],
    itemTransform:   parseTransform(raw['@_ItemTransform']),
    geometricBounds: resolveBounds(raw['@_GeometricBounds'], props?.PathGeometry),
    fillColor:       str(raw['@_FillColor']),
    strokeWeight:    raw['@_StrokeWeight'] ? parseFloat(raw['@_StrokeWeight']) : undefined,
    strokeColor:     str(raw['@_StrokeColor']),
    visible:         raw['@_Visible'] !== undefined ? raw['@_Visible'] === 'true' : undefined,
    image:           rawImage ? mapImage(rawImage) : undefined,
  };
};

const mapPage = (raw: RawPage): IdmlPage => {
  const props = getProperties(raw);
  return {
    self:            raw['@_Self'],
    name:            str(raw['@_Name']),
    geometricBounds: resolveBounds(raw['@_GeometricBounds'], props?.PathGeometry),
    itemTransform:   parseTransform(raw['@_ItemTransform']),
  };
};

const mapSpread = (raw: RawSpread): IdmlSpread => ({
  self:          raw['@_Self'],
  pages:         toArray(raw.Page).map(mapPage),
  // Frames are spread-level in IDML — not nested inside <Page>
  textFrames:    toArray(raw.TextFrame).map(mapTextFrame),
  graphicFrames: toArray(raw.Rectangle).map(mapGraphicFrame),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const parseSpread = (xml: string): IdmlSpread => {
  const raw: RawRoot = xmlParser.parse(xml);
  const spread = toArray(raw.idPkg_Spread?.Spread)[0];
  if (!spread) throw new Error('parseSpread: no <Spread> element found');
  return mapSpread(spread);
};
