# 4T-0045 — Spalten-Default-Ausrichtung in SCG-Tabellen

**Status**: Offen
**Epic**: [3E-0009 — SCG Table Stufe 4](3E-0009-scg-table-sortierung-status.md)
**Zielversion**: 0.15.0

## Warum

Stufe 2 ([3E-0007](3E-0007-scg-table-spans-ausrichtung.md)) erlaubt die Ausrichtung pro Zelle (`align="right"`, `valign="middle"`). Bei Tabellen mit durchgängig nach Konvention ausgerichteten Spalten (z.B. „Preis" rechtsbündig, „Status" zentriert) ist es nervig, in jeder Zelle wieder `align="…"` zu schreiben.

Klassische Markdown-Pipe-Tabellen lösen das über die Trennlinie `:---`, `---:`, `:---:`. SCG-Tabellen sollten in Stufe 4 einen vergleichbaren Komfort bieten.

## Lösungsansatz

### Syntax: `{|+cols="…"` als Tabellen-Header-Attribut

Direkt nach `{|` (oder direkt nach `|+ Caption`) kann eine `cols`-Anweisung stehen, die pro Spalte eine Default-Ausrichtung definiert:

```
{|+cols="left right right"
|+ Aufwandsschätzung
|-
! Bereich
! Aufgabe
! Stunden
|-
| Entwurf
| Anforderungen sammeln
| 8
|}
```

Die `cols`-Liste hat einen Wert pro Spalte, durch Whitespace getrennt. Erlaubte Werte: `left`, `center`, `right` (analog Stufe-2-`align`-Whitelist).

### Parser-Erweiterung

In `parseScgTableBlock` ([src/main/preload.js](../../src/main/preload.js)):

- Nach dem `{|` zusätzlich auf der gleichen Zeile (oder den ersten folgenden Zeilen vor dem ersten `|-`) nach einer `+cols="…"`-Anweisung suchen. Pragmatisch: erste Zeile nach `{|` prüfen.
- Wenn gefunden: Liste der Werte parsen, Whitelist-Filter (`left`/`center`/`right`), als `columnDefaults`-Array speichern.
- Beim Rendern jeder Zelle:
  - Spalten-Index pro Zeile tracken (komplizierter mit `colspan`).
  - Wenn die Zelle keine eigene `align`-Attribut hat **und** ein Spalten-Default für diese Spalte existiert: Default als CSS-Klasse setzen.

### Spalten-Index-Tracking bei `colspan`

Eine Zelle mit `colspan="2"` belegt zwei Spalten. Beim Iterieren durch die Zellen einer Zeile muss der Spalten-Index entsprechend springen.

Pragmatisches Verhalten bei `colspan` + Spalten-Default:
- Wenn die Zelle einen Span hat, **kein** Spalten-Default anwenden. Begründung: die Zelle überspannt mehrere Spalten mit ggf. unterschiedlichen Defaults; eine eindeutige Wahl ist nicht möglich. Wenn der User Ausrichtung für eine Span-Zelle will, muss er sie explizit setzen (`align="center"`).

### `rowspan` und Spalten-Index

Mit `rowspan` belegt eine Zelle eine Spalten-Position für mehrere Zeilen. Die nachfolgenden Zeilen haben „weniger Zellen" pro Quellzeile, aber das HTML-Rendering ist transparent: die Browser-Layout-Engine kümmert sich darum.

Für die **Spalten-Default-Anwendung** im Renderer: das Tracking pro Zeile bleibt anhand der Quell-Zellen-Sequenz; rowspan-Effekte werden nicht in Spalten-Index-Berechnung berücksichtigt. Bei pathologischen Konstrukten kann das zu falschen Defaults führen; in der Praxis sind solche Konstrukte aber selten.

### Mismatch-Verhalten

- **Weniger Werte als Spalten**: zusätzliche Spalten ohne Default. Toleranz, kein Fehler.
- **Mehr Werte als Spalten**: zusätzliche ignorieren. Toleranz.
- **Ungültiger Wert** (z.B. `top` statt `left`): wird ignoriert, diese Spalte hat keinen Default.

### Konverter-Output

Im `buildScgTableHtmlPortable` (4T-0041) muss der Spalten-Default berücksichtigt werden: pro Zelle, wenn der Spalten-Default greift, wird die Inline-Style-`text-align`-Eigenschaft gesetzt (analog zu Stufe-2-`align`).

### Akzeptanz-Smoke-Tests

1. Tabelle mit `cols="left right right"` und drei Spalten: alle Zellen der 2. und 3. Spalte sind rechtsbündig.
2. Explizite `align="center"` an einer Zelle überschreibt den Spalten-Default.
3. Spalten-Default-Wert `unknown` wird ignoriert; Spalte hat keinen Default.
4. `cols`-Liste mit weniger Werten als Spalten: nur die ersten N Spalten haben Default.
5. `cols`-Liste mit mehr Werten als Spalten: überzählige werden ignoriert.
6. Bei `colspan="2"` wird kein Spalten-Default angewendet; ohne eigene `align`-Attribut bleibt die Zelle linksbündig (Default).
7. Konverter-Output enthält die Spalten-Default-Ausrichtung als Inline-Style.

## Akzeptanzkriterien

- `{|+cols="…"` als Tabellen-Attribut wird erkannt und gespeichert.
- Whitelist auf `left`/`center`/`right`.
- Spalten-Default wirkt pro Zelle, wenn keine eigene `align`-Attribut vorhanden.
- Zell-Override gewinnt gegen Spalten-Default.
- Mismatch-Toleranz: fehlende oder überzählige Werte werden sauber behandelt.
- `colspan` schaltet Spalten-Default für die betroffene Zelle aus.
- Konverter erhält die Spalten-Default-Ausrichtung beim Export.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `parseScgTableBlock` um `cols`-Attribut-Parsing erweitern; `renderScgTableRow`/`renderScgTablePortableRow` und `buildScgTableCellAttrs`/`buildScgTablePortableCellAttrs` um Spalten-Index-Tracking und Default-Anwendung.
- [src/renderer/styles.css](../../src/renderer/styles.css) — keine neuen Regeln nötig; die bestehenden `align-*`-Klassen aus Stufe 2 werden wiederverwendet.

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
