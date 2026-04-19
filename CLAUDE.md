# CLAUDE.md

Renders `.idml` files as pixel-perfect React components.

## Commands

```bash
pnpm dev          # CLI watch mode (tsx watch src/index.ts)
pnpm start <f>    # Run CLI on an .idml file → outputs .parsed.json and .resolved.json
pnpm ui           # Vite dev server (React renderer, port 3000)
pnpm build        # tsc compile to dist/
pnpm test         # vitest run (all __tests__/ directories)
pnpm test:watch   # vitest watch mode
```

## Architecture — Parse → Resolve → Render

Three strict phases. **Never skip or merge phases** — each phase has its own type layer and unit system. This separation keeps bugs localized: a wrong px value is always a resolver bug, never a parser bug.

```
IDML ZIP
  └─ IdmlParser.parseFile()   → ParsedIdml        (pts, IDML ID refs)
       └─ resolveDocument()   → ResolvedDocument   (px, CSS strings)
            └─ React comps    → pixel-perfect HTML (absolute positioning)
```

See per-folder CLAUDE.md for details: `src/`, `src/parser/`, `src/resolver/`, `src/components/`, `src/types/`.

## IDML ZIP resources

| File | Content |
|------|---------|
| `designmap.xml` | Spread + story file list |
| `Resources/Graphic.xml` | Color swatches, gradients |
| `Resources/Styles.xml` | Character, paragraph, object styles |
| `Resources/Fonts.xml` | Font families and PostScript names per variant |
| `Resources/Preferences.xml` | Page dimensions |
| `Spreads/Spread_*.xml` | Pages, frames, geometry |
| `Stories/Story_*.xml` | Text content |

## Test locations

| Folder | Files |
|--------|-------|
| `src/helpers/__tests__/` | `parser.helper.test.ts` |
| `src/parser/__tests__/` | `designmap.parser`, `resources.parser`, `story.parser` |
| `src/resolver/__tests__/` | `basedOn`, `pipeline`, `geometry.resolver`, `colorMap` |

## Known limits
- No tables, anchored objects, footnotes, master page overrides
- Coordinate origin: InDesign top-left of spread; resolver maps to page-local px
- Images: linked images served from `public/images/`; TIFF → JPG via `sharp`
- CDATA in `<Content>` nodes is unreliable — story text always arrives via `#text`
