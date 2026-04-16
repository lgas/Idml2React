import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { IdmlParser } from '@/parser/index';
import { resolveDocument } from '@/resolver/document.resolver';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm start <path/to/file.idml> [--links <path/to/Links/>]');
    process.exit(1);
  }

  const inputPath = resolve(args[0]);
  const basePath  = inputPath.replace(/\.idml$/i, '');

  // Optional --links flag: directory containing linked image files
  const linksIdx  = args.indexOf('--links');
  const linksDir  = linksIdx !== -1 ? resolve(args[linksIdx + 1]) : undefined;

  try {
    // ── 1. Parse raw IDML ──────────────────────────────────────────────────
    console.log(`Parsing ${inputPath}...`);
    if (linksDir) console.log(`Links dir   → ${linksDir}`);
    const parsed = await IdmlParser.parseFile(inputPath, linksDir);

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

    for (const [i, page] of resolved.pages.entries()) {
      const label = page.name ?? `page ${i + 1}`;


      for (const frame of page.textFrames) {
        const paraCount = frame.paragraphs.length;
        const textPreview = frame.paragraphs
          .flatMap(p => p.ranges.map(r => r.text))
          .join('')
          .slice(0, 60)
          .replace(/\n/g, '↵');
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
