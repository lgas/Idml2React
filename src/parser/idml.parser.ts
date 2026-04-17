import AdmZip from 'adm-zip';
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
  static async parseFile(filePath: string): Promise<ParsedIdml> {
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

    const { colors, gradients } = graphicXml
      ? parseGraphic(graphicXml)
      : { colors: [], gradients: [] };
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

    // Images with inline base64 CDATA are already resolved.
    // ZIP-embedded and linked images are resolved by the document resolver
    // using linkUri → /images/filename URL (served from public/images/).

    return {
      documentPreferences,
      colors,
      gradients,
      characterStyles,
      paragraphStyles,
      spreads,
      stories,
    };
  }
}
