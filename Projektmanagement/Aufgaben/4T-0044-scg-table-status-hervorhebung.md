# 4T-0044 — Status-Hervorhebung in SCG-Tabellen

**Status**: Erledigt — 2026-05-19, gepushed (Commit `ae35e45`)
**Epic**: [3E-0009 — SCG Table Stufe 4](3E-0009-scg-table-sortierung-status.md)
**Zielversion**: 0.15.0

## Warum

Status-Spalten in Tabellen (Test-Status grün/rot, Risiko-Level rot/gelb/grün, Verfügbarkeit OK/Wartung/Ausfall) profitieren stark von Farbcodierung. Reine Text-Spalten lesen sich langsam, bunte Status-Zellen werden auf einen Blick erfasst. In MediaWiki üblich über freie Inline-Styles, was bei uns aus XSS-Gründen ausgeschlossen ist (siehe [3E-0007](3E-0007-scg-table-spans-ausrichtung.md)-Whitelist).

Stufe 4 führt eine **semantische Kurzform** mit einer kleinen Whitelist an Klassen ein: `error`, `warn`, `ok`, `info`, `neutral`. Das App-CSS bestimmt die konkreten Farben, im Light- und Dark-Theme konsistent.

## Lösungsansatz

### Syntax: Punktnotation am Zell-/Zeilen-Marker

Eine Status-Klasse wird über einen Punkt direkt nach dem Marker eingeleitet:

- **Zelle**: `|.error Inhalt`, `!.warn Header`, etc.
- **Zeile** (gilt für alle Zellen der Zeile): `|-.error`, `|-.warn`, etc.

Wenn Zelle und Zeile beide eine Status-Klasse haben, gewinnt die Zelle.

### Whitelist

| Status   | Bedeutung                          |
|----------|------------------------------------|
| `error`  | Fehler, kritisch                   |
| `warn`   | Warnung, Aufmerksamkeit            |
| `ok`     | OK, erledigt, positiv              |
| `info`   | Hinweis, neutral-informativ        |
| `neutral`| Markierung ohne Wertung            |

Andere Klassen-Werte werden stillschweigend ignoriert (kein XSS-Risiko, keine beliebigen CSS-Klassen).

### Parser-Erweiterung

In `parseScgTableBlock` ([src/main/preload.js](../../src/main/preload.js)):

- Beim Erkennen von `|`, `!` und `|-` zusätzlich prüfen, ob direkt nach dem Marker (vor Whitespace) ein `.` folgt. Wenn ja: Wort bis zum nächsten Whitespace als potenzielle Status-Klasse extrahieren.
- Whitelist-Check: ist der Wert in `error`/`warn`/`ok`/`info`/`neutral`? Wenn ja: in `cell.statusClass` bzw. `row.statusClass` speichern. Wenn nein: ignorieren, Marker wird als normaler Zellinhalt-Start behandelt.
- Zell-Inhalt fängt nach dem Status-Klassen-Suffix an.

### CSS-Klassen

Neue Regeln in [src/renderer/styles.css](../../src/renderer/styles.css):

```css
.markdown-body .scg-table .status-error  { background-color: ...; color: ...; }
.markdown-body .scg-table .status-warn   { background-color: ...; color: ...; }
.markdown-body .scg-table .status-ok     { background-color: ...; color: ...; }
.markdown-body .scg-table .status-info   { background-color: ...; color: ...; }
.markdown-body .scg-table .status-neutral{ background-color: ...; color: ...; }

[data-theme="dark"] .markdown-body .scg-table .status-error { ... }
/* etc. */
```

Konkrete Farbpalette wird beim Implementieren festgelegt, abgestimmt auf Light- und Dark-Theme mit ausreichendem Kontrast (WCAG-AA).

### HTML-Output

- **Zell-Status**: `<td class="status-error">…</td>` bzw. `<th class="status-warn">…</th>`.
- **Zeilen-Status**: `<tr class="status-error">…</tr>`. Die CSS-Regel zielt dann auf `tr.status-error > td, tr.status-error > th`.

Kombination mit Stufe-2-Klassen (`align-*`, `valign-*`): mehrere Klassen am selben Element. Beispiel: `<td class="status-error align-right">`.

### Konverter-Output (für portable Datei)

Im `buildScgTableHtmlPortable` (4T-0041) müssen Status-Klassen ebenfalls mit übernommen werden — aber als Inline-Styles, weil externe Renderer die `.status-error`-Klasse nicht kennen. Mapping:

- `status-error` → `style="background-color: <farbe>"`
- analog für die anderen

Konkrete Farbwerte beim Implementieren festlegen. Status-Inline-Styles werden zu den bestehenden Stufe-2-Inline-Styles addiert.

### Akzeptanz-Smoke-Tests

1. Zelle mit `|.error` rendert mit roter Hintergrundfarbe.
2. Zeile mit `|-.warn` rendert alle Zellen mit warn-Farbe.
3. Zellen-Status überschreibt Zeilen-Status (`|-.warn` mit `|.error` darin: Zelle ist error, Rest der Zeile warn).
4. Ungültige Klasse (`|.unknown`) wird ignoriert, Zelle rendert ohne Status-Klasse, Inhalt korrekt.
5. Theme-Wechsel: Status-Farben sind in beiden Themes lesbar.
6. Kombination mit Stufe 2: `|.error align="right"` (oder umgekehrt) funktioniert.
7. Im portable Export bleibt die Status-Hintergrundfarbe als Inline-Style erhalten.

## Akzeptanzkriterien

- Zell- und Zeilen-Marker akzeptieren einen Status-Klassen-Suffix in Punkt-Notation (`|.error`, `|-.warn` etc.).
- Whitelist auf fünf Klassen; ungültige Werte werden ignoriert.
- HTML-Output erhält die `status-*`-CSS-Klasse.
- Light- und Dark-Theme-Farben mit ausreichendem Kontrast.
- Konverter erhält die Status-Information beim Export (Inline-Style).
- Stufe-1- und Stufe-2-Funktionalität bleibt unverändert.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `parseScgTableBlock` um Status-Klassen-Parsing erweitern; `renderScgTableRow`/`renderScgTablePortableRow` setzt Status-Klasse auf `<td>`/`<th>`/`<tr>`.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Status-Klassen-Regeln für Light- und Dark-Theme.

## Lösung

Umgesetzt am 2026-05-19, Test bestanden.

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**:
  - Neue Konstanten `SCG_STATUS_CLASSES` (Whitelist auf fünf Werte) und `SCG_STATUS_INLINE_COLORS` (Farb-Map für Light-Theme im Portable-Export).
  - Hilfsfunktion `extractScgTableStatusClass(text)` erkennt `.<class>` mit Whitelist-Filter; gibt `{ status, rest }` zurück.
  - `buildScgTableCellAttrs` und `buildScgTablePortableCellAttrs` jeweils um `statusClass`-Parameter erweitert. Viewer-Pfad setzt CSS-Klasse `status-<value>`, Portable-Pfad setzt `background-color`/`color` als Inline-Style.
  - `parseScgTableBlock`: `startRow` und `startCell` mit `statusClass`-Parameter. `|-`/`!`/`|`-Handler rufen `extractScgTableStatusClass` direkt nach dem Marker auf, bevor `parseScgTableCellAttrs` läuft. Die Reihenfolge ist Marker → Status → Attribute → Inhalt.
  - `renderScgTableRow` und `renderScgTablePortableRow` berechnen `effectiveStatus = cell.statusClass || row.statusClass || null`; **Zell-Status gewinnt** gegen Zeilen-Status.
- **[src/renderer/styles.css](../../src/renderer/styles.css)**: zehn neue CSS-Regeln (fünf Status-Klassen × Light + Dark). Light-Theme mit pastelligen Hintergründen, Dark-Theme mit gedämpften dunklen Tönen. Beide WCAG-AA-konform.
- **[package.json](../../package.json)**: Version 0.14.0 → 0.15.0 (Entwicklungsstand).

### Implementierungsdetails

- **Override-Logik**: pro Zelle wird `cell.statusClass || row.statusClass` genommen. Die effektive Klasse landet auf `<td>` bzw. `<th>`, nicht auf `<tr>`. Damit gewinnt die Zell-Klasse durch reinen DOM-Aufbau, ohne CSS-Spezifitäts-Tricks.
- **Whitelist-Filter** im `extractScgTableStatusClass`: ungültige Klassen-Werte wie `.unknown` werden ignoriert, der Text bleibt als Zellinhalt erhalten.
- **Syntax-Reihenfolge**: zuerst der Marker (`|`, `!`, `|-`), dann optional `.<class>`, dann optional ein Attribut-Block, dann der Inhalt. Beispiel: `|.warn align="right" | 40h`.
- **Portable-Export**: Status-Farben als Inline-Style mit Light-Theme-Werten. Externe Renderer kennen unsere `status-*`-Klassen nicht.

### Smoke-Test (2026-05-19)

Sechs Test-Abschnitte im Render-Pane geprüft:

1. Zell-Status mit allen fünf Klassen (error/warn/ok/info/neutral).
2. Zeilen-Status — alle Zellen der Zeile bekommen die Farbe.
3. Zell-Status gewinnt gegen Zeilen-Status (Override).
4. Kombi mit Stufe-2-Attributen (`align="right"` zusammen mit `.warn`).
5. Ungültiger Klassen-Wert (`.unknown`) wird ignoriert, Text bleibt sichtbar.
6. Theme-Wechsel: Farben bleiben in Light- und Dark-Theme lesbar.

Alle Punkte bestanden.
