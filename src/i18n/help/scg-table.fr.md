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

## Astuces

**`|-` est obligatoire entre les lignes du tableau.** Sans `|-`, les cellules `|` suivantes sont interprétées comme des cellules supplémentaires de la même ligne, pas comme une nouvelle ligne. Piège le plus fréquent au début.

**Clôture extérieure à quatre apostrophes inverses** dès qu'une cellule contient un bloc de code à trois apostrophes inverses. Sinon, le bloc de code intérieur ferme prématurément la clôture extérieure.

**Une cellule par début de ligne source.** Les lignes suivantes sans `|`, `!`, `|-` ou `|}` en tête appartiennent à la cellule en cours.

**Les espaces** en début et en fin de cellule sont supprimés au rendu. L'indentation des listes à l'intérieur de la cellule est préservée.

**Le formatage en ligne, les liens wiki et les images** fonctionnent dans les cellules comme partout ailleurs (`**gras**`, `*italique*`, `` `code` ``, `[[Lien-wiki]]`, `![alt](image.png)`).

## Portabilité

Les fichiers `.md` avec des blocs `scg-table` ne s'affichent comme tableaux que dans ce viewer. Dans l'aperçu GitHub, VS Code et les autres rendus Markdown, le bloc apparaît comme un bloc de code régulier. C'est un choix de conception délibéré, pas un bug — le contenu reste lisible partout plutôt que d'apparaître comme une source syntaxiquement cassée.

## Perspectives

Cette étape couvre la syntaxe de base. Extensions prévues :

- **Étape 2** : `colspan` et `rowspan`, alignement des colonnes (gauche / centre / droite), attributs simples de cellule.
- **Étape 3** : convertisseur `scg-table` → tableau HTML en ligne pour une portabilité maximale dans les rendus Markdown tiers.
