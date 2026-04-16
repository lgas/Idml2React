# idml2json

Parseur et rendu HTML pixel-perfect de fichiers **Adobe InDesign IDML**.

Le projet se divise en deux parties indépendantes :

1. **Parser + Resolver** (Node.js, `src/index.ts`) — lit un fichier `.idml`, produit un JSON prêt pour le rendu.
2. **Renderer** (React + Vite, `src/App.tsx`) — affiche le JSON dans un navigateur avec positionnement absolu fidèle à l'original.

---

## Sommaire

- [Lancer le projet](#lancer-le-projet)
- [Architecture](#architecture)
- [Pipeline de données](#pipeline-de-données)
- [Balises et attributs IDML supportés](#balises-et-attributs-idml-supportés)
- [Système de coordonnées](#système-de-coordonnées)
- [Chaîne de styles typographiques](#chaîne-de-styles-typographiques)
- [Images](#images)
- [Rendu React](#rendu-react)
- [Limites connues](#limites-connues)

---

## Lancer le projet

### Prérequis

```
Node.js ≥ 18
pnpm
```

### Installation

```bash
pnpm install
```

### Parser un fichier IDML (Node.js CLI)

```bash
# Basique
pnpm start chemin/vers/fichier.idml

# Avec images liées (dossier Links/ sur disque)
pnpm start chemin/vers/fichier.idml --links chemin/vers/dossier/Links/
```

Produit deux fichiers à côté du `.idml` :

| Fichier | Contenu |
|---|---|
| `fichier.parsed.json` | Résultat brut du parser — données IDML dénormalisées |
| `fichier.resolved.json` | Document prêt pour le renderer — px, couleurs CSS, styles fusionnés |

### Lancer le renderer (UI React)

```bash
pnpm ui
```

Ouvre Vite en mode dev sur `http://localhost:5173`. Charger un fichier `.idml` depuis l'interface pour le visualiser.

### Mode développement (watch)

```bash
pnpm dev   # recompile src/index.ts à chaque sauvegarde
```

---

## Architecture

```
src/
├── parser/
│   ├── idml.parser.ts        # Point d'entrée — lit le ZIP, orchestre tous les parseurs
│   ├── spread.parser.ts      # Pages, frames (TextFrame, Rectangle/Image)
│   ├── story.parser.ts       # Contenu texte (paragraphes, plages de caractères)
│   ├── resources.parser.ts   # Couleurs, styles, préférences du document
│   └── designmap.parser.ts   # designmap.xml — liste des spreads et stories
│
├── resolver/
│   ├── document.resolver.ts  # Orchestration : transforme ParsedIdml → ResolvedDocument
│   ├── geometry.resolver.ts  # Mathématiques de transformation affine (points → px)
│   └── styles.resolver.ts    # Fusion de la chaîne de styles IDML → CSS
│
├── types/
│   ├── idml.types.ts         # Types des données brutes IDML
│   └── resolved.types.ts     # Types du document résolu (renderer-ready)
│
├── components/
│   ├── IdmlDocument.tsx      # Conteneur principal — toutes les pages
│   ├── IdmlPage.tsx          # Une page (position relative, fond blanc)
│   ├── IdmlTextFrame.tsx     # Cadre texte (colonnes CSS)
│   ├── IdmlParagraph.tsx     # Paragraphe → <p>
│   ├── IdmlTextRun.tsx       # Plage de caractères → <span>
│   └── IdmlGraphicFrame.tsx  # Cadre graphique / image → <div> + <img>
│
└── index.ts                  # CLI Node.js
```

---

## Pipeline de données

```
fichier.idml (ZIP)
      │
      ▼
 IdmlParser.parseFile()          ← src/parser/idml.parser.ts
      │  Lit les XML du ZIP et mappe chaque élément
      │  vers des types TypeScript (ParsedIdml)
      ▼
 ParsedIdml
   ├── documentPreferences  (dimensions de page en points)
   ├── colors[]             (nuanciers CMYK/RGB)
   ├── paragraphStyles[]    (styles de paragraphe nommés)
   ├── characterStyles[]    (styles de caractères nommés)
   ├── spreads[]            (pages + frames positionnés)
   └── stories[]            (contenu texte brut)
      │
      ▼
 resolveDocument()               ← src/resolver/document.resolver.ts
      │  Fusionne les styles, convertit les coordonnées, résout les images
      ▼
 ResolvedDocument
   └── pages[]
         ├── textFrames[]       (x, y, width, height en px + paragraphes)
         └── graphicFrames[]    (x, y, width, height en px + image encodée)
      │
      ▼
 Composants React                ← src/components/
      │  Positionnement absolu, rendu 1:1
      ▼
 HTML pixel-perfect
```

---

## Balises et attributs IDML supportés

### `designmap.xml`

| Élément / attribut | Rôle |
|---|---|
| `<idPkg:Spread src="…">` | Liste les fichiers Spreads à charger |
| `<idPkg:Story src="…">` | Liste les fichiers Stories à charger |

### `Resources/Graphic.xml`

| Élément / attribut | Rôle |
|---|---|
| `<Color Self ColorSpace Values>` | Nuancier — espaces CMYK, RGB, LAB supportés |

Les couleurs LAB et Mixed sont converties en noir faute de profil ICC.

### `Resources/Styles.xml`

#### Styles de paragraphe (`ParagraphStyle`)

| Attribut | Propriété CSS |
|---|---|
| `Justification` | `text-align` (LeftAlign, CenterAlign, RightAlign, FullyJustified…) |
| `ParagraphDirection` | `direction` (ltr / rtl) |
| `SpaceBefore` / `SpaceAfter` | `margin-top` / `margin-bottom` |
| `FirstLineIndent` | `text-indent` |
| `PointSize`, `Leading`, `Tracking`, `AppliedFont`, `FontStyle` | Voir styles de caractères |

#### Styles de caractères (`CharacterStyle`)

| Attribut | Propriété CSS |
|---|---|
| `AppliedFont` | `font-family` |
| `FontStyle` (`Bold`, `Italic`, `Bold Italic`…) | `font-weight` + `font-style` |
| `PointSize` | `font-size` (pt → px) |
| `Leading` (`Auto` ou valeur) | `line-height` |
| `Tracking` | `letter-spacing` (valeur / 1000 em) |
| `FillColor` | `color` (résolu depuis le nuancier) |
| `Capitalization` (`AllCaps`, `SmallCaps`) | `text-transform` |
| `Underline` | `text-decoration: underline` |
| `StrikeThru` | `text-decoration: line-through` |
| `AppliedLanguage` | attribut `lang` HTML (pilote le shaping RTL) |

### `Spreads/Spread_*.xml`

#### `<Spread>`

| Élément | Rôle |
|---|---|
| `<Page>` | Définit les limites et la position d'une page dans le spread |
| `<TextFrame>` | Cadre texte lié à une story |
| `<Rectangle>` | Cadre graphique (fond coloré, bordure, image) |

#### `<Page>`

| Attribut | Rôle |
|---|---|
| `Self` | Identifiant |
| `Name` | Numéro de page affiché |
| `GeometricBounds` | Dimensions en points `[top left bottom right]` |
| `ItemTransform` | Matrice affine (position dans le spread) |

#### `<TextFrame>`

| Attribut | Rôle |
|---|---|
| `Self` | Identifiant |
| `ParentStory` | Réf. vers la Story contenant le texte |
| `ItemTransform` | Matrice affine (position + rotation) |
| `GeometricBounds` | Dimensions locales |
| `TextColumnCount` | Nombre de colonnes |
| `TextColumnGutter` | Gouttière entre colonnes (pt) |
| `Visible` | Si `false`, le frame est ignoré |

#### `<Rectangle>` (cadre graphique)

| Attribut | Rôle |
|---|---|
| `Self` | Identifiant |
| `ItemTransform` | Matrice affine |
| `GeometricBounds` | Dimensions locales |
| `FillColor` | Réf. nuancier → `background` |
| `StrokeColor` | Réf. nuancier → `border-color` |
| `StrokeWeight` | Épaisseur du trait (pt → px) |
| `Visible` | Si `false`, le frame est ignoré |

#### `<Image>` (enfant de `<Rectangle>`)

| Attribut / élément | Rôle |
|---|---|
| `ItemTransform` | Position + échelle de l'image dans son cadre |
| `ImageTypeName` | Détermine le MIME type (jpeg, png, tiff…) |
| `Properties/GraphicBounds` | Dimensions naturelles de l'image (pts) |
| `Properties/Contents` (CDATA) | Image embarquée inline en base64 |
| `Link/@StoredState` | `Embedded` (dans le ZIP) ou `Normal` (liée sur disque) |
| `Link/@LinkResourceURI` | Chemin original du fichier image |

### `Stories/Story_*.xml`

| Élément | Rôle |
|---|---|
| `<Story Self Direction>` | Contenant principal, direction du texte |
| `<ParagraphStyleRange AppliedParagraphStyle>` | Paragraphe avec style nommé + overrides inline |
| `<CharacterStyleRange AppliedCharacterStyle>` | Plage de caractères avec style + overrides inline |
| `<Content>` | Texte brut (peut contenir du CDATA) |
| `<Br/>` | Retour à la ligne souple (Shift+Enter dans InDesign) |

---

## Système de coordonnées

IDML utilise des **points typographiques** (1 pt = 1/72 pouce). Le renderer utilise des **pixels CSS** (1 px = 1/96 pouce). La conversion appliquée partout est :

```
px = pt × (96 / 72)
```

### Spreads et pages

Dans IDML, les frames sont positionnés dans l'espace du **spread** (la planche), pas de la page. Un spread peut contenir plusieurs pages (page gauche + page droite d'un magazine, par exemple).

Le resolver :
1. Calcule la position de chaque page dans l'espace spread (`resolvePageGeometry`)
2. Pour chaque frame, applique sa matrice affine `ItemTransform` pour obtenir sa position en coordonnées spread
3. Soustrait l'origine de la page pour obtenir des coordonnées **relatives à la page** (`resolveFrameGeometry`)
4. Assigne chaque frame à sa page en testant si son centre tombe dans les limites de la page (`findPageForFrame`)

### Matrices affines

`ItemTransform` est une matrice `[a, b, c, d, tx, ty]` équivalente à la matrice CSS `matrix(a, b, c, d, tx, ty)`.

```
x' = a·x + c·y + tx
y' = b·x + d·y + ty
```

Pour calculer la bounding box après transformation, les 4 coins du cadre sont transformés et on prend le min/max — ce qui gère correctement les rotations et les skews.

---

## Chaîne de styles typographiques

InDesign applique les styles par couches successives, chaque couche pouvant écraser la précédente. Le resolver les applique dans cet ordre :

```
1. Style de paragraphe nommé       (ex: "Corps de texte")
         ↓ écrasé par
2. Overrides inline de paragraphe  (ex: justification modifiée localement)
         ↓ écrasé par
3. Style de caractère nommé        (ex: "Gras accentué")
         ↓ écrasé par
4. Overrides inline de caractère   (priorité maximale)
```

Le résultat est un objet `ResolvedTextStyle` plat avec des valeurs CSS directement utilisables. Cet objet est ensuite séparé en :
- `ResolvedParagraphStyle` → appliqué sur `<p>` (`text-align`, `margin`, `direction`…)
- `ResolvedCharStyle` → appliqué sur `<span>` (`font-family`, `font-size`, `color`…)

---

## Images

Trois états possibles pour une image dans un fichier IDML :

### Embarquée inline (`StoredState="Embedded"` + CDATA)

L'image est encodée en base64 directement dans le XML de la story. Le parser la lit depuis `Properties/Contents`.

### Embarquée dans le ZIP (`StoredState="Embedded"` sans CDATA)

L'image est stockée dans le ZIP IDML sous `Links/nom_du_fichier.jpg`. Le parser la détecte via `Link/@StoredState = "Embedded"` et la lit depuis le ZIP.

### Liée sur disque (`StoredState="Normal"`)

Le fichier image n'est **pas dans le ZIP** — il est sur la machine de l'auteur. Le chemin original est dans `Link/@LinkResourceURI`.

Pour résoudre ces images, passer le dossier `Links/` en argument :

```bash
pnpm start fichier.idml --links /chemin/vers/Links/
```

Le parser décode le nom de fichier depuis l'URI (`decodeURIComponent`), lit le fichier depuis `linksDir`, et l'encode en base64 — identique aux images embarquées pour le reste du pipeline.

Si une image liée n'est pas résolue, le cadre graphique est rendu sans image (fond transparent ou couleur de remplissage si définie).

### Rendu de l'image

L'image est affichée dans son cadre avec `overflow: hidden` (le recadrage InDesign). La position et la taille de l'image dans le cadre sont contrôlées par `ItemTransform` de l'élément `<Image>` :

```
offsetX = itemTransform[4] × PT_TO_PX
offsetY = itemTransform[5] × PT_TO_PX
width   = naturalWidth  × scaleX × PT_TO_PX
height  = naturalHeight × scaleY × PT_TO_PX
```

---

## Rendu React

### Composants

| Composant | Props | Rôle |
|---|---|---|
| `IdmlDocument` | `document`, `targetWidth?` | Conteneur global — calcule un facteur d'échelle si `targetWidth` est fourni |
| `IdmlPage` | `page`, `scale` | Page individuelle — fond blanc, `position: relative`, dimensions exactes |
| `IdmlTextFrame` | `frame` | `position: absolute`, colonnes CSS si `columns > 1` |
| `IdmlParagraph` | `paragraph` | `<p>` avec les styles de paragraphe |
| `IdmlTextRun` | `range` | `<span>` avec les styles de caractère ; `<br/>` si `softReturn` |
| `IdmlGraphicFrame` | `frame` | `position: absolute` ; `<img>` positionné en absolu à l'intérieur |

### Calques (z-index)

Les frames graphiques sont rendus à `z-index: 0`, les frames texte à `z-index: 1`. Les frames texte sont donc toujours au-dessus des images, ce qui correspond au comportement habituel InDesign où le texte est placé sur des calques supérieurs.

### Mise à l'échelle

`IdmlDocument` accepte une prop `targetWidth` (px). Si elle est fournie, toutes les pages sont mises à l'échelle proportionnellement via `transform: scale()` sur chaque `IdmlPage`. Cela permet d'intégrer le rendu dans n'importe quelle largeur de conteneur sans modifier les coordonnées.

---

## Limites connues

| Domaine | Limitation |
|---|---|
| **Couleurs LAB / Mixed** | Converties en noir — nécessite un profil ICC pour être précis |
| **SmallCaps** | Approché par `text-transform: capitalize` — les vraies petites capitales nécessitent `font-variant: small-caps` ou une fonte dédiée |
| **Frames ovales / polygones** | Seuls les rectangles (`<Rectangle>`) sont parsés. Les ellipses et polygones sont ignorés |
| **Groupes de frames** | Les éléments `<Group>` ne sont pas supportés — les frames imbriqués dans des groupes sont perdus |
| **Effets (ombres, flous…)** | Non supportés |
| **Filets de paragraphe** | Non supportés |
| **Tableaux** | Non supportés |
| **Texte en chemin** | Non supporté |
| **Rotation de frames** | Les matrices affines avec rotation sont correctement gérées pour le positionnement, mais la rotation CSS du frame lui-même n'est pas appliquée |
| **Spreads multi-pages** | L'assignation des frames aux pages se fait par le centre géométrique du frame — les frames à cheval sur deux pages sont assignés à la page qui contient leur centre |
| **Images TIFF** | Le format TIFF n'est pas nativement supporté par les navigateurs — ces images s'afficheront en erreur |
