import AdmZip from 'adm-zip';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseDesignMap } from './designmap.parser';
import { parseGraphic, parseStyles, parsePreferences } from './resources.parser';
import { parseSpread } from './spread.parser';
import { parseStory } from './story.parser';
import type { ParsedIdml } from '../types/idml.types';

/**
 * Main IDML parser.
 * An IDML file is a ZIP archive containing XML files organized as:
 *
 *   designmap.xml              — entry point, lists all files
 *   Resources/Graphic.xml      — color swatches
 *   Resources/Styles.xml       — paragraph & character styles
 *   Resources/Preferences.xml  — document settings (page size, etc.)
 *   Spreads/Spread_*.xml        — page layout (frames, geometry)
 *   Stories/Story_*.xml         — text content
 */
export class IdmlParser {
  static async parseFile(filePath: string, linksDir?: string): Promise<ParsedIdml> {
    const zip = new AdmZip(filePath);

    const read = (name: string): string | null => {
      const entry = zip.getEntry(name);
      return entry ? zip.readAsText(entry) : null;
    };

    // 1. designmap.xml — discover which spreads / stories are included
    const designMapXml = read('designmap.xml');
    if (!designMapXml) throw new Error('Invalid IDML: designmap.xml is missing');
    const designMap = parseDesignMap(designMapXml);
    
    // 2. Resources — colors, styles, document preferences
    const graphicXml     = read('Resources/Graphic.xml');
    const stylesXml      = read('Resources/Styles.xml');
    const preferencesXml = read('Resources/Preferences.xml');

    const colors = graphicXml ? parseGraphic(graphicXml) : [];
    const { characterStyles, paragraphStyles } = stylesXml
      ? parseStyles(stylesXml)
      : { characterStyles: [], paragraphStyles: [] };
    const documentPreferences = preferencesXml
      ? parsePreferences(preferencesXml)
      : { pageWidth: 0, pageHeight: 0 };

    // 3. Spreads — listed in designmap.xml; fall back to scanning the archive
    const spreadSrcs = designMap.spreadSrcs.length > 0
      ? designMap.spreadSrcs
      : zip.getEntries()
           .map(e => e.entryName)
           .filter(n => n.startsWith('Spreads/Spread_') && n.endsWith('.xml'));
    
    const spreads = spreadSrcs.flatMap(src => {
      const xml = read(src);
      if (!xml) {
        console.warn(`IdmlParser: spread file not found — ${src}`);
        return [];
      }
      return [parseSpread(xml)];
    });

    // 4. Stories — listed in designmap.xml; fall back to scanning the archive
    const storySrcs = designMap.storySrcs.length > 0
      ? designMap.storySrcs
      : zip.getEntries()
           .map(e => e.entryName)
           .filter(n => n.startsWith('Stories/Story_') && n.endsWith('.xml'));

    const stories = storySrcs.flatMap(src => {
      const xml = read(src);
      if (!xml) {
        console.warn(`IdmlParser: story file not found — ${src}`);
        return [];
      }
      return [parseStory(xml)];
    });

    // 5. Resolve images — two sources:
    //    a) ZIP-embedded (StoredState="Embedded" but no inline CDATA) → read from Links/ inside ZIP
    //    b) Linked (StoredState="Normal") + linksDir provided → read from disk
    for (const spread of spreads) {
      for (const frame of spread.graphicFrames) {
        const img = frame.image;
        if (!img || img.base64) continue;

        // Extract filename from LinkResourceURI ("file:C:/…/Links/foo.jpg" → "foo.jpg")
        const filename = img.linkUri
          ?.replace(/\\/g, '/')
          .split('/')
          .pop();
        if (!filename) continue;

        if (img.storedState === 'Embedded') {
          // a) Embedded image stored inside the ZIP under Links/
          const entry = zip.getEntry(`Links/${filename}`);
          if (entry) {
            img.base64 = zip.readFile(entry)!.toString('base64');
          } else {
            console.warn(`IdmlParser: embedded image not found in ZIP — Links/${filename}`);
          }
        } else if (img.storedState === 'Linked' && linksDir) {
          // b) Linked image — try to read from the provided links directory
          const decoded  = decodeURIComponent(filename);
          const filePath = join(linksDir, decoded);
          if (existsSync(filePath)) {
            img.base64      = readFileSync(filePath).toString('base64');
            img.storedState = 'Embedded'; // treat as resolved
          } else {
            console.warn(`IdmlParser: linked image not found on disk — ${filePath}`);
          }
        }
      }
    }

    return {
      documentPreferences,
      colors,
      characterStyles,
      paragraphStyles,
      spreads,
      stories,
    };
  }
}
