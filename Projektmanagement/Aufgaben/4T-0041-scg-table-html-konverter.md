# 4T-0041 — HTML-Konverter: Export portables Markdown

**Status**: Erledigt — 2026-05-19, gepushed
**Epic**: [3E-0008 — SCG Table Stufe 3](3E-0008-scg-table-konverter-verschachtelung.md)
**Zielversion**: 0.14.0

## Warum

`.md`-Dateien mit `scg-table`-Codeblocks rendern nur in diesem Viewer als Tabelle. In fremden Renderern (GitHub-Vorschau, VS Code, andere Editoren) erscheinen sie als regulärer Code-Block. Für extern geteilte Dokumente, die voll lesbar sein sollen, fehlt eine Lösung.

Der HTML-Konverter schließt diese Lücke: er ersetzt `scg-table`-Codeblocks in einer `.md`-Datei durch inline HTML-Tabellen, die in CommonMark als raw HTML erlaubt sind und in allen üblichen Markdown-Renderern korrekt angezeigt werden.

## Lösungsansatz

### Menü-Eintrag „Datei → Exportieren → Portables Markdown…"

In [src/main/menu.js](../../src/main/menu.js):

- Neues Sub-Menü „Datei → Exportieren" anlegen (falls nicht vorhanden), darin der Eintrag „Portables Markdown…".
- Lokalisiert über zwei neue i18n-Keys in fünf Sprachen:
  - `menu.file.export` — Sub-Menü-Label („Exportieren" / „Export" / „Exporter" / „Exportar" / „Esportare").
  - `menu.file.exportPortable` — Eintrag-Label („Portables Markdown…" / „Portable Markdown…" usw.).
- Trigger schickt `menu:exportPortable` an den aktiven Renderer.

### Renderer-Pfad

In [src/renderer/renderer.js](../../src/renderer/renderer.js):

- `api.onMenuExportPortable(callback)` registriert den Event-Handler (analog zu `onMenuSaveAs` etc.).
- Beim Trigger:
  1. Aktiven Tab holen (Source und Pfad).
  2. `api.convertMarkdownPortable(source)` aufrufen.
  3. `api.saveFileAs(suggestedPath, convertedText)` mit Vorbelegung `<basename>-portable.md` aufrufen.

### Konverter-Logik im Preload

In [src/main/preload.js](../../src/main/preload.js):

1. **`convertMarkdownPortable(markdownText)`**:
   - Scannt den Markdown-Text auf `scg-table`-Codeblocks mit Regex `/^(`{3,})scg-table\s*\n([\s\S]*?)\n\1\s*$/gm` (mehrere Fence-Längen, Multiline, non-greedy, gleiche Backtick-Anzahl außen).
   - Pro Match: ruft `buildScgTableHtmlPortable(content)` auf.
   - Bei `null`-Rückgabe (beschädigter Block): Codeblock unverändert lassen.
   - Sonst: Codeblock durch HTML-Output ersetzen.

2. **`buildScgTableHtmlPortable(content)`**:
   - Wiederverwendung der bestehenden Parser-Logik (`renderScgTable`), aber mit eigener HTML-Generierung über eine neue `buildScgTableHtmlInlineStyles`-Funktion.
   - **Refactoring**: die bestehende Parser-Logik aus `renderScgTable` wird in eine neue Hilfsfunktion `parseScgTableBlock(content)` ausgelagert, die `{ caption, rows }` zurückgibt. `renderScgTable` und `buildScgTableHtmlPortable` rufen beide den Parser auf und unterscheiden sich nur in der HTML-Generierung.

3. **`buildScgTableHtmlInlineStyles(caption, rows)`**:
   - Wie `buildScgTableHtml`, aber:
     - **Kein `class="scg-table"`** auf `<table>` (im externen Renderer keine CSS-Definition).
     - **Ausrichtung als Inline-Style** statt CSS-Klasse: `style="text-align: <left|center|right>; vertical-align: <top|middle|bottom>"`.
     - `colspan`, `rowspan`, `scope` als HTML-Attribute (HTML5-konform).
     - `<caption>`, `<thead>`, `<tbody>` wie im Viewer-Render.

### HTML-Output-Beispiel

Aus diesem scg-table:

````
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

wird:

```html
<table>
<caption>Aufwandsschätzung</caption>
<thead>
<tr><th scope="col">Bereich</th><th scope="col">Aufgabe</th><th scope="col" style="text-align: right">Stunden</th></tr>
</thead>
<tbody>
<tr><td rowspan="2">Entwurf</td><td>Anforderungen sammeln</td><td style="text-align: right">8</td></tr>
<tr><td>Layout-Skizze</td><td style="text-align: right">4</td></tr>
<tr><td colspan="2" style="text-align: center">Zwischensumme</td><td style="text-align: right">12</td></tr>
</tbody>
</table>
```

### Verschachtelte Tabellen

Wenn der Markdown-Text mehrfach verschachtelte scg-tables enthält (aus [4T-0040](4T-0040-scg-table-verschachtelung.md)), arbeitet der Konverter analog rekursiv: der Zellinhalt wird durch dieselbe Konverter-Pipeline geschickt, sodass innere scg-tables ebenfalls zu HTML werden.

Dafür wird `buildScgTableHtmlInlineStyles` beim Rendern einer Zelle den Zellinhalt durch eine eigene Hilfsfunktion `renderCellForPortable` schicken, die analog zu `md.render`/`md.renderInline` arbeitet, aber innere scg-table-Codeblocks wieder durch `convertMarkdownPortable` jagt. Genaue Form klären beim Implementieren.

### Verhalten bei beschädigten Blöcken

`scg-table`-Codeblocks ohne `{|`-Anfang (im Viewer als Code-Block degradiert) werden vom Konverter unverändert gelassen. Semantisch konsistent zum Viewer.

### IPC-Schnittstelle

Die Konvertierung kann komplett im Preload laufen (kein Main-Roundtrip nötig). Der Save-As-Dialog läuft im Main über den bestehenden `file:saveAs`-Handler. API-Erweiterung:

- `api.convertMarkdownPortable(text)` (Preload, lokal): liefert konvertierten Markdown-Text.
- Bestehender `api.saveFileAs(suggestedPath, content)` für den Save-Dialog.

### Akzeptanz-Smoke-Tests

1. Datei mit einer einfachen scg-table konvertieren: Output enthält `<table>...<caption>...<thead>...<tbody>...</table>` an Stelle des `scg-table`-Codeblocks.
2. Stufe-2-Attribute (`colspan`, `rowspan`, `align`, `valign`) erscheinen im Output als HTML-Attribute bzw. Inline-Styles.
3. `scope="col"` und `scope="row"` werden korrekt gesetzt.
4. Verschachtelte scg-tables (aus 4T-0040) werden rekursiv konvertiert.
5. Beschädigter scg-table (kein `{|`) bleibt unverändert im Output.
6. Andere Code-Blocks (z.B. ```bash) bleiben unverändert.
7. Save-As-Dialog erscheint mit Vorbelegung `<basename>-portable.md` im Verzeichnis der Quell-Datei.
8. „Unbenannt"-Tab (ohne Pfad): Save-As-Dialog mit Default-Vorbelegung.
9. Konvertierte Datei rendert in einem externen Markdown-Renderer (z.B. GitHub-Vorschau, VS Code Markdown Preview) als echte Tabelle.

## Akzeptanzkriterien

- Menü-Eintrag „Datei → Exportieren → Portables Markdown…" in allen fünf Sprachen lokalisiert.
- Klick öffnet Save-As-Dialog mit Vorbelegung `<basename>-portable.md`.
- Konvertierte Datei enthält an Stelle aller `scg-table`-Codeblocks ein HTML-Tabellen-Äquivalent.
- HTML-Output enthält `colspan`/`rowspan`/`scope` als HTML-Attribute, Ausrichtung als Inline-Style.
- Verschachtelte scg-tables werden korrekt konvertiert.
- Beschädigte scg-table-Blöcke bleiben unverändert.
- Andere Code-Blocks unverändert.
- Konvertierte Datei rendert in mindestens einem externen Markdown-Renderer als echte Tabelle.

## Bezug zu Dateien

- [src/main/main.js](../../src/main/main.js) — `file:saveAs`-Handler wird wiederverwendet (keine neue IPC-Logik nötig, falls Save-Dialog dort schon existiert).
- [src/main/menu.js](../../src/main/menu.js) — neuer Menü-Eintrag „Datei → Exportieren → Portables Markdown…", lokalisiert.
- [src/main/preload.js](../../src/main/preload.js) — Konverter-Logik (`convertMarkdownPortable`, `buildScgTableHtmlPortable`, ggf. Refactoring zu `parseScgTableBlock` als gemeinsame Parser-Helper-Funktion), exposed über contextBridge.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Event-Handler für `menu:exportPortable`, Aufruf der Konverter-API und des Save-As-Dialogs.
- [src/i18n/{de,en,fr,es,it}.json](../../src/i18n) — neue Keys `menu.file.export` und `menu.file.exportPortable`.

## Lösung

Umgesetzt am 2026-05-19, Test bestanden (mit einer Architektur-Erweiterung beim Test).

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**:
  - **Refactoring**: Parser-Logik aus `renderScgTable` in eine eigene Funktion `parseScgTableBlock(content)` ausgelagert. Viewer-Renderer und Konverter teilen sie sich. `renderScgTable` ist ein dünner Wrapper mit Tiefen-Schutz und Aufruf von `parseScgTableBlock` plus `buildScgTableHtml`.
  - **Zweite md-Instanz `mdPortable`** mit `html: true` und denselben Plugins wie die Haupt-`md` (taskLists, anchor, katex, wikiLinks). **Kein** scg-table-Fence-Override — der Konverter behandelt scg-tables vorher separat.
  - **Konverter-Funktionen**: `convertMarkdownPortable(text, addMarker)`, `convertScgTableBlockToHtml(content)` (mit eigenem Tiefen-Counter `scgTablePortableDepth`), `buildScgTablePortableHtml(caption, rows)`, `renderScgTablePortableRow(row, isHeaderRow)`, `buildScgTablePortableCellAttrs(attrs, cellType, isHeaderRow)`, `renderScgTableCellForPortable(content)`.
  - **HTML-Output**: `<table>` ohne CSS-Klasse, `<caption>` mit Inline-Markdown via `mdPortable.renderInline`, `<thead>`/`<tbody>`-Struktur, `<th scope="col">`/`<th scope="row">` für Accessibility. `colspan`/`rowspan` als HTML-Attribute. Ausrichtung als `style="text-align: …; vertical-align: …"`. HTML5-konform.
  - **Zell-Konvertierung in zwei Stufen**: erst innere scg-tables rekursiv via `convertMarkdownPortable(trimmed, false)` zu HTML, dann der Rest via `mdPortable.render(withInnerHtml)`. Die zweite md-Instanz mit `html: true` verhindert das Escapen der zwischenzeitlich eingebetteten HTML-Tags.
  - **Marker-basiertes Opt-in-HTML-Rendering** (siehe Test-Iteration unten): `convertMarkdownPortable` fügt am Datei-Anfang `<!-- scg-portable -->` ein. `renderMarkdown` (Viewer-API) erkennt den Marker und schaltet die Datei auf `mdPortable` (`html: true`). Damit rendert die exportierte Datei auch im eigenen Viewer als HTML-Tabelle.
  - **API exposed**: `api.convertMarkdownPortable(text)` und `api.onMenuExportPortable(cb)`.
- **[src/main/menu.js](../../src/main/menu.js)**: neues Sub-Menü „Datei → Exportieren" mit Eintrag „Portables Markdown…" (lokalisiert in fünf Sprachen). Sendet `menu:exportPortable` an den aktiven Renderer.
- **5 i18n-Dateien** (`src/i18n/{de,en,fr,es,it}.json`): neue Keys `menu.file.export` und `menu.file.exportPortable`.
- **[src/renderer/renderer.js](../../src/renderer/renderer.js)**: neue Funktion `exportCurrentTabAsPortable()`. Holt aktiven Tab-Inhalt, konvertiert über `api.convertMarkdownPortable`, öffnet Save-As-Dialog mit Vorbelegung `<basename>-portable.md` (oder Anhang an Original-Pfad, falls keine `.md`-Endung). Event-Handler `api.onMenuExportPortable` registriert.

### Test-Iteration: Marker-basiertes Render-Verhalten

Im ersten Test fiel auf, dass die **exportierte Datei** im **eigenen Viewer** nicht als HTML-Tabelle rendert, sondern die HTML-Tags wörtlich als Quelltext anzeigt. Ursache: die Haupt-`md`-Instanz hat `html: false` aus Sicherheitsgründen (kein beliebiges HTML aus User-Markdown).

User-Erwartung: die exportierte Datei sollte auch im eigenen Viewer korrekt rendern, damit man das Ergebnis direkt visuell prüfen kann.

**Architektur-Erweiterung im selben Task**: Opt-in-HTML-Rendering über Datei-Marker.

- `convertMarkdownPortable` fügt am Datei-Anfang `<!-- scg-portable -->` ein. Rekursive Aufrufe aus `renderScgTableCellForPortable` setzen `addMarker = false`, damit der Marker nur einmal an der Datei-Spitze steht.
- `renderMarkdown` prüft den Datei-Anfang auf den Marker und schaltet bei Treffer auf `mdPortable` (mit `html: true`).
- Reguläre `.md`-Dateien rendern weiterhin mit `html: false` — kein Sicherheitsrisiko-Anstieg.
- Dateien mit dem Marker rendern HTML. Bei eigenen Konverter-Outputs unkritisch. Bei fremden Dateien mit diesem Marker (Edge-Case) muss der User der Quelle vertrauen — wird in der Hilfe-Tab-Doku in [4T-0042](4T-0042-scg-table-hilfe-tab-stufe-3.md) erläutert.

### Smoke-Test (2026-05-19)

Nach der Marker-Erweiterung:

- Datei-Menü → „Exportieren" → „Portables Markdown…" öffnet Save-As-Dialog mit Vorbelegung `<basename>-portable.md`.
- Exportierte Datei rendert im **eigenen Viewer** als echte HTML-Tabelle (Marker am Anfang signalisiert `mdPortable`).
- HTML-Tabelle enthält `colspan`/`rowspan`/`scope` als Attribute und Inline-Styles für Ausrichtung.
- Verschachtelte scg-tables aus [4T-0040](4T-0040-scg-table-verschachtelung.md) werden rekursiv konvertiert.
- Reguläre `.md`-Dateien ohne Marker rendern unverändert wie bisher (kein HTML).
