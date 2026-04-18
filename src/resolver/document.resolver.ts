import type { ParsedIdml, IdmlStory, IdmlImage, IdmlObjectStyle, IdmlTransparency, GeometricBounds, ItemTransform } from '@/types/idml.types';
import type {
  ResolvedDocument,
  ResolvedPage,
  ResolvedTextFrame,
  ResolvedGraphicFrame,
  ResolvedPolygon,
  ResolvedPolygonPoint,
  ResolvedSubPath,
  ResolvedImage,
  ResolvedParagraph,
  ResolvedParagraphStyle,
  ResolvedCharStyle,
} from '../types/resolved.types';
import { buildStyleResolver, buildColorMap, applyGradientAngle, type ResolvedTextStyle } from './styles.resolver';
import {
  resolvePageGeometry,
  resolveFrameGeometry,
  findPageForFrame,
  applyTransform,
  type PageGeometry,
} from './geometry.resolver';

const PT_TO_PX = 96 / 72;
const pt = (v: number) => v * PT_TO_PX;

// ---------------------------------------------------------------------------
// Transparency / blending
// ---------------------------------------------------------------------------

const BLEND_MODE_MAP: Record<string, string> = {
  Normal: 'normal', Multiply: 'multiply', Screen: 'screen',
  Overlay: 'overlay', Darken: 'darken', Lighten: 'lighten',
  ColorDodge: 'color-dodge', ColorBurn: 'color-burn',
  Difference: 'difference', Exclusion: 'exclusion',
  Hue: 'hue', Saturation: 'saturation', Color: 'color', Luminosity: 'luminosity',
};

const resolveTransparency = (
  t: IdmlTransparency | undefined,
  colorMap: Map<string, string>,
  forSvg = false,
): { opacity?: number; mixBlendMode?: string; boxShadow?: string; svgFilter?: string } => {
  if (!t) return {};

  const rawOpacity = t.blending?.opacity;
  const opacity = (rawOpacity !== undefined && rawOpacity < 100) ? rawOpacity / 100 : undefined;

  const blendKey = t.blending?.blendMode;
  const mixBlendMode = (blendKey && blendKey !== 'Normal') ? BLEND_MODE_MAP[blendKey] : undefined;

  const ds = t.dropShadow;
  if (!ds || ds.mode !== 'Drop') return { opacity, mixBlendMode };

  const shadowColor = ds.color ? (colorMap.get(ds.color) ?? 'rgb(0,0,0)') : 'rgb(0,0,0)';
  const shadowOpacity = ds.opacity !== undefined ? ds.opacity / 100 : 0.5;
  const x = ds.xOffset !== undefined ? pt(ds.xOffset) : 0;
  const y = ds.yOffset !== undefined ? pt(ds.yOffset) : 0;
  const b = ds.size    !== undefined ? pt(ds.size)    : 0;
  const finalColor = shadowColor.replace(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/, `rgba($1, $2, $3, ${shadowOpacity})`);
  const shadowStr = `${x}px ${y}px ${b}px ${finalColor}`;

  return {
    opacity,
    mixBlendMode,
    boxShadow:  forSvg ? undefined : shadowStr,
    svgFilter:  forSvg ? `drop-shadow(${shadowStr})` : undefined,
  };
};

// ---------------------------------------------------------------------------
// Object style basedOn flattening
// ---------------------------------------------------------------------------

const mergeObjectStyles = (
  parent: IdmlObjectStyle,
  child: IdmlObjectStyle,
): IdmlObjectStyle => ({
  ...parent,
  ...Object.fromEntries(Object.entries(child).filter(([, v]) => v !== undefined)),
});

const flattenObjectStyle = (
  ref: string,
  rawMap: Map<string, IdmlObjectStyle>,
  visited = new Set<string>(),
): IdmlObjectStyle | undefined => {
  if (visited.has(ref)) return rawMap.get(ref);
  visited.add(ref);
  const style = rawMap.get(ref);
  if (!style) return undefined;
  const { basedOn } = style;
  if (!basedOn) return style;
  const parentRef = rawMap.has(basedOn) ? basedOn : `ObjectStyle/${basedOn}`;
  if (!rawMap.has(parentRef)) return style;
  const parent = flattenObjectStyle(parentRef, rawMap, visited);
  return parent ? mergeObjectStyles(parent, style) : style;
};

// ---------------------------------------------------------------------------
// Object style helpers
// ---------------------------------------------------------------------------

const cornerRadius = (radius: number | undefined, option: string | undefined): number => {
  if (option === 'RoundedCorner' && radius !== undefined) return pt(radius);
  return 0;
};

const resolveCornerRadius = (s: IdmlObjectStyle): string | undefined => {
  const tl = cornerRadius(s.topLeftCornerRadius,     s.topLeftCornerOption);
  const tr = cornerRadius(s.topRightCornerRadius,    s.topRightCornerOption);
  const br = cornerRadius(s.bottomRightCornerRadius, s.bottomRightCornerOption);
  const bl = cornerRadius(s.bottomLeftCornerRadius,  s.bottomLeftCornerOption);
  if (tl === 0 && tr === 0 && br === 0 && bl === 0) return undefined;
  return `${tl}px ${tr}px ${br}px ${bl}px`;
};

// ---------------------------------------------------------------------------
// Style splitting — ResolvedTextStyle has both paragraph + char props,
// split them so <p> and <span> each get only what they need.
// ---------------------------------------------------------------------------

const extractParagraphStyle = (s: ResolvedTextStyle): ResolvedParagraphStyle => ({
  textAlign:    s.textAlign,
  direction:    s.direction,
  marginTop:    s.marginTop,
  marginBottom: s.marginBottom,
  textIndent:   s.textIndent,
  paddingLeft:  s.paddingLeft,
  paddingRight: s.paddingRight,
});

const extractCharStyle = (s: ResolvedTextStyle): ResolvedCharStyle => ({
  fontFamily:    s.fontFamily,
  fontWeight:    s.fontWeight,
  fontStyle:     s.fontStyle,
  fontSize:      s.fontSize,
  lineHeight:    s.lineHeight,
  letterSpacing: s.letterSpacing,
  fontKerning:   s.fontKerning,
  color:         s.color,
  textTransform: s.textTransform,
  textDecoration:      s.textDecoration,
  textDecorationColor: s.textDecorationColor,
  lang:          s.lang,
  verticalAlign: s.verticalAlign,
  scaleX:        s.scaleX,
  scaleY:        s.scaleY,
});



// ---------------------------------------------------------------------------
// Image resolver
// ---------------------------------------------------------------------------

const imageFilename = (linkUri: string): string => {
  const raw = linkUri.replace(/\\/g, '/').split('/').pop() ?? linkUri;
  return decodeURIComponent(raw).replace(/\.tiff?$/i, '.jpg');
};

const resolveImage = (
  img:            IdmlImage,
  frameBounds:    GeometricBounds,
  frameTransform: ItemTransform,
): ResolvedImage | undefined => {
  if (!img.linkUri) return undefined;

  const src = `/images/${imageFilename(img.linkUri)}`;

  // IDML image transforms are always [sx, 0, 0, sy, tx, ty] (no rotation).
  // The image's itemTransform is in the frame's LOCAL coordinate space.
  // We combine the frame transform with the image transform so we can work
  // entirely in screen (spread) space — this correctly handles flipped frames.
  //
  //   combined_sx = frame_a * img_sx
  //   combined_sy = frame_d * img_sy
  //   combined_tx = frame_a * img_tx + frame_tx   (screen origin of image)
  //   combined_ty = frame_d * img_ty + frame_ty
  const [frmA, , , frmD, frmTx, frmTy] = frameTransform;
  const [imgSx, , , imgSy, imgTx, imgTy] = img.itemTransform;

  const csx = frmA * imgSx;
  const csy = frmD * imgSy;
  const ctx = frmA * imgTx + frmTx;
  const cty = frmD * imgTy + frmTy;

  const W = img.naturalWidth  ?? 0;
  const H = img.naturalHeight ?? 0;

  // Image AABB in spread space (handles negative scales = flipped images)
  const imgLeft = Math.min(ctx, ctx + csx * W);
  const imgTop  = Math.min(cty, cty + csy * H);

  // Frame AABB top-left in spread space (same logic as transformBounds)
  const [bTop, bLeft, bBottom, bRight] = frameBounds;
  const fxs = [frmA * bLeft + frmTx, frmA * bRight + frmTx];
  const fys = [frmD * bTop  + frmTy, frmD * bBottom + frmTy];
  const frameLeft = Math.min(...fxs);
  const frameTop  = Math.min(...fys);

  return {
    src,
    offsetX: pt(imgLeft - frameLeft),
    offsetY: pt(imgTop  - frameTop),
    width:   pt(Math.abs(csx * W)),
    height:  pt(Math.abs(csy * H)),
    flipX:   csx < 0,
    flipY:   csy < 0,
  };
};

// ---------------------------------------------------------------------------
// Story resolver — builds paragraphs from a story + style context
// ---------------------------------------------------------------------------

const resolveStory = (
  story: IdmlStory,
  styleResolver: ReturnType<typeof buildStyleResolver>,
): ResolvedParagraph[] =>
  story.paragraphs.map(para => {
    // Use the first range to get paragraph-level style (all ranges in a §
    // share the same paragraph style — overrides are on the para, not ranges)
    const firstRange = para.characterRanges[0];
    const paraStyle: ResolvedParagraphStyle = firstRange
      ? extractParagraphStyle(styleResolver.resolveRange(para, firstRange))
      : {};

    return {
      style:  paraStyle,
      ranges: para.characterRanges
        .filter(range => range.content.length > 0 || range.softReturn)
        .map(range => ({
          text:       range.content.join(''),
          style:      extractCharStyle(styleResolver.resolveRange(para, range)),
          softReturn: range.softReturn,
        })),
    };
  }).filter(p => p.ranges.length > 0);

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

export const resolveDocument = (idml: ParsedIdml): ResolvedDocument => {
  const styleResolver  = buildStyleResolver(idml);
  const colorMap       = buildColorMap(idml.colors, idml.gradients);
  const gradientIds    = new Set(idml.gradients.map(g => g.self));
  const rawObjectStyleMap = new Map<string, IdmlObjectStyle>(
    (idml.objectStyles ?? []).map(s => [s.self, s]),
  );
  const objectStyleMap = new Map<string, IdmlObjectStyle>(
    (idml.objectStyles ?? []).map(s => [s.self, flattenObjectStyle(s.self, rawObjectStyleMap) ?? s]),
  );

  const resolvePaint = (ref: string | undefined, angle?: number, tint?: number): string | undefined => {
    if (!ref) return undefined;
    const css = colorMap.get(ref);
    if (!css) return undefined;
    let result = (gradientIds.has(ref) && angle !== undefined) ? applyGradientAngle(css, angle) : css;
    // Tint: -1 means 100% (full), otherwise 0–100 → alpha approximation on white bg
    if (tint !== undefined && tint >= 0 && tint < 100) {
      const alpha = tint / 100;
      // Wrap solid color in rgba by replacing rgb(...) with rgba(...)
      result = result.replace(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/, `rgba($1, $2, $3, ${alpha})`);
    }
    return result;
  };

  // Story lookup: storyId → story
  const storyMap = new Map<string, IdmlStory>(
    idml.stories.map(s => [s.self, s]),
  );

  const resolvedPages: ResolvedPage[] = [];

  for (const spread of idml.spreads) {
    // 1. Resolve all page geometries for this spread
    const pageGeometries = spread.pages.map(page => ({
      self:     page.self,
      name:     page.name,
      geometry: resolvePageGeometry(page.itemTransform, page.geometricBounds),
    }));

    // 2. Create one ResolvedPage per page (empty for now, frames added below)
    const spreadPages = new Map<string, ResolvedPage>(
      pageGeometries.map(({ self, name, geometry }) => [self, {
        self,
        name,
        width:         geometry.width,
        height:        geometry.height,
        textFrames:    [],
        graphicFrames: [],
        polygons:      [],
      }]),
    );

    // 3. Assign each TextFrame to its page
    for (const frame of spread.textFrames) {
      if (frame.visible === false) continue;
      const { self: pageSelf, geometry: pageGeo } = findPageForFrame(
        frame.itemTransform,
        frame.geometricBounds,
        pageGeometries,
      );

      const page = spreadPages.get(pageSelf);
      if (!page) continue;

      const objStyle = frame.appliedObjectStyle ? objectStyleMap.get(frame.appliedObjectStyle) : undefined;

      const geo = resolveFrameGeometry(frame.itemTransform, frame.geometricBounds, pageGeo);
      const story = storyMap.get(frame.parentStory);

      const { opacity: tfOpacity, mixBlendMode: tfBlend, boxShadow: tfShadow } =
        resolveTransparency(frame.transparency, colorMap);

      const resolved: ResolvedTextFrame = {
        self:         frame.self,
        x:            geo.x,
        y:            geo.y,
        width:        geo.width,
        height:       geo.height,
        columns:      frame.textColumnCount  ?? 1,
        columnGutter: frame.textColumnGutter ? pt(frame.textColumnGutter) : 0,
        borderRadius: objStyle ? resolveCornerRadius(objStyle) : undefined,
        opacity:      tfOpacity,
        mixBlendMode: tfBlend,
        boxShadow:    tfShadow,
        paragraphs:   story ? resolveStory(story, styleResolver) : [],
      };

      page.textFrames.push(resolved);
    }

    // 4. Assign each GraphicFrame to its page
    for (const frame of spread.graphicFrames) {
      if (frame.visible === false) continue;
      const { self: pageSelf, geometry: pageGeo } = findPageForFrame(
        frame.itemTransform,
        frame.geometricBounds,
        pageGeometries,
      );

      const page = spreadPages.get(pageSelf);
      if (!page) continue;

      const objStyle = frame.appliedObjectStyle ? objectStyleMap.get(frame.appliedObjectStyle) : undefined;

      const geo = resolveFrameGeometry(frame.itemTransform, frame.geometricBounds, pageGeo);

      const fillColor   = frame.fillColor   ?? objStyle?.fillColor;
      const strokeColor = frame.strokeColor ?? objStyle?.strokeColor;
      const fillTint    = frame.fillTint    ?? objStyle?.fillTint;
      const strokeTint  = frame.strokeTint  ?? objStyle?.strokeTint;
      const strokeWeight = frame.strokeWeight ?? objStyle?.strokeWeight;
      const gradientFillAngle   = frame.gradientFillAngle   ?? objStyle?.gradientFillAngle;
      const gradientStrokeAngle = frame.gradientStrokeAngle ?? objStyle?.gradientStrokeAngle;

      const { opacity: gfOpacity, mixBlendMode: gfBlend, boxShadow: gfShadow } =
        resolveTransparency(frame.transparency, colorMap);

      const resolved: ResolvedGraphicFrame = {
        self:         frame.self,
        x:            geo.x,
        y:            geo.y,
        width:        geo.width,
        height:       geo.height,
        fillColor:    resolvePaint(fillColor,   gradientFillAngle,   fillTint),
        strokeColor:  resolvePaint(strokeColor, gradientStrokeAngle, strokeTint),
        strokeWeight: strokeWeight ? pt(strokeWeight) : undefined,
        borderRadius: objStyle ? resolveCornerRadius(objStyle) : undefined,
        opacity:      gfOpacity,
        mixBlendMode: gfBlend,
        boxShadow:    gfShadow,
        image:        frame.image ? resolveImage(frame.image, frame.geometricBounds, frame.itemTransform) : undefined,
      };

      page.graphicFrames.push(resolved);
    }

    // 5. Assign each Polygon to its page
    for (const frame of spread.polygons) {
      if (frame.visible === false) continue;
      const { self: pageSelf, geometry: pageGeo } = findPageForFrame(
        frame.itemTransform,
        frame.geometricBounds,
        pageGeometries,
      );

      const page = spreadPages.get(pageSelf);
      if (!page) continue;

      const objStyle = frame.appliedObjectStyle ? objectStyleMap.get(frame.appliedObjectStyle) : undefined;
      const geo = resolveFrameGeometry(frame.itemTransform, frame.geometricBounds, pageGeo);

      const fillColor        = frame.fillColor        ?? objStyle?.fillColor;
      const strokeColor      = frame.strokeColor      ?? objStyle?.strokeColor;
      const fillTint         = frame.fillTint         ?? objStyle?.fillTint;
      const strokeTint       = frame.strokeTint       ?? objStyle?.strokeTint;
      const strokeWeight     = frame.strokeWeight     ?? objStyle?.strokeWeight;
      const gradientFillAngle   = frame.gradientFillAngle   ?? objStyle?.gradientFillAngle;
      const gradientStrokeAngle = frame.gradientStrokeAngle ?? objStyle?.gradientStrokeAngle;

      const transformPoint = ([lx, ly]: [number, number]): [number, number] => {
        const [sx, sy] = applyTransform(frame.itemTransform, lx, ly);
        return [pt(sx) - pageGeo.spreadX - geo.x, pt(sy) - pageGeo.spreadY - geo.y];
      };

      const paths: ResolvedSubPath[] = frame.paths.map(subpath => ({
        pathOpen: subpath.pathOpen,
        points: subpath.points.map(p => ({
          anchor:         transformPoint(p.anchor),
          leftDirection:  transformPoint(p.leftDirection),
          rightDirection: transformPoint(p.rightDirection),
        })),
      }));

      const { opacity: pgOpacity, mixBlendMode: pgBlend, svgFilter: pgFilter } =
        resolveTransparency(frame.transparency, colorMap, true);

      const resolved: ResolvedPolygon = {
        self:         frame.self,
        x:            geo.x,
        y:            geo.y,
        width:        geo.width,
        height:       geo.height,
        fillColor:    resolvePaint(fillColor,   gradientFillAngle,   fillTint),
        strokeColor:  resolvePaint(strokeColor, gradientStrokeAngle, strokeTint),
        strokeWeight: strokeWeight ? pt(strokeWeight) : undefined,
        borderRadius: objStyle ? resolveCornerRadius(objStyle) : undefined,
        opacity:      pgOpacity,
        mixBlendMode: pgBlend,
        svgFilter:    pgFilter,
        paths,
      };

      page.polygons.push(resolved);
    }

    resolvedPages.push(...spreadPages.values());
  }

  return {
    pageWidth:  pt(idml.documentPreferences.pageWidth),
    pageHeight: pt(idml.documentPreferences.pageHeight),
    pages:      resolvedPages,
  };
};
