import { xmlParser } from '@config/index';
import type { IdmlDesignMap } from '../types/index';

/**
 * Parse le fichier designmap.xml
 * Contient les références vers les spreads et les stories
 */
export const parseDesignMap = (xml: string): IdmlDesignMap => {
    try {
        const parsed = xmlParser.parse(xml);
        return parsed.DesignMap || parsed;
    } catch (error) {
        throw new Error(`Erreur lors du parsing de designmap.xml: ${error}`);
    }
};