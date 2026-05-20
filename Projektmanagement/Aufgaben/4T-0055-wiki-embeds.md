# 4T-0055 — Wiki-Embeds `![[…]]`

**Status**: Offen
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

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
