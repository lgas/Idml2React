# src/types/

## Two type layers — strict separation
- `idml.types.ts` — post-parse. Values in **pts**, colors as IDML self-ID refs (e.g. `"Color/Black"`).
- `resolved.types.ts` — post-resolve. Values in **px**, colors as CSS strings. **No IDML IDs**.

**Why**: mixing the layers causes silent unit bugs (pt rendered as px = ~33% size error). The type system enforces the boundary — resolved types must never carry IDML refs.

## Key primitives
- `ItemTransform` = `[a, b, c, d, tx, ty]` — affine matrix (same order as CSS `matrix(a,b,c,d,tx,ty)`)
- `GeometricBounds` = `[top, left, bottom, right]` — **top-first**, not CSS box-model order (IDML convention)
- `Leading` = `number | 'Auto'` — numeric in pts, or InDesign's auto-leading keyword
- `StoryDirection` = `'LeftToRightDirection' | 'RightToLeftDirection'` — drives `dir` attribute in renderer

## Extending frames
`IdmlTextFrame` and `IdmlGraphicFrame` both accept `appliedObjectStyle?: string` (ref to `IdmlObjectStyle.self`).
`ResolvedTextFrame` and `ResolvedGraphicFrame` both accept `borderRadius?: string` (CSS shorthand).

## Shape types — extend, don't duplicate
New shapes that share paint props should extend existing frame types:
```ts
export interface IdmlPolygon extends IdmlGraphicFrame { pathPoints: ...; pathOpen: boolean; }
export interface ResolvedPolygon extends ResolvedGraphicFrame { pathPoints: ...; pathOpen: boolean; }
```
**Why**: duplicating fill/stroke/opacity fields would require two places to update for every new resolver feature.
New spread shapes → `IdmlSpread.polygons`; resolved → `ResolvedPage.polygons`.

## ObjectStyle
`IdmlObjectStyle` covers fill, stroke, per-corner radius + option. `CornerOption` values other than `'RoundedCorner'` render as `0` — only parse what the resolver actually uses. **Why**: parsing all corner variants would require mapping them to CSS features that don't exist.

## ParsedIdml
Adding a new resource type requires updating `ParsedIdml` **and** wiring it through `idml.parser.ts` (the ZIP orchestrator). **Why**: `idml.parser.ts` is the only place that opens the ZIP and routes files to parsers; adding a type without wiring it there means it's never populated.

## Character style fields
`IdmlCharacterStyle`: `appliedFont`, `fontStyle`, `pointSize`, `leading`, `tracking`, `kerningMethod`, `horizontalScale`, `verticalScale`, `baselineShift`, `fillColor`, `strokeColor`, `underline`, `strikeThru`, `capitalization`, `appliedLanguage`, `underlineColor`, `strikeThroughColor`, `kinsokuSet`, `mojikumi`.
Boolean fields (`underline`, `strikeThru`) are `boolean | undefined` — `undefined` = "not set in IDML", not `false`. **Why**: the cascade treats `undefined` as "inherit from parent style"; `false` would incorrectly block inheritance.

## ResolvedTextStyle fields
CSS-ready: `fontFamily`, `fontWeight`, `fontStyle`, `fontSize` (px), `lineHeight` (px), `letterSpacing` (em), `fontKerning`, `color`, `textAlign`, `direction`, `marginTop/Bottom` (px), `textIndent` (px), `textTransform`, `textDecoration`, `textDecorationColor`, `lang`, `verticalAlign` (pt), `scaleX/Y` (%), `paddingLeft/Right` (px).
