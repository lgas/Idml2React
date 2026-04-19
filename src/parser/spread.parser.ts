import { xmlParser } from '@config/index';
import type {
  IdmlSpread,
  IdmlPage,
  IdmlTextFrame,
  IdmlGraphicFrame,
  IdmlPolygon,
  IdmlPolygonPoint,
  IdmlSubPath,
  IdmlImage,
  IdmlTransparency,
  ImageStoredState,
  GeometricBounds,
  ItemTransform,
} from '../types/idml.types';
import { num, str, toArray } from '@helpers/parser.helper';

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

interface RawBase  { '@_Self': string; }

interface RawPathPoint {
  '@_Anchor'?:         string;
  '@_LeftDirection'?:  string;
  '@_RightDirection'?: string;
}

interface RawPathGeometry {
  GeometryPathType?: RawGeometryPathType | RawGeometryPathType[];
}

interface RawGeometryPathType {
  '@_PathOpen'?: string;
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

interface RawLink extends RawBase {
  '@_StoredState'?:    string;   // 'Embedded' | 'Normal' | 'Missing'
  '@_LinkResourceURI'?: string;
}

interface RawImage extends RawBase {
  '@_ItemTransform'?: string;
  '@_ImageTypeName'?: string;
  Properties?:       RawImageProperties | RawImageProperties[];
  Link?:             RawLink | RawLink[];
}

interface RawTextFrame extends RawBase {
  '@_ParentStory': string;
  '@_ItemTransform'?: string;
  '@_GeometricBounds'?: string;
  '@_TextColumnCount'?: string;
  '@_TextColumnGutter'?: string;
  '@_AppliedObjectStyle'?: string;
  '@_Visible'?: string;
  '@_VerticalJustification'?: string;
  Properties?: RawProperties | RawProperties[];
  TransparencySetting?: RawTransparencySetting;
  TextFramePreference?: {
    '@_TextColumnCount'?: string;
    '@_TextColumnGutter'?: string;
    '@_VerticalJustification'?: string;
    '@_FirstBaselineOffset'?: string;
    '@_TextColumnFixedWidth'?: string;
    '@_TextColumnMaxWidth'?: string;
    Properties?: {
      InsetSpacing?: { ListItem?: string | string[] };
    };
  };
}

interface RawTransparencySetting {
  BlendingSetting?: { '@_BlendMode'?: string; '@_Opacity'?: string };
  DropShadowSetting?: {
    '@_Mode'?: string;
    '@_Opacity'?: string;
    '@_XOffset'?: string;
    '@_YOffset'?: string;
    '@_Size'?: string;
    '@_Color'?: string;
  };
}

interface RawRectangle extends RawBase {
  '@_ItemTransform'?: string;
  '@_GeometricBounds'?: string;
  '@_FillColor'?: string;
  '@_StrokeColor'?: string;
  '@_StrokeWeight'?: string;
  '@_Visible'?: string;
  '@_GradientFillAngle'?:   string;
  '@_GradientStrokeAngle'?: string;
  '@_FillTint'?:            string;
  '@_StrokeTint'?:          string;
  '@_AppliedObjectStyle'?:  string;
  Properties?: RawProperties | RawProperties[];
  Image?: RawImage | RawImage[];
  Rectangle?: RawRectangle | RawRectangle[];
  TransparencySetting?: RawTransparencySetting;
}

interface RawPage extends RawBase {
  '@_Name'?: string;
  '@_GeometricBounds'?: string;
  '@_ItemTransform'?: string;
  Properties?: RawProperties | RawProperties[];
}

interface RawGroup extends RawBase {
  '@_ItemTransform'?: string;
  '@_Visible'?:       string;
  TextFrame?: RawTextFrame | RawTextFrame[];
  Rectangle?: RawRectangle | RawRectangle[];
  Polygon?:   RawRectangle | RawRectangle[];
  Group?:     RawGroup | RawGroup[];
}

interface RawSpread extends RawBase {
  Page?: RawPage | RawPage[];
  TextFrame?: RawTextFrame | RawTextFrame[];
  Rectangle?: RawRectangle | RawRectangle[];
  Polygon?:   RawRectangle | RawRectangle[];
  Group?:     RawGroup | RawGroup[];
}

interface RawRoot {
  // <idPkg:Spread> → 'idPkg_Spread' (wrapper); contains the real <Spread Self="...">
  idPkg_Spread?: { Spread?: RawSpread | RawSpread[] };
}

// ---------------------------------------------------------------------------
// Transparency helper
// ---------------------------------------------------------------------------

const parseTransparency = (raw: { TransparencySetting?: RawTransparencySetting }): IdmlTransparency | undefined => {
  const ts = raw.TransparencySetting;
  if (!ts) return undefined;
  const bs = ts.BlendingSetting;
  const ds = ts.DropShadowSetting;
  return {
    blending: bs ? {
      blendMode: bs['@_BlendMode'],
      opacity: bs['@_Opacity'] !== undefined ? parseFloat(bs['@_Opacity']) : undefined,
    } : undefined,
    dropShadow: ds ? {
      mode: ds['@_Mode'] ?? 'None',
      opacity: ds['@_Opacity'] !== undefined ? parseFloat(ds['@_Opacity']) : undefined,
      xOffset: ds['@_XOffset'] !== undefined ? parseFloat(ds['@_XOffset']) : undefined,
      yOffset: ds['@_YOffset'] !== undefined ? parseFloat(ds['@_YOffset']) : undefined,
      size:    ds['@_Size']    !== undefined ? parseFloat(ds['@_Size'])    : undefined,
      color:   ds['@_Color'],
    } : undefined,
  };
};

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
  /* const base64 = props?.Contents?.__cdata ?? props?.Contents?.['#text']; */

  const storedState = (link?.['@_StoredState'] === 'Embedded' ? 'Embedded'
    : link?.['@_StoredState'] === 'Normal'   ? 'Linked'
    /* : base64 ? 'Embedded' */
    : 'Missing') as ImageStoredState;

  return {
    self:          raw['@_Self'],
    itemTransform: parseTransform(raw['@_ItemTransform']),
    storedState,
    mimeType:      mimeFromTypeName(raw['@_ImageTypeName']),
    /* base64:        base64 ?? undefined, */
    linkUri:       link?.['@_LinkResourceURI'],
    naturalWidth:  naturalWidth  && !isNaN(naturalWidth)  ? naturalWidth  : undefined,
    naturalHeight: naturalHeight && !isNaN(naturalHeight) ? naturalHeight : undefined,
  };
};

const IDENTITY: ItemTransform = [1, 0, 0, 1, 0, 0];

const isIdentity = ([a, b, c, d, tx, ty]: ItemTransform): boolean =>
  a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0;

const mapTextFrame = (raw: RawTextFrame, parentTransform: ItemTransform = IDENTITY): IdmlTextFrame => {
  const props = getProperties(raw);
  const tfp = raw.TextFramePreference;
  //TODO: if TextFramePreference is present, it should override the direct attributes. Verify with real-world samples.
  const colCount  = raw['@_TextColumnCount']  ?? tfp?.['@_TextColumnCount'];
  const colGutter = raw['@_TextColumnGutter'] ?? tfp?.['@_TextColumnGutter'];
  const local = parseTransform(raw['@_ItemTransform']);
  const combined = isIdentity(parentTransform) ? local : combineTransforms(parentTransform, local);

  const insetItems = toArray(tfp?.Properties?.InsetSpacing?.ListItem);
  const insetSpacing: [number, number, number, number] | undefined =
    insetItems.length === 4
      ? [parseFloat(insetItems[0]), parseFloat(insetItems[1]),
         parseFloat(insetItems[2]), parseFloat(insetItems[3])]
      : undefined;

  return {
    self:            raw['@_Self'],
    parentStory:     raw['@_ParentStory'],
    itemTransform:   combined,
    geometricBounds: resolveBounds(raw['@_GeometricBounds'], props?.PathGeometry),
    textColumnCount:       colCount  ? parseInt(colCount,  10) : undefined,
    textColumnGutter:      colGutter ? parseFloat(colGutter)   : undefined,
    textColumnFixedWidth:  num(tfp?.['@_TextColumnFixedWidth']),
    textColumnMaxWidth:    num(tfp?.['@_TextColumnMaxWidth']),
    firstBaselineOffset:   str(tfp?.['@_FirstBaselineOffset']),
    insetSpacing,
    appliedObjectStyle:    str(raw['@_AppliedObjectStyle']),
    visible:               raw['@_Visible'] !== undefined ? raw['@_Visible'] === 'true' : undefined,
    verticalJustification: str(raw['@_VerticalJustification'] ?? tfp?.['@_VerticalJustification']),
    transparency:          parseTransparency(raw),
  };
};

const combineTransforms = (
  [pa, pb, pc, pd, ptx, pty]: ItemTransform,
  [ca, cb, cc, cd, ctx, cty]: ItemTransform,
): ItemTransform => [
  pa * ca + pc * cb,
  pb * ca + pd * cb,
  pa * cc + pc * cd,
  pb * cc + pd * cd,
  pa * ctx + pc * cty + ptx,
  pb * ctx + pd * cty + pty,
];

const mapGraphicFrame = (raw: RawRectangle, parentTransform: ItemTransform = [1, 0, 0, 1, 0, 0]): IdmlGraphicFrame => {
  const props    = getProperties(raw);
  const rawImage = toArray(raw.Image)[0];
  const localTransform = parseTransform(raw['@_ItemTransform']);
  const combined = parentTransform[0] === 1 && parentTransform[1] === 0 && parentTransform[2] === 0 && parentTransform[3] === 1 && parentTransform[4] === 0 && parentTransform[5] === 0
    ? localTransform
    : combineTransforms(parentTransform, localTransform);
  return {
    self:            raw['@_Self'],
    itemTransform:   combined,
    geometricBounds: resolveBounds(raw['@_GeometricBounds'], props?.PathGeometry),
    fillColor:       str(raw['@_FillColor']),
    strokeWeight:    raw['@_StrokeWeight'] ? parseFloat(raw['@_StrokeWeight']) : undefined,
    strokeColor:     str(raw['@_StrokeColor']),
    visible:             raw['@_Visible'] !== undefined ? raw['@_Visible'] === 'true' : undefined,
    image:               rawImage ? mapImage(rawImage) : undefined,
    gradientFillAngle:   raw['@_GradientFillAngle']   ? parseFloat(raw['@_GradientFillAngle'])   : undefined,
    gradientStrokeAngle: raw['@_GradientStrokeAngle'] ? parseFloat(raw['@_GradientStrokeAngle']) : undefined,
    fillTint:            raw['@_FillTint']   !== undefined ? parseFloat(raw['@_FillTint'])   : undefined,
    strokeTint:          raw['@_StrokeTint'] !== undefined ? parseFloat(raw['@_StrokeTint']) : undefined,
    appliedObjectStyle:  str(raw['@_AppliedObjectStyle']),
    transparency:        parseTransparency(raw),
  };
};

const collectGraphicFrames = (
  rectangles: RawRectangle[],
  parentTransform: ItemTransform = IDENTITY,
): IdmlGraphicFrame[] => {
  const result: IdmlGraphicFrame[] = [];
  for (const raw of rectangles) {
    const frame = mapGraphicFrame(raw, parentTransform);
    result.push(frame);
    const nested = toArray(raw.Rectangle);
    if (nested.length > 0) {
      result.push(...collectGraphicFrames(nested, frame.itemTransform));
    }
  }
  return result;
};

interface GroupContents {
  textFrames:    IdmlTextFrame[];
  graphicFrames: IdmlGraphicFrame[];
  polygons:      IdmlPolygon[];
}

const collectFromGroups = (
  groups: RawGroup[],
  parentTransform: ItemTransform = IDENTITY,
): GroupContents => {
  const result: GroupContents = { textFrames: [], graphicFrames: [], polygons: [] };
  for (const group of groups) {
    const local = parseTransform(group['@_ItemTransform']);
    const combined = isIdentity(parentTransform) ? local : combineTransforms(parentTransform, local);

    for (const tf of toArray(group.TextFrame)) {
      result.textFrames.push(mapTextFrame(tf, combined));
    }
    result.graphicFrames.push(...collectGraphicFrames(toArray(group.Rectangle), combined));
    for (const poly of toArray(group.Polygon)) {
      const base = mapGraphicFrame(poly, combined);
      const props = getProperties(poly);
      const paths: IdmlSubPath[] = toArray(props?.PathGeometry?.GeometryPathType).map(gpt => ({
        pathOpen: gpt['@_PathOpen'] === 'true',
        points: toArray(gpt.PathPointArray?.PathPointType).map(pt => ({
          anchor:         parseXY(pt?.['@_Anchor']),
          leftDirection:  parseXY(pt?.['@_LeftDirection']  ?? pt?.['@_Anchor']),
          rightDirection: parseXY(pt?.['@_RightDirection'] ?? pt?.['@_Anchor']),
        })),
      }));
      result.polygons.push({ ...base, paths });
    }
    // Recurse into nested groups
    const nested = collectFromGroups(toArray(group.Group), combined);
    result.textFrames.push(...nested.textFrames);
    result.graphicFrames.push(...nested.graphicFrames);
    result.polygons.push(...nested.polygons);
  }
  return result;
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

const parseXY = (v: string | undefined): [number, number] => {
  if (!v) return [0, 0];
  const parts = v.trim().split(/\s+/).map(Number);
  return parts.length === 2 && !parts.some(isNaN) ? [parts[0], parts[1]] : [0, 0];
};

const mapPolygon = (raw: RawRectangle): IdmlPolygon => {
  const base = mapGraphicFrame(raw);
  const props = getProperties(raw);
  const paths: IdmlSubPath[] = toArray(props?.PathGeometry?.GeometryPathType).map(gpt => ({
    pathOpen: gpt['@_PathOpen'] === 'true',
    points: toArray(gpt.PathPointArray?.PathPointType).map(pt => ({
      anchor:         parseXY(pt?.['@_Anchor']),
      leftDirection:  parseXY(pt?.['@_LeftDirection']  ?? pt?.['@_Anchor']),
      rightDirection: parseXY(pt?.['@_RightDirection'] ?? pt?.['@_Anchor']),
    })),
  }));
  return { ...base, paths };
};

const mapSpread = (raw: RawSpread): IdmlSpread => {
  const fromGroups = collectFromGroups(toArray(raw.Group));
  return {
    self:  raw['@_Self'],
    pages: toArray(raw.Page).map(mapPage),
    // Frames are spread-level in IDML — not nested inside <Page>
    // Groups (including nested groups) are flattened with combined transforms
    textFrames:    [...toArray(raw.TextFrame).map(tf => mapTextFrame(tf)), ...fromGroups.textFrames],
    graphicFrames: [...collectGraphicFrames(toArray(raw.Rectangle)), ...fromGroups.graphicFrames],
    polygons:      [...toArray(raw.Polygon).map(mapPolygon), ...fromGroups.polygons],
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const parseSpread = (xml: string): IdmlSpread => {
  const raw: RawRoot = xmlParser.parse(xml);
  const spread = toArray(raw.idPkg_Spread?.Spread)[0];
  if (!spread) throw new Error('parseSpread: no <Spread> element found');
  return mapSpread(spread);
};
