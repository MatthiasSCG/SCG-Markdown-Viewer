# 4T-0041 — HTML-Konverter: Export portables Markdown

**Status**: Offen
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

(wird nach Abschluss der Umsetzung gefüllt)
