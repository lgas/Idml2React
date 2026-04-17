import type { ParsedIdml, IdmlStory, IdmlImage, GeometricBounds, ItemTransform } from '@/types/idml.types';
import type {
  ResolvedDocument,
  ResolvedPage,
  ResolvedTextFrame,
  ResolvedGraphicFrame,
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
  type PageGeometry,
} from './geometry.resolver';

const PT_TO_PX = 96 / 72;
const pt = (v: number) => v * PT_TO_PX;

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
  color:         s.color,
  textTransform: s.textTransform,
  textDecoration: s.textDecoration,
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
  const styleResolver = buildStyleResolver(idml);
  const colorMap      = buildColorMap(idml.colors, idml.gradients);
  const gradientIds   = new Set(idml.gradients.map(g => g.self));

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
      }]),
    );

    // 3. Assign each TextFrame to its page
    for (const frame of spread.textFrames) {
      const { self: pageSelf, geometry: pageGeo } = findPageForFrame(
        frame.itemTransform,
        frame.geometricBounds,
        pageGeometries,
      );

      const page = spreadPages.get(pageSelf);
      if (!page) continue;

      const geo = resolveFrameGeometry(frame.itemTransform, frame.geometricBounds, pageGeo);
      const story = storyMap.get(frame.parentStory);

      const resolved: ResolvedTextFrame = {
        self:         frame.self,
        x:            geo.x,
        y:            geo.y,
        width:        geo.width,
        height:       geo.height,
        columns:      frame.textColumnCount  ?? 1,
        columnGutter: frame.textColumnGutter ? pt(frame.textColumnGutter) : 0,
        paragraphs:   story ? resolveStory(story, styleResolver) : [],
      };

      page.textFrames.push(resolved);
    }

    // 4. Assign each GraphicFrame to its page
    for (const frame of spread.graphicFrames) {
      const { self: pageSelf, geometry: pageGeo } = findPageForFrame(
        frame.itemTransform,
        frame.geometricBounds,
        pageGeometries,
      );

      const page = spreadPages.get(pageSelf);
      if (!page) continue;

      const geo = resolveFrameGeometry(frame.itemTransform, frame.geometricBounds, pageGeo);

      const resolved: ResolvedGraphicFrame = {
        self:         frame.self,
        x:            geo.x,
        y:            geo.y,
        width:        geo.width,
        height:       geo.height,
        fillColor:    resolvePaint(frame.fillColor,   frame.gradientFillAngle,   frame.fillTint),
        strokeColor:  resolvePaint(frame.strokeColor, frame.gradientStrokeAngle, frame.strokeTint),
        strokeWeight: frame.strokeWeight ? pt(frame.strokeWeight) : undefined,
        image:        frame.image ? resolveImage(frame.image, frame.geometricBounds, frame.itemTransform) : undefined,
      };

      page.graphicFrames.push(resolved);
    }

    resolvedPages.push(...spreadPages.values());
  }

  return {
    pageWidth:  pt(idml.documentPreferences.pageWidth),
    pageHeight: pt(idml.documentPreferences.pageHeight),
    pages:      resolvedPages,
  };
};
