import AdmZip from 'adm-zip';
import { parseDesignMap, parseStory, parseSpread } from '@parsers/index';
import type { ParsedIdml } from '../types/index';

/**
 * Parser principal pour les fichiers IDML
 * Coordonne l'extraction et le parsing des différentes parties
 */
export class IdmlParser {
    /**
     * Parse un fichier IDML complet
     * @param filePath - Chemin vers le fichier .idml
     * @returns Données IDML structurées
     */
    static async parseFile(filePath: string): Promise<ParsedIdml> {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        
        // 1. Extraire et parser designmap.xml (obligatoire)
        const designMapEntry = entries.find(e => e.entryName === 'designmap.xml');
        if (!designMapEntry) {
            throw new Error('Fichier IDML invalide : designmap.xml manquant');
        }
        const designMapXml = zip.readAsText(designMapEntry);
        const designMap = parseDesignMap(designMapXml);
        
        // 2. Extraire et parser tous les spreads
        const spreadEntries = entries.filter(e => e.entryName.startsWith('Spreads/Spread_'));
        const spreads = spreadEntries.map(entry => {
            const xml = zip.readAsText(entry);
            return parseSpread(xml);
        });
        
        // 3. Extraire et parser toutes les stories
        const storyEntries = entries.filter(e => e.entryName.startsWith('Stories/Story_'));
        const stories = storyEntries.map(entry => {
            const xml = zip.readAsText(entry);
            return parseStory(xml);
        });
        
        return {
            designMap,
            spreads,
            stories,
        };
    }
}