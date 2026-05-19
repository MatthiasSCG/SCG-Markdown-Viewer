# SCG Table

SCG Table è un'estensione dello standard Markdown disponibile in questo viewer. Permette **tabelle con celle-blocco multilinea**: elenchi annidati, più paragrafi, blocchi di codice e immagini all'interno di una singola cella. Le tabelle Markdown standard (sintassi pipe) sono basate sulla riga e non lo consentono.

La sintassi segue le convenzioni di MediaWiki. È integrata come blocco di codice delimitato con il tag di linguaggio `scg-table`. In altri renderer Markdown (anteprima di GitHub, VS Code, ecc.) il blocco rimane visibile come blocco di codice leggibile — degradazione elegante invece di sorgente rotta.

## Sintassi di base

| Simbolo | Significato                                         |
|---------|-----------------------------------------------------|
| `{\|`   | Inizio tabella (prima riga del blocco di codice)    |
| `\|+`   | Didascalia opzionale della tabella                  |
| `\|-`   | Separatore tra le righe della tabella               |
| `!`     | Cella di intestazione                               |
| `\|`    | Cella dati                                          |
| `\|}`   | Fine tabella                                        |

Una cella inizia all'inizio di una riga sorgente con `|` o `!`. Le righe successive senza marcatori appartengono alla cella corrente. Si ottengono così celle multilinea senza marcatura per riga.

## Esempio minimo

Sorgente:

````markdown
```scg-table
{|
|+ Tre varianti a confronto
|-
! Variante
! Prezzo
|-
| Base
| 10 EUR
|-
| Premium
| 50 EUR
|}
```
````

Risultato:

```scg-table
{|
|+ Tre varianti a confronto
|-
! Variante
! Prezzo
|-
| Base
| 10 EUR
|-
| Premium
| 50 EUR
|}
```

## Esempio esteso con elenchi e blocco di codice

Una cella contiene un elenco annidato, un'altra un blocco di codice. La recinzione esterna usa **quattro apici inversi** affinché il blocco di codice interno a tre apici inversi resti valido.

Sorgente:

`````markdown
````scg-table
{|
|-
! Fase
! Attività
|-
| Progettazione
| Raccolta dei requisiti:

- Chiarire la struttura principale
  - Campi obbligatori
  - Campi opzionali
- Schizzo del layout
- Revisione con gli stakeholder
|-
| Realizzazione
| Scheletro del codice:

```bash
mkdir src
npm init -y
```
|}
````
`````

Risultato:

````scg-table
{|
|-
! Fase
! Attività
|-
| Progettazione
| Raccolta dei requisiti:

- Chiarire la struttura principale
  - Campi obbligatori
  - Campi opzionali
- Schizzo del layout
- Revisione con gli stakeholder
|-
| Realizzazione
| Scheletro del codice:

```bash
mkdir src
npm init -y
```
|}
````

## Suggerimenti

**`|-` è obbligatorio tra le righe della tabella.** Senza `|-`, le celle `|` successive vengono interpretate come ulteriori celle della stessa riga, non come una nuova riga. Inciampo più frequente all'inizio.

**Recinzione esterna a quattro apici inversi** quando una cella contiene un blocco di codice a tre apici inversi. Altrimenti il blocco di codice interno chiude prematuramente la recinzione esterna.

**Una cella per inizio di riga sorgente.** Le righe successive senza `|`, `!`, `|-` o `|}` iniziali appartengono alla cella corrente.

**Lo spazio bianco** all'inizio e alla fine di una cella viene rimosso al rendering. L'indentazione degli elenchi all'interno della cella viene preservata.

**Formattazione inline, link wiki e immagini** funzionano nelle celle come ovunque altrove (`**grassetto**`, `*corsivo*`, `` `codice` ``, `[[Link-wiki]]`, `![alt](immagine.png)`).

## Portabilità

I file `.md` con blocchi `scg-table` si visualizzano come tabelle solo in questo viewer. Nell'anteprima di GitHub, VS Code e in altri renderer Markdown il blocco appare come un normale blocco di codice. È una scelta di progettazione deliberata, non un bug — il contenuto resta leggibile ovunque invece di apparire come sorgente sintatticamente rotta.

## Prospettiva

Questa fase copre la sintassi di base. Estensioni pianificate:

- **Fase 2**: `colspan` e `rowspan`, allineamento delle colonne (sinistra / centro / destra), semplici attributi di cella.
- **Fase 3**: convertitore `scg-table` → tabella HTML inline per la massima portabilità in renderer Markdown di terze parti.
