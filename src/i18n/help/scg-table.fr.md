# SCG Table

SCG Table est une extension du standard Markdown propre à ce viewer. Elle permet **des tableaux avec des cellules-bloc multi-lignes** : listes imbriquées, plusieurs paragraphes, blocs de code et images dans une même cellule. Les tableaux Markdown standard (syntaxe pipe) sont basés sur la ligne et ne le permettent pas.

La syntaxe s'inspire de MediaWiki. Elle est intégrée comme bloc de code clôturé avec l'étiquette de langue `scg-table`. Dans les autres rendus Markdown (aperçu GitHub, VS Code, etc.) le bloc reste visible comme bloc de code lisible — dégradation gracieuse plutôt que source cassée.

## Syntaxe de base

| Symbole | Signification                                          |
|---------|--------------------------------------------------------|
| `{\|`   | Début du tableau (première ligne dans le bloc de code) |
| `\|+`   | Légende optionnelle                                    |
| `\|-`   | Séparateur entre lignes du tableau                     |
| `!`     | Cellule d'en-tête                                      |
| `\|`    | Cellule de données                                     |
| `\|}`   | Fin du tableau                                         |

Une cellule commence en début de ligne source avec `|` ou `!`. Les lignes suivantes sans marqueur appartiennent à la cellule en cours. Cela produit des cellules multi-lignes sans balisage par ligne.

## Exemple minimal

Source :

````markdown
```scg-table
{|
|+ Trois variantes comparées
|-
! Variante
! Prix
|-
| Base
| 10 EUR
|-
| Premium
| 50 EUR
|}
```
````

Résultat :

```scg-table
{|
|+ Trois variantes comparées
|-
! Variante
! Prix
|-
| Base
| 10 EUR
|-
| Premium
| 50 EUR
|}
```

## Exemple étendu avec listes et bloc de code

Une cellule contient une liste imbriquée, une autre un bloc de code. La clôture extérieure utilise **quatre apostrophes inverses** pour que le bloc de code intérieur à trois apostrophes inverses reste valide.

Source :

`````markdown
````scg-table
{|
|-
! Phase
! Tâches
|-
| Conception
| Collecte des exigences :

- Clarifier la structure principale
  - Champs obligatoires
  - Champs facultatifs
- Esquisse de la maquette
- Revue avec les parties prenantes
|-
| Réalisation
| Squelette du code :

```bash
mkdir src
npm init -y
```
|}
````
`````

Résultat :

````scg-table
{|
|-
! Phase
! Tâches
|-
| Conception
| Collecte des exigences :

- Clarifier la structure principale
  - Champs obligatoires
  - Champs facultatifs
- Esquisse de la maquette
- Revue avec les parties prenantes
|-
| Réalisation
| Squelette du code :

```bash
mkdir src
npm init -y
```
|}
````

## Spans et alignement

À partir de la version 0.13.0, les cellules peuvent porter des attributs pour s'étendre sur plusieurs colonnes ou lignes et pour aligner leur contenu.

### Aperçu des attributs

| Attribut  | Valeurs autorisées             | Effet                                                       |
|-----------|--------------------------------|-------------------------------------------------------------|
| `colspan` | entier positif                 | La cellule s'étend sur plusieurs colonnes                   |
| `rowspan` | entier positif                 | La cellule s'étend sur plusieurs lignes                     |
| `align`   | `left` / `center` / `right`    | Alignement horizontal du contenu de la cellule              |
| `valign`  | `top` / `middle` / `bottom`    | Alignement vertical dans les cellules-bloc multilignes      |

Les attributs se placent entre deux barres verticales en début de cellule : `| attr="val" attr="val" | contenu`.

### Exemple avec colspan, rowspan et align

Source :

````markdown
```scg-table
{|
|+ Estimation de charge
|-
! Domaine
! Tâche
! align="right" | Heures
|-
| rowspan="2" | Conception
| Collecter les exigences
| align="right" | 8
|-
| Esquisse du layout
| align="right" | 4
|-
| colspan="2" align="center" | Sous-total
| align="right" | 12
|}
```
````

Résultat :

```scg-table
{|
|+ Estimation de charge
|-
! Domaine
! Tâche
! align="right" | Heures
|-
| rowspan="2" | Conception
| Collecter les exigences
| align="right" | 8
|-
| Esquisse du layout
| align="right" | 4
|-
| colspan="2" align="center" | Sous-total
| align="right" | 12
|}
```

### Astuces pour les spans et l'alignement

- Les attributs peuvent apparaître dans n'importe quel ordre : `| colspan="2" align="center" | contenu` et `| align="center" colspan="2" | contenu` sont équivalents.
- Les valeurs invalides sont ignorées silencieusement (par exemple `colspan="abc"`, `align="haut"`).
- Les cellules sans bloc d'attributs s'affichent comme avant.

### Accessibilité

Les cellules d'en-tête (`!`) reçoivent automatiquement l'attribut `scope` approprié : `scope="col"` pour les en-têtes de la ligne d'en-tête, `scope="row"` pour les en-têtes au sein des lignes de données. Cela permet aux lecteurs d'écran d'associer les cellules de données à leurs en-têtes.

## Astuces

**`|-` est obligatoire entre les lignes du tableau.** Sans `|-`, les cellules `|` suivantes sont interprétées comme des cellules supplémentaires de la même ligne, pas comme une nouvelle ligne. Piège le plus fréquent au début.

**Clôture extérieure à quatre apostrophes inverses** dès qu'une cellule contient un bloc de code à trois apostrophes inverses. Sinon, le bloc de code intérieur ferme prématurément la clôture extérieure.

**Une cellule par début de ligne source.** Les lignes suivantes sans `|`, `!`, `|-` ou `|}` en tête appartiennent à la cellule en cours.

**Les espaces** en début et en fin de cellule sont supprimés au rendu. L'indentation des listes à l'intérieur de la cellule est préservée.

**Le formatage en ligne, les liens wiki et les images** fonctionnent dans les cellules comme partout ailleurs (`**gras**`, `*italique*`, `` `code` ``, `[[Lien-wiki]]`, `![alt](image.png)`).

## Portabilité

Les fichiers `.md` avec des blocs `scg-table` ne s'affichent comme tableaux que dans ce viewer. Dans l'aperçu GitHub, VS Code et les autres rendus Markdown, le bloc apparaît comme un bloc de code régulier. C'est un choix de conception délibéré, pas un bug — le contenu reste lisible partout plutôt que d'apparaître comme une source syntaxiquement cassée.

## Perspectives

Extensions prévues :

- **Convertisseur HTML et tableaux imbriqués** : convertisseur `scg-table` → tableau HTML en ligne pour une portabilité maximale dans les rendus Markdown tiers, plus tableaux SCG imbriqués dans les cellules.
- **Tri, mise en évidence des statuts et alignement par défaut** : tableaux triables, mise en évidence des statuts (erreur/avertissement/ok) via classes sémantiques et alignement par défaut par colonne.
