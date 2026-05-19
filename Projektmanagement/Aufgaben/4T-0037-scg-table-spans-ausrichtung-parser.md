# 4T-0037 — Parser- und Renderer-Erweiterung für scg-table Stufe 2 (Spans, Ausrichtung, Accessibility-scope)

**Status**: Wartet auf Test
**Epic**: [3E-0007 — SCG Table Stufe 2](3E-0007-scg-table-spans-ausrichtung.md)
**Zielversion**: 0.13.0

## Warum

Stufe 1 ([4T-0034](4T-0034-scg-table-parser.md)) hat scg-table als Basis-Tabelle implementiert, ohne Layout-Steuerung pro Zelle. Für Vergleichstabellen mit Header über mehrere Spalten, Matrizen mit gemeinsamen Zellen über mehrere Zeilen und numerische Spalten mit rechtsbündigen Werten braucht es Zell-Attribute. Stufe 2 fügt diese hinzu.

Außerdem ist Accessibility ein leichter Gewinn, wenn die Parser-Erweiterung ohnehin die Header-Zell-Generierung anfasst: `scope="col"` und `scope="row"` ermöglichen Screen-Readern, Datenzellen mit ihren Headern zu verbinden.

## Lösungsansatz

### Syntax: MediaWiki-kompatibel mit strikter Whitelist

Eine Zelle bekommt einen optionalen Attribut-Block am Anfang, getrennt durch ein zweites `|`:

```
| colspan="2" align="center" | Inhalt
```

- **Mit Attributen**: `| attr1="val1" attr2="val2" | Inhalt` (oder `! attr1="val1" | Inhalt` für Header-Zellen).
- **Ohne Attribute**: `| Inhalt` bzw. `! Inhalt` (wie in Stufe 1, unverändert).
- Parser erkennt das Trennzeichen anhand des zweiten `|` in einer Zelle. Ist kein zweites `|` da, ist kein Attribut-Block vorhanden.

### Whitelist

Erlaubte Attribute (alles andere stillschweigend ignoriert):

| Attribut  | Erlaubte Werte                       | HTML-Mapping                                |
|-----------|--------------------------------------|---------------------------------------------|
| `colspan` | positive Ganzzahl                    | `colspan="N"` auf `<td>` / `<th>`           |
| `rowspan` | positive Ganzzahl                    | `rowspan="N"` auf `<td>` / `<th>`           |
| `align`   | `left` / `center` / `right`          | `class="align-left|center|right"` auf Zelle |
| `valign`  | `top` / `middle` / `bottom`          | `class="valign-top|middle|bottom"` auf Zelle |

**Sicherheit:**

- Werte werden vor der Übernahme strikt validiert. `colspan="2"` → ok, `colspan="abc"` → ignoriert. `align="center"` → ok, `align="javascript:alert(1)"` → ignoriert.
- Keine `style="…"`-Attribute, keine `class="…"`-Attribute, keine `id`-Attribute, keine `data-*`-Attribute. Damit besteht keine Möglichkeit, beliebigen CSS- oder JS-Code einzuschleusen.
- `align` und `valign` werden auf CSS-Klassen gemappt (nicht auf das deprecated HTML4-`align`-Attribut), damit die CSS-Hoheit beim App-Stylesheet bleibt.

### Accessibility (`scope`)

Beim Generieren der HTML-Zelle wird automatisch das `scope`-Attribut gesetzt:

- `<th>` in der `<thead>`-Zeile (erste Zeile, wenn alle Zellen `!` haben) bekommt `scope="col"`.
- `<th>` in einer `<tbody>`-Zeile (Zeilen-Header durch `!` am Zeilenanfang) bekommt `scope="row"`.
- `<td>` bekommt kein `scope`.

Damit verbinden Screen-Reader Datenzellen mit den passenden Headern.

### Beispiel

````````
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
````````

Ergibt eine Tabelle mit:

- Rechtsbündiger Stunden-Spalte (`align="right"` pro Zelle).
- Erster Spalte „Entwurf" über zwei Zeilen (`rowspan="2"`).
- Letzter Zeile mit „Zwischensumme" über zwei Spalten zentriert (`colspan="2" align="center"`).

### Parser-Erweiterung in [src/main/preload.js](../../src/main/preload.js)

In `renderScgTable`, beim Erkennen einer Zelle mit `|` oder `!`:

1. Statt `trimmed.slice(1).trimStart()` als Inhalt zu nehmen, prüfen, ob es ein zweites `|` in der Zeile gibt.
2. Wenn ja: alles zwischen den beiden `|` als Attribut-String parsen (Regex auf `attr="value"`-Paare).
3. Whitelist-Filter anwenden, ungültige Werte verwerfen.
4. Im `currentCell` zusätzlich zu `type` und `content` ein `attrs`-Feld speichern.

In `renderScgTableRow`:

1. Beim Generieren der `<td>` / `<th>` die Attribute aus `cell.attrs` als HTML-Attribute bzw. CSS-Klassen anhängen.
2. `scope`-Attribut automatisch setzen abhängig davon, ob die Zelle in `<thead>` oder `<tbody>` liegt.

### CSS in [src/renderer/styles.css](../../src/renderer/styles.css)

Neue Klassen für Ausrichtung:

```css
.markdown-body .scg-table .align-left   { text-align: left; }
.markdown-body .scg-table .align-center { text-align: center; }
.markdown-body .scg-table .align-right  { text-align: right; }
.markdown-body .scg-table .valign-top   { vertical-align: top; }
.markdown-body .scg-table .valign-middle{ vertical-align: middle; }
.markdown-body .scg-table .valign-bottom{ vertical-align: bottom; }
```

Bestehende Default-`vertical-align: top` aus 4T-0034 bleibt; die Klassen überschreiben spezifischer.

### Akzeptanz-Smoke-Tests

1. Tabelle mit `colspan="2"` über zwei Spalten rendert korrekt.
2. Tabelle mit `rowspan="2"` über zwei Zeilen rendert korrekt.
3. `align="right"` rendert eine Zelle rechtsbündig.
4. `valign="middle"` rendert eine mehrzeilige Zelle vertikal zentriert.
5. Kombinationen (`colspan` + `align`, `rowspan` + `valign`) funktionieren.
6. Ungültige Werte (`colspan="abc"`, `align="oben"`) werden ignoriert, Zelle rendert ohne das ungültige Attribut.
7. Beliebige Style-Attribute (`style="background:red"`) werden ignoriert, kein CSS-Inhalt im HTML-Output.
8. `<th>` in der Header-Zeile hat `scope="col"`, `<th>` als Zeilen-Header hat `scope="row"`.
9. Stufe-1-Tabellen (ohne Stufe-2-Attribute) rendern unverändert.

## Akzeptanzkriterien

- Eine scg-table-Zelle kann optional einen Attribut-Block am Anfang haben (`| attrs | Inhalt`).
- Die Attribute `colspan`, `rowspan`, `align`, `valign` werden honoriert; alle anderen Attribute werden stillschweigend ignoriert.
- Werte werden strikt validiert; ungültige Werte werden ignoriert.
- Header-Zellen erhalten automatisch das passende `scope`-Attribut.
- Stufe-1-Funktionalität bleibt unverändert (keine Regression).
- Smoke-Tests 1–9 bestanden.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `renderScgTable` und `renderScgTableRow` um Attribut-Parsing, Whitelist-Filterung und `scope`-Logik erweitern.
- [src/renderer/styles.css](../../src/renderer/styles.css) — CSS-Klassen für `align-*` und `valign-*`.

## Lösung

Umgesetzt am 2026-05-19, Test bestanden.

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**: Zwei neue Hilfsfunktionen vor `renderScgTable` eingehängt:
  - `parseScgTableCellAttrs(rawText)`: erkennt einen optionalen Attribut-Block am Zellenanfang (zweites `|` als Trenner) und gibt gefilterte `attrs` plus den verbleibenden Zellinhalt zurück. **Konservativ**: ein Attribut-Block wird nur erkannt, wenn der Teil vor dem ersten `|` exakt dem Muster `name="value"` (ggf. mehrfach durch Whitespace getrennt) entspricht. Damit wird ein `|` im Zellinhalt (z.B. in Wiki-Links oder Inline-Pipes) nicht versehentlich als Attribut-Trenner missdeutet. Wert-Validierung strikt: `colspan`/`rowspan` nur `[1-9]\d*`, `align` nur `left`/`center`/`right`, `valign` nur `top`/`middle`/`bottom`. Alle anderen Attribute (`style`, `class`, `id`, `onclick` etc.) und ungültige Werte werden stillschweigend ignoriert.
  - `buildScgTableCellAttrs(attrs, cellType, isHeaderRow)`: erzeugt den HTML-Attribut-String. `colspan`/`rowspan` als HTML-Attribute, `align`/`valign` als CSS-Klassen (`align-*`/`valign-*`). `scope`-Setzung automatisch: `<th>` in `thead` bekommt `scope="col"`, in `tbody` `scope="row"`.
  - `startCell` nimmt zusätzlich `attrs` entgegen; `|`- und `!`-Handler rufen `parseScgTableCellAttrs` auf dem Anfangstext der Zelle auf.
  - `buildScgTableHtml` reicht `isHeaderRow` (true für `thead`-Zeile, false für `tbody`-Zeile) an `renderScgTableRow` durch.
  - `renderScgTableRow` baut den Attribut-String pro Zelle und hängt ihn an das öffnende `<td>`/`<th>`-Tag.
- **[src/renderer/styles.css](../../src/renderer/styles.css)**: Sechs neue CSS-Klassen (`.align-left/center/right`, `.valign-top/middle/bottom`) als `.markdown-body .scg-table .…`-Selektoren. Spezifität (0,3,0) schlägt die Stufe-1-Default-Regel für `td/th` (0,2,1), `valign-*` überschreibt damit das Stufe-1-Default `vertical-align: top`.
- **[package.json](../../package.json)**: Version 0.12.0 → 0.13.0 (Entwicklungsstand). Damit werden Test-EXEs der laufenden Entwicklung nicht versehentlich die offizielle 0.12.0-EXE in `releases/` überschreiben.

### Implementierungsdetails

- **Whitelist und Ignorier-Verhalten**: ungültige Werte und nicht erlaubte Attribute werden komplett verworfen, der Zellinhalt aber trotzdem nach dem `|`-Trenner gelesen. So bleibt das Verhalten konsistent zwischen „valides Attribut" und „erkennbarer aber ignorierter Attribut-Block". Der User sieht die Zelle mit ihrem Inhalt ohne den ungültigen Effekt — kein Crash, keine Fehlermeldung.
- **`<th>` in Datenzeilen**: wenn alle Zellen der ersten Zeile vom Typ `th` sind, kommt die Zeile in `<thead>` und die `<th>` bekommen `scope="col"`. Ein `<th>` in einer `tbody`-Zeile (z.B. erste Zelle in einer Datenzeile als `! Header der Zeile`) bekommt `scope="row"`. Damit verbinden Screen-Reader die Datenzellen mit ihrem Header.

### Smoke-Test (2026-05-19)

Acht Test-Abschnitte im Render-Pane geprüft: colspan, rowspan, align, valign mit mehrzeiligem Inhalt, Kombinationen aus colspan/rowspan/align/valign, ungültige Werte (`colspan="abc"`, `align="oben"`, `rowspan="0"`), verbotene Attribute (`style`, `class`, `onclick`) und Regression-Check Stufe-1-Tabelle ohne Attribute. Alle Punkte bestanden.
