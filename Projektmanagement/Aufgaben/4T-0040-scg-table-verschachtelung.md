# 4T-0040 — Verschachtelte SCG-Tabellen

**Status**: Erledigt — 2026-05-19, gepushed
**Epic**: [3E-0008 — SCG Table Stufe 3](3E-0008-scg-table-konverter-verschachtelung.md)
**Zielversion**: 0.14.0

## Warum

Komplexe Doku-Strukturen mit Tabellen in Tabellen (z.B. Vergleichsmatrizen mit Detail-Untermatrizen pro Zeile) brauchen verschachtelte SCG-Tabellen. Aus Stufe 1 ([4T-0034](4T-0034-scg-table-parser.md)) ist die Basis-Funktionalität da; rekursives Markdown in Zellen funktioniert seit damals. Aber innerhalb von `renderScgTable` ist kein expliziter Selbst-Aufruf erkannt — die Verschachtelung greift technisch über den `md.render(cellContent)`-Pfad und den darin enthaltenen fence-Renderer-Override „automatisch", aber ohne Schutz vor Endlos-Rekursion bei kreativen Eingaben.

Stufe 3 schaltet die Verschachtelung explizit frei und schützt sie mit einem Rekursionstiefen-Limit.

## Lösungsansatz

### Verschachtelung funktioniert technisch bereits

Beim Rendern einer Zelle wird der Zellinhalt durch `md.render(cellContent)` geschickt. Da `md.renderer.rules.fence` bereits den scg-table-Override hat, greift bei einem inneren `scg-table`-Codeblock automatisch `renderScgTable` rekursiv. Voraussetzung: die Außen-Fence der inneren Tabelle ist länger als die der äußeren (CommonMark-Regel).

Was fehlt: ein **Rekursionstiefen-Schutz** und ein **Smoke-Test**, der die Verschachtelung gezielt absichert.

### Tiefen-Limit: max. 3 Ebenen

Modul-Level-Variable in [src/main/preload.js](../../src/main/preload.js):

```javascript
let scgTableRecursionDepth = 0;
const SCG_TABLE_MAX_DEPTH = 3;
```

Am Anfang von `renderScgTable`:

```javascript
function renderScgTable(content) {
  if (scgTableRecursionDepth >= SCG_TABLE_MAX_DEPTH) {
    return null; // Fallback: Block wird vom Default-Fence-Renderer als
                 // regulaerer Code-Block gerendert.
  }
  scgTableRecursionDepth++;
  try {
    // ... bestehende Parser- und Render-Logik
    return buildScgTableHtml(caption, rows);
  } finally {
    scgTableRecursionDepth--;
  }
}
```

Damit sind exakt 3 Ebenen erlaubt (Counter-Werte 0, 1, 2 beim Eintritt → 1, 2, 3 nach Inkrement). Die 4. Ebene erreicht den Check mit Counter 3, gibt `null` zurück, der Override fällt auf den Default-Renderer (Code-Block). Kein Crash, kein Endlos-Loop.

### Fence-Längen-Konvention

| Ebene | Außen-Fence-Länge | Beispiel-Inhalt |
|-------|-------------------|-----------------|
| 1 | 3 Backticks | nur Tabelle, kein Code-Block |
| 2 | 4 Backticks | Tabelle mit innerem Code-Block (3 Backticks) **oder** mit innerer Tabelle (3 Backticks) |
| 3 | 5 Backticks | Tabelle mit innerer Tabelle (4 Backticks), die selbst Code (3 Backticks) enthalten kann |

Regel: jede äußere Fence mindestens eine Backtick mehr als die nächste innere. CommonMark-Standard.

### Akzeptanz-Smoke-Tests

1. **Zwei Ebenen tief**: äußere Tabelle (4 Backticks) hat eine Zelle, die eine innere Tabelle (3 Backticks) enthält. Beide rendern als HTML-Tabellen.
2. **Drei Ebenen tief**: 5 Backticks außen, 4 Backticks Mitte, 3 Backticks innen. Alle drei rendern.
3. **Vier Ebenen tief**: die innerste Tabelle wird zum Code-Block, nicht zu einer Tabelle (Tiefen-Limit greift). Keine Crash, kein verstümmeltes HTML.
4. **Stufe-1-Tabelle ohne Verschachtelung** rendert unverändert (Regression-Check).
5. **Innere Tabelle nutzt Stufe-2-Attribute** (`colspan`, `align` etc.): funktioniert in der inneren Tabelle wie in der äußeren.
6. **Innere Tabelle hat eigenen Code-Block in einer Zelle**: alle drei Inhalte (äußere Tabelle, innere Tabelle, Code-Block) rendern korrekt.

## Akzeptanzkriterien

- Ein `scg-table`-Codeblock innerhalb einer Zelle (mit längerer Außen-Fence) wird als HTML-Tabelle gerendert, bis zu 3 Ebenen tief.
- Bei mehr als 3 Ebenen Tiefe wird die zu tiefe Tabelle als Code-Block angezeigt (Fallback).
- Verschachtelte Tabellen können Stufe-2-Attribute (`colspan`, `rowspan`, `align`, `valign`) nutzen.
- Stufe-1- und Stufe-2-Funktionalität bleibt unverändert (keine Regression).
- Smoke-Tests 1–6 bestanden.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — Rekursionstiefen-Counter (Modul-Level-Variable plus Konstante), try/finally-Wrapping in `renderScgTable`.

## Lösung

Umgesetzt am 2026-05-19, Test bestanden (mit einer Korrektur-Iteration).

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**:
  - Modul-Level-Variable `scgTableRecursionDepth` und Konstante `SCG_TABLE_MAX_DEPTH = 3` direkt vor `renderScgTable`.
  - Funktionsbody umschlossen mit `try/finally`: am Anfang Tiefen-Check, Counter inkrementieren; im `finally`-Block dekrementieren (auch bei Exceptions sauber).
  - Lokale Variable `fenceInProgress` im Parser-State, plus zwei Hilfsfunktionen `maybeOpenFence(text)` und `maybeCloseFence(line)`.
  - Parser-Loop um einen Vorrang-Block erweitert: wenn `fenceInProgress` gesetzt ist, gehen alle Folgezeilen direkt zum aktuellen Zellinhalt, ohne dass scg-table-Marker (`|-`, `|`, `!`, `|}`) darin interpretiert werden.
- **[package.json](../../package.json)**: Version 0.13.0 → 0.14.0 (Entwicklungsstand).

### Korrektur-Iteration während des Tests

Die ursprüngliche Architektur-Annahme aus [3E-0008](3E-0008-scg-table-konverter-verschachtelung.md) („Verschachtelung funktioniert technisch fast geschenkt, weil `md.render(cellContent)` den fence-Override rekursiv aufruft") **war falsch**. Der Parser läuft zeilenweise; bei einer inneren `scg-table`-Fence in einer Zelle wurden die `|-`/`|`/`!`/`|}`-Marker der inneren Tabelle vom äußeren Parser als seine eigenen interpretiert — die innere Tabelle wurde zerrissen statt verschachtelt zu rendern.

Beim ersten Smoke-Test fiel das sofort auf (zweistufige Tabelle: innere Tabelle erschien als eigene Tabelle vor der äußeren statt als Verschachtelung). Fix per **Fence-Tracking** im äußeren Parser:

- `fenceInProgress` hält die öffnende Fence-Sequenz (`` ``` `` oder `` ```` ``) sobald eine in einer Zelle auftaucht.
- Solange die Fence offen ist, gehen alle Folgezeilen direkt zum Zellinhalt; scg-table-Marker werden nicht interpretiert.
- Die schließende Fence wird über CommonMark-Regel erkannt (gleicher Char, mindestens gleiche Länge, danach nur Whitespace).
- Beim Rendern der Zelle greift `md.render(cellContent)` dann auf den intakten inneren Block, und der scg-table-Override ruft `renderScgTable` rekursiv auf. Counter geht von Tiefe N auf N+1, am Ende sauber zurück.

### Bonus-Wirkung

Derselbe Fix repariert eine latente Stufe-1-Schwäche: ein Code-Block in einer Zelle, dessen Inhalt zufällig wie ein scg-table-Marker aussieht (z.B. eine Bash-Zeile mit `|-`), wurde bisher zerrissen. Jetzt nicht mehr. Die Stufe-1-Tests waren das nie aufgefallen, weil die Test-Inhalte (typische Bash-Snippets) keine scg-table-Marker enthielten.

### Smoke-Test (2026-05-19)

Sechs Test-Abschnitte im Render-Pane geprüft:

1. Stufe-1-Tabelle ohne Verschachtelung (Regression).
2. Zwei Ebenen verschachtelt.
3. Drei Ebenen verschachtelt.
4. Vier Ebenen: drei rendern als Tabelle, die innerste fällt auf Code-Block zurück (Tiefen-Limit).
5. Stufe-2-Attribute (`colspan`, `align`) funktionieren in der inneren Tabelle.
6. Innere Tabelle mit eigenem Bash-Code-Block in einer Zelle.

Alle Punkte bestanden nach der Korrektur-Iteration.

### Konsequenz für 4T-0041

Der Parser-Refactoring (`parseScgTableBlock`-Auslagerung) muss die Fence-Tracking-Logik mit übernehmen, damit Viewer-Renderer und Konverter dasselbe Parsing-Verhalten haben. Wird beim Implementieren von 4T-0041 berücksichtigt.
