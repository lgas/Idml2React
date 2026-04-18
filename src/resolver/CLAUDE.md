# src/resolver/

## Orchestration rule
`document.resolver.ts` is the **only public entry point**. Geometry and style resolvers are internal — do not import them from components. **Why**: keeps resolution order predictable and prevents components from accidentally running resolution twice.

## geometry.resolver.ts

### applyTransform
```ts
applyTransform([a, b, c, d, tx, ty], x, y) → [x', y']
// x' = a*x + c*y + tx
// y' = b*x + d*y + ty
```
Transforms path point anchors from item-local space to spread space.

### resolvePageGeometry / resolveFrameGeometry
Both transform all 4 corners of the bounds rect and return the AABB. **Why**: directly computing `width = right - left` would be wrong for rotated/skewed frames — transforming all corners is the only correct approach.

### findPageForFrame
Assigns a frame to a page using the **center** of its AABB in spread space. Falls back to `pages[0]`. **Why**: IDML frames are spread-level (not nested under `<Page>`), so page membership must be computed from position.

## Color / paint resolution

### buildColorMap
- RGB → `rgb(r, g, b)`
- CMYK (0–100 scale) → RGB approx: `r = round(255 * (1 - c/100) * (1 - k/100))`
- LAB / Mixed → `'#000000'` fallback (**Why**: requires ICC profile, not available in browser)
- Linear gradient → `linear-gradient(90deg, stop1 loc%, ...)` — stops sorted ascending by location
- Radial gradient → `radial-gradient(circle, stop1 loc%, ...)`
- Unresolved stop color ref → `'#000000'` fallback

### applyGradientAngle
Substitutes the angle in a stored `linear-gradient(...)` CSS string.
`cssAngle = ((90 - idmlAngle) % 360 + 360) % 360`
**Why**: InDesign 0° = horizontal left→right = CSS 90deg. The `% 360 + 360) % 360` handles negative modulo in JS.
- InDesign 0° → CSS 90deg | 90° → CSS 0deg | 180° → CSS 270deg
- Radial gradients and non-gradient strings returned unchanged.

### resolvePaint(ref, angle?, tint?)
- `ref` is an IDML self ID like `"Color/Black"` or `"Gradient/u5534"`
- Gradients need `angle` to produce a valid CSS gradient
- `tint=-1` means 100% (no tint); `0–99` approximates opacity on white via `rgba`. **Why**: InDesign tint is ink-based; we approximate with alpha blending.
- Returns `undefined` for `"Swatch/None"` or unknown refs

## Object style merge order
Frame inline value **wins** over object style — use `??` not `||`. **Why**: `||` would ignore `0` and `false` as falsy, overwriting valid inline values with style defaults.
```ts
const fillColor = frame.fillColor ?? objStyle?.fillColor;
```

## Corner radius
`resolveCornerRadius(objStyle)` → CSS shorthand `"TLpx TRpx BRpx BLpx"` or `undefined`.
Only `RoundedCorner` produces non-zero — all other `CornerOption` values map to `0`. **Why**: InDesign has 5+ corner options but only RoundedCorner has a direct CSS equivalent.
Order: top-left, top-right, bottom-right, bottom-left (CSS standard).

## Style cascade (text)
4-layer merge, increasing priority:
1. Named paragraph style
2. Paragraph inline overrides
3. Named character style
4. Character inline overrides

`buildStyleResolver()` → `{ resolveRange(para, range) }` — call **once per document**, reuse for all stories. **Why**: basedOn chain flattening is done at build time; calling it per-range would recompute the full chain repeatedly.

### basedOn chain flattening
Run at resolver build time, not per-range. Cycles guarded with `visited: Set<string>`.
`$ID/`-prefixed refs (e.g. `"$ID/[No paragraph style]"`) are InDesign's root sentinel — treated as no parent.

## Polygon path points
Path point anchors are item-local. To convert to frame-relative px:
```ts
const [sx, sy] = applyTransform(frame.itemTransform, lx, ly); // → spread pts
const frameRelX = pt(sx) - pageGeo.spreadX - geo.x;
const frameRelY = pt(sy) - pageGeo.spreadY - geo.y;
```
`applyTransform` is exported from `geometry.resolver.ts` for this purpose.

## Transparency
`resolveTransparency(t, colorMap, forSvg)`:
- Opacity < 100 → `opacity` (0–1 scale)
- Blend mode `'Normal'` → omitted (**Why**: CSS default; emitting it wastes bytes and can interact badly with stacking contexts)
- Drop shadow → `boxShadow` string by default; `svgFilter` string when `forSvg=true`
- Absent transparency object → returns `{}`

## imageFilename helper
- Normalizes Windows backslashes → forward slashes (**Why**: IDML files authored on Windows embed backslash paths)
- Extracts filename only (no path)
- `.tiff` / `.tif` (any case) → `.jpg` (**Why**: browsers don't render TIFF; images are pre-converted via `sharp`)
