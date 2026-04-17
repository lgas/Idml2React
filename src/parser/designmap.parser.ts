import { toArray } from '@helpers/parser.helper';
import { xmlParser } from '@config/index';

/**
 * Minimal designmap.xml parse result.
 * We only need the file references — the actual content is parsed by dedicated parsers.
 */
export interface DesignMap {
  spreadSrcs: string[];   // e.g. ['Spreads/Spread_ub6.xml', ...]
  storySrcs: string[];    // e.g. ['Stories/Story_u1b4.xml', ...]
}

interface RawDesignMap {
  Document?: {
    idPkg_Spread?: Array<{ '@_src': string }> | { '@_src': string };
    idPkg_Story?:  Array<{ '@_src': string }> | { '@_src': string };
  };
}

export const parseDesignMap = (xml: string): DesignMap => {
  const raw: RawDesignMap = xmlParser.parse(xml);
  const doc = raw.Document ?? {};
  

  return {
    spreadSrcs: toArray(doc.idPkg_Spread).map(s => s['@_src']),
    storySrcs:  toArray(doc.idPkg_Story).map(s => s['@_src']),
  };
};
