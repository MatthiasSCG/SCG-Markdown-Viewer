# 4T-0040 — Verschachtelte SCG-Tabellen

**Status**: Offen
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

(wird nach Abschluss der Umsetzung gefüllt)
