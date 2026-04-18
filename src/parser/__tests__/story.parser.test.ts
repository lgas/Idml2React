import { describe, it, expect } from 'vitest';
import { parseStory, parseLeading } from '../story.parser';

// ---------------------------------------------------------------------------
// parseLeading
// ---------------------------------------------------------------------------

describe('parseLeading', () => {
  it('returns undefined for undefined input', () => {
    expect(parseLeading(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(parseLeading('')).toBeUndefined();
  });

  it('returns "Auto" for the Auto keyword', () => {
    expect(parseLeading('Auto')).toBe('Auto');
  });

  it('parses a numeric string', () => {
    expect(parseLeading('14.4')).toBe(14.4);
    expect(parseLeading('12')).toBe(12);
    expect(parseLeading('0')).toBe(0);
  });

  it('returns undefined for a non-numeric non-Auto string', () => {
    expect(parseLeading('abc')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const wrapStory = (storyAttrs: string, inner: string) =>
  `<?xml version="1.0"?>
  <idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
    <Story Self="s1" ${storyAttrs}>${inner}</Story>
  </idPkg:Story>`;

const simplePara = (style: string, text: string) =>
  `<ParagraphStyleRange AppliedParagraphStyle="${style}">
    <CharacterStyleRange AppliedCharacterStyle="$ID/[No character style]">
      <Content>${text}</Content>
    </CharacterStyleRange>
  </ParagraphStyleRange>`;

// ---------------------------------------------------------------------------
// parseStory
// ---------------------------------------------------------------------------

describe('parseStory', () => {
  it('throws when no <Story> element found', () => {
    expect(() => parseStory('<?xml version="1.0"?><Root/>')).toThrow('parseStory');
  });

  it('parses story self and default direction', () => {
    const xml = wrapStory('', simplePara('ParagraphStyle/Body', 'Hello'));
    const story = parseStory(xml);
    expect(story.self).toBe('s1');
    expect(story.direction).toBe('LeftToRightDirection');
  });

  it('parses RightToLeftDirection from StoryPreference', () => {
    const xml = wrapStory(
      '',
      `<StoryPreference StoryDirection="RightToLeftDirection"/>` +
        simplePara('ParagraphStyle/Body', 'مرحبا'),
    );
    const story = parseStory(xml);
    expect(story.direction).toBe('RightToLeftDirection');
  });

  it('parses a single paragraph with a single character range', () => {
    const xml = wrapStory('', simplePara('ParagraphStyle/Body', 'Hello world'));
    const story = parseStory(xml);
    expect(story.paragraphs).toHaveLength(1);
    const para = story.paragraphs[0];
    expect(para.appliedParagraphStyle).toBe('ParagraphStyle/Body');
    expect(para.characterRanges).toHaveLength(1);
    expect(para.characterRanges[0].content).toEqual(['Hello world']);
  });

  it('parses multiple paragraphs', () => {
    const xml = wrapStory('', [
      simplePara('ParagraphStyle/Body', 'First'),
      simplePara('ParagraphStyle/Body', 'Second'),
    ].join(''));
    const story = parseStory(xml);
    expect(story.paragraphs).toHaveLength(2);
  });

  it('parses text from #text node', () => {
    const xml = wrapStory('', simplePara('ParagraphStyle/Body', 'Plain text'));
    const story = parseStory(xml);
    expect(story.paragraphs[0].characterRanges[0].content).toEqual(['Plain text']);
  });

  it('sets softReturn when <Br/> is present', () => {
    const xml = wrapStory(
      '',
      `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Body">
        <CharacterStyleRange AppliedCharacterStyle="$ID/[No character style]">
          <Content>Line one</Content>
          <Br/>
        </CharacterStyleRange>
      </ParagraphStyleRange>`,
    );
    const story = parseStory(xml);
    expect(story.paragraphs[0].characterRanges[0].softReturn).toBe(true);
  });

  it('leaves softReturn undefined when no <Br/>', () => {
    const xml = wrapStory('', simplePara('ParagraphStyle/Body', 'No break'));
    const story = parseStory(xml);
    expect(story.paragraphs[0].characterRanges[0].softReturn).toBeUndefined();
  });

  it('parses character style overrides from attributes', () => {
    const xml = wrapStory(
      '',
      `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Body">
        <CharacterStyleRange AppliedCharacterStyle="$ID/[No character style]"
          AppliedFont="Helvetica" FontStyle="Bold" PointSize="16"
          Tracking="20" HorizontalScale="90" VerticalScale="110"
          BaselineShift="2" FillColor="Color/Red"
          Underline="true" StrikeThru="false"
          Capitalization="AllCaps" AppliedLanguage="French">
          <Content>Styled</Content>
        </CharacterStyleRange>
      </ParagraphStyleRange>`,
    );
    const story = parseStory(xml);
    const overrides = story.paragraphs[0].characterRanges[0].overrides!;
    expect(overrides.appliedFont).toBe('Helvetica');
    expect(overrides.fontStyle).toBe('Bold');
    expect(overrides.pointSize).toBe(16);
    expect(overrides.tracking).toBe(20);
    expect(overrides.horizontalScale).toBe(90);
    expect(overrides.verticalScale).toBe(110);
    expect(overrides.baselineShift).toBe(2);
    expect(overrides.fillColor).toBe('Color/Red');
    expect(overrides.underline).toBe(true);
    expect(overrides.strikeThru).toBe(false);
    expect(overrides.capitalization).toBe('AllCaps');
    expect(overrides.appliedLanguage).toBe('French');
  });

  it('returns undefined overrides when no attributes are set', () => {
    const xml = wrapStory('', simplePara('ParagraphStyle/Body', 'Clean'));
    const story = parseStory(xml);
    expect(story.paragraphs[0].characterRanges[0].overrides).toBeUndefined();
  });

  it('Properties.Leading overrides @_Leading attribute', () => {
    const xml = wrapStory(
      '',
      `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Body">
        <CharacterStyleRange AppliedCharacterStyle="$ID/[No character style]" Leading="10">
          <Properties>
            <Leading type="unit">18</Leading>
          </Properties>
          <Content>Text</Content>
        </CharacterStyleRange>
      </ParagraphStyleRange>`,
    );
    const story = parseStory(xml);
    expect(story.paragraphs[0].characterRanges[0].overrides?.leading).toBe(18);
  });

  it('parses paragraph-level inline overrides', () => {
    const xml = wrapStory(
      '',
      `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Body"
        Justification="CenterAlign" SpaceBefore="6" SpaceAfter="3"
        FirstLineIndent="12" LeftIndent="4" RightIndent="4">
        <CharacterStyleRange AppliedCharacterStyle="$ID/[No character style]">
          <Content>Indented</Content>
        </CharacterStyleRange>
      </ParagraphStyleRange>`,
    );
    const story = parseStory(xml);
    const overrides = story.paragraphs[0].overrides as Record<string, unknown>;
    expect(overrides?.justification).toBe('CenterAlign');
    expect(overrides?.spaceBefore).toBe(6);
    expect(overrides?.spaceAfter).toBe(3);
    expect(overrides?.firstLineIndent).toBe(12);
    expect(overrides?.leftIndent).toBe(4);
    expect(overrides?.rightIndent).toBe(4);
  });

  it('parses multiple character ranges in a paragraph', () => {
    const xml = wrapStory(
      '',
      `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Body">
        <CharacterStyleRange AppliedCharacterStyle="$ID/[No character style]">
          <Content>Part one</Content>
        </CharacterStyleRange>
        <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/Bold">
          <Content>Part two</Content>
        </CharacterStyleRange>
      </ParagraphStyleRange>`,
    );
    const story = parseStory(xml);
    const ranges = story.paragraphs[0].characterRanges;
    expect(ranges).toHaveLength(2);
    expect(ranges[0].appliedCharacterStyle).toBe('$ID/[No character style]');
    expect(ranges[1].appliedCharacterStyle).toBe('CharacterStyle/Bold');
  });
});
