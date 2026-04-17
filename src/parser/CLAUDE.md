# src/parser/

## XML parsing quirks (fast-xml-parser)
- Namespace colons become underscores: `<idPkg:Spread>` → `idPkg_Spread`
- Attributes are prefixed `@_`: `Self="x"` → `'@_Self': 'x'`
- A single child becomes an object; multiple children become an array — always use `toArray()` from `@helpers/parser.helper`

## Raw interface pattern
- Define `Raw*` interfaces inline per file — never export them
- Every attribute is `string | undefined` — cast with `num()` / `str()` helpers
- `str()` returns `undefined` for empty strings (safe for optional refs)

## Geometry
- `GeometricBounds` = `[top, left, bottom, right]` in pts, item-local space
- `ItemTransform` = `[a, b, c, d, tx, ty]` affine matrix
- If `@_GeometricBounds` is absent, fall back to `PathGeometry` anchor points (`boundsFromPathGeometry`) — already handled in `spread.parser.ts`
- Nested `Rectangle` elements carry a parent transform — use `combineTransforms()`, already implemented

## Resources file mapping
| File | Parser export |
|------|--------------|
| `Resources/Graphic.xml` | `parseGraphic` → colors, gradients |
| `Resources/Styles.xml` | `parseStyles` → characterStyles, paragraphStyles, objectStyles |
| `Resources/Preferences.xml` | `parsePreferences` → pageWidth, pageHeight |

## Style groups
All three style types (char, para, object) use the same recursive `flatten*` pattern: collect items at root level + recurse into nested `*StyleGroup` children.

## AppliedObjectStyle ref
Frames carry `@_AppliedObjectStyle` (e.g. `"ObjectStyle/$ID/[None]"`). The `[None]` style has all-zero/transparent defaults — resolving it is safe and produces no visible change.

## Reusing Raw interfaces for new shape types
`<Polygon>` has the same XML attributes as `<Rectangle>` — type it as `RawRectangle` in `RawSpread` rather than defining a new interface:
```ts
Polygon?: RawRectangle | RawRectangle[];
```
Then `mapPolygon` spreads `mapGraphicFrame(raw)` and adds only the shape-specific fields (path points).

## Path points (Polygon / bezier shapes)
`PathPointType` has three attributes: `Anchor`, `LeftDirection`, `RightDirection` — all `"x y"` strings.
- Fall back `leftDirection`/`rightDirection` to `anchor` when the attribute is absent (straight segment).
- `RawGeometryPathType` carries `@_PathOpen` — add it to the interface before reading it.
- `parseXY(v)` helper: split `"x y"` → `[number, number]`, return `[0,0]` on failure.
