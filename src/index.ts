import { writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { IdmlParser } from '@/parser/index';
import { resolveDocument } from '@/resolver/document.resolver';
import { convertTiffToJpg } from '@/scripts/convert-tiff';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm start <path/to/file.idml>');
    process.exit(1);
  }

  const inputPath = resolve(args[0]);
  const basePath  = inputPath.replace(/\.idml$/i, '');

  try {
    // ── 0. Convert any TIFF files in public/images/ to JPG ────────────────
    const publicImages = join(resolve('.'), 'public', 'images');
    await convertTiffToJpg(publicImages);

    // ── 1. Parse raw IDML ──────────────────────────────────────────────────
    console.log(`Parsing ${inputPath}...`);
    const parsed = await IdmlParser.parseFile(inputPath);

    writeFileSync(`${basePath}.parsed.json`, JSON.stringify(parsed, null, 2));
    console.log(`Raw parsed  → ${basePath}.parsed.json`);
    console.log(`  ${parsed.spreads.length} spread(s), ${parsed.stories.length} story/stories`);
    console.log(`  ${parsed.paragraphStyles.length} paragraph styles, ${parsed.characterStyles.length} character styles`);
    console.log(`  ${parsed.colors.length} colors`);

    // ── 2. Resolve to renderer-ready document ─────────────────────────────
    console.log('\nResolving...');
    const resolved = resolveDocument(parsed);

    writeFileSync(`${basePath}.resolved.json`, JSON.stringify(resolved, null, 2));
    console.log(`Resolved    → ${basePath}.resolved.json`);


  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
