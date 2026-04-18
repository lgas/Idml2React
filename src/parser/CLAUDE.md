# src/parser/

## XML parsing quirks (fast-xml-parser)
- Namespace colons → underscores: `<idPkg:Spread>` → `idPkg_Spread`
- Attributes prefixed `@_`: `Self="x"` → `'@_Self': 'x'`
- Single child = object; multiple children = array — always use `toArray()` from `@helpers/parser.helper` to normalize

## Raw interface pattern
- Define `Raw*` interfaces inline per parser file — never export them (they are XML shape, not domain model)
- Every attribute is `string | undefined` — cast with `num()` / `str()` helpers
- `str()` returns `undefined` for empty strings (safe for optional refs)
- `num()` returns `undefined` for empty, `NaN` for non-numeric (not `undefined`) — guard against NaN explicitly when needed

## Geometry
- `GeometricBounds` = `[top, left, bottom, right]` in pts, item-local space
- `ItemTransform` = `[a, b, c, d, tx, ty]` affine matrix
- If `@_GeometricBounds` is absent, fall back to `PathGeometry` anchor points (`boundsFromPathGeometry`) — already handled in `spread.parser.ts`
- Nested `Rectangle` elements carry a parent transform — use `combineTransforms()`, already implemented

## spread.parser.ts — key internal helpers

| Helper | Behavior |
|--------|----------|
| `parseTransform(v)` | Splits 6-number string; falls back to identity `[1,0,0,1,0,0]` on missing/malformed |
| `parseBoundsAttr(v)` | Splits 4-number string; returns `null` on failure |
| `boundsFromPathGeometry(pg)` | AABB of all `PathPointType.@_Anchor` points → `[top,left,bottom,right]` |
| `resolveBounds(attr, pg)` | Prefers `@_GeometricBounds`, falls back to path geometry, then `[0,0,0,0]` |
| `combineTransforms(parent, child)` | 2×2 multiply + translate: `tx' = a*ctx + c*cty + ptx` |
| `mimeFromTypeName(name)` | String-contains check: png/gif/tiff/webp/svg → MIME; default `image/jpeg` |

## story.parser.ts — key behaviors
- **`parseLeading(v)`**: `'Auto'` → `'Auto'`; numeric string → `number`; empty/invalid → `undefined`
- **`extractCharOverrides`**: only sets keys explicitly present — returns `undefined` if nothing is set. **Why**: avoids overwriting cascade values with `undefined` in the resolver merge.
- **Properties child elements override same-named attributes** (e.g. `<Properties><Leading>18</Leading>` wins over `@_Leading="10"`) — intentional IDML specificity rule
- **`softReturn`**: `true` when `<Br/>` present; `undefined` otherwise (never `false`). **Why**: `undefined` means "unset" in the cascade; `false` would wrongly block inheritance.
- Paragraph-level character overrides (`@_AppliedFont`, etc.) stored in `overrides.characterStyle` and cascade down to all char ranges in that paragraph

## Resources file mapping

| File | Parser export |
|------|--------------|
| `Resources/Graphic.xml` | `parseGraphic` → colors, gradients |
| `Resources/Styles.xml` | `parseStyles` → characterStyles, paragraphStyles, objectStyles |
| `Resources/Preferences.xml` | `parsePreferences` → pageWidth, pageHeight |

## Style groups
All three style types (char, para, object) use the same recursive `flatten*` pattern: collect items at root + recurse into nested `*StyleGroup` children. **Why**: IDML allows arbitrary nesting of style groups in the UI; flattening at parse time means the resolver never has to walk nested groups.

## Boolean attributes
`@_Underline`, `@_StrikeThru`, `@_Nonprinting`: `'true'` → `true`; `'false'` → `false`; absent → `undefined`. **Never use `Boolean(v)`** — the string `'false'` is truthy.

## Reusing Raw interfaces for new shape types
`<Polygon>` has identical XML attributes to `<Rectangle>` — type it as `RawRectangle` in `RawSpread` rather than a new interface. **Why**: avoids duplication; IDML reuses the same attribute set for all frame-like shapes.
```ts
Polygon?: RawRectangle | RawRectangle[];
```
Then `mapPolygon` spreads `mapGraphicFrame(raw)` and adds only shape-specific fields (path points).

## Path points (Polygon / bezier shapes)
`PathPointType` has three attributes: `Anchor`, `LeftDirection`, `RightDirection` — all `"x y"` strings.
- Fall back `leftDirection`/`rightDirection` to `anchor` when absent (straight segment)
- `RawGeometryPathType` carries `@_PathOpen` — add it to the interface before reading it
- `parseXY(v)` helper: split `"x y"` → `[number, number]`, return `[0,0]` on failure
