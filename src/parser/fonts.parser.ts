import { xmlParser } from '@config/index';
import { str, toArray } from '@helpers/parser.helper';
import type { IdmlFont } from '@/types/idml.types';

interface RawFont {
  '@_FontFamily'?:    string;
  '@_FontStyleName'?: string;
  '@_PostScriptName'?: string;
}

interface RawFontFamily {
  '@_Name'?: string;
  Font?: RawFont | RawFont[];
}

interface RawFontsRoot {
  idPkg_Fonts?: {
    FontFamily?: RawFontFamily | RawFontFamily[];
  };
}

export const parseFonts = (xml: string): IdmlFont[] => {
  const root = xmlParser.parse(xml) as RawFontsRoot;
  const families = toArray(root.idPkg_Fonts?.FontFamily);
  const fonts: IdmlFont[] = [];

  for (const family of families) {
    for (const font of toArray(family.Font)) {
      const fontFamily    = str(font['@_FontFamily']);
      const fontStyleName = str(font['@_FontStyleName']);
      const postScriptName = str(font['@_PostScriptName']);
      if (fontFamily && fontStyleName && postScriptName) {
        fonts.push({ fontFamily, fontStyleName, postScriptName });
      }
    }
  }

  return fonts;
};
