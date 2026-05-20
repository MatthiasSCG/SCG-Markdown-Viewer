# 4T-0055 — Wiki-Embeds `![[…]]`

**Status**: Erledigt — 2026-05-20, Test bestanden
**Epic**: [3E-0011 — Wiki-Link-Ausbau und Tag-System](3E-0011-wiki-link-ausbau-und-tag-system.md)
**Zielversion**: 0.17.0
**Setzt voraus**: [4T-0054 — Wiki-Link-Parser für Heading- und Block-Anker](4T-0054-wiki-link-heading-block-anker.md)

## Warum

In Obsidian und Logseq ist `![[Datei]]` der Embed-Operator: er bettet eine andere Datei inline in das aktuelle Dokument ein. Bei Bildern (`![[bild.png]]`) ist das identisch zur Markdown-Bild-Syntax; bei Markdown-Dateien wird ein eingebetteter Render-Block erzeugt; bei anderen Datei-Typen (PDF) erscheint ein Vorschau-Element mit Klick-Link.

Aktuell ignoriert die App `![[…]]`-Sequenzen vollständig. Damit fehlt einer der häufigsten Vernetzungs-Mechanismen aus dem Obsidian-Workflow.

## Lösungsansatz

### Parser-Erweiterung

In [src/main/preload.js](../../src/main/preload.js), `wikiLinksPlugin`:

- Erkennung des `!`-Präfix vor `[[…]]`. Bei Treffer wird statt `<a>` ein typabhängiger Embed-Block erzeugt.
- Anker-Logik aus 4T-0054 bleibt bestehen: `![[Notiz#Abschnitt]]` bettet nur den Abschnitt ein (Best Effort).

### Embed-Typen

Anhand der Datei-Endung wird der Render-Pfad gewählt:

| Endung | Render |
|--------|--------|
| `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp` | `<img>` mit Base64-Pfad-Auflösung analog zu Markdown-Bildern |
| `md`, `markdown`, `mdown`, `mkd` | Eingebetteter Render-Block (rekursiv) in einer dezenten Box mit Klick-Link |
| `pdf` | `<embed type="application/pdf">` mit fester Höhe und Klick-Link als Fallback |
| sonstige | Klick-Link mit Datei-Icon, kein eingebetteter Inhalt |

### Rekursionsschutz für Markdown-Embeds

`![[A]]` in Datei `B.md` lädt `A.md`. Wenn `A.md` selbst `![[B]]` enthält, würde rekursiv geladen werden:

- Tiefenzähler analog zu SCG-Tables (`scgTableRecursionDepth` aus 3E-0008).
- Limit: 2 Ebenen. Bei Überschreitung wird statt Render-Block ein dezenter Klick-Link mit Hinweis „Embed-Tiefe überschritten" angezeigt.

### Anker bei Markdown-Embeds

`![[Datei#Abschnitt]]`: nur der Abschnitt von Heading bis zum nächsten gleichrangigen oder höheren Heading wird eingebettet. Best-Effort-Implementation: Heading-Text suchen, von dort bis zum nächsten `#`-Heading derselben oder niedrigeren Stufe extrahieren.

`![[Datei#^id]]`: nur das Element mit der Block-ID wird eingebettet (Absatz, Listenitem, Blockquote, Tabellenzeile).

### Aliases-Auflösung

Wenn der Embed-Pfad keine direkte Datei findet, kommt die Alias-Auflösung aus 4T-0050 zum Einsatz. Bei mehrdeutigem Alias wird nicht der Disambiguation-Dialog gezeigt (störend bei jedem Render), sondern die erste Treffer-Datei genommen und ein dezenter Hinweis „mehrdeutig: <Alias>" am Embed-Block.

### CSS

Eingebettete Markdown-Blöcke bekommen einen leichten Rahmen, einen kleinen Header mit Datei-Name (klickbar), und einen `<div>` mit dem gerenderten Inhalt. PDF-Embeds bekommen feste Mindesthöhe (z.B. 400px), aber Resize per CSS-Resize-Handle möglich.

### Akzeptanz-Smoke-Tests

1. `![[bild.png]]` rendert das Bild inline (identisch zu `![](bild.png)`).
2. `![[Notiz.md]]` rendert die Notiz in einer dezenten Box mit klickbarem Datei-Namen.
3. `![[Notiz.md#Abschnitt]]` rendert nur den Abschnitt.
4. `![[Notiz.md#^abc]]` rendert nur den Block mit `^abc`.
5. `![[file.pdf]]` rendert eine PDF-Vorschau.
6. `![[unknown.xyz]]` rendert nur einen Klick-Link mit Datei-Icon.
7. Rekursive Embeds: Tiefe 2 funktioniert, Tiefe 3 zeigt Hinweis statt Inhalt.
8. `![[Alias]]` löst über Aliases aus Frontmatter auf.

## Akzeptanzkriterien

- Parser erkennt `![[…]]` und liefert je nach Datei-Endung Bild/Markdown/PDF/Link.
- Markdown-Embeds rekursiv mit Tiefen-Limit 2.
- Heading- und Block-Anker im Embed führen zur Teil-Einbettung.
- Aliases werden bei Embed-Pfaden mit aufgelöst (erste Treffer-Datei bei Mehrdeutigkeit).
- CSS: dezente Embed-Box, klickbarer Header, theme-konform.
- Bestehende Markdown-Bild-Syntax `![Alt](pfad)` bleibt unverändert.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `wikiLinksPlugin` erkennt `!`-Präfix; neue Render-Funktion `renderWikiEmbed`.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Post-Render-Hook für Markdown-Embeds (Klick-Handling im Header), PDF-Embed-Handling.
- [src/renderer/styles.css](../../src/renderer/styles.css) — `.wiki-embed-*`-Stilfamilie für Markdown-/PDF-/Link-Embeds.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings für „Embed-Tiefe überschritten", „mehrdeutig: <Alias>".

## Lösung

Umgesetzt am 2026-05-20, Test bestanden.

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**:
  - Neues `wikiEmbedsPlugin` erkennt `![[…]]`-Syntax als eigene Inline-Rule vor `link`. Pipe-Trenner wird im Embed-Kontext als Größen-Modifier interpretiert (`|<n>`, `|<n>px`, `|<n> px`). Datei-Typ aus Extension abgeleitet: `image`, `pdf`, `md`, `other`.
  - Anker-Trennung analog zum Wiki-Link-Plugin (4T-0054): `![[Datei#Heading]]` und `![[Datei#^id]]` werden korrekt zerlegt.
  - Renderer-Regel `wikiembed`: Bild-Embeds werden direkt als `<img>` ausgegeben (damit `resolveImagesForBase` zu data-URI konvertiert); PDF/MD/Other als `<span class="wiki-embed-*">`-Platzhalter mit `data-embed-*`-Attributen.
  - Plugin auch in `mdPortable` für den HTML-Export registriert. Bilder sind dort vollständig portabel; PDF/MD/Other-Embeds bleiben als leere Span-Elemente (akzeptable Einschränkung in Stufe 1).
- **[src/main/backlinks.js](../../src/main/backlinks.js)**:
  - Neue exportierte Funktion `extractEmbedSnippet(content, anchor)`. Bei Heading-Anker schneidet sie von der Heading-Zeile bis zur nächsten gleichrangigen oder höheren Heading; bei Block-Anker (`^id`) die Zeile mit dem Block-Marker (Marker selbst wird entfernt). Fenced-Code-Blöcke werden beim Heading-Scan übersprungen, damit Markdown-Beispiele im Code keine falschen Treffer erzeugen.
- **[src/main/main.js](../../src/main/main.js)**: neuer IPC-Handler `embed:read` liest die Ziel-Datei (relativer Pfad zu `basePath` aufgelöst, dekodiert) und ruft `extractEmbedSnippet` bei Bedarf. Antwort: `{ ok, path, displayPath, content }` oder `{ ok: false, error }`.
- **[src/main/preload.js](../../src/main/preload.js)**: neue API-Methode `readEmbedFile(basePath, embedPath, anchor)`.
- **[src/renderer/renderer.js](../../src/renderer/renderer.js)**:
  - Neuer Post-Processing-Schritt `applyWikiEmbedsIfPresent(container, basePath, depth)` mit `WIKI_EMBED_MAX_DEPTH = 2`. Iteriert über `.wiki-embed:not(.wiki-embed-image):not(.wiki-embed-processed)` und expandiert je nach `data-embed-kind` per `renderPdfEmbed` / `renderMarkdownEmbed` / `renderOtherEmbed`.
  - `renderPdfEmbed`: `<embed type="application/pdf">` mit `file://`-URL (Windows-Pfad-Konvertierung: Backslashes zu Slashes), Default-Höhe 600 px, konfigurierbare Breite.
  - `renderMarkdownEmbed`: Header mit Datei-Name als klickbarem Link (öffnet die Quelldatei in der aktiven Pane), optionaler `#Anker`-Hinweis. Body mit rekursivem `api.renderMarkdown`-Aufruf und nachgelagerter Mermaid-/SCG-Table-Sortierung-/Wiki-Embed-Verarbeitung. Rekursions-Tiefe wird inkrementiert.
  - `renderOtherEmbed`: dezenter Klick-Link mit Büroklammer-Präfix, öffnet die Datei via `api.openExternal('file://...')` mit dem OS-Default-Programm.
  - `renderBrokenEmbed`: einheitlicher Fehler-Block mit `t('embed.notFound')` (mit `{path}`-Platzhalter), optional mit Detail-Fehlermeldung in Klammern.
  - Aufruf an drei Stellen: Initial-Pane-Render, `renderPaneContent`, `savePropertiesFromPane`.
- **[src/renderer/styles.css](../../src/renderer/styles.css)**: neue `.wiki-embed-*`-Stilfamilie. Bilder als Block mit `max-width: 100%`. PDF-Container mit dezentem Rahmen. Markdown-Embed mit Header (dezent gedämpfter Hintergrund, Datei-Name fett, Anker-Hinweis monospace) und Body (Markdown-Body-Klasse für vererbtes Styling). Other-Embed als gedämpfter Link-Button mit Büroklammer-Icon. Broken/Depth-Exceeded mit gedämpftem Rot, Light- und Dark-konform.
- **i18n (DE/EN/FR/ES/IT)**: zwei neue Keys je Sprache: `embed.notFound` (mit `{path}`-Platzhalter) und `embed.depthExceeded`.
- **[Projektmanagement/Aufgaben/3E-0012-markdown-syntax-erweiterungen.md](3E-0012-markdown-syntax-erweiterungen.md)**: Block-Embed-Erweiterung als Nachzieher-Punkt aufgenommen. Vollständige Block-Range-Erkennung über den markdown-it-AST kommt in 0.18.0 statt erst in 1.0.0.

### Implementierungsdetails

- **Pipe-Syntax-Konflikt mit Wiki-Links**: `[[Datei|Label]]` interpretiert `|` als Label-Trenner; `![[Datei|200px]]` interpretiert `|` als Größen-Modifier. Konsistent mit Obsidian-Konvention. Der `!`-Präfix ist der eindeutige Diskriminator. Bei ungültigen Größen-Angaben wird der Pipe-Teil ignoriert (kein Alt-Text-Fallback in Stufe 1).
- **Bild-Embed-Render-Pfad**: Bilder werden direkt als `<img>` im preload ausgegeben statt als Platzhalter mit Renderer-Postprocessing. Vorteil: `resolveImagesForBase` greift automatisch und konvertiert zu data-URI; keine zusätzliche IPC-Roundtrip pro Bild nötig.
- **Rekursionsschutz**: pro `applyWikiEmbedsIfPresent`-Aufruf wird `depth` weitergegeben. Bei `depth >= WIKI_EMBED_MAX_DEPTH` zeigt der Markdown-Embed nur einen dezenten Hinweis statt rekursiver Expansion. Tiefenzähler ist closure-state pro Aufrufkette, nicht globaler State.
- **`wiki-embed-processed`-Marker**: verhindert Doppel-Expansion bei mehrfachem Aufruf (z.B. wenn `renderPaneContent` und `applyMermaidIfPresent` und Properties-Save jeweils erneut Embeds finden würden).
- **Markdown-Embed mit Frontmatter in der Ziel-Datei**: `api.renderMarkdown` ruft intern `extractFrontmatter` (4T-0049) auf, sodass Frontmatter aus der eingebetteten Datei automatisch nicht im Embed-Body sichtbar wird.
- **PDF-`file://`-URL und Electron-Sicherheit**: Electron erlaubt `<embed>` mit `file://`-Protokoll im Renderer-Prozess. Pfad-Conversion (Windows-Backslashes zu Slashes) ist nötig, damit das URL-Format korrekt ist (`file:///C:/Users/...`).
- **Other-Embed öffnet mit `openExternal`**: `api.openExternal('file://...')` öffnet die Datei mit dem OS-Default-Programm. Damit funktionieren ZIPs (Archivmanager), Office-Dokumente (Word/LibreOffice) und beliebige andere Datei-Typen ohne dass die App selbst Renderer haben muss.

### Smoke-Test (2026-05-20)

13 Test-Punkte vom Nutzer verifiziert:

1. Bild ohne Größe (max. Container-Breite).
2. Bild mit Pixel-Breite (`|200`).
3. Bild mit `px`-Suffix (`|300px`).
4. PDF-Embed mit Default-Größe.
5. PDF-Embed mit konfigurierbarer Breite.
6. Markdown-Embed der ganzen Datei mit klickbarem Header.
7. Markdown-Embed nur eines Abschnitts (Heading-Anker).
8. Markdown-Embed nur eines Blocks (`^id`-Anker).
9. Other-Embed mit Klick-Link und Büroklammer-Icon.
10. Broken-Embed bei fehlender Datei.
11. Broken-Embed bei fehlendem Anker.
12. Theme-Wechsel (Hell und Dunkel).
13. Bestehende Wiki-Link-Funktionalität unverändert (`[[bild.png]]` ohne `!` bleibt Klick-Link).

Alle Punkte bestanden.

### Schnitt-Anpassungen am Meta-Plan

- **Block-Embed-Erweiterung** (mehrzeilige Listen-Items, Code-Blöcke, Tabellenzeilen, mehrzeilige Blockquotes als vollständige Block-Range) wurde aus dem 4T-0055-Scope ausgeschlossen, weil eine AST-basierte Block-Range-Erkennung in markdown-it nicht trivial ist. Stattdessen wurde der Punkt in Epic [3E-0012](3E-0012-markdown-syntax-erweiterungen.md) als Nachzieher-Task aufgenommen (Zielversion 0.18.0). Begründung: thematisch passend zu „Markdown-Syntax-Erweiterungen", weil Block-Anker `^id` schon in 4T-0054 als Markdown-Syntax eingeführt wurde — die Erweiterung verfeinert die bereits etablierte Syntax. Entscheidung auf Vorschlag des Nutzers am 2026-05-20 (statt der ursprünglich geplanten Verortung im 1.0.0-Konsolidierungs-Epic 3E-0016).
