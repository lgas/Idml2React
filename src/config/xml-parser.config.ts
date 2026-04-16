import { X2jOptions, XMLParser } from "fast-xml-parser";

const xmlParserConfig: X2jOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    ignoreDeclaration: true,

    // Normalize Adobe namespaces.
    // <aid:xxx> / <xs:xxx> → stripped entirely (content attributes only)
    // <idPkg:Spread> → 'idPkg_Spread'  ← keeps a distinct name so it never
    //   collides with the inner <Spread Self="..."> element it wraps.
    removeNSPrefix: false,
    transformTagName: (tagName) => {
        if (tagName.startsWith('idPkg:')) return tagName.replace('idPkg:', 'idPkg_');
        return tagName.replace(/^(aid|aid5|xs):/, '');
    },

    // Keep all values as strings — parsers convert explicitly
    parseTagValue: false,
    parseAttributeValue: false,
    htmlEntities: true,
    processEntities: true,
    textNodeName: "#text",
    cdataPropName: "__cdata",

    trimValues: true,
    allowBooleanAttributes: true,
    alwaysCreateTextNode: true, // Preserve empty text nodes for easier content extraction (see parseStory)    
    preserveOrder: false,

    // Tags that can appear more than once must always be arrays
    isArray: (name) => [
        // Spreads & pages
        'Spread', 'Page', 'TextFrame', 'Rectangle', 'Oval', 'Group',
        // Stories
        'Story', 'ParagraphStyleRange', 'CharacterStyleRange', 'Content', 'Br',
        // Resources
        'CharacterStyle', 'ParagraphStyle',
        'Color', 'Tint', 'Gradient', 'Swatch', 'Mixed',
        'StyleGroup',
        // Misc
        'Link', 'Image', 'Properties',
    ].includes(name),
};

/**
 * Instance unique du parser XML (pattern Singleton léger)
 */
export const xmlParser = new XMLParser(xmlParserConfig);