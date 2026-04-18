import { describe, it, expect } from 'vitest';
import { parseDesignMap } from '../designmap.parser';

const wrap = (inner: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Document>${inner}</Document>`;

describe('parseDesignMap', () => {
  it('returns empty arrays when document has no spreads or stories', () => {
    const result = parseDesignMap(wrap(''));
    expect(result).toEqual({ spreadSrcs: [], storySrcs: [] });
  });

  it('returns empty arrays when Document element is missing', () => {
    const result = parseDesignMap('<?xml version="1.0"?><Root/>');
    expect(result).toEqual({ spreadSrcs: [], storySrcs: [] });
  });

  it('parses a single spread src', () => {
    const xml = wrap(`<idPkg:Spread src="Spreads/Spread_ub6.xml"/>`);
    const result = parseDesignMap(xml);
    expect(result.spreadSrcs).toEqual(['Spreads/Spread_ub6.xml']);
  });

  it('parses multiple spread srcs', () => {
    const xml = wrap(`
      <idPkg:Spread src="Spreads/A.xml"/>
      <idPkg:Spread src="Spreads/B.xml"/>
      <idPkg:Spread src="Spreads/C.xml"/>
    `);
    const result = parseDesignMap(xml);
    expect(result.spreadSrcs).toEqual([
      'Spreads/A.xml',
      'Spreads/B.xml',
      'Spreads/C.xml',
    ]);
  });

  it('parses a single story src', () => {
    const xml = wrap(`<idPkg:Story src="Stories/Story_u1b4.xml"/>`);
    const result = parseDesignMap(xml);
    expect(result.storySrcs).toEqual(['Stories/Story_u1b4.xml']);
  });

  it('parses multiple story srcs', () => {
    const xml = wrap(`
      <idPkg:Story src="Stories/S1.xml"/>
      <idPkg:Story src="Stories/S2.xml"/>
    `);
    const result = parseDesignMap(xml);
    expect(result.storySrcs).toEqual(['Stories/S1.xml', 'Stories/S2.xml']);
  });

  it('parses both spreads and stories together', () => {
    const xml = wrap(`
      <idPkg:Spread src="Spreads/A.xml"/>
      <idPkg:Story src="Stories/B.xml"/>
    `);
    const result = parseDesignMap(xml);
    expect(result.spreadSrcs).toEqual(['Spreads/A.xml']);
    expect(result.storySrcs).toEqual(['Stories/B.xml']);
  });
});
