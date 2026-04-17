import type { ParsedIdml, IdmlStory, IdmlImage, GeometricBounds } from '../types/idml.types';
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
import { buildStyleResolver, buildColorMap, type ResolvedTextStyle } from './styles.resolver';
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
});



// ---------------------------------------------------------------------------
// Image resolver
// ---------------------------------------------------------------------------

const imageFilename = (linkUri: string): string => {
  const raw = linkUri.replace(/\\/g, '/').split('/').pop() ?? linkUri;
  return decodeURIComponent(raw).replace(/\.tiff?$/i, '.jpg');
};

const resolveImage = (
  img:         IdmlImage,
  frameBounds: GeometricBounds,
): ResolvedImage | undefined => {
  if (!img.base64 && !img.linkUri) return undefined;

  const src = img.base64
    ? `data:${img.mimeType};base64,${img.base64}`
    : `/images/${imageFilename(img.linkUri!)}`;

  // ItemTransform = [scaleX, 0, 0, scaleY, tx, ty]
  // tx/ty are in the frame's LOCAL coordinate space (pts), whose origin is
  // typically at the frame's center — not its top-left corner.
  // Subtracting the frame's local top-left (geometricBounds[1], [0]) gives
  // the image offset relative to the frame div's top-left corner.
  const scaleX = img.itemTransform[0];
  const scaleY = img.itemTransform[3];
  const offsetX = pt(img.itemTransform[4] - frameBounds[1]);
  const offsetY = pt(img.itemTransform[5] - frameBounds[0]);

  // Rendered size = natural dimensions (in pts) × scale → px
  const width  = img.naturalWidth  != null ? pt(img.naturalWidth  * scaleX) : 0;
  const height = img.naturalHeight != null ? pt(img.naturalHeight * scaleY) : 0;

  return { src, offsetX, offsetY, width, height };
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
  const colorMap      = buildColorMap(idml.colors);

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
        fillColor:    frame.fillColor   ? colorMap.get(frame.fillColor)   : undefined,
        strokeColor:  frame.strokeColor ? colorMap.get(frame.strokeColor) : undefined,
        strokeWeight: frame.strokeWeight ? pt(frame.strokeWeight) : undefined,
        
        image:        frame.image ? resolveImage(frame.image, frame.geometricBounds) : undefined,
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
