# src/components/

## Layout model
All frames use `position: absolute` with px coords from the resolver. **Why**: IDML uses absolute positioning; CSS flow layout would require reverse-engineering InDesign's layout engine, which is not feasible.
Scale via `useViewportWidth` (ResizeObserver) — never hardcode pixel sizes in components.

## Frame hierarchy
`IdmlDocument` → `IdmlPage` → `IdmlTextFrame` / `IdmlGraphicFrame` / `IdmlPolygonFrame` → `IdmlParagraph` → `IdmlTextRun`

## IdmlPage — z-order and scale
Render order within a page: **graphicFrames → polygons → textFrames**. **Why**: text must always render on top of graphics to match InDesign's default stacking behavior.
Scale: outer div = `width/height * scale` (reserves layout space); inner div = `transform: scale(scale)` with `transformOrigin: top left`. **Why**: two-div approach prevents scale from collapsing the parent's reported size, which would break the ResizeObserver loop.

## IdmlGraphicFrame
- `overflow: hidden` only when `frame.image` is present — images can be larger than frame (crop). **Why**: applying it unconditionally clips polygon SVGs that intentionally overflow their bounding box.
- `mixBlendMode: 'multiply'` on `<img>` when `frame.fillColor` is set — colorizes grayscale images
- `flipX=true` → `transform: scaleX(-1)` on `<img>`; `flipY=true` → `scaleY(-1)`
- `borderRadius` from resolved object style applies to the container div

## IdmlTextFrame
- `columnCount` / `columnGap` only set when `columns > 1` — not rendered for single-column frames. **Why**: setting `column-count: 1` in CSS changes text rendering subtly; omit it to keep default browser behavior.
- `overflow: hidden` always — text can overflow the frame in InDesign but we clip
- `borderRadius` from resolved object style applies to the container div

## IdmlTextRun
- `<span>` + optional `<br/>` after it when `softReturn === true`
- `display: inline-block` + `transform: scale(scaleX/100, scaleY/100)` only when `scaleX` or `scaleY` is set. **Why**: `inline-block` is required for CSS `transform` to apply to inline text.
- `verticalAlign` rendered in `pt` units (not px) — InDesign baseline shift is in points and should not be scaled
- `lang` attribute on `<span>` drives browser text shaping (Arabic, Hebrew, CJK)

## IdmlPolygonFrame
SVG-based. Cubic bezier path per subpath:
- Open path (`pathOpen=true`): `M anchor[0]` then `L` to each remaining anchor
- Closed path (`pathOpen=false`): `M anchor[0]` then per segment `C rightDir[i] leftDir[i+1] anchor[i+1]`; last segment closes back to start with `rightDir[last]` + `leftDir[0]`, then `Z`
- Multiple subpaths joined with space in `d`
- SVG uses `overflow: visible` — polygon paths can extend beyond their bounding box. **Why**: InDesign strokes are centered on the path; half the stroke width bleeds outside the geometric bounds.

## Adding a new frame type
Render inside `IdmlPage`. Follow `position: absolute` + `data-self` (for debugging) pattern. Register in the render-order sequence (see z-order above).
