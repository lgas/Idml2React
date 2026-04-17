# src/

## Pipeline
Parse → Resolve → Render. Never skip phases — raw parsed types are not renderer-safe.

## Path aliases
`@/*` → `src/*`, also `@config/*`, `@parser/*`, `@resolver/*`, `@components/*`, `@hooks/*`, `@helpers/*`, `@scripts/*`.

## Adding a new IDML concept (checklist)
1. Add raw `Raw*` interface in the parser file (never export it)
2. Add domain type in `types/idml.types.ts`
3. Add resolved type in `types/resolved.types.ts` (px, CSS strings, no IDML IDs)
4. Wire into `ParsedIdml` and `ResolvedDocument`
5. Parse in the relevant `*parser.ts`
6. Resolve in `resolver/document.resolver.ts`
7. Render in the relevant component

## Units
- Parser output: points (pt), raw IDML refs (e.g. `"Color/Black"`)
- Resolver output: px (`PT_TO_PX = 96 / 72`), CSS color strings
- Never mix units across the phase boundary
