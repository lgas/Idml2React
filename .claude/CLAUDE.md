# CLAUDE.md

<!--This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.-->

## Commands

```bash
pnpm dev          # CLI watch mode (tsx watch src/index.ts)
pnpm start <f>    # Run CLI on an .idml file → outputs .parsed.json and .resolved.json
pnpm ui           # Vite dev server (React renderer, port 3000)
pnpm build        # tsc compile to dist/
```

No test suite configured.

## Architecture

Three-phase pipeline: **Parse → Resolve → Render**

```
IDML ZIP
  └─ IdmlParser.parseFile()       → ParsedIdml   (raw XML-mapped types)
       └─ resolveDocument()       → ResolvedDocument (px, CSS colors, merged styles)
            └─ React components   → pixel-perfect HTML (absolute positioning)
```

### Parse (`src/parser/`)
Extracts IDML ZIP, reads XML via `fast-xml-parser`. Delegates per-section:
- `designmap.parser.ts` — entry points list
- `spread.parser.ts` — pages + frames (geometry)
- `story.parser.ts` — text content
- `resources.parser.ts` — colors, paragraph/character styles, prefs

### Resolve (`src/resolver/`)
Transforms `ParsedIdml` into renderer-ready `ResolvedDocument`:
- `geometry.resolver.ts` — affine transforms, points → px
- `styles.resolver.ts` — style cascade merge, CMYK → RGB
- `document.resolver.ts` — orchestration

### Render (`src/components/`)
React components with `position: absolute` matching InDesign coordinates.
`IdmlDocument` → `IdmlPage` → `IdmlTextFrame` / `IdmlGraphicFrame` → `IdmlParagraph` → `IdmlTextRun`

`useViewportWidth` (ResizeObserver) drives a scale factor applied at document root.

### Types (`src/types/`)
- `idml.types.ts` — raw IDML domain model (post-parse)
- `resolved.types.ts` — renderer-ready types (post-resolve)

### Path aliases
`@/*` → `src/*`, `@config/*`, `@parser/*`,  `@scripts/*`, `@resolver/*`, `@components/*`, `@hooks/*`, `@helpers/*`

## Key constraints / known limits
- Images: embedded TIFF converted to JPG via `sharp`; linked images resolved relative to IDML path
- No support for tables, anchored objects, footnotes, master page overrides
- Coordinate origin: InDesign uses top-left of spread; resolver maps to page-local px coords
- Style cascade: character style overrides paragraph style overrides base style
