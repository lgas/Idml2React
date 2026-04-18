# src/

## Pipeline rule
Parse → Resolve → Render. **Never pass parsed types to the renderer directly** — resolved types carry px/CSS, parsed types carry pts/IDML refs. Mixing them produces silent unit bugs.

## Path aliases
Declared in both `tsconfig.json` (type-checking) and `vite.config.ts` (vitest + dev server). Add a new alias in both files or it will resolve at runtime but fail in tests.

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `src/*` |
| `@config/*` | `src/config/*` |
| `@parser/*` | `src/parser/*` |
| `@resolver/*` | `src/resolver/*` |
| `@components/*` | `src/components/*` |
| `@hooks/*` | `src/hooks/*` |
| `@helpers/*` | `src/helpers/*` |
| `@scripts/*` | `src/scripts/*` |

## Adding a new IDML concept (checklist)
1. Add `Raw*` interface inline in the parser file (never export — it's XML-shape, not domain model)
2. Add domain type in `types/idml.types.ts` (pts, IDML refs)
3. Add resolved type in `types/resolved.types.ts` (px, CSS strings, no IDML IDs)
4. Wire into `ParsedIdml` and `ResolvedDocument`
5. Parse in the relevant `*parser.ts`
6. Resolve in `resolver/document.resolver.ts`
7. Render in the relevant component
8. Add tests in the matching `__tests__/` directory

## Units
- Parser output: **points (pt)**, raw IDML refs (e.g. `"Color/Black"`)
- Resolver output: **px** (`PT_TO_PX = 96 / 72`), CSS color strings
- Conversion only in the resolver — never in the parser or renderer

## XML singleton
`config/xml-parser.config.ts` exports a single `xmlParser` instance. Key settings and **why**:

| Setting | Value | Why |
|---------|-------|-----|
| `attributeNamePrefix` | `"@_"` | Avoids collision between XML attrs and child elements with the same name |
| `transformTagName` | `idPkg:X → idPkg_X`; strips `aid:` / `xs:` | Colons are invalid in JS identifiers |
| `parseTagValue / parseAttributeValue` | `false` | All values stay as strings; cast explicitly with `num()`/`str()` to avoid silent NaN bugs |
| `isArray` whitelist | e.g. `TextFrame`, `CharacterStyle`, `Content` | fast-xml-parser returns an object when only one child exists; whitelist forces array |
| `cdataPropName` | `"__cdata"` | CDATA extraction from `<Content>` is unreliable; text arrives via `#text` |
