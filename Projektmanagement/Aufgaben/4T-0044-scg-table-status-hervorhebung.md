# 4T-0044 — Status-Hervorhebung in SCG-Tabellen

**Status**: Offen
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

(wird nach Abschluss der Umsetzung gefüllt)
