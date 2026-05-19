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

## Tipps

**`|-` ist Pflicht zwischen Tabellenzeilen.** Ohne `|-` werden Folge-`|`-Zellen als weitere Zellen derselben Zeile interpretiert, nicht als neue Zeile. Häufigster Stolperstein beim Einstieg.

**Vier-Backtick-Außenfence**, sobald die Zelle einen Code-Block mit drei Backticks enthält. Andernfalls schließt der innere Code-Block die äußere Fence vorzeitig.

**Eine Zelle pro Quellzeile-Anfang.** Folgezeilen ohne führendes `|`, `!`, `|-` oder `|}` gehören zur laufenden Zelle.

**Whitespace** am Anfang und Ende einer Zelle wird beim Rendern entfernt. Listen-Einrückung innerhalb der Zelle bleibt erhalten.

**Inline-Formatierung, Wiki-Links und Bilder** funktionieren in Zellen wie sonst auch (`**fett**`, `*kursiv*`, `` `code` ``, `[[Wiki-Link]]`, `![alt](bild.png)`).

## Portabilität

`.md`-Dateien mit `scg-table`-Blöcken rendern nur in diesem Viewer als Tabelle. In GitHub-Vorschau, VS Code und anderen Markdown-Renderern erscheint der Block als regulärer Code-Block. Das ist bewusste Designentscheidung, kein Fehler — so bleibt der Inhalt überall lesbar, statt als syntaktisch korrumpierter Quelltext zu erscheinen.

## Ausblick

Geplante Erweiterungen:

- **HTML-Konverter und verschachtelte Tabellen**: Konverter `scg-table` → HTML-Tabelle inline für maximale Portabilität in fremden Markdown-Renderern, plus verschachtelte SCG-Tabellen in Zellen.
- **Sortierung, Status-Hervorhebung und Spalten-Default**: sortierbare Tabellen, Status-Hervorhebung (Fehler/Warnung/OK) über semantische Klassen und Standard-Ausrichtung pro Spalte.
