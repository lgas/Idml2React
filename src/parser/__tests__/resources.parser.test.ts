import { describe, it, expect } from 'vitest';
import { parseGraphic, parseStyles, parsePreferences } from '../resources.parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const graphicXml = (inner: string) =>
  `<?xml version="1.0"?><idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">${inner}</idPkg:Graphic>`;

const stylesXml = (inner: string) =>
  `<?xml version="1.0"?><idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">${inner}</idPkg:Styles>`;

const prefsXml = (inner: string) =>
  `<?xml version="1.0"?><idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">${inner}</idPkg:Preferences>`;

// ---------------------------------------------------------------------------
// parseGraphic — colors
// ---------------------------------------------------------------------------

describe('parseGraphic — colors', () => {
  it('returns empty arrays for empty XML', () => {
    expect(parseGraphic(graphicXml(''))).toEqual({ colors: [], gradients: [] });
  });

  it('parses a single CMYK color', () => {
    const xml = graphicXml(
      `<Color Self="Color/Black" Name="Black" Space="CMYK" ColorValue="0 0 0 100"/>`
    );
    const { colors } = parseGraphic(xml);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toMatchObject({
      self: 'Color/Black',
      name: 'Black',
      space: 'CMYK',
      values: [0, 0, 0, 100],
    });
  });

  it('parses an RGB color', () => {
    const xml = graphicXml(
      `<Color Self="Color/Red" Name="Red" Space="RGB" ColorValue="255 0 0"/>`
    );
    const { colors } = parseGraphic(xml);
    expect(colors[0]).toMatchObject({ space: 'RGB', values: [255, 0, 0] });
  });

  it('parses multiple colors', () => {
    const xml = graphicXml(`
      <Color Self="Color/A" Name="A" Space="CMYK" ColorValue="0 0 0 0"/>
      <Color Self="Color/B" Name="B" Space="CMYK" ColorValue="100 0 0 0"/>
    `);
    const { colors } = parseGraphic(xml);
    expect(colors).toHaveLength(2);
    expect(colors[0].self).toBe('Color/A');
    expect(colors[1].self).toBe('Color/B');
  });
});

// ---------------------------------------------------------------------------
// parseGraphic — gradients
// ---------------------------------------------------------------------------

describe('parseGraphic — gradients', () => {
  it('parses a linear gradient with stops', () => {
    const xml = graphicXml(`
      <Gradient Self="Gradient/g1" Name="BW" Type="Linear">
        <GradientStop StopColor="Color/Black" Location="0" Midpoint="50"/>
        <GradientStop StopColor="Color/White" Location="100"/>
      </Gradient>
    `);
    const { gradients } = parseGraphic(xml);
    expect(gradients).toHaveLength(1);
    expect(gradients[0].type).toBe('Linear');
    expect(gradients[0].stops).toHaveLength(2);
    expect(gradients[0].stops[0]).toMatchObject({ stopColor: 'Color/Black', location: 0, midpoint: 50 });
    expect(gradients[0].stops[1]).toMatchObject({ stopColor: 'Color/White', location: 100, midpoint: undefined });
  });

  it('parses a radial gradient', () => {
    const xml = graphicXml(`
      <Gradient Self="Gradient/r1" Name="Radial" Type="Radial">
        <GradientStop StopColor="Color/Red" Location="0"/>
        <GradientStop StopColor="Color/Blue" Location="100"/>
      </Gradient>
    `);
    const { gradients } = parseGraphic(xml);
    expect(gradients[0].type).toBe('Radial');
  });

  it('maps any non-Radial type to Linear', () => {
    const xml = graphicXml(`
      <Gradient Self="Gradient/x" Name="X" Type="SomeOtherType">
        <GradientStop StopColor="Color/A" Location="0"/>
      </Gradient>
    `);
    const { gradients } = parseGraphic(xml);
    expect(gradients[0].type).toBe('Linear');
  });
});

// ---------------------------------------------------------------------------
// parseStyles — character styles
// ---------------------------------------------------------------------------

describe('parseStyles — character styles', () => {
  it('returns empty arrays for empty styles xml', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root"/>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const result = parseStyles(xml);
    expect(result.characterStyles).toHaveLength(0);
    expect(result.paragraphStyles).toHaveLength(0);
    expect(result.objectStyles).toHaveLength(0);
  });

  it('parses a character style with all text attributes', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root">
        <CharacterStyle Self="CharacterStyle/Body" Name="Body"
          AppliedFont="Minion Pro" FontStyle="Regular" PointSize="12"
          Leading="14.4" Tracking="10" KerningMethod="Optical"
          HorizontalScale="100" VerticalScale="100" BaselineShift="0"
          FillColor="Color/Black" StrokeColor="Color/None"
          Underline="false" StrikeThru="false"
          Capitalization="Normal" AppliedLanguage="English: USA"/>
      </RootCharacterStyleGroup>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const { characterStyles } = parseStyles(xml);
    expect(characterStyles).toHaveLength(1);
    const cs = characterStyles[0];
    expect(cs.self).toBe('CharacterStyle/Body');
    expect(cs.appliedFont).toBe('Minion Pro');
    expect(cs.fontStyle).toBe('Regular');
    expect(cs.pointSize).toBe(12);
    expect(cs.leading).toBe(14.4);
    expect(cs.tracking).toBe(10);
    expect(cs.kerningMethod).toBe('Optical');
    expect(cs.horizontalScale).toBe(100);
    expect(cs.verticalScale).toBe(100);
    expect(cs.baselineShift).toBe(0);
    expect(cs.fillColor).toBe('Color/Black');
    expect(cs.underline).toBe(false);
    expect(cs.strikeThru).toBe(false);
    expect(cs.capitalization).toBe('Normal');
    expect(cs.appliedLanguage).toBe('English: USA');
  });

  it('parses underline=true correctly', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root">
        <CharacterStyle Self="CharacterStyle/U" Name="U" Underline="true" StrikeThru="true"/>
      </RootCharacterStyleGroup>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const { characterStyles } = parseStyles(xml);
    expect(characterStyles[0].underline).toBe(true);
    expect(characterStyles[0].strikeThru).toBe(true);
  });

  it('leaves underline/strikeThru undefined when absent', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root">
        <CharacterStyle Self="CharacterStyle/X" Name="X"/>
      </RootCharacterStyleGroup>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const { characterStyles } = parseStyles(xml);
    expect(characterStyles[0].underline).toBeUndefined();
    expect(characterStyles[0].strikeThru).toBeUndefined();
  });

  it('parses basedOn from Properties.BasedOn', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root">
        <CharacterStyle Self="CharacterStyle/Child" Name="Child">
          <Properties>
            <BasedOn type="string">CharacterStyle/Parent</BasedOn>
          </Properties>
        </CharacterStyle>
      </RootCharacterStyleGroup>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const { characterStyles } = parseStyles(xml);
    expect(characterStyles[0].basedOn).toBe('CharacterStyle/Parent');
  });

  it('flattens nested CharacterStyleGroup', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root">
        <CharacterStyle Self="CharacterStyle/Top" Name="Top"/>
        <CharacterStyleGroup Self="sg1" Name="Group1">
          <CharacterStyle Self="CharacterStyle/Nested" Name="Nested"/>
          <CharacterStyleGroup Self="sg2" Name="Group2">
            <CharacterStyle Self="CharacterStyle/Deep" Name="Deep"/>
          </CharacterStyleGroup>
        </CharacterStyleGroup>
      </RootCharacterStyleGroup>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const { characterStyles } = parseStyles(xml);
    const ids = characterStyles.map(s => s.self);
    expect(ids).toContain('CharacterStyle/Top');
    expect(ids).toContain('CharacterStyle/Nested');
    expect(ids).toContain('CharacterStyle/Deep');
  });
});

// ---------------------------------------------------------------------------
// parseStyles — paragraph styles
// ---------------------------------------------------------------------------

describe('parseStyles — paragraph styles', () => {
  it('flattens nested ParagraphStyleGroup', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root"/>
      <RootParagraphStyleGroup Self="psg" Name="Root">
        <ParagraphStyle Self="ParagraphStyle/Top" Name="Top"/>
        <ParagraphStyleGroup Self="sg1" Name="Group1">
          <ParagraphStyle Self="ParagraphStyle/Nested" Name="Nested"/>
          <ParagraphStyleGroup Self="sg2" Name="Group2">
            <ParagraphStyle Self="ParagraphStyle/Deep" Name="Deep"/>
          </ParagraphStyleGroup>
        </ParagraphStyleGroup>
      </RootParagraphStyleGroup>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const { paragraphStyles } = parseStyles(xml);
    const ids = paragraphStyles.map(s => s.self);
    expect(ids).toContain('ParagraphStyle/Top');
    expect(ids).toContain('ParagraphStyle/Nested');
    expect(ids).toContain('ParagraphStyle/Deep');
  });

  it('parses paragraph style with spacing and indents', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root"/>
      <RootParagraphStyleGroup Self="psg" Name="Root">
        <ParagraphStyle Self="ParagraphStyle/Body" Name="Body"
          Justification="LeftJustified" ParagraphDirection="LeftToRightDirection"
          SpaceBefore="6" SpaceAfter="6"
          FirstLineIndent="12" LeftIndent="0" RightIndent="0"/>
      </RootParagraphStyleGroup>
      <RootObjectStyleGroup Self="osg"/>
    `);
    const { paragraphStyles } = parseStyles(xml);
    expect(paragraphStyles).toHaveLength(1);
    const ps = paragraphStyles[0];
    expect(ps.self).toBe('ParagraphStyle/Body');
    expect(ps.justification).toBe('LeftJustified');
    expect(ps.paragraphDirection).toBe('LeftToRightDirection');
    expect(ps.spaceBefore).toBe(6);
    expect(ps.spaceAfter).toBe(6);
    expect(ps.firstLineIndent).toBe(12);
    expect(ps.leftIndent).toBe(0);
    expect(ps.rightIndent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseStyles — object styles
// ---------------------------------------------------------------------------

describe('parseStyles — object styles', () => {
  it('parses object style with fill/stroke and corner radius', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root"/>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg">
        <ObjectStyle Self="ObjectStyle/Box" Name="Box"
          FillColor="Color/Red" FillTint="50"
          StrokeColor="Color/Black" StrokeTint="-1" StrokeWeight="1"
          TopLeftCornerRadius="4" TopRightCornerRadius="4"
          BottomLeftCornerRadius="0" BottomRightCornerRadius="0"
          TopLeftCornerOption="RoundedCorner" TopRightCornerOption="RoundedCorner"
          BottomLeftCornerOption="None" BottomRightCornerOption="None"
          Nonprinting="false"/>
      </RootObjectStyleGroup>
    `);
    const { objectStyles } = parseStyles(xml);
    expect(objectStyles).toHaveLength(1);
    const os = objectStyles[0];
    expect(os.fillColor).toBe('Color/Red');
    expect(os.fillTint).toBe(50);
    expect(os.strokeWeight).toBe(1);
    expect(os.topLeftCornerRadius).toBe(4);
    expect(os.topLeftCornerOption).toBe('RoundedCorner');
    expect(os.bottomLeftCornerOption).toBe('None');
    expect(os.nonprinting).toBe(false);
  });

  it('parses nonprinting=true', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root"/>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg">
        <ObjectStyle Self="ObjectStyle/NP" Name="NP" Nonprinting="true"/>
      </RootObjectStyleGroup>
    `);
    const { objectStyles } = parseStyles(xml);
    expect(objectStyles[0].nonprinting).toBe(true);
  });

  it('flattens nested ObjectStyleGroup', () => {
    const xml = stylesXml(`
      <RootCharacterStyleGroup Self="csg" Name="Root"/>
      <RootParagraphStyleGroup Self="psg" Name="Root"/>
      <RootObjectStyleGroup Self="osg">
        <ObjectStyle Self="ObjectStyle/A" Name="A"/>
        <ObjectStyleGroup Self="osg2">
          <ObjectStyle Self="ObjectStyle/B" Name="B"/>
        </ObjectStyleGroup>
      </RootObjectStyleGroup>
    `);
    const { objectStyles } = parseStyles(xml);
    const ids = objectStyles.map(s => s.self);
    expect(ids).toContain('ObjectStyle/A');
    expect(ids).toContain('ObjectStyle/B');
  });
});

// ---------------------------------------------------------------------------
// parsePreferences
// ---------------------------------------------------------------------------

describe('parsePreferences', () => {
  it('parses page width and height', () => {
    const xml = prefsXml(`
      <DocumentPreference PageWidth="595.2756" PageHeight="841.8898"/>
    `);
    const result = parsePreferences(xml);
    expect(result.pageWidth).toBeCloseTo(595.2756);
    expect(result.pageHeight).toBeCloseTo(841.8898);
  });

  it('returns zeros when DocumentPreference is missing', () => {
    const result = parsePreferences(prefsXml(''));
    expect(result).toEqual({ pageWidth: 0, pageHeight: 0 });
  });
});
