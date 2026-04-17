# src/components/

## Layout model
All frames use `position: absolute` with px coords from the resolver. The document root applies a scale factor via `useViewportWidth` (ResizeObserver) — never hardcode pixel sizes in components.

## Frame hierarchy
`IdmlDocument` → `IdmlPage` → `IdmlTextFrame` / `IdmlGraphicFrame` → `IdmlParagraph` → `IdmlTextRun`

## IdmlGraphicFrame
- `overflow: hidden` only when `frame.image` is present (image can be larger than frame = crop)
- `mixBlendMode: 'multiply'` on the `<img>` when `frame.fillColor` is set — colorizes grayscale images
- `borderRadius` from resolved object style applies to the container div

## IdmlTextFrame
- `columnCount` / `columnGap` CSS mirrors InDesign columns exactly — no custom layout needed
- `overflow: hidden` always (text can overflow the frame in InDesign but we clip)
- `borderRadius` from resolved object style applies to the container div

## IdmlPolygonFrame
SVG-based. Cubic bezier path built as:
`M anchor[0]` then for each segment: `C rightDir[i] leftDir[i+1] anchor[i+1]`, closing with `Z` if `pathOpen=false`.
The last segment connects back to `anchor[0]` using `rightDir[last]` and `leftDir[0]`.
SVG uses `overflow: visible` — polygon paths can extend beyond their bounding box.

## Adding a new frame type
Render it inside `IdmlPage`. Follow the same `position: absolute` + `data-self` pattern for debugging.
