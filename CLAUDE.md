# CLAUDE.md

The project renders `.idml` files as pixel-perfect React components.

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
  └─ IdmlParser.parseFile()     → ParsedIdml        (pts, IDML ID refs)
       └─ resolveDocument()     → ResolvedDocument   (px, CSS strings)
            └─ React components → pixel-perfect HTML (absolute positioning)
```

See `src/CLAUDE.md`, `src/parser/CLAUDE.md`, `src/resolver/CLAUDE.md`, `src/components/CLAUDE.md`, `src/types/CLAUDE.md` for per-folder detail.

## Resources parsed from IDML ZIP

| File | Content |
|------|---------|
| `designmap.xml` | Spread + story file list |
| `Resources/Graphic.xml` | Color swatches, gradients |
| `Resources/Styles.xml` | Character, paragraph, **object** styles |
| `Resources/Preferences.xml` | Page dimensions |
| `Spreads/Spread_*.xml` | Pages, frames, geometry |
| `Stories/Story_*.xml` | Text content |

## Known limits
- No tables, anchored objects, footnotes, master page overrides
- Coordinate origin: InDesign uses top-left of spread; resolver maps to page-local px
- Images: linked images served from `public/images/`; TIFF → JPG via `sharp`
