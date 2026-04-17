# src/resolver/

## Orchestration
`document.resolver.ts` is the only public entry point. It calls geometry and style resolvers internally — do not call them from components.

## Color / paint resolution
`resolvePaint(ref, angle?, tint?)` handles all paint types:
- `ref` is an IDML self ID like `"Color/Black"` or `"Gradient/u5534"`
- Gradients need `angle` to produce a valid CSS gradient
- `tint` of `-1` means 100% (no tint); `0–99` approximates opacity on a white background via `rgba`
- Returns `undefined` for `"Swatch/None"` or unknown refs

## Object style merge order
Frame inline value **wins** over object style default — use `??` not `||` (allows `0` and `false` to be valid inline values):
```ts
const fillColor = frame.fillColor ?? objStyle?.fillColor;
```

## Corner radius
`resolveCornerRadius(objStyle)` returns a CSS shorthand `"TLpx TRpx BRpx BLpx"` or `undefined`.
Only `RoundedCorner` option produces a non-zero radius — all other `CornerOption` values map to `0`.
Order is CSS standard: top-left, top-right, bottom-right, bottom-left.

## Style cascade (text)
4-layer merge with increasing priority:
1. Named paragraph style
2. Paragraph inline overrides
3. Named character style
4. Character inline overrides

`buildStyleResolver()` returns `{ resolveRange(para, range) }` — call once per document, reuse for all stories.

## Frame-to-page assignment
Frames are spread-level in IDML (not nested in `<Page>`). `findPageForFrame()` uses the frame's transformed bounding box center to determine which page it belongs to.

## Transforming individual path points (Polygon)
Path point anchors are in item-local space. To convert to frame-relative px:
```ts
const [sx, sy] = applyTransform(frame.itemTransform, lx, ly); // → spread pts
const frameRelX = pt(sx) - pageGeo.spreadX - geo.x;
const frameRelY = pt(sy) - pageGeo.spreadY - geo.y;
```
`applyTransform` is exported from `geometry.resolver.ts` for this purpose.
