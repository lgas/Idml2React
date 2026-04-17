# src/types/

## Two type layers
- `idml.types.ts` — post-parse, IDML domain model. Values in pts, colors as IDML self-ID refs (e.g. `"Color/Black"`).
- `resolved.types.ts` — post-resolve, renderer-ready. Values in px, colors as CSS strings. No IDML IDs.

## Key primitives
- `ItemTransform` = `[a, b, c, d, tx, ty]` — CSS `matrix(a,b,c,d,tx,ty)`
- `GeometricBounds` = `[top, left, bottom, right]` — note top-first, not the CSS box-model order

## Extending frames
Both `IdmlTextFrame` and `IdmlGraphicFrame` accept `appliedObjectStyle?: string` (ref to `IdmlObjectStyle.self`).
Both `ResolvedTextFrame` and `ResolvedGraphicFrame` accept `borderRadius?: string` (CSS shorthand).

## Shape types inherit from frame types
New shape types that share paint props should extend, not duplicate:
```ts
export interface IdmlPolygon extends IdmlGraphicFrame { pathPoints: ...; pathOpen: boolean; }
export interface ResolvedPolygon extends ResolvedGraphicFrame { pathPoints: ...; pathOpen: boolean; }
```
New spread shapes go in `IdmlSpread.polygons`, new resolved shapes in `ResolvedPage.polygons`.

## ObjectStyle
`IdmlObjectStyle` covers fill, stroke, and per-corner radius+option. `CornerOption` values other than `'RoundedCorner'` render as `0` radius — only parse what the resolver actually uses.

## ParsedIdml
Adding a new resource type requires adding it to `ParsedIdml` **and** wiring it through `idml.parser.ts` (the ZIP orchestrator).
