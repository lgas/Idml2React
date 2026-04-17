import { readdirSync, existsSync, unlinkSync } from 'fs';
import { join, extname, basename } from 'path';
import sharp from 'sharp';

/**
 * Converts all .tif / .tiff files in a directory to .jpg using sharp.
 * The original TIFF file is deleted after a successful conversion.
 */
export const convertTiffToJpg = async (dir: string): Promise<void> => {
  if (!existsSync(dir)) return;

  const files = readdirSync(dir).filter(f => /\.tiff?$/i.test(f));
  if (files.length === 0) return;

  console.log(`\nConverting ${files.length} TIFF file(s) in ${dir}...`);

  for (const file of files) {
    const src  = join(dir, file);
    const dest = join(dir, basename(file, extname(file)) + '.jpg');

    try {
      await sharp(src, { failOn: 'error' }).jpeg({ quality: 90 }).toFile(dest);
      unlinkSync(src);
      console.log(`  ✓ ${file} → ${basename(dest)}`);
    } catch (err) {
      console.warn(`  ✗ ${file} — conversion failed:`, err);
    }
  }
};
