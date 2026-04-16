import { xmlParser } from '@config/index';
import type { IdmlStory } from '../types/index';

/**
 * Parse un fichier Story_*.xml
 * Contient le contenu textuel et les styles de caractères/paragraphes
 */
export const parseStory = (xml: string): IdmlStory => {
    try {
        const parsed = xmlParser.parse(xml);
        // L'IDML peut avoir différentes structures racine
        return parsed.Story || parsed.idPkg_Story || parsed;
    } catch (error) {
        throw new Error(`Erreur lors du parsing d'une story: ${error}`);
    }
};