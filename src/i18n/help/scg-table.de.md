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

## Tipps

**`|-` ist Pflicht zwischen Tabellenzeilen.** Ohne `|-` werden Folge-`|`-Zellen als weitere Zellen derselben Zeile interpretiert, nicht als neue Zeile. Häufigster Stolperstein beim Einstieg.

**Vier-Backtick-Außenfence**, sobald die Zelle einen Code-Block mit drei Backticks enthält. Andernfalls schließt der innere Code-Block die äußere Fence vorzeitig.

**Eine Zelle pro Quellzeile-Anfang.** Folgezeilen ohne führendes `|`, `!`, `|-` oder `|}` gehören zur laufenden Zelle.

**Whitespace** am Anfang und Ende einer Zelle wird beim Rendern entfernt. Listen-Einrückung innerhalb der Zelle bleibt erhalten.

**Inline-Formatierung, Wiki-Links und Bilder** funktionieren in Zellen wie sonst auch (`**fett**`, `*kursiv*`, `` `code` ``, `[[Wiki-Link]]`, `![alt](bild.png)`).

## Portabilität

`.md`-Dateien mit `scg-table`-Blöcken rendern nur in diesem Viewer als Tabelle. In GitHub-Vorschau, VS Code und anderen Markdown-Renderern erscheint der Block als regulärer Code-Block. Das ist bewusste Designentscheidung, kein Fehler — so bleibt der Inhalt überall lesbar, statt als syntaktisch korrumpierter Quelltext zu erscheinen.

## Ausblick

Diese Stufe deckt die Basis-Syntax ab. Geplante Erweiterungen:

- **Stufe 2**: `colspan` und `rowspan`, Spaltenausrichtung (links / zentriert / rechts), einfache Zell-Attribute.
- **Stufe 3**: Konverter `scg-table` → HTML-Tabelle inline für maximale Portabilität in fremden Markdown-Renderern.
