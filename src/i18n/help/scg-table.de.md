# SCG Table

SCG Table ist eine Erweiterung des Markdown-Standards in diesem Viewer. Sie erlaubt **Tabellen mit mehrzeiligen Block-Zellen**: geschachtelte Listen, mehrere Absätze, Code-Blöcke und Bilder innerhalb einer Tabellenzelle. Standard-Markdown-Tabellen (Pipe-Syntax) sind zeilenbasiert und können das nicht.

Die Syntax orientiert sich an MediaWiki. Eingebettet wird sie als Fenced-Code-Block mit Sprach-Tag `scg-table`. Dadurch bleibt der Inhalt in fremden Markdown-Renderern (GitHub-Vorschau, VS Code etc.) als lesbarer Code-Block sichtbar — Graceful Degradation statt zerschossenem Quelltext.

## Grundsyntax

| Zeichen | Bedeutung                                        |
|---------|--------------------------------------------------|
| `{\|`   | Tabellen-Anfang (erste Zeile im Code-Block)      |
| `\|+`   | Optionale Tabellen-Caption                       |
| `\|-`   | Zeilen-Trenner zwischen Tabellenzeilen           |
| `!`     | Header-Zelle                                     |
| `\|`    | Datenzelle                                       |
| `\|}`   | Tabellen-Ende                                    |

Eine Zelle beginnt am Zeilenanfang mit `|` oder `!`. Folgezeilen ohne Sonderzeichen am Zeilenanfang gehören zur laufenden Zelle. So entstehen mehrzeilige Zellen ohne explizite Markierung pro Zeile.

## Minimales Beispiel

Quelltext:

````markdown
```scg-table
{|
|+ Drei Varianten im Vergleich
|-
! Variante
! Preis
|-
| Basis
| 10 EUR
|-
| Premium
| 50 EUR
|}
```
````

Ergebnis:

```scg-table
{|
|+ Drei Varianten im Vergleich
|-
! Variante
! Preis
|-
| Basis
| 10 EUR
|-
| Premium
| 50 EUR
|}
```

## Erweitertes Beispiel mit Listen und Code-Block

Eine Zelle enthält eine geschachtelte Liste, eine andere einen Code-Block. Die äußere Fence hat **vier Backticks**, damit der innere Code-Block mit drei Backticks zulässig bleibt.

Quelltext:

`````markdown
````scg-table
{|
|-
! Phase
! Aufgaben
|-
| Entwurf
| Sammlung der Anforderungen:

- Hauptstruktur klären
  - Pflichtfelder
  - optionale Felder
- Layout-Skizze
- Review mit Stakeholder
|-
| Build
| Code-Skelett:

```bash
mkdir src
npm init -y
```
|}
````
`````

Ergebnis:

````scg-table
{|
|-
! Phase
! Aufgaben
|-
| Entwurf
| Sammlung der Anforderungen:

- Hauptstruktur klären
  - Pflichtfelder
  - optionale Felder
- Layout-Skizze
- Review mit Stakeholder
|-
| Build
| Code-Skelett:

```bash
mkdir src
npm init -y
```
|}
````

## Spans und Ausrichtung

Ab Version 0.13.0 lassen sich Zellen mit Attributen versehen, um über mehrere Spalten oder Zeilen zu greifen und den Zellinhalt auszurichten.

### Übersicht der Attribute

| Attribut  | Erlaubte Werte               | Wirkung                                                |
|-----------|------------------------------|--------------------------------------------------------|
| `colspan` | positive Ganzzahl            | Zelle erstreckt sich über mehrere Spalten              |
| `rowspan` | positive Ganzzahl            | Zelle erstreckt sich über mehrere Zeilen               |
| `align`   | `left` / `center` / `right`  | horizontale Ausrichtung des Zellinhalts                |
| `valign`  | `top` / `middle` / `bottom`  | vertikale Ausrichtung in mehrzeiligen Block-Zellen     |

Attribute stehen zwischen zwei Pipes am Zellenanfang: `| attr="val" attr="val" | Inhalt`.

### Beispiel mit colspan, rowspan und align

Quelltext:

````markdown
```scg-table
{|
|+ Aufwandsschätzung
|-
! Bereich
! Aufgabe
! align="right" | Stunden
|-
| rowspan="2" | Entwurf
| Anforderungen sammeln
| align="right" | 8
|-
| Layout-Skizze
| align="right" | 4
|-
| colspan="2" align="center" | Zwischensumme
| align="right" | 12
|}
```
````

Ergebnis:

```scg-table
{|
|+ Aufwandsschätzung
|-
! Bereich
! Aufgabe
! align="right" | Stunden
|-
| rowspan="2" | Entwurf
| Anforderungen sammeln
| align="right" | 8
|-
| Layout-Skizze
| align="right" | 4
|-
| colspan="2" align="center" | Zwischensumme
| align="right" | 12
|}
```

### Tipps zu Spans und Ausrichtung

- Attribute können in beliebiger Reihenfolge stehen: `| colspan="2" align="center" | Inhalt` und `| align="center" colspan="2" | Inhalt` sind gleichwertig.
- Ungültige Werte werden stillschweigend ignoriert (z.B. `colspan="abc"`, `align="oben"`).
- Zellen ohne Attribut-Block rendern unverändert wie bisher.

### Accessibility

Header-Zellen (`!`) bekommen automatisch das passende `scope`-Attribut: `scope="col"` für Header in der Tabellen-Header-Zeile, `scope="row"` für Header innerhalb von Datenzeilen. Damit verbinden Screen-Reader Datenzellen mit ihren Headern.

## Verschachtelte Tabellen und HTML-Export

Zwei Erweiterungen, die in Version 0.14.0 dazugekommen sind: SCG-Tabellen können ineinander verschachtelt werden, und eine Datei mit SCG-Tabellen kann als „portables Markdown" mit inline HTML-Tabellen exportiert werden, damit sie auch in fremden Renderern (GitHub-Vorschau, VS Code etc.) als echte Tabelle erscheint.

### Verschachtelte Tabellen

Eine Zelle kann selbst eine SCG-Tabelle enthalten — bis zu drei Ebenen tief. Wichtig: jede äußere Code-Fence muss mindestens eine Backtick mehr haben als die nächste innere (CommonMark-Standard).

| Ebene | Äußere Fence    | Beispiel-Inhalt                                                          |
|-------|-----------------|--------------------------------------------------------------------------|
| 1     | drei Backticks  | nur Tabelle, kein eingeschachtelter Code-Block                           |
| 2     | vier Backticks  | Tabelle mit innerer Tabelle (drei Backticks)                             |
| 3     | fünf Backticks  | Tabelle mit innerer Tabelle (vier Backticks), die ihrerseits eine Tabelle (drei Backticks) enthält |

Eine vierte Ebene rendert nicht mehr als Tabelle, sondern als Code-Block (Tiefen-Limit-Schutz vor pathologischen Eingaben).

Quelltext-Beispiel für zwei Ebenen:

`````markdown
````scg-table
{|
|+ Äußere Tabelle
|-
| Aufwand pro Position
| ```scg-table
{|
|-
! Position
! Stunden
|-
| Anforderungen
| 8
|}
```
|}
````
`````

Ergebnis:

````scg-table
{|
|+ Äußere Tabelle
|-
| Aufwand pro Position
| ```scg-table
{|
|-
! Position
! Stunden
|-
| Anforderungen
| 8
|}
```
|}
````

### HTML-Export für externe Markdown-Renderer

`.md`-Dateien mit SCG-Tabellen rendern nur in diesem Viewer als Tabelle. In fremden Renderern (GitHub-Vorschau, VS Code, andere Editoren) erscheint der `scg-table`-Codeblock unverändert als Quelltext.

Mit **Datei → Exportieren → Portables Markdown…** speicherst du eine Variante der Datei, in der die SCG-Tabellen durch inline HTML-Tabellen ersetzt sind. Diese HTML-Tabellen rendert jeder CommonMark-konforme Renderer (GitHub, VS Code etc.) als echte Tabelle.

- **Save-As-Dialog** mit Vorbelegung `<basename>-portable.md` im Verzeichnis der Quell-Datei. Pfad und Name lassen sich frei ändern.
- **Original-Datei** bleibt unverändert; der Export schreibt immer in eine neue Datei.
- **Zell-Attribute** (`colspan`, `rowspan`, `align`, `valign`) werden in HTML-Standard-Attribute und Inline-Styles übersetzt.
- **Accessibility-`scope`** auf Header-Zellen bleibt erhalten.
- **Verschachtelung**: bis zu drei Ebenen werden rekursiv mitkonvertiert.
- **Inline-Formatierung in Zellen** (fett, kursiv, Code, Links) wird zu HTML konvertiert, damit auch sie in fremden Renderern korrekt erscheint.

#### Marker für die Viewer-Anzeige

Damit die exportierte Datei **auch im SCG Markdown Viewer** als Tabelle gerendert wird (statt als Quelltext mit `<table>`-Tags), fügt der Konverter am Datei-Anfang den Marker `<!-- scg-portable -->` ein. Der Viewer erkennt diesen Marker und schaltet die Datei in einen HTML-fähigen Render-Modus.

**Sicherheits-Hinweis**: reguläre `.md`-Dateien werden weiterhin ohne HTML-Rendering geöffnet — kein HTML aus dem Markdown wird ausgeführt. Erst der Marker schaltet das HTML-Rendering frei. Bei einer fremden `.md`-Datei mit diesem Marker (Edge-Case) musst du der Quelle vertrauen, weil der HTML-Inhalt dort ausgeführt würde.

## Sortierung, Status-Hervorhebung und Spalten-Default

Drei Erweiterungen ab Version 0.15.0: SCG-Tabellen können mit Status-Klassen pro Zelle oder Zeile eingefärbt, mit einer Default-Ausrichtung pro Spalte versehen und durch Klick auf den Spaltenkopf sortiert werden.

### Status-Hervorhebung

Vor dem Inhalt einer Zelle oder direkt nach `|-` kann eine Status-Klasse in Punkt-Notation stehen:

| Klasse     | Bedeutung                          |
|------------|------------------------------------|
| `.error`   | Fehler, kritisch                   |
| `.warn`    | Warnung, Aufmerksamkeit            |
| `.ok`      | OK, erledigt, positiv              |
| `.info`    | Hinweis, neutral-informativ        |
| `.neutral` | Markierung ohne Wertung            |

- **Zelle**: `|.error Inhalt`
- **Zeile** (gilt für alle Zellen der Zeile): `|-.warn`
- **Zell-Status gewinnt** gegen Zeilen-Status.
- Ungültige Werte werden stillschweigend ignoriert.

Beispiel:

```scg-table
{|
|-
! Service
! Status
|-.warn
| Mail-Service
| Wartung
|-
| Web-Server
|.error Ausfall
|-
| Datenbank
|.ok Laeuft
|}
```

### Spalten-Default-Ausrichtung

In der Tabellen-Header-Zeile setzt `cols="…"` eine Default-Ausrichtung pro Spalte:

- Syntax: `{|+cols="left right right"`
- Werte sind `left`, `center` oder `right`.
- Eine Zelle mit explizitem `align`-Attribut (aus Stufe 2) überschreibt den Default.
- Bei `colspan` wird kein Default angewendet (Zelle überspannt mehrere Spalten mit ggf. unterschiedlichen Defaults).

Beispiel:

```scg-table
{|+cols="left right right"
|-
! Produkt
! Preis
! Lager
|-
| Tastatur
| 49
| 12
|-
| Maus
| 25
| 8
|-
| Monitor
| 280
| 3
|}
```

### Sortierbare Tabellen

`+sortable` in der Header-Zeile macht die Tabelle anklickbar-sortierbar:

- Syntax: `{|+sortable` (kombinierbar mit `cols=`: `{|+sortable cols="left right"`)
- Klick auf einen Header sortiert aufsteigend, weiterer Klick absteigend, dritter Klick stellt die Original-Reihenfolge wieder her.
- **Sort-Heuristik**: zuerst numerisch (`Number()` auf die erste Zeile der Zelle), sonst lexikographisch mit Locale (`localeCompare`, Umlaute korrekt einsortiert).
- **Mehrzeilige Zellen**: nach der ersten Zeile sortiert.
- **Datum**: ISO-Format (2026-05-19) sortiert lexikographisch korrekt. Andere Datums-Formate vorher auf ISO umstellen.
- **`colspan`/`rowspan` deaktivieren die Sortierung** automatisch (Layout-Risiko zu hoch).
- **Im portablen Export** ist die Sortierung nicht enthalten (kein JavaScript in fremden Markdown-Renderern).

Beispiel:

```scg-table
{|+sortable
|-
! Name
! Alter
! Stadt
|-
| Mueller
| 42
| Berlin
|-
| Schmidt
| 28
| Hamburg
|-
| Becker
| 35
| Muenchen
|}
```

## Tipps

**`|-` ist Pflicht zwischen Tabellenzeilen.** Ohne `|-` werden Folge-`|`-Zellen als weitere Zellen derselben Zeile interpretiert, nicht als neue Zeile. Häufigster Stolperstein beim Einstieg.

**Vier-Backtick-Außenfence**, sobald die Zelle einen Code-Block mit drei Backticks enthält. Andernfalls schließt der innere Code-Block die äußere Fence vorzeitig.

**Eine Zelle pro Quellzeile-Anfang.** Folgezeilen ohne führendes `|`, `!`, `|-` oder `|}` gehören zur laufenden Zelle.

**Whitespace** am Anfang und Ende einer Zelle wird beim Rendern entfernt. Listen-Einrückung innerhalb der Zelle bleibt erhalten.

**Inline-Formatierung, Wiki-Links und Bilder** funktionieren in Zellen wie sonst auch (`**fett**`, `*kursiv*`, `` `code` ``, `[[Wiki-Link]]`, `![alt](bild.png)`).

## Portabilität

`.md`-Dateien mit `scg-table`-Blöcken rendern nur in diesem Viewer als Tabelle. In GitHub-Vorschau, VS Code und anderen Markdown-Renderern erscheint der Block als regulärer Code-Block. Das ist bewusste Designentscheidung, kein Fehler — so bleibt der Inhalt überall lesbar, statt als syntaktisch korrumpierter Quelltext zu erscheinen.

## Stand der Funktionen

Damit ist der geplante Funktionsumfang der SCG-Tabellen erreicht: Basis-Syntax, Spans und Ausrichtung, Verschachtelung und HTML-Export, Sortierung, Status-Hervorhebung und Spalten-Default.
