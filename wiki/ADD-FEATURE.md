# Adding a Feature to idml2json

This document covers what you need to know before touching the codebase: the architecture rules, the decisions made along the way, and the traps to avoid. It was written after implementing group rendering (`<Group>` support) from scratch.

---

## The checklist (never skip a step)

Every new IDML concept follows the same path through the pipeline. The CLAUDE.md files call this the "adding a new IDML concept checklist":

1. Add a `Raw*` interface in the parser file (never export it)
2. Add a domain type in [`src/types/idml.types.ts`](src/types/idml.types.ts)
3. Add a resolved type in [`src/types/resolved.types.ts`](src/types/resolved.types.ts)
4. Wire the new type into `ParsedIdml` and `ResolvedDocument`
5. Parse it in the relevant `*parser.ts`
6. Resolve it in [`src/resolver/document.resolver.ts`](src/resolver/document.resolver.ts)
7. Render it in a component
8. Add the component to [`IdmlPage.tsx`](src/components/IdmlPage.tsx) (or the appropriate parent)

If you skip step 3 and try to pass a parsed type directly to a component, TypeScript will stop you — and that's intentional. The phase boundary is enforced by the type system.

---

## Architecture: the three-phase rule

The single most important constraint in this codebase is that **no type crosses a phase boundary unchanged**:

```
IDML XML  →  [Parser]  →  ParsedIdml  →  [Resolver]  →  ResolvedDocument  →  [Components]
              pts, IDs                    px, CSS strings
```

- **Parser output** (`idml.types.ts`): everything in points, colors as IDML self-IDs like `"Color/Black"`, transforms as raw `[a,b,c,d,tx,ty]` tuples. No CSS anywhere.
- **Resolver output** (`resolved.types.ts`): everything in pixels, colors as CSS strings like `"rgb(255,0,0)"`, styles merged and flattened. No IDML IDs anywhere.
- **Components**: receive `Resolved*` types only. They produce CSS from what they're given — they do no math, no lookup, no conversion.

This separation is not ceremonial. It means you can test the resolver in complete isolation (all 190 tests do exactly this), change the renderer without touching parsing logic, and reason about each phase independently.

---

## How the parser works

### Raw interfaces are private

Every parser file defines `Raw*` interfaces that mirror the XML structure exactly. These are never exported. The public output is always a typed domain model from `idml.types.ts`.

```ts
// Private — stays in spread.parser.ts
interface RawGroup extends RawBase {
  '@_ItemTransform'?: string;
  '@_FillColor'?:     string;
  // ...
}

// Public — goes into idml.types.ts
export interface IdmlGroup extends IdmlBase {
  itemTransform: ItemTransform;
  fillColor?:    string;
  // ...
}
```

### Every attribute is a string until you cast it

`fast-xml-parser` is configured with no automatic value parsing. Every attribute comes in as `string | undefined`. The parser helpers `num()` and `str()` do the safe conversion:

- `str(v)` returns `undefined` for empty strings (prevents phantom color refs)
- `num(v)` returns `undefined` for non-numeric strings (prevents `NaN` propagating through geometry)

Use `parseFloat` / `parseInt` directly only when you're certain the attribute exists and is numeric.

### `toArray()` everywhere

A child element that appears once in XML becomes an object. One that appears multiple times becomes an array. `fast-xml-parser` does not normalize this. Always wrap child access with `toArray()`:

```ts
toArray(raw.TextFrame).map(tf => mapTextFrame(tf))  // safe whether 0, 1, or N children
```

Forgetting this will work fine on files with multiple children but silently break on files with exactly one.

### Transform composition happens in the parser

When a frame is inside a group, its final position in spread space is `parentGroupTransform × frameLocalTransform`. The parser does this multiplication at parse time using `combineTransforms()`, and stores the result as the frame's `itemTransform`. By the time the resolver sees the frame, it has no idea the frame was inside a group — it just has a world-space matrix.

This means the resolver doesn't need to traverse trees. It calls `resolveFrameGeometry(frame.itemTransform, frame.geometricBounds, pageGeo)` the same way for every frame, regardless of nesting depth.

The identity matrix check (`isIdentity()`) avoids unnecessary multiplications when there's no parent transform.

### `RawRectangle` works for polygons too

`<Polygon>` in IDML has the same attributes as `<Rectangle>`. The parser types it as `RawRectangle` rather than defining a redundant interface. Only the `mapPolygon` function differs — it spreads `mapGraphicFrame(raw)` and adds the path point extraction on top.

---

## How the resolver works

### Everything resolves through one entry point

[`document.resolver.ts`](src/resolver/document.resolver.ts) is the only public export. It calls geometry, style, and color resolvers internally. Components never call resolver functions directly.

### Inner closures avoid repetition

The resolver defines per-frame-type helpers (`resolveTextFrameItem`, `resolveGraphicFrameItem`, `resolvePolygonItem`) as closures inside `resolveDocument`. They close over `colorMap`, `resolvePaint`, `objectStyleMap`, and `styleResolver` — all of which are computed once at the top of `resolveDocument`.

This pattern is important: if you need to resolve the same frame type in two places (e.g., top-level spread frames and group children), define the helper once and call it from both places. Do not copy-paste the resolution logic.

### Group bounding boxes are computed, not read

InDesign stores a `GeometricBounds` attribute on `<Group>` elements, but it can be stale after the document is edited. The resolver ignores it. Instead:

1. Resolve all children with page-relative coordinates (using the composed transforms from the parser)
2. Compute the group bounding box as `min(x)`, `min(y)`, `max(x+w)`, `max(y+h)` across all children
3. Subtract the group origin from each child's `x` and `y` so they become group-relative

This gives the group `<div>` a reliable bounding box and makes children position correctly inside it.

### Frame-to-page assignment uses center point

Frames are spread-level in IDML — not nested in `<Page>`. `findPageForFrame()` uses the frame's transformed bounding box center to decide which page it belongs to. For groups, the resolver uses the first visible child frame as the anchor for page assignment, since the group itself has no independent bounds before its children are resolved.

### The `??` operator, not `||`

Object style merge always uses `??`:

```ts
const fillColor = frame.fillColor ?? objStyle?.fillColor;
```

Using `||` would treat `0` and `false` as falsy, silently discarding valid zero-value overrides (e.g., `fillTint: 0` means fully transparent, which is meaningful).

### `resolvePaint` handles everything

Colors, gradients, and tints all go through `resolvePaint(ref, angle?, tint?)`. Don't reach into `colorMap` directly. The function handles:
- Solid colors: ref → CSS `rgb()`
- Gradients: ref + angle → CSS `linear-gradient()` / `radial-gradient()` with corrected angle
- Tints: alpha approximation over white via `rgba()`
- Unknown refs: returns `undefined` (treated as transparent by components)

### Drop shadow splits by frame type

`resolveTransparency(t, colorMap, forSvg?)` takes an optional `forSvg` flag. For rectangular frames it outputs `boxShadow`; for SVG polygon frames it outputs `svgFilter` with `drop-shadow()`. This is because `box-shadow` follows the element rectangle, not the SVG path outline.

---

## How the components work

### Absolute positioning everywhere

Every frame renders as `position: absolute` with `left`, `top`, `width`, `height` in px. This mirrors InDesign's layout model exactly. There is no flexbox, grid, or flow layout at the page level — only inside text frames (for columns and vertical justification).

### Group `<div>` as a local coordinate system

The `IdmlGroup` component renders a `position: absolute` div at the group's page-relative position. Inside it, all children use `position: absolute` with coordinates relative to the group's top-left. This is the same model as `IdmlPage` (page-relative absolute positioning), just one level deeper.

The group div has no `overflow: hidden` — group children in InDesign can extend beyond the group's bounds.

### Render order matters

Inside `IdmlPage` and `IdmlGroup`, the render order is:
1. Graphic frames (z-index 0 equivalent — backgrounds, images)
2. Polygon frames (SVG shapes, same layer as graphics)
3. Sub-groups
4. Text frames (always on top)

This matches InDesign's default stacking behavior where text is placed on higher layers than graphics.

### Components do no math

If you find yourself writing arithmetic in a component, it belongs in the resolver. Components receive numbers in px and CSS strings — they put them directly into `style` props.

---

## What the group feature taught us

### The stale-bounds trap

The XML `GeometricBounds` on a `<Group>` element cannot be trusted. InDesign doesn't always update it when you move or resize children. Computing bounds from children at resolve time is the only reliable approach. This likely applies to other container elements too.

### Structural tree vs. flat transform composition

The parser keeps groups as a structural tree (`IdmlGroup` contains `textFrames`, `graphicFrames`, `polygons`, `groups`). Children have composed (world-space) transforms, so the resolver can call `resolveFrameGeometry` on any child without knowing its depth in the tree. This is the right split: structure lives in the tree, math lives in the transforms.

The alternative — fully flattening everything into the spread's flat lists (what the code did before) — loses the group's own style properties and makes it impossible to render a group wrapper div.

### Page assignment for containers

Individual frames use `findPageForFrame(transform, bounds, pageGeometries)` to determine their page. A group has no single transform+bounds pair until its children are resolved. The solution: use any visible child frame's transform+bounds as the page anchor. In practice, all children of a group are on the same page, so any child works.

### Test fixtures need updating

When you add a required field to `IdmlSpread` or `ResolvedPage`, every test fixture that constructs those types inline will fail to compile. The fix is mechanical — add the field with an empty value — but you have to find all the fixtures. Running `tsc --noEmit` immediately after the type change shows exactly which lines need updating.

### The `IdmlPolygonPoint` unused import

TypeScript `import type` declarations for types only used as structural parts of other types (e.g., `IdmlPolygonPoint` is used inside `IdmlSubPath`) can trigger "declared but never read" warnings depending on how the type is referenced. When moving code around, check that all imports are still directly referenced after refactoring.

---

## Where to look when something is wrong

| Problem | Where to look |
|---|---|
| Frame appears at wrong position | `resolveFrameGeometry` in [`geometry.resolver.ts`](src/resolver/geometry.resolver.ts) |
| Frame assigned to wrong page | `findPageForFrame` in [`geometry.resolver.ts`](src/resolver/geometry.resolver.ts) |
| Color wrong or missing | `buildColorMap` in [`styles.resolver.ts`](src/resolver/styles.resolver.ts), `resolvePaint` in [`document.resolver.ts`](src/resolver/document.resolver.ts) |
| Style not applying | `buildStyleResolver` → `resolveRange` in [`styles.resolver.ts`](src/resolver/styles.resolver.ts) |
| Frame missing entirely | Check `visible === false` filter in the spread loop; check `toArray()` usage in the parser |
| Group children at wrong position | `shift` function in `resolveGroupItem` — verify group origin is computed correctly |
| Path wrong on polygon | `transformPoint` closure in `resolvePolygonItem` — check `spreadX`/`spreadY` subtraction |
| XML attribute not parsed | Check `RawGroup` / `RawRectangle` interface has the attribute; check `fast-xml-parser` config forces it as a string |
