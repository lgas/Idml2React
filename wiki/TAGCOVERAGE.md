# IDML Tag Coverage

Tracks every XML tag, attribute, and property across the three phases: **Parse → Resolve → Render**.

Legend: ✅ done · ⚠️ partial / gap · ❌ not implemented

---

## 1. designmap.xml

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `idPkg:Spread` | ✅ | — | — | Enumerates spread file list |
| `idPkg:Story` | ✅ | — | — | Enumerates story file list |
| `@_src` | ✅ | — | — | File reference on each entry |

---

## 2. Spreads / Pages

### `Spread`

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `Spread` | ✅ | — | — | Root container |
| `@_Self` | ✅ | — | — | Spread ID |
| `Page` | ✅ | ✅ | ✅ | One or more pages per spread |
| `Page/@_Name` | ✅ | ✅ | ✅ | Page label ("1", "2-3", …) |
| `Page/@_GeometricBounds` | ✅ | ✅ | ✅ | `[top left bottom right]` in pts |
| `Page/@_ItemTransform` | ✅ | ✅ | — | Affine matrix (6 values) |

### `TextFrame`

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `@_Self` | ✅ | ✅ | ✅ | Frame ID |
| `@_ParentStory` | ✅ | ✅ | — | Reference to `Stories/Story_*.xml` |
| `@_ItemTransform` | ✅ | ✅ | — | Transform in pts |
| `@_GeometricBounds` | ✅ | ✅ | ✅ | Frame bounds in pts; fallback: PathGeometry AABB |
| `@_TextColumnCount` | ✅ | ✅ | ✅ | Multi-column; fallback to `TextFramePreference` child |
| `@_TextColumnGutter` | ✅ | ✅ | ✅ | Column gap in pts → CSS `column-gap` |
| `@_AppliedObjectStyle` | ✅ | ✅ | ✅ | Object style reference |
| `@_Visible` | ✅ | ✅ | ✅ | `'false'` → frame excluded |
| `Properties/PathGeometry` | ✅ | ✅ | — | Alternative bounds source |
| `TransparencySetting/BlendingSetting/@_BlendMode` | ✅ | ✅ | ✅ | → CSS `mix-blend-mode` |
| `TransparencySetting/BlendingSetting/@_Opacity` | ✅ | ✅ | ✅ | 0–100 → CSS `opacity` |
| `TransparencySetting/DropShadowSetting/@_Mode` | ✅ | ✅ | ✅ | `'Drop'` / `'None'` |
| `TransparencySetting/DropShadowSetting/@_Opacity` | ✅ | ✅ | ✅ | Shadow opacity |
| `TransparencySetting/DropShadowSetting/@_XOffset` | ✅ | ✅ | ✅ | Shadow X in pts |
| `TransparencySetting/DropShadowSetting/@_YOffset` | ✅ | ✅ | ✅ | Shadow Y in pts |
| `TransparencySetting/DropShadowSetting/@_Size` | ✅ | ✅ | ✅ | Blur radius in pts |
| `TransparencySetting/DropShadowSetting/@_Color` | ✅ | ✅ | ✅ | Color reference |
| `@_InsetSpacing` | ❌ | ❌ | ❌ | Frame padding — not implemented |
| `@_VerticalJustification` | ❌ | ❌ | ❌ | Vertical text alignment — not implemented |

### `Rectangle` (Graphic Frame)

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `@_Self` | ✅ | ✅ | ✅ | Frame ID |
| `@_ItemTransform` | ✅ | ✅ | — | Transform in pts |
| `@_GeometricBounds` | ✅ | ✅ | ✅ | Bounds in pts |
| `@_FillColor` | ✅ | ✅ | ✅ | Color / gradient ref |
| `@_FillTint` | ✅ | ✅ | ✅ | 0–100 or -1 → rgba alpha |
| `@_StrokeColor` | ✅ | ✅ | ✅ | Color / gradient ref |
| `@_StrokeTint` | ✅ | ✅ | ✅ | 0–100 or -1 → rgba alpha |
| `@_StrokeWeight` | ✅ | ✅ | ✅ | Stroke width in pts |
| `@_GradientFillAngle` | ✅ | ✅ | ✅ | Rotate `linear-gradient()` CSS |
| `@_GradientStrokeAngle` | ✅ | ✅ | ✅ | Gradient angle for stroke |
| `@_AppliedObjectStyle` | ✅ | ✅ | ✅ | Object style reference |
| `@_Visible` | ✅ | ✅ | ✅ | `'false'` → frame excluded |
| `Properties/PathGeometry` | ✅ | ✅ | — | Bounds fallback |
| `TransparencySetting` | ✅ | ✅ | ✅ | See TextFrame above |
| `@_StrokeAlignment` | ❌ | ❌ | ❌ | Inside / center / outside — not implemented |
| `@_StrokeType` | ❌ | ❌ | ❌ | Dash / dot styles — not implemented |
| `@_StrokeDashAndGap` | ❌ | ❌ | ❌ | Custom dash pattern — not implemented |
| `@_LeftLineEnd`, `@_RightLineEnd` | ❌ | ❌ | ❌ | Arrowheads — not implemented |

### `Image` (child of Rectangle)

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `@_Self` | ✅ | ✅ | — | Image element ID |
| `@_ItemTransform` | ✅ | ✅ | ✅ | Scale + offset within frame |
| `@_ImageTypeName` | ✅ | — | — | MIME type hint |
| `Link/@_StoredState` | ✅ | — | — | `'Embedded'` / `'Normal'` / `'Missing'` |
| `Link/@_LinkResourceURI` | ✅ | ✅ | ✅ | → `/images/{filename}` URL |
| `Properties/GraphicBounds` | ✅ | — | — | Natural image dimensions in pts |
| `Properties/Contents` (base64 CDATA) | ⚠️ | ❌ | ❌ | Code exists but commented out |

### `Polygon`

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| Inherits all Rectangle attributes | ✅ | ✅ | ✅ | Fill, stroke, transform, transparency |
| `GeometryPathType/@_PathOpen` | ✅ | ✅ | ✅ | `'true'` = open path; `'false'` = closed |
| `PathPointType/@_Anchor` | ✅ | ✅ | ✅ | Point `"x y"` in item-local space |
| `PathPointType/@_LeftDirection` | ✅ | ✅ | ✅ | Bezier left control point |
| `PathPointType/@_RightDirection` | ✅ | ✅ | ✅ | Bezier right control point |

### `Group`

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `@_Self` | ✅ | — | — | Group ID |
| `@_ItemTransform` | ✅ | ✅ | — | Combined with child transforms |
| `@_Visible` | ✅ | ✅ | — | Applied to all children |
| Children (TextFrame, Rectangle, Polygon, Group) | ✅ | ✅ | ✅ | **Flattened at parse time** — no `<div>` wrapper emitted |

> **Gap:** Groups are dissolved into parent arrays. Nested group layout / group-level blend modes are lost.

### Not parsed at all in Spreads

| Tag | Notes |
|---|---|
| `Oval` | Parsed as Rectangle; no SVG `<ellipse>` emitted |
| `Layer` | No z-order from layers |
| `Table`, `Cell`, `Row`, `Column` | Not implemented |
| `Button`, `CheckBox`, `RadioButton`, `ComboBox`, `TextBox` | Not implemented |
| `Movie`, `Sound` | Not implemented |
| `AnimationSetting` | Not implemented |
| `HyperlinkTextSource`, `HyperlinkURLDestination` | Not implemented |

---

## 3. Stories / Text

### `Story`

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `@_Self` | ✅ | ✅ | — | Story ID |
| `@_Name` | ✅ | — | — | Metadata only |
| `StoryPreference/@_StoryDirection` | ✅ | ✅ | ✅ | → HTML `dir` attribute |

### `ParagraphStyleRange`

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `@_AppliedParagraphStyle` | ✅ | ✅ | — | Paragraph style ref |
| `@_Justification` | ✅ | ✅ | ✅ | → CSS `text-align` |
| `@_ParagraphDirection` | ✅ | ✅ | ✅ | → CSS `direction` |
| `@_SpaceBefore` | ✅ | ✅ | ✅ | pts → CSS `margin-top` |
| `@_SpaceAfter` | ✅ | ✅ | ✅ | pts → CSS `margin-bottom` |
| `@_FirstLineIndent` | ✅ | ✅ | ✅ | pts → CSS `text-indent` |
| `@_LeftIndent` | ✅ | ✅ | ✅ | pts → CSS `padding-left` |
| `@_RightIndent` | ✅ | ✅ | ✅ | pts → CSS `padding-right` |
| `@_BulletsAndNumberingListType` | ✅ | ⚠️ | ❌ | Parsed; not rendered as `<ul>`/`<ol>` |
| `@_BulletsAlignment` | ✅ | ⚠️ | ❌ | Parsed; not used |
| Character-level overrides on paragraph | ✅ | ✅ | ✅ | Same as CharacterStyleRange |
| `Properties/Leading` | ✅ | ✅ | ✅ | Element form overrides attribute |
| `Properties/AppliedFont` | ✅ | ✅ | ✅ | Element form overrides attribute |
| `Properties/UnderlineColor` | ✅ | ✅ | ✅ | → CSS `text-decoration-color` |
| `Properties/StrikeThroughColor` | ✅ | ✅ | ✅ | → CSS `text-decoration-color` |
| `Properties/BulletChar` | ✅ | ⚠️ | ❌ | Parsed; not rendered |
| `Properties/TabList` (position, alignment, leader) | ✅ | ⚠️ | ❌ | Parsed; not rendered |
| `@_DropCapLines`, `@_DropCapCharacters` | ❌ | ❌ | ❌ | Not implemented |

### `CharacterStyleRange`

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `@_AppliedCharacterStyle` | ✅ | ✅ | — | Character style ref |
| `@_AppliedFont` | ✅ | ✅ | ✅ | PostScript name → CSS `font-family` |
| `@_FontStyle` | ✅ | ✅ | ✅ | → CSS `font-weight` + `font-style` |
| `@_PointSize` | ✅ | ✅ | ✅ | pts → CSS `font-size` px |
| `@_Leading` | ✅ | ✅ | ✅ | `'Auto'` or pts → CSS `line-height` px |
| `@_Tracking` | ✅ | ✅ | ✅ | 1/1000 em → CSS `letter-spacing` |
| `@_HorizontalScale` | ✅ | ✅ | ✅ | % → CSS `transform: scaleX()` |
| `@_VerticalScale` | ✅ | ✅ | ✅ | % → CSS `transform: scaleY()` |
| `@_BaselineShift` | ✅ | ✅ | ✅ | pts → CSS `vertical-align` |
| `@_FillColor` | ✅ | ✅ | ✅ | → CSS `color` |
| `@_StrokeColor` | ✅ | ⚠️ | ❌ | Parsed; text stroke not rendered |
| `@_Underline` | ✅ | ✅ | ✅ | → CSS `text-decoration: underline` |
| `@_StrikeThru` | ✅ | ✅ | ✅ | → CSS `text-decoration: line-through` |
| `@_Capitalization` | ✅ | ✅ | ✅ | → CSS `text-transform` |
| `@_AppliedLanguage` | ✅ | ✅ | ✅ | → HTML `lang` attribute |
| `Content` | ✅ | ✅ | ✅ | Text content nodes |
| `Br` | ✅ | ✅ | ✅ | Soft return → `<br/>` |
| `Properties/KinsokuSet` | ✅ | ⚠️ | ❌ | Parsed; Japanese line-breaking not applied |
| `Properties/Mojikumi` | ✅ | ⚠️ | ❌ | Parsed; Japanese spacing not applied |
| `@_Position` (super / subscript) | ❌ | ❌ | ❌ | Not implemented |
| `@_NoBreak` | ❌ | ❌ | ❌ | Not implemented |

---

## 4. Resources / Styles.xml

### Character Styles

| Tag / Attribute | Parse | Resolve | Notes |
|---|:---:|:---:|---|
| `RootCharacterStyleGroup` | ✅ | — | Root container; groups flattened |
| `CharacterStyle/@_Self` | ✅ | ✅ | Style ID |
| `CharacterStyle/@_Name` | ✅ | ✅ | Style label |
| `Properties/BasedOn` | ✅ | ✅ | Parent style ref; merged in resolver |
| All character attributes (font, size, leading, color …) | ✅ | ✅ | Same attribute set as CharacterStyleRange |
| `StyleGroup` nesting | ✅ | — | Flattened at parse time |

### Paragraph Styles

| Tag / Attribute | Parse | Resolve | Notes |
|---|:---:|:---:|---|
| `RootParagraphStyleGroup` | ✅ | — | Root container; groups flattened |
| `ParagraphStyle/@_Self` | ✅ | ✅ | Style ID |
| `ParagraphStyle/@_Name` | ✅ | ✅ | Style label |
| `Properties/BasedOn` | ✅ | ✅ | Parent style ref; merged in resolver |
| All paragraph + character attributes | ✅ | ✅ | Same attribute sets as ranges |
| `StyleGroup` nesting | ✅ | — | Flattened at parse time |

### Object Styles

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `RootObjectStyleGroup` | ✅ | — | — | Root container |
| `ObjectStyle/@_Self` | ✅ | ✅ | — | Style ID |
| `ObjectStyle/@_Name` | ✅ | ✅ | — | Style label |
| `Properties/BasedOn` | ✅ | ✅ | — | Merged in resolver |
| `@_FillColor`, `@_FillTint` | ✅ | ✅ | ✅ | Fill paint |
| `@_StrokeColor`, `@_StrokeTint` | ✅ | ✅ | ✅ | Stroke paint |
| `@_StrokeWeight` | ✅ | ✅ | ✅ | Stroke width |
| `@_GradientFillAngle`, `@_GradientStrokeAngle` | ✅ | ✅ | ✅ | Gradient angles |
| `@_TopLeftCornerRadius` / `TopRight` / `BottomLeft` / `BottomRight` | ✅ | ✅ | ✅ | Per-corner radius |
| `@_TopLeftCornerOption` / … | ✅ | ✅ | ⚠️ | Only `RoundedCorner` → radius; others ignored |
| `@_Nonprinting` | ✅ | ⚠️ | ❌ | Parsed; not filtered |
| `ObjectStyleGroup` nesting | ✅ | — | — | Flattened at parse time |

---

## 5. Resources / Graphic.xml

### Colors

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `Color/@_Self` | ✅ | ✅ | ✅ | Color ID (e.g. `"Color/Black"`) |
| `Color/@_Name` | ✅ | — | — | Swatch label |
| `Color/@_Space` | ✅ | ✅ | — | `'RGB'` / `'CMYK'` / `'LAB'` / `'Mixed'` |
| `Color/@_ColorValue` | ✅ | ✅ | ✅ | Channel values → CSS `rgb()` |
| LAB colors | ✅ | ⚠️ | ⚠️ | Resolved to `#000000` fallback (no ICC conversion) |

### Gradients

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `Gradient/@_Self` | ✅ | ✅ | ✅ | Gradient ID |
| `Gradient/@_Name` | ✅ | — | — | Gradient label |
| `Gradient/@_Type` | ✅ | ✅ | ✅ | `'Linear'` → `linear-gradient`; `'Radial'` → `radial-gradient` |
| `GradientStop/@_StopColor` | ✅ | ✅ | ✅ | Color reference |
| `GradientStop/@_Location` | ✅ | ✅ | ✅ | 0–100 → CSS stop position |
| `GradientStop/@_Midpoint` | ✅ | ⚠️ | ❌ | Parsed; midpoint interpolation not implemented |

---

## 6. Resources / Preferences.xml

| Tag / Attribute | Parse | Resolve | Render | Notes |
|---|:---:|:---:|:---:|---|
| `DocumentPreference/@_PageWidth` | ✅ | ✅ | ✅ | pts → CSS viewport width |
| `DocumentPreference/@_PageHeight` | ✅ | ✅ | ✅ | pts → CSS viewport height |

---

## 7. Rendering (React components)

### `IdmlDocument`
| Prop | Rendered | Notes |
|---|:---:|---|
| `document: ResolvedDocument` | ✅ | |
| `targetWidth?: number` | ✅ | Scale factor calculation |

### `IdmlPage`
| Prop | Rendered | Notes |
|---|:---:|---|
| `page: ResolvedPage` | ✅ | |
| `scale?: number` | ✅ | Two-div scale pattern |
| Render order | ✅ | graphicFrames → polygons → textFrames |

### `IdmlGraphicFrame`
| CSS property | Rendered | Notes |
|---|:---:|---|
| `position: absolute`, x / y / width / height | ✅ | |
| `background` | ✅ | fillColor (solid or gradient) |
| `border` | ✅ | strokeColor + strokeWeight |
| `border-radius` | ✅ | From object style |
| `opacity` | ✅ | |
| `mix-blend-mode` | ✅ | |
| `box-shadow` | ✅ | Drop shadow |
| `<img>` position + scale | ✅ | Image within frame |
| `<img>` flipX / flipY | ✅ | `transform: scaleX/Y(-1)` |
| `<img>` colorize via blend mode | ✅ | `mix-blend-mode: multiply` for tinted images |

### `IdmlPolygonFrame`
| CSS / SVG property | Rendered | Notes |
|---|:---:|---|
| `position: absolute`, x / y / width / height | ✅ | Container `<div>` |
| SVG `<path fill>` | ✅ | fillColor |
| SVG `<path stroke>` + `stroke-width` | ✅ | strokeColor + strokeWeight |
| `opacity` | ✅ | On `<svg>` |
| `mix-blend-mode` | ✅ | On `<svg>` |
| SVG `<filter>` drop-shadow | ✅ | svgFilter |
| Open / closed paths | ✅ | pathOpen flag |
| Cubic Bezier curves | ✅ | `C` commands from control points |

### `IdmlTextFrame`
| CSS property | Rendered | Notes |
|---|:---:|---|
| `position: absolute`, x / y / width / height | ✅ | |
| `column-count` | ✅ | Only if > 1 |
| `column-gap` | ✅ | columnGutter |
| `border-radius` | ✅ | |
| `opacity` | ✅ | |
| `mix-blend-mode` | ✅ | |
| `box-shadow` | ✅ | |
| `padding` (InsetSpacing) | ❌ | Not implemented |

### `IdmlParagraph` → `<p>`
| CSS property | Rendered | Notes |
|---|:---:|---|
| `text-align` | ✅ | |
| `direction` | ✅ | |
| `margin-top` / `margin-bottom` | ✅ | SpaceBefore / SpaceAfter |
| `text-indent` | ✅ | FirstLineIndent |
| `padding-left` / `padding-right` | ✅ | LeftIndent / RightIndent |

### `IdmlTextRun` → `<span>`
| CSS property | Rendered | Notes |
|---|:---:|---|
| `font-family` | ✅ | |
| `font-weight` / `font-style` | ✅ | |
| `font-size` | ✅ | px |
| `line-height` | ✅ | px |
| `letter-spacing` | ✅ | em |
| `color` | ✅ | |
| `text-transform` | ✅ | |
| `text-decoration` + `text-decoration-color` | ✅ | underline / line-through |
| `vertical-align` | ✅ | baseline shift (pt units) |
| `transform: scale(scaleX, scaleY)` | ✅ | requires `display: inline-block` |
| HTML `lang` | ✅ | |
| `-webkit-text-stroke` | ❌ | StrokeColor on text not rendered |

---

## 8. Gap Summary

### Parsed but not rendered
| Feature | Where | Impact |
|---|---|---|
| Bullets / numbered lists | `@_BulletsAndNumberingListType`, `BulletChar` | Plain text instead of `<ul>`/`<ol>` |
| Tab stops | `Properties/TabList` | Tabs rendered as spaces |
| Text stroke | `CharacterStyleRange/@_StrokeColor` | No `-webkit-text-stroke` emitted |
| KinsokuSet / Mojikumi | CharacterStyleRange Properties | Japanese line-breaking not applied |
| Gradient midpoints | `GradientStop/@_Midpoint` | Midpoint position ignored |
| Non-rounded corners | `@_*CornerOption` | Cut / bevel corners ignored |
| `@_Nonprinting` | ObjectStyle | Hidden-from-print frames still rendered |
| Inline base64 images | `Properties/Contents` CDATA | Code commented out |

### Not parsed at all
| Feature | Priority | Notes |
|---|---|---|
| `@_InsetSpacing` (text frame padding) | High | Very common in real documents |
| `@_VerticalJustification` | High | Top / center / bottom / justify |
| Drop caps (`@_DropCapLines`, `@_DropCapCharacters`) | Medium | Common in editorial layouts |
| Superscript / subscript (`@_Position`) | Medium | → CSS `vertical-align: super/sub` |
| `@_NoBreak` | Low | → CSS `white-space: nowrap` |
| Stroke alignment / type / dash pattern | Medium | → CSS border / SVG `stroke-dasharray` |
| Arrowheads (`@_LeftLineEnd`, `@_RightLineEnd`) | Low | SVG markers |
| Tables (`Table`, `Cell`, `Row`) | High | → HTML `<table>` |
| Hyperlinks | High | → `<a href>` |
| `Oval` as ellipse | Medium | Currently treated as Rectangle |
| `Layer` (z-order) | Low | All frames share same z-order logic |
| Groups preserved as `<div>` | Low | Currently flattened at parse time |
| LAB color ICC conversion | Low | Falls back to `#000000` |

---

## 9. Units & Conversion

| Phase | Unit | Notes |
|---|---|---|
| Parse | points (pt) | 1 pt = 1/72 inch |
| Resolve | pixels (px) | `PT_TO_PX = 96 / 72 ≈ 1.333` |
| Render | px, em, pt | px for geometry; em for `letter-spacing`; pt for `vertical-align` (baseline shift) |

Conversion happens **only in the resolver** — parser never converts, renderer never converts.
