import { X2jOptions, XMLParser } from "fast-xml-parser";

const xmlParserConfig: X2jOptions = {
  // ===== OPTIONS DE BASE (déjà présentes) =====
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    ignoreDeclaration: true,
    
    // ===== OPTIONS CRUCIALES POUR L'IDML =====
    // 1. Gestion des namespaces Adobe (idPkg:, aid:, etc.)
    removeNSPrefix: true,            // Transforme <idPkg:Story> en <Story>
    // Sécurité supplémentaire : transformer les tags
    transformTagName: (tagName) => {
        // Nettoie tous les préfixes Adobe possibles
        return tagName.replace(/^(idPkg|aid|aid5|xs):/, '');
    },
    
    // 2. Gestion du texte et des entités HTML
    parseTagValue: false,            // Garde le texte brut (pas de parsing numérique)
    htmlEntities: true,              // Décode &lt; en <, &amp; en &
    processEntities: true,           // Traite les entités XML standard
    textNodeName: "#text",           // Nom pour les noeuds texte
    
    // 3. Gestion des tableaux (CRUCIAL)
    isArray: (name, jpath, isLeafNode, isAttribute) => {
        // Force en array SEULEMENT les éléments qui peuvent être multiples
        const alwaysArray = [
            'Spread', 'Page', 'TextFrame', 'Rectangle', 'Oval',
            'ParagraphStyleRange', 'CharacterStyleRange', 'Br',
            'Content', 'Properties', 'Link', 'Image', 'Story',
            'AppliedFont', 'AppliedParagraphStyle', 'AppliedCharacterStyle'
        ];
        return alwaysArray.includes(name);
    },
    
    // 4. Nettoyage et performance
    trimValues: true,                // Supprime les espaces inutiles
    allowBooleanAttributes: true,    // Supporte <SomeFlag Visible="true" />
    alwaysCreateTextNode: false,     // Ne crée pas de #text pour les noeuds vides (gain de mémoire)
    
    // 5. Gestion avancée du texte (IMPORTANT pour le HTML)
    preserveOrder: false,            // Structure objet standard (plus simple à manipuler)
    cdataPropName: "__cdata",        // Nom explicite pour les sections CDATA
    
    // 6. Gestion personnalisée des valeurs (pour éviter les conversions indésirables)
    attributeValueProcessor: (attrName, attrValue) => {
        // Garder les valeurs telles quelles
        return attrValue;
    },
    tagValueProcessor: (tagName, tagValue) => {
        // Garder les valeurs telles quelles
        return tagValue;
    },
    numberParseOptions: {
        hex: false,                  // Ne convertit pas les couleurs hex en nombres
        leadingZeros: false          // Préserve "001" comme string
    },
    
    // 7. Options de débogage (à activer en dev)
    updateTag: (tagName, jPath, attrs) => {
      console.log(`Parsing: ${tagName} at ${jPath}`);
      return tagName;
    }
};

/**
 * Instance unique du parser XML (pattern Singleton léger)
 */
export const xmlParser = new XMLParser(xmlParserConfig);