# 4T-0046 — Sortierbare SCG-Tabellen

**Status**: Offen
**Epic**: [3E-0009 — SCG Table Stufe 4](3E-0009-scg-table-sortierung-status.md)
**Zielversion**: 0.15.0

## Warum

Daten-Tabellen mit mehreren Spalten und vielen Zeilen werden nur durch Sortierbarkeit wirklich nutzbar. MediaWiki-Standard ist `class="sortable"`; in den meisten Wiki- und CMS-Plattformen ebenfalls. Für deinen Doku-Use-Case sind das z.B. Anforderungslisten (sortiert nach Priorität), Vergleichstabellen (sortiert nach Preis oder Bewertung), Aufwandsschätzungen (sortiert nach Aufwand).

## Lösungsansatz

### Aktivierung pro Tabelle

In der Tabellen-Header-Zeile (analog zu `cols`-Attribut aus [4T-0045](4T-0045-scg-table-spalten-default.md)):

```
{|+sortable
|-
! Position
! Preis
|-
| Basis
| 10
|-
| Premium
| 50
|}
```

`{|+sortable` (oder kombiniert mit `cols`: `{|+sortable cols="left right"`) setzt auf der gerenderten `<table>` die Klasse `scg-table sortable`.

### Renderer-Hook im Renderer-Pane

In [src/renderer/renderer.js](../../src/renderer/renderer.js) nach jedem `api.renderMarkdown`-Aufruf einen Post-Process-Pass:

- Suche `<table class="scg-table sortable">`-Elemente im Render-DOM.
- Pro Tabelle: prüfe, ob `colspan` oder `rowspan` in irgendeiner Zelle vorhanden ist. Wenn ja: **Sortierung deaktivieren** (kein Click-Handler, kein Indikator-Icon). Doku-Verweis: bei Spans + Sortierung ist das Layout-Risiko zu hoch.
- Wenn keine Spans: pro Header-Zelle (`<th>` in `<thead>`) Click-Handler registrieren. Beim Klick: sortiere die `<tbody>`-Zeilen nach dem Text-Inhalt der jeweiligen Spalte; toggle aufsteigend → absteigend → reset (drei Klicks zyklisch).
- Sort-Indikator (Inline-SVG, Lucide-Stil) im Header rechts: aufsteigend (↑), absteigend (↓), neutral (↕) oder leer.

### Sort-Heuristik

```javascript
function compareScgTableCells(a, b) {
  const aText = a.textContent.split('\n')[0].trim(); // erste Zeile bei Mehrzeilern
  const bText = b.textContent.split('\n')[0].trim();
  const aNum = Number(aText);
  const bNum = Number(bText);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }
  return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
}
```

- **Numerisch zuerst**: `Number(text)` ergibt nicht `NaN` für beide Werte → numerischer Vergleich.
- **Sonst lexikographisch** mit `localeCompare` (Locale-fähig, behandelt Umlaute korrekt). Option `numeric: true` macht `"item10" > "item2"` korrekt.
- **Mehrzeilige Zellen**: nach der ersten Zeile sortieren (intuitiv).
- **Datum**: keine spezielle Behandlung. ISO-Datum (2026-05-19) sortiert lexikographisch korrekt. Für andere Datums-Formate muss der User auf ISO umstellen — Doku-Hinweis im Hilfe-Tab.

### Sort-Indikator-Icons

Inline-SVG (Lucide-Stil), drei Varianten:

- **Neutral**: doppelter Chevron (`chevrons-up-down`), gedämpfte Farbe, sichtbar bei jedem `<th>` der Tabelle, signalisiert „sortierbar".
- **Aufsteigend**: `chevron-up`, akzent-Farbe.
- **Absteigend**: `chevron-down`, akzent-Farbe.

Icons werden inline ins `<th>` eingefügt; CSS-Position rechts neben dem Header-Text.

### Stabilität und Reset

- **Stabile Sortierung**: bei Gleichheit der Sort-Spalte bleibt die ursprüngliche Reihenfolge erhalten (`Array.prototype.sort` ist seit ES2019 stabil).
- **Reset** (dritter Klick auf dieselbe Spalte): die Original-Reihenfolge wiederherstellen. Dafür beim ersten Klick die ursprüngliche `<tr>`-Reihenfolge in einem Array sichern; beim Reset die Array-Reihenfolge wiederherstellen.
- **Click auf andere Spalte**: erste neue Sort-Spalte startet bei aufsteigend.

### Persistenz

- **Sortierung ist Session-lokal und Tab-lokal**. Keine Persistenz über App-Neustarts. Beim Tab-Wechsel und Re-Render geht die Sortierung verloren (kein Workaround in Stufe 4).

### Sortierung im portablen Export

Der HTML-Konverter (4T-0041) hat **keinen JavaScript-Hook** im Output, weil das im fremden Renderer (GitHub, VS Code) nicht zuverlässig läuft. `class="sortable"` wird im Konverter-Output **nicht** mitgegeben — die exportierte Tabelle ist nicht sortierbar. Begründung: in GitHub-Renderern funktioniert client-side Sortierung nicht.

### Akzeptanz-Smoke-Tests

1. Tabelle mit `{|+sortable` und drei Datenzeilen: Klick auf Header sortiert aufsteigend, weiterer Klick absteigend, dritter Klick reset.
2. Numerische Werte werden numerisch sortiert (10 > 2, nicht „10" < „2").
3. Lexikographische Werte sortieren mit Locale (Umlaute korrekt einsortiert).
4. Mehrzeilige Zelle: Sortierung nach der ersten Zeile.
5. Sort-Indikator (Chevron-Icon) erscheint in jedem `<th>`; ändert sich beim Sortieren.
6. Tabelle mit `sortable` plus `colspan` einer Zelle: Sortierung wird deaktiviert (kein Klick-Handler, kein Indikator).
7. Tabelle ohne `sortable`: kein Sort-Verhalten (unverändert wie bisher).
8. Portable Export einer sortierbaren Tabelle: HTML enthält **kein** `class="sortable"`-Attribut auf `<table>`.

## Akzeptanzkriterien

- `{|+sortable` aktiviert die Sortierung; rendert `<table class="scg-table sortable">`.
- Click-Handler auf Header-Zellen toggelt aufsteigend → absteigend → reset.
- Sort-Heuristik: numerisch wenn möglich, sonst lexikographisch mit Locale.
- Sort-Indikator-Icon erscheint in jedem `<th>`; ändert sich passend.
- Bei `colspan`/`rowspan` in der Tabelle wird Sortierung automatisch deaktiviert.
- Portable Export enthält keine `sortable`-Klasse.
- Sortierung ist Session-/Tab-lokal, kein Cross-Tab- oder Cross-Restart-Effekt.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `parseScgTableBlock` erkennt `+sortable` als Tabellen-Attribut, setzt `tableMeta.sortable = true`; `buildScgTableHtml` setzt `class="scg-table sortable"` bei Sortierbarkeit. Span-Erkennung als Marker zum späteren Deaktivieren.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Post-Render-Hook für `.scg-table.sortable`-Tabellen: Span-Check, Click-Handler-Registrierung, Sort-Logik, Indikator-Icons.
- [src/renderer/styles.css](../../src/renderer/styles.css) — CSS für Sort-Indikator-Icons, hover-Effekte am Header.

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
