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

## Span e allineamento

Dalla versione 0.13.0, le celle possono avere attributi per estendersi su più colonne o righe e per allineare il contenuto della cella.

### Panoramica degli attributi

| Attributo | Valori consentiti              | Effetto                                                       |
|-----------|--------------------------------|---------------------------------------------------------------|
| `colspan` | intero positivo                | La cella si estende su più colonne                            |
| `rowspan` | intero positivo                | La cella si estende su più righe                              |
| `align`   | `left` / `center` / `right`    | Allineamento orizzontale del contenuto della cella            |
| `valign`  | `top` / `middle` / `bottom`    | Allineamento verticale in celle-blocco multilinea             |

Gli attributi si trovano tra due barre verticali all'inizio della cella: `| attr="val" attr="val" | contenuto`.

### Esempio con colspan, rowspan e align

Sorgente:

````markdown
```scg-table
{|
|+ Stima dell'impegno
|-
! Area
! Attività
! align="right" | Ore
|-
| rowspan="2" | Progettazione
| Raccolta dei requisiti
| align="right" | 8
|-
| Bozza del layout
| align="right" | 4
|-
| colspan="2" align="center" | Subtotale
| align="right" | 12
|}
```
````

Risultato:

```scg-table
{|
|+ Stima dell'impegno
|-
! Area
! Attività
! align="right" | Ore
|-
| rowspan="2" | Progettazione
| Raccolta dei requisiti
| align="right" | 8
|-
| Bozza del layout
| align="right" | 4
|-
| colspan="2" align="center" | Subtotale
| align="right" | 12
|}
```

### Suggerimenti su span e allineamento

- Gli attributi possono apparire in qualsiasi ordine: `| colspan="2" align="center" | contenuto` e `| align="center" colspan="2" | contenuto` sono equivalenti.
- I valori non validi vengono ignorati silenziosamente (ad esempio `colspan="abc"`, `align="sopra"`).
- Le celle senza blocco di attributi vengono renderizzate come prima.

### Accessibilità

Le celle di intestazione (`!`) ricevono automaticamente l'attributo `scope` appropriato: `scope="col"` per le intestazioni nella riga di intestazione, `scope="row"` per le intestazioni all'interno delle righe di dati. Questo permette ai lettori di schermo di associare le celle di dati con le loro intestazioni.

## Suggerimenti

**`|-` è obbligatorio tra le righe della tabella.** Senza `|-`, le celle `|` successive vengono interpretate come ulteriori celle della stessa riga, non come una nuova riga. Inciampo più frequente all'inizio.

**Recinzione esterna a quattro apici inversi** quando una cella contiene un blocco di codice a tre apici inversi. Altrimenti il blocco di codice interno chiude prematuramente la recinzione esterna.

**Una cella per inizio di riga sorgente.** Le righe successive senza `|`, `!`, `|-` o `|}` iniziali appartengono alla cella corrente.

**Lo spazio bianco** all'inizio e alla fine di una cella viene rimosso al rendering. L'indentazione degli elenchi all'interno della cella viene preservata.

**Formattazione inline, link wiki e immagini** funzionano nelle celle come ovunque altrove (`**grassetto**`, `*corsivo*`, `` `codice` ``, `[[Link-wiki]]`, `![alt](immagine.png)`).

## Portabilità

I file `.md` con blocchi `scg-table` si visualizzano come tabelle solo in questo viewer. Nell'anteprima di GitHub, VS Code e in altri renderer Markdown il blocco appare come un normale blocco di codice. È una scelta di progettazione deliberata, non un bug — il contenuto resta leggibile ovunque invece di apparire come sorgente sintatticamente rotta.

## Prospettiva

Estensioni pianificate:

- **Convertitore HTML e tabelle annidate**: convertitore `scg-table` → tabella HTML inline per la massima portabilità in renderer Markdown di terze parti, più tabelle SCG annidate nelle celle.
- **Ordinamento, evidenziazione dello stato e allineamento predefinito**: tabelle ordinabili, evidenziazione dello stato (errore/avviso/ok) tramite classi semantiche e allineamento predefinito per colonna.
