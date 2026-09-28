# IDML → Web (CSS/HTML) Transformation Guide

**Purpose** : Extract layout, typography, colors, tables, hyperlinks, forms, multimedia, and animation from an IDML package to produce HTML/CSS output.

**Scope** : Only elements and attributes that have a direct or indirect equivalent in web standards. Non‑web features (print, color profiles, transparency flattening, Japanese‑specific typography, etc.) are omitted.

---

## 1. Document & Spread Container

| Tag | Typical Parent(s) | HTML/CSS Role | Key Attributes (with enums) |
|-----|------------------|---------------|-----------------------------|
| `Document` | root of designmap.xml | `<html>` + viewport | `ZeroPoint`, `PageHeight`, `PageWidth` |
| `Spread` | `Document` | `<div>` (absolute container) | `ItemTransform` (matrix), `PageCount` |
| `MasterSpread` | `Document` | master template | same as `Spread` + `Name`, `NamePrefix` |
| `Page` | `Spread`, `MasterSpread` | `<section>` | `GeometricBounds` (y1 x1 y2 x2) |
| `Layer` | `Document` | `z-index` group | `Visible`, `Locked`, `Printable` |

---

## 2. Page Items (common attributes apply to all)

**Common attributes** (used by all spline/graphic/group/button items):  
`FillColor`, `FillTint`, `StrokeWeight`, `StrokeColor`, `StrokeTint`,  
`StrokeAlignment` (`CenterAlignment`, `InsideAlignment`, `OutsideAlignment`),  
`StrokeType`, `StrokeDashAndGap`,  
`LeftLineEnd`/`RightLineEnd` (`None`, `SimpleArrowHead`, `TriangleArrowHead`, `CircleArrowHead`, `SquareArrowHead`, `BarArrowHead`),  
`ItemTransform`, `Visible`, `Locked`, `Nonprinting`.

| Tag | Typical Parent(s) | Specific Role |
|-----|------------------|----------------|
| `Rectangle` | `Spread`, `MasterSpread`, `Group`, `State`, `Button`, `MultiStateObject` | basic box |
| `Oval` | same as `Rectangle` | ellipse |
| `Polygon` | same as `Rectangle` | custom shape |
| `GraphicLine` | same as `Rectangle` | open path |
| `TextFrame` | same as `Rectangle` | text container (refers to `Story`) |
| `Group` | same as `Rectangle` | groups child items |
| `Button` | same as `Rectangle` | interactive button (contains `State`) |
| `MultiStateObject` | same as `Rectangle` | multiple states (contains `State`) |
| `Image`, `PDF`, `EPS`, `ImportedPage` | `Rectangle`, `Oval`, `Polygon`, `Group`, `Button`, `MultiStateObject` | placed graphic inside a container |
| `Movie`, `Sound` | same as `Image` | media |
| `CheckBox`, `ComboBox`, `ListBox`, `RadioButton`, `TextBox`, `SignatureField` | `Spread`, `Rectangle`, `Oval` | form fields |

---

## 3. Path Geometry → SVG

| Tag | Typical Parent(s) | CSS/SVG Equivalent | Attributes |
|-----|------------------|--------------------|-------------|
| `PathGeometry` | `Rectangle`, `Oval`, `Polygon`, `GraphicLine`, `TextFrame`, `Button`, `MultiStateObject` | `<path>` container | — |
| `GeometryPathType` | `PathGeometry` | `<path>` data | `PathOpen` (`true`/`false`) |
| `PathPointArray` | `GeometryPathType` | sequence of points | — |
| `PathPointType` | `PathPointArray` | Bezier point | `Anchor`, `LeftDirection`, `RightDirection` (each = `"x y"`) |

---

## 4. Text & Typography → CSS

| Tag | Typical Parent(s) | CSS Property | Key Attributes (with enums) |
|-----|------------------|--------------|-----------------------------|
| `Story` | `Document` (via `idPkg:Story`), or standalone | text flow | `StoryTitle`, `TrackChanges` |
| `ParagraphStyleRange` | `Story`, `XmlStory`, `XMLElement`, `Cell`, `Footnote`, `Note` | paragraph block | `AppliedParagraphStyle` (reference), `Justification` (`LeftAlign`, `CenterAlign`, `RightAlign`, `FullyJustified`), `SpaceBefore`/`After`, `DropCapLines`, `DropCapCharacters` |
| `CharacterStyleRange` | `ParagraphStyleRange` | inline span | `AppliedCharacterStyle`, `FontStyle`, `PointSize`, `FillColor`, `StrokeColor`, `Capitalization` (`Normal`, `AllCaps`, `SmallCaps`), `Position` (`Normal`, `Superscript`, `Subscript`), `Underline`, `StrikeThru`, `NoBreak`, `Tracking`, `HorizontalScale`, `VerticalScale` |
| `Content` | `CharacterStyleRange` | text node | raw text |
| `Br` | `CharacterStyleRange` | `<br>` | line break |

---

## 5. Colors & Swatches → CSS Colors

| Tag | Parent | CSS Equivalent | Attributes / Enums |
|-----|--------|----------------|---------------------|
| `Color` | `Resources/Graphic.xml` | `rgb()` / `cmyk()` | `Model` (`Process`, `Spot`), `Space` (`RGB`, `CMYK`, `LAB`), `ColorValue` (e.g., `"0 0 0 100"`) |
| `Tint` | same | `color-mix()` | `BaseColor` (reference), `TintValue` (0–100) |
| `Gradient` | same | `linear-gradient()` / `radial-gradient()` | `Type` (`Linear`, `Radial`) |
| `GradientStop` | `Gradient` | color stop | `Location` (0–100), `StopColor` (reference), `Midpoint` (13–87) |
| `Swatch` | same | `transparent` | `Name="None"` |

---

## 6. Tables → HTML `<table>`

| Tag | Typical Parent(s) | HTML Equivalent | Key Attributes |
|-----|------------------|-----------------|----------------|
| `Table` | `CharacterStyleRange`, `Cell` | `<table>` | `ColumnCount`, `BodyRowCount`, `HeaderRowCount`, `FooterRowCount` |
| `Row` | `Table` | `<tr>` | `SingleRowHeight` |
| `Column` | `Table` | `<col>` | `SingleColumnWidth` |
| `Cell` | `Table` | `<td>` / `<th>` | `RowSpan`, `ColumnSpan`, `VerticalJustification` (`TopAlign`, `CenterAlign`, `BottomAlign`, `JustifyAlign`), `TopInset`, `LeftInset`, `BottomInset`, `RightInset`, `FillColor`, `StrokeWeight`, etc. |

---

## 7. Hyperlinks → HTML `<a>`

| Tag | Parent | HTML Equivalent | Key Attributes |
|-----|--------|-----------------|----------------|
| `HyperlinkURLDestination` | `Document` | destination URL | `DestinationURL`, `Name` |
| `HyperlinkPageDestination` | `Document` | page anchor | `DestinationPage` (reference to `Page`), `ViewSetting` |
| `Hyperlink` | `Document` | `<a>` | `Source` (reference to `HyperlinkTextSource`), `DestinationUniqueKey` |
| `HyperlinkTextSource` | `CharacterStyleRange` (inside `Story`) | link text | contains `Content` element |

---

## 8. Buttons & Behaviors → HTML Forms / JS

| Tag | Parent(s) | HTML/JS Equivalent | Key Attributes / Enums |
|-----|-----------|--------------------|------------------------|
| `State` | `Button`, `MultiStateObject` | CSS pseudo‑classes | `Statetype` (`Up`, `Rollover`, `Down`) |
| `GotoURLBehavior` | `Button` | `window.location` | `URL` |
| `SubmitFormBehavior` | `Button` | form submit | — |
| `ClearFormBehavior` | `Button` | reset form | — |
| `PrintFormBehavior` | `Button` | `window.print()` | — |
| Common behavior attributes | all behaviors | JS event | `BehaviorEvent` (`MouseUp`, `MouseDown`, `MouseEnter`, `MouseExit`, `OnFocus`, `OnBlur`) |

---

## 9. Multimedia → HTML5 Media

| Tag | Parent | HTML5 Equivalent | Key Attributes / Enums |
|-----|--------|------------------|------------------------|
| `Movie` | any spline item | `<video>` | `PlayMode` (`Once`, `RepeatPlay`), `ShowControls`, `MovieLoop`, `PosterAvailable` |
| `Sound` | any spline item | `<audio>` | `SoundLoop`, `StopOnPageTurn` |
| `NavigationPoint` | `Movie` | `<track>` cue | `Time` (seconds), `Name` |

---

## 10. Animation → CSS Animations

| Tag | Parent(s) | CSS Equivalent | Key Attributes / Enums |
|-----|-----------|----------------|------------------------|
| `AnimationSetting` | any page item | `@keyframes` | `Duration`, `Plays`, `PlaysLoop`, `EaseType` (`NoEase`, `EaseIn`, `EaseOut`, `EaseInOut`) |
| `TimingSetting` | `Spread`, `MasterSpread`, any page item | event + animation | Contains `TimingList` → `TimingGroup` → `TimingTarget` |
| `TimingTarget` | `TimingGroup` | JS trigger | `DynamicTarget` (reference), `DelaySeconds`, `TriggerEvent` (`OnPageLoad`, `OnClick`, `OnRollover`, `OnRolloff`, etc.) |

---

## 11. Quick Enum Reference for CSS

| Category | Enum Values |
|----------|--------------|
| Justification | `LeftAlign`, `CenterAlign`, `RightAlign`, `FullyJustified` |
| Capitalization | `Normal`, `AllCaps`, `SmallCaps` |
| Stroke alignment | `CenterAlignment`, `InsideAlignment`, `OutsideAlignment` |
| Arrowheads | `None`, `SimpleArrowHead`, `TriangleArrowHead`, `CircleArrowHead`, `SquareArrowHead`, `BarArrowHead` |
| Gradient type | `Linear`, `Radial` |
| Blend modes | `Normal`, `Multiply`, `Screen`, `Overlay`, `Darken`, `Lighten`, `Difference`, etc. |
| Button events | `MouseUp`, `MouseDown`, `MouseEnter`, `MouseExit`, `OnFocus`, `OnBlur` |
| Page transition | `None`, `FadeTransition`, `PushTransition`, `WipeTransition`, `ZoomInTransition` |

---

## 12. Non‑Web Sections to Ignore

The following IDML parts have **no direct CSS/HTML equivalent** and can be skipped:

- `FlattenerPreference`, `PrintPreference`, `PrintBookletOption`
- Color management (`CMYKProfile`, `RGBPolicy`, `RenderingIntent`, etc.)
- `Trapping`, `TrapPreset`
- `XML` tags, `BackingStory`, `Mapping`
- `Index`, `CrossReferenceFormat`
- `PreflightProfile`, `WatermarkPreference`
- `ConditionalTextPreference`
- Japanese‑only features: `Kinsoku`, `Mojikumi`, `Ruby`, `Warichu`, `Kenten`
- `CompositeFont`
- UCF container packaging
- InCopy assignment elements

---

*End of IDML Web‑Oriented Specifications*