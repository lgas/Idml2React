import { xmlParser } from '@config/index';
import type { IdmlSpread } from '../types/index';

/**
 * Parse un fichier Spread_*.xml
 * Contient la mise en page visuelle d'une page ou double-page
 */
export const parseSpread = (xml: string): IdmlSpread => {
    try {
        const parsed = xmlParser.parse(xml);
        return parsed.Spread || parsed;
    } catch (error) {
        throw new Error(`Erreur lors du parsing d'un spread: ${error}`);
    }
};