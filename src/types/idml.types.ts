/**
 * Types pour les données parsées de l'IDML
*/

export interface IdmlAttribute {
  '@_Self'?: string;
  '@_Name'?: string;
  '@_AppliedParagraphStyle'?: string;
  '@_AppliedCharacterStyle'?: string;
  '@_ItemTransform'?: string;
  '@_Visible'?: boolean;
  [key: `@_${string}`]: string | boolean | undefined;
}

export interface IdmlContent {
  '#text'?: string;
  __cdata?: string;
}

export interface IdmlParagraphStyleRange extends IdmlAttribute {
  CharacterStyleRange: IdmlCharacterStyleRange[];
  Content?: IdmlContent[];
}

export interface IdmlCharacterStyleRange extends IdmlAttribute {
  Content?: IdmlContent[];
  Br?: IdmlAttribute[];
}

export interface IdmlStory {
  '@_Self': string;
  '@_Name'?: string;
  ParagraphStyleRange: IdmlParagraphStyleRange[];
  StoryPreference?: {
    '@_StoryDirection'?: 'LeftToRightDirection' | 'RightToLeftDirection';
  };
}

export interface IdmlTextFrame extends IdmlAttribute {
  Properties?: IdmlAttribute[];
}

export interface IdmlPage extends IdmlAttribute {
  TextFrame?: IdmlTextFrame[];
  Rectangle?: IdmlAttribute[];
}

export interface IdmlSpread {
  '@_Self': string;
  Page: IdmlPage[];
}

export interface IdmlDesignMap {
  Document?: {
    Spread?: Array<{ '@_Src': string }>;
    Story?: Array<{ '@_Src': string }>;
  };
}

export interface ParsedIdml {
  designMap: IdmlDesignMap;
  spreads: IdmlSpread[];
  stories: IdmlStory[];
}