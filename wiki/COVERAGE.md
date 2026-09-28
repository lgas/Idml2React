# IDML to Web Coverage Analysis

Based on the provided IDML Web‑Oriented Specification (`IDML2WEB-SPEC.MD`), your TypeScript types (`idml.types.ts`, `resolved.types.ts`), and the actual parsed/resolved JSON data.

## 1. Percentage of Web‑Oriented IDML Features Covered

Your current implementation covers approximately **40–45%** of the features that are useful for generating HTML/CSS.

| Feature Area                     | Coverage | Notes                                                                 |
| -------------------------------- | -------- | --------------------------------------------------------------------- |
| **Document & Spread container**  | Partial  | `Spread` attributes (`ItemTransform`, `PageCount`) missing; `Layer` missing |
Oval| **Page items (basic geometry)**  | Partial  | `Rectangle`, `Oval`, `Polygon`, `TextFrame` parsed; `Group`, `Button`, `MultiStateObject`, form fields missing |
| **Common page item attributes**  | Partial  | `FillColor`, `StrokeWeight`, `StrokeColor` present; `StrokeAlignment`, `StrokeType`, `DashAndGap`, arrowheads missing |
| **Path geometry**                | ✅ Good  | Polygons fully supported; rectangles/ovals use bounds instead of paths |
| **Text & typography**            | ✅ Good  | Most character/paragraph properties parsed; missing `DropCap`, `NoBreak`, `Position` (superscript/subscript) |
| **Colors & gradients**           | ✅ Full  | CMYK/RGB/LAB colors converted to CSS; linear gradients supported |
| **Tables**                       | ❌ 0%    | Not parsed at all                                                    |
| **Hyperlinks**                   | ❌ 0%    | Not parsed                                                           |
| **Buttons & behaviors**          | ❌ 0%    | Not parsed                                                           |
| **Multimedia** (video/audio)     | ❌ 0%    | Not parsed                                                           |
| **Animation**                    | ❌ 0%    | Not parsed                                                           |

> The largest gaps are **interactive elements** (hyperlinks, forms, multimedia) and **structured data** (tables).  
> Text and basic graphics are well covered – they represent the majority of static layouts.

## 2. Tags & Attributes That Are Parsed but Not Resolved

These fields are present in your `idml.types.ts` but are **not transformed** into render‑ready CSS/HTML in `resolved.types.ts`.

| Parsed Field / Attribute          | Type Location                        | Why Not Resolved                                                                 |
| --------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `kerningMethod`                   | `IdmlCharacterStyle`                 | No direct CSS equivalent (browser uses `font-kerning` automatically)             |
| `bulletsAndNumberingListType`     | `IdmlParagraphStyle`                 | Not mapped to `<ul>` / `<ol>` yet                                                |
| `bulletsAlignment`                | `IdmlParagraphStyle`                 | Would control list marker alignment – not used                                   |
| `fillTint` / `strokeTint`         | `IdmlGraphicFrame`, `IdmlObjectStyle`| Not converted to `rgba()` or opacity                                             |
| `visible`                         | `IdmlGraphicFrame`, `IdmlTextFrame`  | All frames are treated as visible; no `display: none` logic                      |
| `locked`                          | Idml page items                      | Not relevant for rendering                                                       |
| `nonprinting`                     | Idml page items                      | Not relevant for screen display                                                  |
| `storedState` (image)             | `IdmlImage`                          | Only `src` is used; linking/embedding status ignored                             |
| `linkUri`                         | `IdmlImage`                          | Used only to fetch image data, not stored in resolved                            |
| `mimeType`                        | `IdmlImage`                          | Not needed after base64 conversion                                               |
| `naturalWidth` / `naturalHeight`  | `IdmlImage`                          | Used during parsing but not kept in resolved                                     |
| `gradientFillAngle` / `gradientStrokeAngle` | `IdmlGraphicFrame`        | Actually **resolved** – used to build `linear-gradient` angle (present in output) |

> **Note:** `appliedObjectStyle` is resolved because the resolver merges object style properties into the frame’s direct attributes.

## 3. Missing Tags & Attributes – Priority for Implementation

Based on real‑world usage frequency in InDesign documents, here is the recommended order for adding missing features.

### 🔴 High Priority (very common)

| IDML Tag / Attribute                    | CSS / HTML Equivalent                           | Reason                                                           |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `Table`, `Row`, `Cell`                  | `<table>`, `<tr>`, `<td>`                       | Tables are ubiquitous in data‑rich layouts                       |
| `HyperlinkURLDestination` + `HyperlinkTextSource` | `<a href="...">`                         | Essential for any web export                                     |
| `StrokeAlignment` (`CenterAlignment`, `InsideAlignment`, `OutsideAlignment`) | `box-sizing` + border behavior | Controls whether stroke is centred, inside, or outside the frame |
| `StrokeType` (`Solid`, `Dashed`, `Dotted`) + `StrokeDashAndGap` | `border-style` + `stroke-dasharray`  | Dashed/dotted borders are extremely common                       |
| `LeftLineEnd` / `RightLineEnd` (arrowheads) | CSS `::marker` or SVG markers               | Used for callout lines, flowcharts                               |
| `DropCapLines` + `DropCapCharacters`    | `::first-letter` + custom styling               | Common in magazine‑style text                                    |

### 🟡 Medium Priority (important for rich documents)

| IDML Tag / Attribute                    | CSS / HTML Equivalent                           | Reason                                                           |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `BulletsAndNumberingListType`           | `<ul>` / `<ol>`                                 | Lists appear frequently                                          |
| `NoBreak`                               | `white-space: nowrap`                           | Prevents line breaks in specific text runs                       |
| `Position` (`Superscript`, `Subscript`) | `vertical-align: super/sub`                    | Footnotes, chemical formulas, etc.                               |
| `CornerOption` + `TopLeftCornerRadius`, etc. | `border-radius` (shorthand)               | Rounded corners on frames – very frequent                        |
| `VerticalJustification` (in `TextFrame`) | flexbox alignment (`align-items`)              | Vertical centering of text inside a frame                        |
| `InsetSpacing` (top/left/bottom/right)  | `padding`                                       | Inner margins of text frames                                     |

### 🟢 Lower Priority (less frequent, but useful)

| IDML Tag / Attribute                    | CSS / HTML Equivalent                           | Reason                                                           |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `Button` + `State` (`Up`, `Rollover`, `Down`) | CSS `:hover`, `:active`                 | For interactive PDF/HTML forms                                   |
| `CheckBox`, `RadioButton`, `TextBox`, `ComboBox` | HTML form elements                      | Forms                                                            |
| `Movie`, `Sound`                        | `<video>`, `<audio>`                            | Multimedia                                                       |
| `AnimationSetting` (duration, easing, keyframes) | CSS `@keyframes`                        | For SWF/HTML5 animation export                                   |
| `Group` (nested page items)             | `<div>` nesting + transforms                    | Required for preserving complex grouped layouts                  |
| `Layer`                                 | `z-index` stacking order                       | Useful for multi‑layer designs                                   |

---

## Summary Table – Implementation Roadmap

| Priority | Feature Area          | Current Status       | Next Action                                                              |
| -------- | --------------------- | -------------------- | ------------------------------------------------------------------------ |
| 🔴       | Tables                | Not parsed           | Add `IdmlTable`, `IdmlRow`, `IdmlCell` → resolve to HTML `<table>`       |
| 🔴       | Hyperlinks            | Not parsed           | Add `HyperlinkURLDestination`, `HyperlinkTextSource` → resolve to `<a>`  |
| 🔴       | Stroke alignment      | Not parsed           | Add `StrokeAlignment` to `IdmlGraphicFrame` → map to CSS border behavior |
| 🔴       | Stroke type & dashes  | Not parsed           | Add `StrokeType`, `StrokeDashAndGap` → map to `border-style` + `stroke-dasharray` |
| 🔴       | Arrowheads            | Not parsed           | Add `LeftLineEnd`/`RightLineEnd` → map to CSS markers or SVG             |
| 🔴       | Drop caps             | Not parsed           | Add `DropCapLines`, `DropCapCharacters` → implement `::first-letter`     |
| 🟡       | Lists                 | Parsed but not resolved | Map `bulletsAndNumberingListType` to `<ul>`/`<ol>`                       |
| 🟡       | Corner radii          | Partially parsed (in object styles) | Add `CornerOption` + radii to frames → `border-radius`                   |
| 🟡       | Vertical justification | Not parsed           | Add `VerticalJustification` to `IdmlTextFrame` → use flexbox alignment   |
| 🟢       | Buttons & forms       | Not parsed           | Add button and form field elements                                       |
| 🟢       | Multimedia            | Not parsed           | Add `Movie`, `Sound` elements                                            |
| 🟢       | Animation             | Not parsed           | Add `AnimationSetting` to page items                                     |

Once you add the **high‑priority** items, your coverage will rise to **~70%**.  
Adding medium priority brings it to **~85%**.